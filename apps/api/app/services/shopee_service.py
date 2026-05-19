import asyncio
import json
import os
import sys
import re
import subprocess
import time
import httpx
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor

from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from playwright_stealth import Stealth

from app.core.config import settings

class ShopeeService:
    """
    Advanced Shopee Importer using Chrome Remote Debugging (CDP).
    Bypasses anti-bot by attaching to a real browser session with Proxy support.
    """
    
    def __init__(self):
        # Use a dedicated profile directory
        self.user_data_dir = r"C:\ShopeeDebug"
        self.debug_port = 9222
        self.executor = ThreadPoolExecutor(max_workers=1)
        
        if not os.path.exists(self.user_data_dir):
            try:
                os.makedirs(self.user_data_dir)
            except:
                # Fallback to current directory if C:\ is not writable
                self.user_data_dir = os.path.join(os.getcwd(), "shopee-debug-profile")
                if not os.path.exists(self.user_data_dir):
                    os.makedirs(self.user_data_dir)

    def _get_browser_path(self) -> str:
        """Finds CocCoc or Chrome executable path."""
        # Prioritize CocCoc as requested, then Chrome
        paths = [
            os.path.expandvars(r"%LOCALAPPDATA%\CocCoc\Browser\Application\browser.exe"),
            r"C:\Program Files\CocCoc\Browser\Application\browser.exe",
            r"C:\Program Files (x86)\CocCoc\Browser\Application\browser.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ]
        
        for path in paths:
            if os.path.exists(path):
                return path
        return "chrome.exe"  # Last resort: assume it's in PATH

    async def _ensure_browser_running(self):
        """Checks if browser is running on debug port, launches if not."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"http://127.0.0.1:{self.debug_port}/json/version", timeout=2)
                if response.status_code == 200:
                    print(f"DEBUG: Browser is already running on port {self.debug_port}")
                    # Note: We can't change proxy on an already running browser easily
                    return True
        except:
            pass

        print(f"DEBUG: Launching browser in Debug Mode on port {self.debug_port}...")
        browser_path = self._get_browser_path()
        
        # Command to open browser in debug mode
        # Added proxy support from settings
        flags = [
            f"--remote-debugging-port={self.debug_port}",
            f'--user-data-dir="{self.user_data_dir}"',
            "--disable-blink-features=AutomationControlled"
        ]
        
        if settings.SHOPEE_PROXY_SERVER:
            print(f"DEBUG: Using proxy server: {settings.SHOPEE_PROXY_SERVER}")
            flags.append(f'--proxy-server="{settings.SHOPEE_PROXY_SERVER}"')
            
        cmd = f'start "" "{browser_path}" ' + " ".join(flags)
        
        subprocess.Popen(cmd, shell=True)
        
        # Wait for browser to start
        for _ in range(10):
            await asyncio.sleep(1)
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(f"http://127.0.0.1:{self.debug_port}/json/version")
                    if res.status_code == 200:
                        return True
            except:
                continue
        return False

    async def import_from_url(self, url: str) -> Dict[str, Any]:
        """Main entry point. Handles the Windows thread bridge."""
        if not url or "shopee.vn" not in url:
            return {"success": False, "error": "URL không hợp lệ"}

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            self.executor,
            self._run_sync_import,
            url
        )

    def _run_sync_import(self, url: str) -> Dict[str, Any]:
        """Bridge to run async logic in a new thread."""
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        try:
            return new_loop.run_until_complete(self._import_logic(url))
        finally:
            new_loop.close()

    async def _import_logic(self, url: str) -> Dict[str, Any]:
        """Attaches to the running browser and extracts data."""
        # Ensure browser is ready
        if not await self._ensure_browser_running():
            return {"success": False, "error": "Không thể khởi động trình duyệt Debug Mode"}

        async with async_playwright() as p:
            try:
                # Attach to existing browser
                browser = await p.chromium.connect_over_cdp(f"http://127.0.0.1:{self.debug_port}")
                context = browser.contexts[0]
                
                # Use current page if available, otherwise create new
                page = context.pages[0] if context.pages else await context.new_page()
                
                # Handle proxy authentication if needed
                if settings.SHOPEE_PROXY_USER and settings.SHOPEE_PROXY_PASS:
                    await context.set_extra_http_headers({
                        "Proxy-Authorization": f"Basic {settings.SHOPEE_PROXY_USER}:{settings.SHOPEE_PROXY_PASS}"
                    })
                
                # Apply stealth
                await Stealth().apply_stealth_async(page)

                product_json = None
                
                # Set up interception
                async def handle_response(response):
                    nonlocal product_json
                    if any(path in response.url for path in ["/api/v4/item/get", "/api/v4/pdp/get_pc", "/api/v2/item/get"]):
                        try:
                            data = await response.json()
                            if data.get("data"):
                                product_json = data["data"]
                        except:
                            pass

                page.on("response", handle_response)
                
                print(f"DEBUG: Navigating to {url}")
                await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                
                # Wait for data or user action (Login/Captcha)
                for i in range(60):
                    if product_json:
                        break
                    
                    content = await page.content()
                    if "anti_bot" in content or "Loading Issue" in content or "buyer/login" in page.url:
                        if i % 10 == 0:
                            print(f"!!! CẦN HỖ TRỢ !!! Vui lòng giải captcha hoặc đăng nhập trên cửa sổ trình duyệt (Thử {i}s)")
                    
                    await asyncio.sleep(1)

                # Fallback: INITIAL_STATE
                if not product_json:
                    try:
                        state = await page.evaluate("window.__INITIAL_STATE__")
                        if state and state.get("item"):
                            product_json = state["item"]
                    except:
                        pass

                # Fallback: Meta Tags
                if not product_json:
                    if "product/" in page.url or "-i." in page.url:
                        meta_data = await self._extract_meta_tags(page)
                        if meta_data.get("name") and "Login" not in meta_data["name"]:
                            return {"success": True, "data": meta_data}
                
                if not product_json:
                    return {"success": False, "error": "Không lấy được dữ liệu. Hãy thực hiện thao tác trên trình duyệt."}

                formatted_data = self._format_shopee_data(product_json, url)
                return {"success": True, "data": formatted_data}

            except Exception as e:
                return {"success": False, "error": f"Lỗi CDP: {str(e)}"}
            finally:
                # We don't close the browser because it's a persistent debug session
                pass

    async def _extract_meta_tags(self, page: Page) -> Dict[str, Any]:
        data = {}
        try:
            data["name"] = await page.get_attribute('meta[property="og:title"]', "content") or await page.title()
            data["description"] = await page.get_attribute('meta[property="og:description"]', "content") or ""
            img = await page.get_attribute('meta[property="og:image"]', "content")
            data["images"] = [img] if img else []
            data["sourceUrl"] = page.url
            data["price"] = 0
            data["sold"] = 0
            data["rating"] = 0
            data["stock"] = 0
        except:
            pass
        return data

    def _format_shopee_data(self, raw: Dict[str, Any], url: str) -> Dict[str, Any]:
        # Price processing (Shopee price * 100,000)
        price = raw.get("price") or raw.get("price_min") or 0
        if price > 10000: price = price // 100000
            
        price_before = raw.get("price_before_discount") or raw.get("price_max") or 0
        if price_before > 10000: price_before = price_before // 100000

        image_hashes = raw.get("images", [])
        images = []
        for img in image_hashes:
            if str(img).startswith("http"):
                images.append(img)
            else:
                images.append(f"https://down-vn.img.susercontent.com/file/{img}")

        if not images and raw.get("image"):
            main_img = raw.get("image")
            if str(main_img).startswith("http"):
                images.append(main_img)
            else:
                images.append(f"https://down-vn.img.susercontent.com/file/{main_img}")

        return {
            "name": raw.get("name") or raw.get("title") or "Sản phẩm Shopee",
            "description": raw.get("description") or "",
            "price": price,
            "priceBeforeDiscount": price_before if price_before > price else price,
            "stock": raw.get("stock") or 0,
            "sold": raw.get("historical_sold") or raw.get("sold") or 0,
            "rating": raw.get("item_rating", {}).get("rating_star") or 0,
            "images": images,
            "sourceUrl": url
        }

shopee_service = ShopeeService()
