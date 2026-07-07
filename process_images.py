import numpy as np
from PIL import Image, ImageOps
import scipy.ndimage as ndimage
import os

INPUT_DIR = "photo"
OUTPUT_DIR = os.path.join("public", "processed")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Correct clockwise rotations determined from semantic analysis:
# 1-5.jpeg: correct or landscape
# 6.jpeg: woman in red (head is on the right -> rotate 90 degrees CCW / 270 degrees CW)
# 7.jpeg: table and pot (bottom is on the right -> rotate 90 degrees CW)
# 8.jpeg: piano keys (landscape, correct)
# 9.jpeg: landscape, head is on the left -> rotate 90 degrees CW
# 10.jpeg: head is on the right -> rotate 90 degrees CCW / 270 degrees CW
image_rotations = {
    "1.jpeg": 0,
    "2.jpeg": 0,
    "3.jpeg": 0,
    "4.jpeg": 0,
    "5.jpeg": 0,
    "6.jpeg": 270,
    "7.jpeg": 90,
    "8.jpeg": 0,
    "9.jpeg": 90,
    "10.jpeg": 270
}

def find_perspective_coeffs(src_pts, dst_pts):
    matrix = []
    for (x, y), (u, v) in zip(src_pts, dst_pts):
        matrix.append([x, y, 1, 0, 0, 0, -u*x, -u*y])
        matrix.append([0, 0, 0, x, y, 1, -v*x, -v*y])
    
    A = np.array(matrix)
    B = np.array(dst_pts).flatten()
    
    # Solve A * X = B
    coeffs = np.linalg.solve(A, B)
    return coeffs

def process_painting(img_path, rotate_deg=0):
    img = Image.open(img_path)
    img = ImageOps.exif_transpose(img)
    w, h = img.size
    
    scale = 800.0 / max(w, h)
    img_small = img.resize((int(w*scale), int(h*scale)), Image.Resampling.BILINEAR)
    gray = np.array(img_small.convert('L'), dtype=float)
    
    # Thresholding to isolate the canvas from the background carpet
    threshold = 150
    binary = gray > threshold
    
    # Clean binary mask
    structure = np.ones((5, 5), dtype=bool)
    binary = ndimage.binary_opening(binary, structure=structure)
    binary = ndimage.binary_closing(binary, structure=structure)
    
    labeled, num_features = ndimage.label(binary)
    if num_features == 0:
        print(f"  Warning: No canvas detected in {os.path.basename(img_path)}. Fallback to default crop.")
        return img.crop((int(w*0.06), int(h*0.06), int(w*0.94), int(h*0.94)))
        
    sizes = ndimage.sum(binary, labeled, range(1, num_features + 1))
    largest_label = np.argmax(sizes) + 1
    canvas_mask = labeled == largest_label
    
    y, x = np.where(canvas_mask)
    
    # 4 extreme corners
    tl_idx = np.argmin(x + y)
    tr_idx = np.argmin(-x + y)
    br_idx = np.argmax(x + y)
    bl_idx = np.argmax(-x + y)
    
    pts = np.array([
        [x[tl_idx] / scale, y[tl_idx] / scale],
        [x[tr_idx] / scale, y[tr_idx] / scale],
        [x[br_idx] / scale, y[br_idx] / scale],
        [x[bl_idx] / scale, y[bl_idx] / scale]
    ])
    
    # Clockwise sort corners starting from top-left
    centroid = np.mean(pts, axis=0)
    angles = np.arctan2(pts[:, 1] - centroid[1], pts[:, 0] - centroid[0])
    sort_idx = np.argsort(angles)
    sorted_pts = pts[sort_idx]
    src_pts = [tuple(p) for p in sorted_pts]
    
    top_w = np.linalg.norm(np.array(src_pts[1]) - np.array(src_pts[0]))
    bottom_w = np.linalg.norm(np.array(src_pts[2]) - np.array(src_pts[3]))
    left_h = np.linalg.norm(np.array(src_pts[3]) - np.array(src_pts[0]))
    right_h = np.linalg.norm(np.array(src_pts[2]) - np.array(src_pts[1]))
    
    out_w = int((top_w + bottom_w) / 2.0)
    out_h = int((left_h + right_h) / 2.0)
    
    dst_pts = [
        (0, 0),
        (out_w, 0),
        (out_w, out_h),
        (0, out_h)
    ]
    
    # Perform perspective projection warp
    coeffs = find_perspective_coeffs(dst_pts, src_pts)
    warped = img.transform((out_w, out_h), Image.Transform.PERSPECTIVE, coeffs, Image.Resampling.BICUBIC)
    
    # Fine crop to painting boundary by scanning for colored/non-white pixels inside the warped canvas
    arr = np.array(warped)
    w_gray = np.array(warped.convert('L'))
    
    # Calculate color saturation
    sat = np.max(arr, axis=2).astype(float) - np.min(arr, axis=2).astype(float)
    
    # Non-white pixels: grayscale <= 200 OR saturation >= 20
    is_painting = (w_gray <= 200) | (sat >= 20)
    
    # Remove noise
    struct = np.ones((3, 3), dtype=bool)
    is_painting = ndimage.binary_opening(is_painting, structure=struct)
    
    y_p, x_p = np.where(is_painting)
    if len(x_p) > 0:
        p_min_x = np.min(x_p)
        p_max_x = np.max(x_p)
        p_min_y = np.min(y_p)
        p_max_y = np.max(y_p)
        
        # Add a thin white border around the painting (1.5% of canvas size)
        border_x = int(out_w * 0.015)
        border_y = int(out_h * 0.015)
        
        crop_box = (
            max(0, p_min_x - border_x),
            max(0, p_min_y - border_y),
            min(out_w, p_max_x + border_x),
            min(out_h, p_max_y + border_y)
        )
        cropped = warped.crop(crop_box)
    else:
        cropped = warped
        
    # Rotate if needed (rotate CCW by -rotate_deg)
    if rotate_deg != 0:
        cropped = cropped.rotate(-rotate_deg, expand=True)
        
    return cropped

def main():
    print("=== Processing, Aligning, and Rotating Images ===")
    for i in range(1, 11):
        filename = f"{i}.jpeg"
        input_path = os.path.join(INPUT_DIR, filename)
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        if os.path.exists(input_path):
            print(f"Processing {filename}...")
            rotate_deg = image_rotations.get(filename, 0)
            cropped = process_painting(input_path, rotate_deg)
            cropped.save(output_path, "JPEG", quality=92, optimize=True)
            print(f"  Rotation: {rotate_deg} deg -> Saved: {output_path} ({cropped.size[0]}x{cropped.size[1]})")
        else:
            print(f"  Skipped {filename} (not found)")
    print("=== Done! ===")

if __name__ == "__main__":
    main()
