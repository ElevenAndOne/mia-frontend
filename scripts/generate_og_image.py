"""
Generate OG image for app.miacreate.ai link previews.
Output: public/og-image.png (600x600px)

Run from frontend root:
    python scripts/generate_og_image.py
"""
import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.dirname(SCRIPT_DIR)
ICONS_DIR = os.path.join(FRONTEND_DIR, "public", "icons")

SIZE = 600
# Brand dark background (#06050A)
BG_COLOR = (6, 5, 10, 255)

logo_path = os.path.join(ICONS_DIR, "mia-logo.png")
if not os.path.exists(logo_path):
    print(f"mia-logo.png not found at {logo_path}")
    sys.exit(1)

# Dark background
canvas = Image.new("RGBA", (SIZE, SIZE), BG_COLOR)

# Load combined logo, resize to 60% of canvas with high quality
logo = Image.open(logo_path).convert("RGBA")
logo_size = int(SIZE * 0.6)  # 360x360
logo = logo.resize((logo_size, logo_size), Image.LANCZOS)

# Center on canvas
x = (SIZE - logo_size) // 2
y = (SIZE - logo_size) // 2
canvas.paste(logo, (x, y), logo)

output_path = os.path.join(FRONTEND_DIR, "public", "og-image.png")
canvas.convert("RGB").save(output_path, "PNG", optimize=True)
print(f"Saved: {output_path} ({SIZE}x{SIZE}px)")
