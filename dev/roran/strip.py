import sys, glob
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
def load(pat):
    return [Image.open(f).convert('RGBA') for f in sorted(glob.glob(pat))]
def strip(rows, labels, out, every=2, H=230):
    allims = [im for r in rows for im in r]; bb = None
    for im in allims:
        b = im.getbbox(); bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    w, h = bb[2] - bb[0], bb[3] - bb[1]; tw = int(w * H / h); n = len(rows[0][::every])
    W = Image.new('RGB', (n * tw + 10, len(rows) * (H + 40)), (30, 34, 48)); d = ImageDraw.Draw(W)
    for r, row in enumerate(rows):
        d.text((8, r * (H + 40) + 6), labels[r], fill=(240, 201, 95), font=F)
        for i, im in enumerate(row[::every]):
            c = im.crop(bb).resize((tw, H)); W.paste(c, (i * tw, r * (H + 40) + 36), c)
    W.save(out)
    return bb
