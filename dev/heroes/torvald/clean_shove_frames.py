# v1524: Atlas drew white speed streaks at the shield on each shove impact. Copy large/shove -> large/shove_clean, removing semi-transparent / bright
# neutral-white streak pixels outside the body and dropping small leftover islands. Opaque silver armour stays (it is part of the big body blob).
import glob, numpy as np, os
from PIL import Image
import scipy.ndimage as nd
L = '/home/claude/kingdom-strategy/art/originals/heroes/torvald/large/shove/'
OUT = os.path.join(os.path.dirname(L.rstrip('/')), 'shove_clean') + '/'
os.makedirs(OUT, exist_ok=True)
for i, f in enumerate(sorted(glob.glob(L + '*.webp'))):
    a = np.asarray(Image.open(f).convert('RGBA')).astype(float); al = a[..., 3]; rgb = a[..., :3]
    mx = rgb.max(2); mn = rgb.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    streak = ((al < 245) & (sat < 0.18) & (mx > 150)) | ((sat < 0.10) & (mx > 225))
    body = nd.binary_erosion(al > 200, iterations=3)
    rm = nd.binary_dilation(streak, iterations=1) & ~body
    al2 = al.copy(); al2[rm] = 0
    lab, n = nd.label(al2 > 40)
    if n > 1:
        sz = nd.sum(al2 > 40, lab, range(1, n + 1)); big = int(np.argmax(sz)) + 1
        for k, s_ in enumerate(sz):
            if k + 1 != big and s_ < 1500: al2[lab == k + 1] = 0
    a[..., 3] = al2; Image.fromarray(a.astype(np.uint8)).save(OUT + '%04d.webp' % i, 'WEBP', quality=92)
print('done')
