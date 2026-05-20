import modal
import os
import time

# Configuration
USER_ID = "test_user_01"
# Sample images for face LoRA training
IMAGE_URLS = [
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800",
]
OUTPUT_DIR = "apps/api"
LORA_FILE = f"{OUTPUT_DIR}/pytorch_lora_weights.safetensors"

def test_train():
    print(f"🎓 Starting LoRA Training for {USER_ID}...")
    
    # Lookup the function
    f = modal.Function.from_name("decadriver-tryon", "train_avatar_task")
    
    start_time = time.time()
    try:
        # Call directly and wait (This takes 10-15 mins)
        # Note: modal.Function.remote has a default timeout, we might need to be careful
        # But Modal background tasks can run longer.
        print("⏳ Running SDXL LoRa training on A10G (10-15 mins)...")
        result = f.remote(USER_ID, IMAGE_URLS)
        
        elapsed = (time.time() - start_time) / 60
        if result.get("status") == "success":
            print(f"✅ Training Success in {elapsed:.1f} minutes!")
            print(f"🔗 LoRa Path: {result['lora_path']}")
            
            # Now download from volume
            print("📥 Downloading LoRa weights from Modal Volume...")
            import subprocess
            cmd = ["modal", "volume", "get", "decadriver-weights", f"loras/{USER_ID}/pytorch_lora_weights.safetensors", OUTPUT_DIR]
            subprocess.run(cmd, check=True)
            
            if os.path.exists(LORA_FILE):
                print(f"✅ Weights downloaded successfully to: {LORA_FILE}")
                print(f"📁 File size: {os.path.getsize(LORA_FILE) / (1024*1024):.2f} MB")
        else:
            print(f"❌ Training Failed: {result}")
            
    except Exception as e:
        print(f"❌ Training Error: {e}")

if __name__ == "__main__":
    test_train()
