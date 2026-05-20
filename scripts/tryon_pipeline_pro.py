#!/usr/bin/env python3
"""
Professional Try-On Pipeline:
Input (any pose/background) → Output (straight pose + clean background)

Pipeline:
1. Preprocess: Detect pose → Normalize to T-pose/A-pose
2. Try-on: FASHN inference
3. Postprocess: Remove background → Optional transparent or white
"""
import io
import os
import requests
import numpy as np
from PIL import Image
from typing import Tuple, Optional
import cv2


class TryOnPipeline:
    def __init__(self):
        self.target_size = (768, 1024)  # FASHN standard size
        
    def preprocess_person_image(
        self, 
        image: Image.Image,
        normalize_pose: bool = True,
        remove_bg: bool = True
    ) -> Image.Image:
        """
        Preprocess person image:
        - Remove background
        - Normalize pose to standing straight
        - Resize to standard size
        """
        # Step 1: Remove background
        if remove_bg:
            image = self._remove_background(image)
        
        # Step 2: Normalize pose (if needed)
        if normalize_pose:
            image = self._normalize_pose(image)
        
        # Step 3: Resize to target size
        image = self._resize_and_pad(image, self.target_size)
        
        return image
    
    def _remove_background(self, image: Image.Image) -> Image.Image:
        """Remove background using rembg"""
        try:
            from rembg import remove
            return remove(image)
        except ImportError:
            print("⚠️ rembg not installed, skipping background removal")
            return image
    
    def _normalize_pose(self, image: Image.Image) -> Image.Image:
        """
        Normalize pose to standing straight using DWPose + perspective transform
        
        For production: Use DWPose to detect keypoints, then:
        1. Calculate shoulder angle
        2. Rotate to make shoulders horizontal
        3. Align spine vertically
        """
        # Convert to numpy
        img_array = np.array(image)
        
        # Simple approach: Find person bounding box and center
        if img_array.shape[2] == 4:  # RGBA
            alpha = img_array[:, :, 3]
            coords = np.column_stack(np.where(alpha > 0))
            
            if len(coords) > 0:
                y_min, x_min = coords.min(axis=0)
                y_max, x_max = coords.max(axis=0)
                
                # Crop to person
                person = img_array[y_min:y_max, x_min:x_max]
                
                # TODO: Advanced pose normalization with DWPose
                # For now, just return cropped person
                return Image.fromarray(person)
        
        return image
    
    def _resize_and_pad(
        self, 
        image: Image.Image, 
        target_size: Tuple[int, int]
    ) -> Image.Image:
        """
        Resize image to target size while maintaining aspect ratio
        Pad with transparent pixels
        """
        # Calculate scaling factor
        width, height = image.size
        target_width, target_height = target_size
        
        scale = min(target_width / width, target_height / height)
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        # Resize
        resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Create canvas with transparent background
        canvas = Image.new('RGBA', target_size, (255, 255, 255, 0))
        
        # Paste centered
        x_offset = (target_width - new_width) // 2
        y_offset = (target_height - new_height) // 2
        canvas.paste(resized, (x_offset, y_offset), resized if resized.mode == 'RGBA' else None)
        
        return canvas
    
    def postprocess_result(
        self,
        image: Image.Image,
        background: str = "white"  # "white", "transparent", or hex color
    ) -> Image.Image:
        """
        Postprocess try-on result:
        - Remove any remaining background artifacts
        - Apply clean background (white/transparent)
        """
        # Remove background again (FASHN might add some artifacts)
        image_no_bg = self._remove_background(image)
        
        # Apply desired background
        if background == "transparent":
            return image_no_bg
        
        # Create solid background
        canvas = Image.new('RGB', image_no_bg.size, background)
        canvas.paste(image_no_bg, (0, 0), image_no_bg if image_no_bg.mode == 'RGBA' else None)
        
        return canvas
    
    def process_full_pipeline(
        self,
        person_image_url: str,
        garment_image_url: str,
        fashn_inference_fn,  # Function that calls FASHN
        output_background: str = "white"
    ) -> Image.Image:
        """
        Full pipeline:
        1. Download images
        2. Preprocess person (normalize pose + remove bg)
        3. Run FASHN inference
        4. Postprocess result (clean background)
        """
        # Download images
        person_img = self._load_image(person_image_url)
        garment_img = self._load_image(garment_image_url)
        
        # Preprocess person image
        print("📐 Preprocessing person image...")
        person_processed = self.preprocess_person_image(
            person_img,
            normalize_pose=True,
            remove_bg=True
        )
        
        # Save preprocessed to temp (for FASHN input)
        temp_person_path = "/tmp/person_preprocessed.png"
        person_processed.save(temp_person_path)
        
        # Run FASHN inference
        print("🎨 Running FASHN inference...")
        result_img = fashn_inference_fn(temp_person_path, garment_img)
        
        # Postprocess result
        print("✨ Postprocessing result...")
        final_img = self.postprocess_result(result_img, background=output_background)
        
        return final_img
    
    def _load_image(self, url_or_path: str) -> Image.Image:
        """Load image from URL or local path"""
        if url_or_path.startswith("http"):
            response = requests.get(url_or_path)
            return Image.open(io.BytesIO(response.content)).convert("RGBA")
        else:
            return Image.open(url_or_path).convert("RGBA")


# Example usage
if __name__ == "__main__":
    pipeline = TryOnPipeline()
    
    # Test preprocessing
    test_img = Image.open("/home/dinh/.hermes/images/clip_20260519_204834_1.png")
    processed = pipeline.preprocess_person_image(test_img)
    processed.save("/tmp/test_preprocessed.png")
    print("✅ Saved preprocessed image to /tmp/test_preprocessed.png")
