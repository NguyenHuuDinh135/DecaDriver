import asyncio
import sys
import os

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Add the apps/api directory to the python path
sys.path.append(os.path.join(os.getcwd(), "apps", "api"))

from app.services.shopee_fetcher import shopee_fetcher

async def test_fetcher():
    # Example real Shopee VN product link
    test_url = "https://shopee.vn/product/12345678/9012345678" # We'll try to find a real pattern or just test the logic
    # In reality, I should use a valid link for a real test, but I'll use one that follows the pattern
    # Let's use a common pattern link
    test_url = "https://shopee.vn/Ao-Thun-Nam-Cotton-i.11134207.23551234567"
    
    print(f"Testing Shopee fetcher with URL: {test_url}")
    data = await shopee_fetcher.fetch_product_data(test_url)
    
    if data:
        print("\nSuccessfully fetched data:")
        for key, value in data.items():
            print(f"- {key}: {value}")
    else:
        print("\nFailed to fetch data.")

if __name__ == "__main__":
    asyncio.run(test_fetcher())
