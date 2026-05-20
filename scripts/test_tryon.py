import modal
import os

# Configuration
PERSON_IMG = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800"
GARMENT_IMG = "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800"
OUTPUT_PATH = "apps/api/MODAL_TRYON_RESULT.png"

def test_tryon():
    print("🚀 Triggering Modal Virtual Try-On (FASHN v1.5)...")
    
    # Lookup the function from the deployed app
    f = modal.Function.from_name("decadriver-tryon", "run_tryon_job")
    
    mock_job = {
        "id": "test_job_001",
        "person_image_url": PERSON_IMG,
        "garment_image_url": GARMENT_IMG,
        "category": "tops"
    }
    
    try:
        # Call the function and get PNG bytes
        print("⏳ Running inference on GPU (this may take 30-60s)...")
        png_bytes = f.remote(mock_job)
        
        # Save result locally
        with open(OUTPUT_PATH, "wb") as f_out:
            f_out.write(png_bytes)
            
        print(f"✅ Try-On Success! Result saved to: {OUTPUT_PATH}")
        print(f"📁 File size: {len(png_bytes) / 1024:.2f} KB")
        
    except Exception as e:
        print(f"❌ Try-On Error: {e}")

if __name__ == "__main__":
    test_tryon()
