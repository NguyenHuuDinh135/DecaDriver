import asyncio
import json
import os
import sys
import re
import subprocess
import httpx
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor

from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from playwright_stealth import Stealth

from app.core.config import settings

class TikiService:
    """
    Advanced Tiki Importer using Chrome Remote Debugging (CDP).
    Leverages a real browser session to bypass Tiki protections.
    """
    
    def __init__(self):
        # Use a dedicated profile directory for Tiki
        self.user_data_dir = r"C:\TikiDebug"
        self.debug_port = 9223 # Different port to avoid conflict
        self.executor = ThreadPoolExecutor(max_workers=1)
        
        if not os.path.exists(self.user_data_dir):
            try:
                os.makedirs(self.user_data_dir)
            except:
                self.user_data_dir = os.path.join(os.getcwd(), "tiki-debug-profile")
                if not os.path.exists(self.user_data_dir):
                    os.makedirs(self.user_data_dir)

    def _get_browser_path(self) -> str:
        """Finds CocCoc or Chrome executable path."""
        paths = [
            os.path.expandvars(r"%LOCALAPPDATA%\CocCoc\Browser\Application\browser.exe"),
            r"C:\Program Files\CocCoc\Browser\Application\browser.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ]
        for path in paths:
            if os.path.exists(path):
                return path
        return "chrome.exe"

    async def _ensure_browser_running(self):
        """Checks if browser is running on debug port, launches if not."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"http://127.0.0.1:{self.debug_port}/json/version", timeout=2)
                if response.status_code == 200:
                    return True
        except:
            pass

        print(f"DEBUG: Launching browser for Tiki on port {self.debug_port}...")
        browser_path = self._get_browser_path()
        flags = [
            f"--remote-debugging-port={self.debug_port}",
            f'--user-data-dir="{self.user_data_dir}"',
            "--disable-blink-features=AutomationControlled"
        ]
        
        cmd = f'start "" "{browser_path}" ' + " ".join(flags)
        subprocess.Popen(cmd, shell=True)
        
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
        """Main entry point with thread bridge."""
        if not url or "tiki.vn" not in url:
            return {"success": False, "error": "URL không hợp lệ hoặc không phải Tiki.vn"}

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
        """Tiki-specific extraction logic."""
        if not await self._ensure_browser_running():
            return {"success": False, "error": "Không thể khởi động trình duyệt"}

        async with async_playwright() as p:
            try:
                browser = await p.chromium.connect_over_cdp(f"http://127.0.0.1:{self.debug_port}")
                context = browser.contexts[0]
                page = context.pages[0] if context.pages else await context.new_page()
                
                # Apply stealth
                await Stealth().apply_stealth_async(page)
                await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

                product_json = None
                
                # Intercept Tiki Product API
                async def handle_response(response):
                    nonlocal product_json
                    if "/api/v2/products/" in response.url:
                        try:
                            data = await response.json()
                            if data.get("id"):
                                print(f"DEBUG: Captured Tiki Product API: {response.url}")
                                product_json = data
                        except:
                            pass

                page.on("response", handle_response)
                
                print(f"DEBUG: Điều hướng tới Tiki: {url}")
                await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                
                # Wait for data capture
                for _ in range(15):
                    if product_json:
                        break
                    await asyncio.sleep(1)

                # Fallback: Meta Tags
                if not product_json:
                    meta_data = await self._extract_meta_tags(page)
                    if meta_data.get("name") and "Tiki" not in meta_data["name"]:
                        return {"success": True, "data": meta_data}
                
                if not product_json:
                    return {"success": False, "error": "Không thể lấy dữ liệu sản phẩm Tiki. Hãy thử tải lại trang."}

                formatted_data = self._format_tiki_data(product_json, url)
                return {"success": True, "data": formatted_data}

            except Exception as e:
                return {"success": False, "error": f"Lỗi Tiki CDP: {str(e)}"}

    async def _extract_meta_tags(self, page: Page) -> Dict[str, Any]:
        data = {}
        try:
            data["name"] = await page.get_attribute('meta[property="og:title"]', "content") or await page.title()
            data["description"] = await page.get_attribute('meta[property="og:description"]', "content") or ""
            img = await page.get_attribute('meta[property="og:image"]', "content")
            data["images"] = [img] if img else []
            data["sourceUrl"] = page.url
            data["price"] = 0
            data["priceBeforeDiscount"] = 0
            data["stock"] = 0
            data["sold"] = 0
            data["rating"] = 0
        except:
            pass
        return data

    def _format_tiki_data(self, raw: Dict[str, Any], url: str) -> Dict[str, Any]:
        """Formats Tiki API response to standard structure."""
        images = []
        if raw.get("images"):
            images = [img.get("base_url") for img in raw.get("images") if img.get("base_url")]
        elif raw.get("thumbnail_url"):
            images = [raw.get("thumbnail_url")]

        return {
            "name": raw.get("name", "Sản phẩm Tiki"),
            "description": raw.get("description", ""),
            "price": raw.get("price", 0),
            "priceBeforeDiscount": raw.get("list_price", 0),
            "stock": raw.get("stock_item", {}).get("qty", 0),
            "sold": raw.get("all_time_quantity_sold", 0),
            "rating": raw.get("rating_average", 0),
            "images": images,
            "sourceUrl": url
        }

tiki_service = TikiService()
