"""Re-embed the Mecha skin layers + layout (from build_mecha_skin.py) into test/index.html. python3 dev/mecha/embed_mecha_skin.py"""
import json, base64, io, re
from PIL import Image
D = "art/originals/ships/mecha/"; L = json.load(open(D + "mecha_layout.json"))
def b64(f): b = io.BytesIO(); Image.open(D + f).save(b, "WEBP", quality=90, method=6); return base64.b64encode(b.getvalue()).decode()
p = "test/index.html"; s = open(p).read()
for var, f in (('mechaCqImg.src = "data:image/webp;base64,', "mecha_back.png"), ('mechaGovImg.src = "data:image/webp;base64,', "mecha_gov.png")):
    s, n = re.subn(re.escape(var) + r'[^"]+', lambda m: var + b64(f), s); assert n == 1, var
ls = ", ".join("%s: [%s, %s]" % (k, v[0], v[1]) for k, v in L["layout"].items())
pl = dict(L["plats"]); pl["amp"] = 0.012
s, n = re.subn(r'cqScale: [\d.]+, govWidth: [\d.]+, (?:govXf: \{[^}]*\}, )?lift: 12, (?:calm: true, )?anim: mechaAnim, (?:plats: Object\.assign\(\{.*?\}, \{ img: mechaPlatImg \}\), )?barsAbove: true, meleeFront: [\d.]+, defLayout: \{[^}]*\}',
               lambda m: 'cqScale: %s, govWidth: %s, govXf: %s, lift: 12, calm: true, anim: mechaAnim, plats: Object.assign(%s, { img: mechaPlatImg }), barsAbove: true, meleeFront: %s, defLayout: { %s }' % (L["cqScale"], L["govWidth"], json.dumps(L["govXf"]).replace('"', ''), json.dumps(pl, separators=(",", ":")), L["meleeFront"], ls), s); assert n == 1, n
s, n = re.subn(r'(mechaPlatImg\.src = "data:image/webp;base64,)[^"]+', lambda m: m.group(1) + b64("mecha_plat.png"), s); assert n == 1
open(p, "w").write(s); print("ok", L["cqScale"], L["meleeFront"])
