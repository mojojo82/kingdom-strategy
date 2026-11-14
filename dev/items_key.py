# Item icons: key ChatGPT's flat magenta background WITHOUT eating purple parts of the icon.
# Only magenta connected to the cell border is removed (flood fill), edges get a soft alpha + magenta despill.
# Run: python3 dev/items_key.py  (slices art/originals/items/icons_sheet*_gpt.png -> art/originals/items/cut/*.png + art/items/*.webp)
import numpy as np
from PIL import Image
from scipy import ndimage
def key_cell(cell):
    a = np.asarray(cell.convert('RGB')).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2)          # distance to pure magenta
    near = d < 120
    lab, n = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border)) | (d < 42)   # + enclosed pockets of pure magenta (seen through gaps)
    # soft edge: pixels next to the background get alpha by how magenta they are
    ring = ndimage.binary_dilation(bg, iterations=2) & ~bg
    alpha = np.where(bg, 0.0, 1.0)
    soft = np.clip((d - 40) / 140, 0, 1)
    alpha = np.where(ring, np.minimum(alpha, soft), alpha)
    # despill: on edge pixels pull the magenta cast out (green up to min(r,b))
    rgb = a.copy()
    spill = ring | (alpha < 1)
    m = np.minimum(r, b)
    rgb[..., 0] = np.where(spill, np.minimum(r, g + (m - g) * 0.3 + 40), r)
    rgb[..., 2] = np.where(spill, np.minimum(b, g + (m - g) * 0.3 + 40), b)
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')
SHEETS = {  # v2 (Harley 14 Nov): Kingshot-style redraws - thin soft outlines in each object's own colour
 'art/originals/items/ks/ks_sheet1_gpt.png': (3, 2, ['speed_general', 'speed_construction', 'speed_research', 'speed_training', 'speed_healing', 'peace_shield']),
 'art/originals/items/ks/ks_sheet2_gpt.png': (3, 2, ['tp_advanced', 'tp_random', 'tp_alliance', 'tp_beginner', 'march_speed', 'march_recall']),
 'art/originals/items/ks/ks_sheet3_gpt.png': (3, 2, ['stamina', 'chest_hero_select', 'chest_weapon_select', 'chest_card_custom', 'chest_equipment', 'enhance_stone']),
 'art/originals/items/ks/ks_sheet4_gpt.png': (3, 2, ['anti_scout', 'chest_res_custom', 'chest_res_supply', 'res_food', 'res_wood', 'res_stone']),
 'art/originals/items/ks/ks_sheet5_gpt.png': (3, 2, ['res_gold', 'gems', 'valor', 'books', 'energon', 'rp']),
 'art/originals/items/ks/ks_sheet6_gpt.png': (2, 1, ['ticket', 'fragment']),
}
if __name__ == '__main__':
    names = []
    for f, (c, rws, nm) in SHEETS.items():
        im = Image.open(f).convert('RGB'); W, H = im.size; cw, ch = W / c, H / rws
        for i, n in enumerate(nm):
            cell = im.crop((round((i % c) * cw), round((i // c) * ch), round((i % c + 1) * cw), round((i // c + 1) * ch)))
            k = key_cell(cell); bb = k.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox(); k = k.crop(bb)
            s = max(k.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.alpha_composite(k, ((s - k.width) // 2, (s - k.height) // 2))
            sq.save('art/originals/items/ks/cut/%s.png' % n)
            sq.resize((192, 192), Image.LANCZOS).save('art/items/%s.webp' % n, quality=90)
            names.append(n)
    print(len(names), 'icons')
