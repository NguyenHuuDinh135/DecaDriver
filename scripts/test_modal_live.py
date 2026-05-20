import requests
import os
import json

# Configuration
MODAL_BASE = "https://nguyenhuudinh135--decadriver-tryon"
CLIP_URL = f"{MODAL_BASE}-clip-api.modal.run"
ANALYZE_URL = f"{MODAL_BASE}-analyze-api.modal.run"

# Sample data URLs (using public stable images)
PERSON_IMG = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500"
GARMENT_IMG = "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500"

def test_clip():
    print("\n🔍 Testing CLIP Embedding...")
    payload = {"text": "A stylish blue denim jacket"}
    try:
        resp = requests.post(CLIP_URL, json=payload, timeout=30)
        resp.raise_for_status()
        result = resp.json()
        if "embedding" in result:
            print(f"✅ CLIP Success! Vector size: {len(result['embedding'])}")
        else:
            print(f"❌ CLIP Failed: {result}")
    except Exception as e:
        print(f"❌ CLIP Error: {e}")

def test_analyze():
    print("\n🧠 Testing Moondream2 Analysis...")
    payload = {
        "image_url": GARMENT_IMG,
        "prompt": "Describe the color and texture of this garment."
    }
    try:
        # Increased timeout to 600s for first-time model download
        resp = requests.post(ANALYZE_URL, json=payload, timeout=600)
        resp.raise_for_status()
        result = resp.json()
        if result.get("status") == "success":
            print(f"✅ Analysis Success: {result['analysis']}")
        else:
            print(f"❌ Analysis Failed: {result}")
    except Exception as e:
        print(f"❌ Analysis Error: {e}")

if __name__ == "__main__":
    print("🚀 Starting Modal LIVE Endpoint Tests...")
    test_clip()
    test_analyze()
    print("\n✨ Basic tests finished. (Try-On and LoRa require job queuing/long runs)")
