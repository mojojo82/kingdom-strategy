# Roran's thrown spear for the game (2D, same colours as the 3D lance + the C1 outline), pointing right. Out: spear.png (120x24, tip at the right).
from PIL import Image, ImageDraw, ImageFilter
S = 4; W, H = 120, 24; L = 112   # L = shaft butt -> tip in px (lance 1.59 units)
im = Image.new('RGBA', (W*S, H*S)); d = ImageDraw.Draw(im); cy = H*S//2; x0 = 4*S
u = L*S/1.59
shaft_end = x0 + (1.59-0.27)*u
d.rounded_rectangle([x0, cy-1.6*S, shaft_end, cy+1.6*S], radius=1.5*S, fill=(110,70,40,255))          # wood
d.rectangle([x0+(1.59-0.30)*u, cy-2.6*S, x0+(1.59-0.21)*u, cy+2.6*S], fill=(205,125,68,255))           # copper collar
bx = x0+(1.59-0.21)*u; tip = x0+1.59*u
d.polygon([(bx, cy), (bx+0.05*u, cy-5.2*S), (bx+0.12*u, cy-4.4*S), (tip, cy), (bx+0.12*u, cy+4.4*S), (bx+0.05*u, cy+5.2*S)], fill=(214,222,232,255))  # steel leaf
d.line([(bx+0.02*u, cy), (tip-0.02*u, cy)], fill=(160,170,184,255), width=S)                            # blade ridge
for sy in (-1, 1): d.polygon([(bx+0.01*u, cy+sy*2*S), (bx-0.06*u, cy+sy*7*S), (bx+0.03*u, cy+sy*3.5*S)], fill=(200,208,220,255))  # prongs swept back
im = im.resize((W, H), Image.LANCZOS)
a = im.split()[3].point(lambda v: 255 if v > 60 else 0); ring = a.filter(ImageFilter.MaxFilter(3))
o = Image.new('RGBA', im.size, (18,15,20,0)); o.putalpha(ring); o.alpha_composite(im); o.save('spear.png'); print('spear.png', o.size)
