"""Graveyard sky (v1299, Harley: hard jump from the light far layer into the very dark code sky - the composite had soft clouds and a glow).
Takes the sky straight from the composite: every pixel where neither the far nor the near layer has art is real sky; the rest (behind the hills,
abbey, chapel, trees) is painted in with OpenCV inpainting, so parallax never reveals a hole. Same rows as the far layer (composite rows 0-727),
ends cross-faded so it repeats. Writes art/levels/graveyard_sky.webp.  Run: python3 dev/levels/build_graveyard_sky.py"""
import os, cv2, numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SRC = os.path.join(ROOT, "art/originals/backgrounds")
comp = np.asarray(Image.open(os.path.join(SRC, "graveyard_v2_composite_1536x1024.png")).convert("RGB"))
def magenta(p):
    a = np.asarray(Image.open(os.path.join(SRC, p)).convert("RGB")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (np.minimum(r, b) - g > 70) | ((r > 150) & (b > 150) & (g < 110))
sky = magenta("graveyard_layer_far_gpt_1536x1024.png") & magenta("graveyard_layer_near_gpt_1536x1024.png")
H = 728
sky[215:] = False                                   # below the hill tops: repainted smooth (hills cover it anyway)
mask = (~sky[:H]).astype(np.uint8) * 255
mask = cv2.dilate(mask, np.ones((17, 17), np.uint8))  # also repaint the soft edges around the hills/trees
img = cv2.cvtColor(comp[:H].copy(), cv2.COLOR_RGB2BGR)
small = cv2.resize(img, (img.shape[1] // 4, H // 4), interpolation=cv2.INTER_AREA); sm = cv2.resize(mask, (img.shape[1] // 4, H // 4), interpolation=cv2.INTER_NEAREST)
fill = cv2.inpaint(small, sm, 9, cv2.INPAINT_TELEA)                      # big holes: fill at 1/4 size (smooth), then blow back up
fill = cv2.GaussianBlur(cv2.resize(fill, (img.shape[1], H), interpolation=cv2.INTER_CUBIC), (0, 0), 6)
m3 = (cv2.GaussianBlur(mask, (0, 0), 3).astype(np.float32) / 255)[..., None]
out = (img * (1 - m3) + fill * m3).astype(np.uint8)
out = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
# seamless left/right, same 90px cross-fade as the other layers
n = 90; W = out.width; o2 = out.crop((0, 0, W - n, H)).copy()
for i in range(n):
    t = i / (n - 1); o2.paste(Image.blend(out.crop((W - n + i, 0, W - n + i + 1, H)), out.crop((i, 0, i + 1, H)), t), (i, 0))
o2.save(os.path.join(SRC, "graveyard_built", "graveyard_sky.png")); o2.save(os.path.join(ROOT, "art/levels/graveyard_sky.webp"), quality=88, method=6)
print("sky", o2.size, "top colour", o2.getpixel((10, 2)))
