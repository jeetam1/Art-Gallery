"""
Process all photos in public/ directory:
1. Gentle edge trim to remove background
2. Add a clean white border (~0.5cm matting)
3. Save to public/framed/
"""
import numpy as np
from PIL import Image, ImageOps
import os

INPUT_DIR = "raw_images"
OUTPUT_DIR = "public"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Default gentle crop: 2% from each edge
DEFAULT_CROP = (0.02, 0.02, 0.02, 0.02)

# Per-image overrides for photos that need special handling
CROP_MAP = {
    "1.jpeg":  (0.02, 0.01, 0.02, 0.01),
    "4.jpeg":  (0.01, 0.02, 0.01, 0.01),
    "5.jpeg":  (0.01, 0.01, 0.01, 0.01),
    "6.jpeg":  (0.01, 0.01, 0.01, 0.01),
    "7.jpeg":  (0.01, 0.01, 0.01, 0.01),
    "9.jpeg":  (0.05, 0.01, 0.05, 0.01),  # Blue background on sides
    "10.jpeg": (0.12, 0.10, 0.06, 0.12),  # Another painting behind it
    "11.jpeg": (0.01, 0.01, 0.01, 0.01),
    "17.jpeg": (0.04, 0.02, 0.04, 0.03),
}


def process_image(filename):
    """Process a single image: crop edges, add white border."""
    input_path = os.path.join(INPUT_DIR, filename)
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    if not os.path.exists(input_path):
        print(f"  Skipped {filename} (not found)")
        return False
    
    print(f"Processing {filename}...", end=" ")
    
    img = Image.open(input_path)
    img = ImageOps.exif_transpose(img)
    w, h = img.size
    
    is_new_photo = filename.endswith('.jpeg') and filename[:-5].isdigit() and 156 <= int(filename[:-5]) <= 166
    if is_new_photo:
        left_pct = top_pct = right_pct = bottom_pct = 0.0
    else:
        left_pct, top_pct, right_pct, bottom_pct = CROP_MAP.get(filename, DEFAULT_CROP)
    
    left = int(w * left_pct)
    top = int(h * top_pct)
    right = w - int(w * right_pct)
    bottom = h - int(h * bottom_pct)
    
    cropped = img.crop((left, top, right, bottom))
    cw, ch = cropped.size
    
    # Add white border (~2.5% of shorter dimension, min 12px)
    border_px = max(12, int(min(cw, ch) * 0.025))
    new_w = cw + 2 * border_px
    new_h = ch + 2 * border_px
    bordered = Image.new('RGB', (new_w, new_h), (255, 255, 255))
    bordered.paste(cropped, (border_px, border_px))
    
    # Save main high-res framed image as progressive JPEG
    bordered.save(output_path, "JPEG", quality=90, optimize=True, progressive=True)
    
    # Create thumbnails directory
    thumb_dir = os.path.join(OUTPUT_DIR, "thumbnails")
    os.makedirs(thumb_dir, exist_ok=True)
    
    # Generate and save compressed progressive thumbnail (max 450px)
    thumb = bordered.copy()
    thumb.thumbnail((450, 450), Image.Resampling.LANCZOS)
    thumb_path = os.path.join(thumb_dir, filename)
    thumb.save(thumb_path, "JPEG", quality=75, optimize=True, progressive=True)
    
    print(f"{w}x{h} -> {new_w}x{new_h} (thumbnail saved)")
    return True


def main():
    # Find all numbered jpegs in public/
    files = []
    for f in os.listdir(INPUT_DIR):
        if f.endswith('.jpeg') and f[:-5].isdigit():
            files.append(f)
    
    files.sort(key=lambda x: int(x[:-5]))
    total = len(files)
    
    print(f"Found {total} photos to frame")
    print("=" * 50)
    
    success = 0
    for f in files:
        if process_image(f):
            success += 1
    
    print("=" * 50)
    print(f"Done! Framed {success}/{total} images -> {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
