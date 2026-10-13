# Roran's game sheet (v1123): rows idle (24 frames, 2 s loop) and attack (the game throw, every 2nd of 51 frames = 26, played at 20 fps).
# Frames: art/originals/sprites_hires/roran/toon (Blender, Gareth-look shader, 263x211 cells, + the 1 px C1 outline). Prints/patches HERO_ANIMS.roran.
import json, base64, io, re
from PIL import Image
H = 'art/originals/sprites_hires/roran/toon/'
BRIGHT = 0.7   # Harley 13 Oct: "30% back" - the sunny face looked odd against the dreary levels (multiplies the colour, not the outline/alpha)
from PIL import ImageEnhance
def dim(im): a = im.split()[3]; o = ImageEnhance.Brightness(im.convert('RGB')).enhance(BRIGHT).convert('RGBA'); o.putalpha(a); return o
idle = [dim(Image.open(H + 'idle_%02d.png' % k).convert('RGBA')) for k in range(24)]
att = [dim(Image.open(H + 'throw_%02d.png' % k).convert('RGBA')) for k in range(0, 51, 2)]
cw, ch = idle[0].size; n = max(len(idle), len(att))
sheet = Image.new('RGBA', (cw * n, ch * 2))
for r, row in enumerate((idle, att)):
    for k, im in enumerate(row): sheet.alpha_composite(im, (k * cw, r * ch))
b = io.BytesIO(); sheet.save(b, 'WEBP', quality=88, method=6)
spear = 'data:image/png;base64,' + base64.b64encode(open('dev/roran/spear.png', 'rb').read()).decode()
src = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
entry = ('  roran: { src: "%s", cw: %d, ch: %d, ax: 122.5, ay: 203, fps: { idle: 12, run: 12, attack: 20 }, rows: { idle: [0, 24], run: [0, 24], attack: [1, %d] }, '
         'once: { attack: true }, sizeMul: 1, dispH: %.2f, model3d: true, hand: [57.5, 106], release: 13.5, spear: "%s" }, // v1123: 3D Roran (dev/roran) - Blender Gareth-look frames, idle made from scratch, Mixamo throw\n') % (src, cw, ch, len(att), ch * 29.99 / 200, spear)
g = open('test/index.html').read()
pat = re.compile(r'  roran: \{ src: "data:image/webp;base64,[A-Za-z0-9+/=]+".*?\n')
if pat.search(g): g = pat.sub(lambda m: entry, g, count=1)
else:
    i = g.index('var HERO_ANIMS = {'); j = g.index('\n  kessa: { src:', i); g = g[:j+1] + entry + g[j+1:]
open('test/index.html', 'w').write(g); print('sheet', sheet.size, 'KB', len(b.getvalue()) // 1024)
