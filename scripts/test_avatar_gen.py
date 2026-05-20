import requests
import base64
from PIL import Image
import io

# Configuration
# Pose image: A fashion model in a specific pose
POSE_REF_URL = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800"
# Face image: We'll use a local face for the test
FACE_REF_URL = "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800"

def test_avatar_gen():
    print("🚀 Testing Personalized Avatar Generation (Pose + Face Swap) on Modal...")
    
    url = "https://nguyenhuudinh135--decadriver-tryon-ai-gateway.modal.run"
    
    payload = {
        "task": "generate_avatar",
        "face_image_url": FACE_REF_URL,
        "pose_image_url": POSE_REF_URL,
        "remove_bg": True,
        "prompt": "a high quality professional studio photo of a beautiful woman, fashion model, standing, casual outfit, highly detailed, 8k"
    }
    
    print(f"📤 Sending request to {url}...")
    try:
        resp = requests.post(url, json=payload, timeout=300)
        resp.raise_for_status()
        data = resp.json()
        
        if data["status"] == "success":
            img_data = base64.b64decode(data["image_b64"])
            img = Image.open(io.BytesIO(img_data))
            
            output_path = "AVATAR_GEN_RESULT.png"
            img.save(output_path)
            print(f"✅ Success! Result saved to {output_path}")
            print(f"📏 Image size: {img.size}")
            print(f"ℹ️ Info: {data.get('info')}")
        else:
            print(f"❌ Error: {data.get('error') or data.get('message')}")
            
    except Exception as e:
        print(f"❌ Failed to call endpoint: {e}")

if __name__ == "__main__":
    test_avatar_gen()
