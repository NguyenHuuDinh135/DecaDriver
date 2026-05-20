import requests
import base64
import os
from PIL import Image
import io

# Test images
TEST_IMAGE_URL = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800"

def test_rembg():
    print("🚀 Testing Background Removal on Modal...")
    
    # Get endpoint URL from Modal (we'll assume it's running or use a dev URL)
    # For now, let's assume we use 'modal run' or we have the URL
    url = "https://nguyenhuudinh135--decadriver-tryon-ai-gateway.modal.run"
    
    payload = {
        "task": "remove_bg",
        "image_url": TEST_IMAGE_URL
    }
    
    print(f"📤 Sending request to {url}...")
    try:
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        
        if data["status"] == "success":
            img_data = base64.b64decode(data["image_b64"])
            img = Image.open(io.BytesIO(img_data))
            
            output_path = "REMBG_RESULT.png"
            img.save(output_path)
            print(f"✅ Success! Result saved to {output_path}")
            print(f"📏 Image size: {img.size}, Mode: {img.mode}")
        else:
            print(f"❌ Error: {data.get('error')}")
            
    except Exception as e:
        print(f"❌ Failed to call endpoint: {e}")
        print("💡 Make sure the app is deployed with 'modal deploy apps/api/modal_worker.py'")

if __name__ == "__main__":
    test_rembg()
