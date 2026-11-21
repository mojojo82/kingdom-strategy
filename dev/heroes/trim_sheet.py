#!/usr/bin/env python3
"""v1774 (Harley: big hero sheets get thrown away and re-unpacked by iOS -> freezes).
Trims every frame of a hero sheet to its own tight box and packs the boxes tightly into a new sheet.
The look does not change (same pixels); only the empty space goes. The game reads the boxes from HERO_TRIM.

  python3 dev/heroes/trim_sheet.py IN.webp CW CH OUT.webp OUT.json [MAXW=4096]

OUT.json = { "cols": cells per row in the ORIGINAL sheet, "w", "h", "r": [ per original cell: [x, y, w, h, ox, oy] or 0 ] }
  x, y, w, h = the box in the new sheet; ox, oy = where that box sat inside the original cell.
Each box keeps PAD transparent px around the hero and GAP px between boxes, so smooth scaling never picks up a neighbour.
"""
import sys, json
import numpy as np
from PIL import Image

PAD, GAP, ALPHA_MIN = 2, 2, 1


def main():
    src, cw, ch, out_img, out_json = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
    maxw = int(sys.argv[6]) if len(sys.argv) > 6 else 4096
    im = Image.open(src).convert("RGBA")
    A = np.asarray(im)
    H, W = A.shape[:2]
    cols, rows = W // cw, H // ch
    boxes = []  # (cell, x0, y0, w, h)
    for r in range(rows):
        for c in range(cols):
            cell = A[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw, 3] >= ALPHA_MIN
            if not cell.any():
                continue
            ys, xs = np.where(cell)
            x0, x1 = max(0, xs.min() - PAD), min(cw, xs.max() + 1 + PAD)
            y0, y1 = max(0, ys.min() - PAD), min(ch, ys.max() + 1 + PAD)
            x0, x1, y0, y1 = int(x0), int(x1), int(y0), int(y1)
            boxes.append((r * cols + c, c * cw + x0, r * ch + y0, x1 - x0, y1 - y0, x0, y0))
    # shelf packing, tallest first
    order = sorted(range(len(boxes)), key=lambda i: -boxes[i][4])
    place, x, y, shelf_h, used_w = {}, 0, 0, 0, 0
    for i in order:
        bw, bh = boxes[i][3], boxes[i][4]
        if x + bw > maxw:
            x, y, shelf_h = 0, y + shelf_h + GAP, 0
        place[i] = (x, y)
        x += bw + GAP
        shelf_h = max(shelf_h, bh)
        used_w = max(used_w, x - GAP)
    out_h = y + shelf_h
    out = Image.new("RGBA", (used_w, out_h), (0, 0, 0, 0))
    rects = [0] * (cols * rows)
    for i, (cell, sx, sy, bw, bh, ox, oy) in enumerate(boxes):
        px, py = place[i]
        out.paste(im.crop((sx, sy, sx + bw, sy + bh)), (px, py))
        rects[cell] = [px, py, bw, bh, ox, oy]
    out.save(out_img, quality=95, method=4)
    json.dump({"cols": cols, "w": used_w, "h": out_h, "r": rects}, open(out_json, "w"), separators=(",", ":"))
    print("%s: %dx%d (%.1f MB) -> %dx%d (%.1f MB), %d frames" % (src, W, H, W * H * 4 / 1e6, used_w, out_h, used_w * out_h * 4 / 1e6, len(boxes)))


if __name__ == "__main__":
    main()
