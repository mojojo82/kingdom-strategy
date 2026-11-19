"""v1739: older city skins + map decorations redrawn by ChatGPT for the 44-degree map -> TEST.
In: art/originals/remake44/gpt/r44_<key>.png (magenta). Keys: skin_<id> / decor_<group>.
- key magenta (dev/skins/key_magenta.py), trim; ChatGPT lands ~47 deg -> squash height by SQ (0.946 = 0.695/0.735) unless the piece has a measurable
  diamond base (then exact).
- skins: WebP at the old width -> test/assets/city-skins-<id>44-<hash>.webp, CITY_SKINS src swapped, CITY_ART_BAKED re-measured with the game's own
  foundation rule (cityArtGet: widest row in the lower 45 %, plate = width x sin44) - for ALL baked skins (old values used sin35).
- decor: every DECOR_SPRITES entry of that group re-made at its old width, fx/fy/fw/aspect from the widest row + bottom (diamond = width x sin44).
Run: python3 dev/fx/build_remake44.py [keys...]   (default: every r44_*.png found)"""
import base64, glob, hashlib, io, math, os, re, subprocess, sys
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."); K = math.sin(math.radians(44)); SQ = 0.946
GPT = os.path.join(ROOT, "art/originals/remake44/gpt"); OUTD = os.path.join(ROOT, "art/originals/remake44")
DECOR_GROUP = {"obelisk": ["obelisk_base", "obelisk_1x1"], "spire": ["spire_base", "spire_2x2", "spire_1x1"], "forge": ["forge_base"], "shipwreck": ["shipwreck_2x2"]}
def keyed(key):
    src = os.path.join(GPT, "r44_%s.png" % key); out = os.path.join(OUTD, "keyed_%s.png" % key)
    subprocess.run(["python3", os.path.join(ROOT, "dev/skins/key_magenta.py"), src, out], check=True, capture_output=True)
    im = Image.open(out).convert("RGBA"); return im.crop(im.getbbox())
def squash(im):
    return im.resize((im.width, max(1, round(im.height * SQ))), Image.LANCZOS)
def bake(im):   # the game's cityArtGet rule, at 240 px
    w, h = im.size; sc = min(1, 240 / max(w, h)); cw, ch = max(1, round(w * sc)), max(1, round(h * sc))
    a = np.asarray(im.resize((cw, ch), Image.LANCZOS))[..., 3] > 40; rows = np.nonzero(a.any(1))[0]; first, last = rows.min(), rows.max()
    pw = 0; sx = 0; n = 0
    for r in range(int(math.floor(last - (last - first) * 0.45)), last + 1):
        q = np.nonzero(a[r])[0]
        if len(q): pw = max(pw, q.max() - q.min() + 1); sx += (q.min() + q.max()) / 2; n += 1
    return (sx / n + 0.5) / cw, (last + 1 - pw * K / 2) / ch, h / w
def decor_metrics(im):
    a = np.asarray(im)[..., 3] > 60; H, W = a.shape; cols = np.nonzero(a.any(0))[0]; xl, xr = cols.min(), cols.max(); yb = np.nonzero(a.any(1))[0].max()
    return (xl + xr) / 2 / W, (yb - (xr - xl) / 2 * K) / H, (xr - xl) / W, H / W
G = open(os.path.join(ROOT, "test/index.html"), encoding="utf-8").read()
keys = sys.argv[1:] or sorted(os.path.basename(p)[4:-4] for p in glob.glob(os.path.join(GPT, "r44_*.png")))
for key in keys:
    im = squash(keyed(key))
    if key.startswith("skin_"):
        sid = key[5:]; m = re.search(r'(\n  %s: \{ id: "%s",[^\n]*?src: ksA\(")([^"]+)("\))' % (sid, sid), G); assert m, sid
        old = Image.open(os.path.join(ROOT, "test", m.group(2))); w = old.width; im2 = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        buf = io.BytesIO(); im2.save(buf, "WEBP", quality=90, method=6); hh = hashlib.md5(buf.getvalue()).hexdigest()[:8]
        name = "assets/city-skins-%s44-%s.webp" % (sid, hh); open(os.path.join(ROOT, "test", name), "wb").write(buf.getvalue())
        G = G[:m.start()] + m.group(1) + name + m.group(3) + G[m.end():]
        print(key, "->", name, im2.size, len(buf.getvalue()) // 1024, "KB")
    else:
        grp = key[6:]
        for dk in DECOR_GROUP.get(grp, [grp]):
            m = re.search(r'(\n  %s: \{ name: "[^"]+"[^\n]*?)src: "data:image/webp;base64,([^"]+)"' % dk, G); assert m, dk
            old = Image.open(io.BytesIO(base64.b64decode(m.group(2)))); w = old.width; im2 = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            fx, fy, fw, asp = decor_metrics(im2); buf = io.BytesIO(); im2.save(buf, "WEBP", quality=90, method=6)
            head = m.group(1)
            for f, v in (("fx", fx), ("fy", fy), ("fw", fw)): head = re.sub(r'\b%s: [0-9.]+' % f, "%s: %.4f" % (f, v), head)
            head = re.sub(r'aspect: [0-9.]+', "aspect: %.4f" % asp, head) if "aspect:" in head else head.replace("fw: %.4f," % fw, "fw: %.4f, aspect: %.4f," % (fw, asp))
            G = G[:m.start()] + head + 'src: "data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode() + '"' + G[m.end():]
            print(dk, im2.size, "fx %.3f fy %.3f fw %.3f" % (fx, fy, fw), len(buf.getvalue()) // 1024, "KB")
# re-bake every baked city skin with the 44-deg plate
i = G.index("var CITY_ART_BAKED = {"); j = G.index("};", i); blk = G[i:j]
for m in re.finditer(r'\n  ([a-z0-9]+): \{ id: "[^"]+",[^\n]*?src: ksA\("([^"]+)"\)', G[G.index("var CITY_SKINS = {"):]):
    sid, p = m.group(1), m.group(2)
    if not re.search(r'\b%s: \{ fx' % sid, blk): continue
    fx, fy, asp = bake(Image.open(os.path.join(ROOT, "test", p)).convert("RGBA"))
    blk = re.sub(r'\b(%s: \{ )fx: [0-9.]+, fy: [0-9.]+, aspect: [0-9.]+' % sid, r'\g<1>fx: %.4f, fy: %.4f, aspect: %.4f' % (fx, fy, asp), blk)
G = G[:i] + blk + G[j:]
open(os.path.join(ROOT, "test/index.html"), "w", encoding="utf-8").write(G); print("ok")
