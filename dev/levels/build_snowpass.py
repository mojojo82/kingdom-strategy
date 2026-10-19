"""Snow level (chapter 3, frozen mountain pass) - Harley's ChatGPT composite art/originals/backgrounds/snowpass_v1_composite_1536x1024.png.
Layers:  sky  = GPT sky on its own (snowpass_sky_gpt), seamless
         far  = GPT far split (mountains, misty forest, ruined bridge), keyed, cut at the road line, seamless
         near = cut straight out of the composite (dev/levels/build_snowpass_near.py - GPT's near split was too harsh), seamless
         road = GPT road split (snow-covered walking strip, icicles), surface band flattened to the village eye-level, 2x crisp
Writes art/levels/snowpass_{sky,far,near,road}.webp (+ PNGs in art/originals/backgrounds/snowpass_built/). Run after build_snowpass_near.py."""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from build_graveyard import key, seamless          # same strict magenta key + 90px cross-fade (fine for solid layers: sky, road)

def seamless_cut(im, search=260, band=16):
    """For see-through layers (far, near): a 90px cross-fade leaves half-transparent 'ghost' copies of peaks/trees. Instead pick the wrap width
    whose last column best matches column 0 (alpha + colour), drop the rest, and blend only a narrow band where both sides are solid."""
    a = np.asarray(im.convert("RGBA")).astype(np.float32); W = a.shape[1]
    ref = a[:, :band]; best = None
    for w2 in range(W - search, W - band + 1):
        d = np.abs(a[:, w2 - band:w2] - ref); d[..., 3] *= 3
        sc = d.mean()
        if best is None or sc < best[0]: best = (sc, w2)
    w2 = best[1]; out = a[:, :w2].copy()
    for i in range(band):
        t = (i + 0.5) / band; L = a[:, w2 - band + i]; R = a[:, i]
        both = (L[:, 3] > 200) & (R[:, 3] > 200)
        blend = L * (1 - t) + R * t
        pick = np.where((t < 0.5)[None, None] if False else (np.full((len(L), 1), t < 0.5)), L, R)
        out[:, w2 - band + i] = np.where(both[:, None], blend, pick)
    out = out[:, :w2]; out[:, :band] = out[:, :band]
    print("  seam: wrap width", w2, "of", W, "score", round(float(best[0]), 1))
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "snowpass_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 762                                   # composite row where the near layer meets the road
if __name__ == "__main__":
    def save(im, name, q=90):
        im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
    save(seamless(Image.open(os.path.join(SRC, "snowpass_sky_gpt_1536x1024.png")).convert("RGBA")), "snowpass_sky", 88)
    far = key(Image.open(os.path.join(SRC, "snowpass_layer_far_gpt_1536x1024.png")))
    save(seamless_cut(far.crop((0, 180, far.width, ROAD_TOP + 1))), "snowpass_far")
    near = Image.open(os.path.join(FULL, "snowpass_near_cut.png")).convert("RGBA")
    save(seamless_cut(near.crop((0, 140, near.width, ROAD_TOP + 8))), "snowpass_near")
    road = key(Image.open(os.path.join(SRC, "snowpass_layer_road_gpt_1536x1024.png")))
    TOP, CUT, BAND = 712, 776, 43                    # snow surface 722-776 (front edge where the icicles start) -> squashed to ~33 + 10 margin
    band = road.crop((0, TOP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
    face = road.crop((0, CUT, road.width, road.height))
    r2 = Image.new("RGBA", (road.width, BAND + face.height)); r2.paste(band, (0, 0)); r2.paste(face, (0, BAND))
    r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)
    save(r2, "snowpass_road")
    a = r2.getchannel("A"); tops = sorted(next((y for y in range(r2.height) if a.getpixel((x, y)) > 200), 0) for x in range(0, r2.width, 40))
    print("road solid top (median row)", tops[len(tops) // 2])
