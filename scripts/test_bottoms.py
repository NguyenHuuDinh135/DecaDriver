import modal
import os

# Configuration
# Using the same person but a pair of jeans
PERSON_IMG = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800"
# Public URL for a pair of blue jeans
JEANS_IMG = "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800"
OUTPUT_PATH = "apps/api/MODAL_BOTTOMS_RESULT.png"

def test_bottoms():
    print("🚀 Triggering Modal Bottoms Try-On (Jeans)...")
    
    # Lookup the function from the deployed app
    f = modal.Function.from_name("decadriver-tryon", "run_tryon_job")
    
    mock_job = {
        "id": "test_bottoms_001",
        "person_image_url": PERSON_IMG,
        "garment_image_url": JEANS_IMG,
        "category": "bottoms"
    }
    
    try:
        print("⏳ Running inference on GPU...")
        png_bytes = f.remote(mock_job)
        
        with open(OUTPUT_PATH, "wb") as f_out:
            f_out.write(png_bytes)
            
        print(f"✅ Success! Result saved to: {OUTPUT_PATH}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_bottoms()
