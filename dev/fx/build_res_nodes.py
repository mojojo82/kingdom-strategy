"""v1738: resource node art for the 44-degree map. Takes art/originals/res_nodes/v44/<type>_keyed.png (ChatGPT redraw, keyed), squashes it vertically
so its ground diamond is exactly sin(44) as tall as wide (ChatGPT lands a little steep, ~47), trims, resizes to the old widths (food/stone/gold 320,
wood 340), WebP q90, measures fx/fy/fw/aspect and writes the RES_NODE_ART entries into test/index.html.
Run: python3 dev/fx/build_res_nodes.py food wood stone gold"""
import base64, io, math, os, re, sys
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."); K = math.sin(math.radians(44)); WIDTH = {"wood": 340}
def diamond(a):
    m = np.asarray(a)[..., 3] > 60; H, W = m.shape; cols = np.nonzero(m.any(0))[0]; xl, xr = cols.min(), cols.max()
    cy = (np.nonzero(m[:, xl])[0].mean() + np.nonzero(m[:, xr])[0].mean()) / 2; yb = np.nonzero(m.any(1))[0].max()
    return xl, xr, cy, yb, 2 * (yb - cy) / (xr - xl)
G = open(os.path.join(ROOT, "test/index.html"), encoding="utf-8").read()
for t in sys.argv[1:]:
    im = Image.open(os.path.join(ROOT, "art/originals/res_nodes/v44/%s_keyed.png" % t)).convert("RGBA"); im = im.crop(im.getbbox())
    k0 = diamond(im)[4]; im = im.resize((im.width, round(im.height * K / k0)), Image.LANCZOS)
    w = WIDTH.get(t, 320); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    xl, xr, cy, yb, k = diamond(im); W, H = im.size
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=90, method=6); im.save(os.path.join(ROOT, "art/originals/res_nodes/v44/%s_game.webp" % t), "WEBP", quality=90, method=6)
    entry = '%s: { src: "data:image/webp;base64,%s", fx: %.4f, fy: %.4f, fw: %.4f, aspect: %.4f, scale: 1 }' % (t, base64.b64encode(buf.getvalue()).decode(), (xl + xr) / 2 / W, cy / H, (xr - xl) / W, H / W)
    i = G.index("var RES_NODE_ART = {"); j = G.index("};", i); blk = G[i:j]
    blk2 = re.sub(r'\n  %s: \{ src: "data:image/webp;base64,[^"]+"[^}]*\}' % t, "\n  " + entry, blk); assert blk2 != blk, t
    G = G[:i] + blk2 + G[j:]; print(t, (W, H), "was diamond %.3f -> %.3f (target %.3f)" % (k0, k, K), len(buf.getvalue()) // 1024, "KB")
open(os.path.join(ROOT, "test/index.html"), "w", encoding="utf-8").write(G)
