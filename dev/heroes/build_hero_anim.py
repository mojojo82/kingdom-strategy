"""Pack a new hero's keyed LARGE frames into one HERO_ANIMS grid sheet (same format as Roran / Kessa: rows idle + attack, fixed cells,
`wrap` columns per band, each logical row = 2 physical rows) and print the HERO_ANIMS entry to paste into test/index.html.
Input: art/originals/heroes/<hero>/large/{idle,attack}/NNNN.webp (made by build_hero_frames.py). Output: art/heroes/<hero>/<hero>_anim_<tag>.webp
Run: python3 dev/heroes/build_hero_anim.py juno"""
import glob, os, sys, json
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
HERO = sys.argv[1]
CFG = {"juno": {"tag": "v1", "stand_src": 580, "feet_y": 681, "stand": 110, "disp_stand": 27,
                # idle: 5 s loop at 8 fps (every 3rd video frame, last dropped so it loops); attack: the whole 5 s shot squeezed into ~1 s
                # (every 5th frame at 24 fps) so it fits the 1 s basic-attack rhythm
                "idle": {"step": 3, "fps": 8}, "attack": {"step": 5, "fps": 24}},
       # v1480 Bram (melee, ground): idle 5 s at 8 fps; run = one clean stride cycle (video frames 24-47, the clip repeats every 24 = 1 s) at
       # every 2nd frame, 12 fps; attack = video frames 10-81 (jab ~21, piston punch ~45, back in stance by ~80; attack v3 - v1 steam hit the edge, v2 zoomed in) at every 3rd frame, 24 fps = 1 s
       "bram": {"tag": "v1", "stand": 110, "disp_stand": 26, "per_clip": True,
                "idle": {"step": 3, "fps": 8}, "run": {"step": 2, "fps": 12, "from": 24, "to": 48}, "attack": {"step": 3, "fps": 24, "from": 10, "to": 82}},
       # v1499 Pip (ranged rider): idle 5 s at 8 fps; attack = raise + aim (video frames 9-41) then lower (64-87), every 3rd frame, 24 fps = ~0.85 s.
       # Frames 42-63 (H3 Max's own muzzle flash + smoke cloud, which runs off the frame edge) are left out; the flare round leaves on the jump (release)
       "pip": {"tag": "v1", "stand": 110, "disp_stand": 27, "per_clip": True,
               "idle": {"step": 3, "fps": 8}, "attack": {"fps": 24, "frames": list(range(9, 42, 3)) + [64, 66, 69, 72, 75, 78, 81, 84, 87]}},
       # v1502 Hanzo (melee): idle 5 s at 8 fps; run = one stride cycle (16 video frames = 0.67 s, frames 20-35) at 24 fps; attack = double slash (video 10-76, every 3rd);
       # attack2 = cross-slash + stab (video 18-90 every 3rd, skipping 53-56 where H3 Max drew a light streak to the frame edge);
       # skill = leap + throw (video 8-46 every 2nd: crouch, jump, wind-up, throw ~44) + landing (58-66), the arc/dust landing frames 48-56 left out
       "hanzo": {"tag": "v1", "stand": 90, "disp_stand": 24, "per_clip": True, "wrap": 14,
                 "idle": {"step": 3, "fps": 8}, "run": {"step": 1, "fps": 24, "from": 20, "to": 36},
                 "attack": {"fps": 24, "frames": list(range(10, 77, 3))},
                 "attack2": {"fps": 24, "frames": [i for i in range(18, 91, 3) if not 52 <= i <= 57]}},
       # the leap is tall, so it gets its own small sheet (one cell size for a jump would make the main sheet huge); idle = 1 frame (scale reference only)
       "hanzo_skill": {"hero": "hanzo", "tag": "v1", "stand": 90, "disp_stand": 24, "per_clip": True, "canvas": 3, "wrap": 13,
                 "idle": {"fps": 8, "frames": [0]}, "skill": {"fps": 24, "frames": list(range(8, 45, 2)) + list(range(58, 67, 2))}},
       # v1506 Aurek (tall melee paladin, ~1.24x Hanzo: disp_stand 30 vs 24): idle 5 s at 8 fps; run = one stride (video 42-68, matches 69 at 0.05) at 24 fps;
       # attack / attack2 = the clip's two slashes (raise 4-20 + follow-through 32-52 / 56-72 + 82-102, every 2nd) - H3 Max's pale slash trail (22-31, 73-81) left out, the cut reads as the fast swing
       "aurek": {"tag": "v1", "stand": 90, "disp_stand": 30, "per_clip": True, "wrap": 14,
                 "idle": {"step": 3, "fps": 8}, "run": {"step": 1, "fps": 24, "from": 42, "to": 69},
                 "attack": {"fps": 24, "frames": list(range(4, 21, 2)) + list(range(32, 53, 2))},
                 "attack2": {"clip": "attack", "fps": 24, "frames": list(range(56, 73, 2)) + list(range(82, 103, 2))}},
       # Sunforge Slam: raise (4-20), the trail + dust frames (22-38) cut, sword planted (40-70 every 3rd), rising back to guard (72-94 every 2nd)
       "aurek_skill": {"hero": "aurek", "tag": "v1", "stand": 90, "disp_stand": 30, "per_clip": True, "wrap": 16,
                 "idle": {"fps": 8, "frames": [0]}, "skill": {"fps": 24, "frames": list(range(4, 21, 2)) + list(range(40, 71, 3)) + list(range(72, 95, 2))}},
       # v1508 Seraphine (fortress rider, green-screen clips): idle 5 s at 8 fps; attack = one cast (video 8-44: staff swings forward, points ~16-28, back), every 2nd = 0.8 s;
       # skill (own sheet) = staff raised high (8-36 every 2nd), held (40-72 every 4th), lowered (76-96 every 2nd); the rain starts with the staff fully raised (frame 12)
       "seraphine": {"tag": "v1", "stand": 110, "disp_stand": 27, "per_clip": True, "wrap": 21,
                 "idle": {"step": 3, "fps": 8}, "attack": {"fps": 24, "frames": list(range(8, 45, 2))}},
       "seraphine_skill": {"hero": "seraphine", "tag": "v1", "stand": 110, "disp_stand": 27, "per_clip": True, "wrap": 18,
                 "idle": {"fps": 8, "frames": [0]}, "skill": {"fps": 24, "frames": list(range(8, 37, 2)) + list(range(40, 73, 4)) + list(range(76, 97, 2))}},
       # v1508 Vesper: attack = first tome-tap + flick (video 8-44, flick ~22); skill = raise (8-28), hold (32-64, thinned), point forward + settle (66-100; the strike is called at 72)
       "vesper": {"tag": "v1", "stand": 110, "disp_stand": 27, "per_clip": True, "wrap": 21,
                 "idle": {"step": 3, "fps": 8}, "attack": {"fps": 24, "frames": list(range(8, 45, 2))}},
       "vesper_skill": {"hero": "vesper", "tag": "v1", "stand": 110, "disp_stand": 27, "per_clip": True, "wrap": 19,
                 "idle": {"fps": 8, "frames": [0]}, "skill": {"fps": 24, "frames": list(range(8, 29, 2)) + list(range(32, 65, 4)) + list(range(66, 101, 2))}},
       # v1509 Halo-7 (hulking melee golem, over 2x Hanzo): walk v2 frames 15-47 (the clean stepping stretch before he turns), punch 1 (video 12-60, fist out ~32)
       # + punch 2 (76-116, fist out ~92); skill = wind-up (12-36), braced chest-forward hold (40-80; the beam fires at 36), relax (82-100)
       "halo7": {"tag": "v1", "stand": 140, "disp_stand": 50, "per_clip": True, "wrap": 14,
                 "idle": {"step": 3, "fps": 8}, "run": {"clip": "walk", "step": 2, "fps": 12, "from": 0, "to": 60},   # v1519: new brisk walk (walk_v4: one 2-step cycle = video 0-59)
                 "attack": {"fps": 24, "frames": list(range(12, 61, 2))}, "attack2": {"clip": "attack", "fps": 24, "frames": list(range(76, 117, 2))}},
       "halo7_skill": {"hero": "halo7", "tag": "v1", "stand": 140, "disp_stand": 50, "per_clip": True, "wrap": 14,
                 "idle": {"fps": 8, "frames": [0]}, "skill": {"fps": 24, "frames": list(range(12, 37, 2)) + list(range(40, 81, 2)) + list(range(82, 101, 2))}},
       # v1512 Kessa redo (design untouched): attack = palm push (video 3-15, palm out at 15 = sheet frame 6 -> KESSA_RELEASE_SEC 6/16 unchanged) + return (18-39);
       # "skill" row = Arc Burst cast for HERO_ANIMS rows.cast: wind-up (15-33, 7 frames), hold (45/51/57 = the seq's 7-9 loop), recovery (84-108) - same 15-frame layout as the old cast row
       "kessa": {"tag": "v2", "stand": 110, "disp_stand": 27, "per_clip": True, "wrap": 15,
                 "idle": {"step": 3, "fps": 8}, "attack": {"fps": 16, "frames": list(range(3, 16, 2)) + list(range(18, 40, 3))},
                 "skill": {"clip": "cast", "fps": 16, "frames": [15, 18, 21, 24, 27, 30, 33, 45, 51, 57, 84, 90, 96, 102, 108]}},
       # v1512 Roran redo: one spear throw (video 10-60, the spear leaves his hand at video frame 38 = sheet frame 14 at 21 fps = 0.667 s, was 13.5/20 = 0.675 s)
       "roran": {"tag": "v2", "stand": 120, "disp_stand": 29, "per_clip": True, "wrap": 14,
                 "idle": {"step": 3, "fps": 8}, "attack": {"fps": 21, "frames": list(range(10, 61, 2))}},
       # v1512 Lyra (first real animation): draw + release (video 6-60, arrow leaves at 38 = sheet frame 16 at 24 fps = 0.667 s)
       "lyra": {"tag": "v1", "stand": 110, "disp_stand": 27, "per_clip": True, "wrap": 15,
                 "idle": {"step": 3, "fps": 8}, "attack": {"fps": 24, "frames": list(range(6, 61, 2))}},
       # v1514 Caelum (winged hammer melee): every clip is already drawn at the same scale / feet point (the approved slam mockup used one anchor), so
       # "same_space" skips the per-clip rescale. run = one stride (18 video frames, 30-47); attack = overhead smash (raise 8-22, H3 Max's trail + dust 23-35 cut,
       # hammer down 36-50; impact = sheet frame 8); attack2 = side sweep (raise 50-62, streak 63-71 cut, follow-through 72-88; impact 7)
       "caelum": {"tag": "v1", "stand": 90, "disp_stand": 30, "per_clip": True, "same_space": True, "wrap": 16,
                 "idle": {"step": 3, "fps": 8}, "run": {"step": 1, "fps": 24, "from": 30, "to": 48},
                 "attack": {"fps": 16, "frames": list(range(8, 23, 2)) + list(range(36, 51, 2))},
                 "attack2": {"clip": "attack", "fps": 16, "frames": list(range(50, 63, 2)) + list(range(72, 89, 2))}},
       # Skybreaker Slam, one row played by phase in the game (all every 2nd video frame = real speed at 12 fps): take-off 0-38 + 63-88 (33 frames; 39-62 repeat
       # the same wing beats), hover 0-13 (7), fall = slam_down 50-57 (8, every frame, picked by fall progress), impact = cleaned slam_down 58-110 (27)
       # v1524 Torvald redo (shield-only knight): run = one 2-stride cycle (video 34-62); attack = forward shove (cleaned copy without Atlas' white streaks,
       # video 6-46, shield out at 18 -> impact 6); attack2 = shield backhand (wind-up 6-36, the sweep 37-41, follow-through 44/48, recovery 70-82; impact 12)
       "torvald": {"tag": "v2", "stand": 100, "disp_stand": 30, "per_clip": True, "same_space": True, "wrap": 14,
                 "idle": {"step": 3, "fps": 8}, "run": {"step": 1, "fps": 24, "from": 34, "to": 63},
                 "attack": {"clip": "shove_clean", "fps": 24, "frames": list(range(6, 47, 2))},
                 "attack2": {"clip": "backhand", "fps": 24, "frames": list(range(6, 37, 3)) + [37, 38, 39, 40, 41, 44, 48] + list(range(70, 83, 3))}},
       # Guard Stance: plants his feet and braces behind the raised shield (the white-gold ward aura is drawn by the game on top)
       "torvald_skill": {"hero": "torvald", "tag": "v1", "stand": 100, "disp_stand": 30, "per_clip": True, "same_space": True, "wrap": 14,
                 "idle": {"fps": 8, "frames": [0]}, "skill": {"clip": "brace", "fps": 24, "frames": list(range(12, 61, 2))}},
       "caelum_skill": {"hero": "caelum", "tag": "v1", "stand": 90, "disp_stand": 30, "per_clip": True, "same_space": True, "canvas": 2, "wrap": 10,
                 "idle": {"fps": 8, "frames": [0]},
                 "skill": {"fps": 12, "parts": [["takeoff", list(range(0, 39, 2)) + list(range(63, 89, 2))], ["hover", list(range(0, 14, 2))],
                                                ["slam_down", list(range(50, 58))], ["slam_clean", list(range(58, 111, 2))]]}}}[HERO]
ROWS = [r for r in ("idle", "run", "attack", "attack2", "skill") if r in CFG]
HD_ = CFG.get("hero", HERO); L = os.path.join(ROOT, "art/originals/heroes", HD_, "large")
rows = {}
META = json.load(open(os.path.join(L, "meta.json"))) if CFG.get("per_clip") else None
for st in ROWS:
    c = CFG[st]
    if "parts" in c:   # v1514: a row stitched from several clips [[clip, frames], ...]
        sel = []; clips_ = []
        for cn, fr_ in c["parts"]:
            ff = sorted(glob.glob(os.path.join(L, cn, "*.webp"))); sel += [ff[i] for i in fr_]
        fs = sel
    else: fs = sorted(glob.glob(os.path.join(L, c.get("clip", st), "*.webp")))   # v1506: a row can take its frames from another clip (Aurek attack2 = 2nd slash of the attack clip)
    if "parts" in c: pass
    elif "frames" in c: sel = [fs[i] for i in c["frames"]]   # v1499: an explicit frame list (skips a stretch of the clip)
    else: fs = fs[c.get("from", 0):c.get("to", len(fs))]; sel = fs[::c["step"]]
    if st == "idle" and len(sel) > 1 and "from" not in c and "frames" not in c: sel = sel[:-1]
    ims = [Image.open(f).convert("RGBA") for f in sel]
    if META:   # every clip onto one doubled canvas at the idle clip's scale and feet point, so one cell / anchor fits all rows
        m0 = META["idle"]; m = m0 if CFG.get("same_space") else META[c.get("clip", st)]; sc = m0["stand"] / m["stand"]; W0, H0 = ims[0].size; out = []
        for im in ims:
            big = im.resize((round(W0 * sc), round(H0 * sc)), Image.LANCZOS) if abs(sc - 1) > 1e-3 else im
            CF = CFG.get("canvas", 2); canv = Image.new("RGBA", (round(W0 * CF), round(H0 * CF)), (0, 0, 0, 0))  # v1502: canvas factor (a high jump scaled up needs more room)
            canv.paste(big, (round(m0["feet_x"] + W0 * (CF - 1) / 2 - m["feet_x"] * sc), round(m0["feet_y"] + H0 * (CF - 1) / 2 - m["feet_y"] * sc))); out.append(canv)
        ims = out
    rows[st] = ims
first = rows["idle"][0]
if META:
    CF = CFG.get("canvas", 2); m0 = META["idle"]; W0, H0 = round(first.size[0] / CF), round(first.size[1] / CF)
    FX, FY = m0["feet_x"] + W0 * (CF - 1) / 2, m0["feet_y"] + H0 * (CF - 1) / 2; CFG["stand_src"] = m0["stand"]
else:
    al = np.asarray(first.getchannel("A"))[CFG["feet_y"] - 40:CFG["feet_y"]] > 128
    xs = np.nonzero(al.any(0))[0]; FX, FY = (xs.min() + xs.max()) / 2.0, CFG["feet_y"]
bb = None
for st in rows:
    for im in rows[st]:
        b = im.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
        if b: bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
k = CFG["stand"] / CFG["stand_src"]
cw, ch = int(np.ceil((bb[2] - bb[0]) * k)) + 2, int(np.ceil((bb[3] - bb[1]) * k)) + 2
W = CFG.get("wrap") or max(1, int(np.ceil(max(len(r) for r in rows.values()) / 2)))
# v1502: each logical row starts at physical row 2*index (the game reads row[0] * 2 + floor(f / W)); a row longer than 2*W frames takes more
# physical rows, so the next row's index skips ahead (the game never reads past a row's own frames)
ridx, pr = {}, 0
for st in ROWS: ridx[st] = (pr + 1) // 2; pr = ridx[st] * 2 + int(np.ceil(len(rows[st]) / W))
assert W * cw <= 4096, "sheet wider than 4096"
assert pr * ch <= 4096, "sheet taller than 4096 (%d)" % (pr * ch)
sheet = Image.new("RGBA", (W * cw, pr * ch), (0, 0, 0, 0))
for st in ROWS:
    for f, im in enumerate(rows[st]):
        c = im.crop(bb).resize((cw - 2, ch - 2), Image.LANCZOS)
        sheet.paste(c, ((f % W) * cw + 1, (ridx[st] * 2 + f // W) * ch + 1))
out = os.path.join(ROOT, "art/heroes", HD_); os.makedirs(out, exist_ok=True)
fn = "%s_anim_%s.webp" % (HERO, CFG["tag"]); sheet.save(os.path.join(out, fn), "WEBP", quality=88, method=6)
ax, ay = round((FX - bb[0]) * k + 1, 2), round((FY - bb[1]) * k + 1, 2)
fps = {st: CFG[st]["fps"] for st in ROWS}; rws = {st: [ridx[st], len(rows[st])] for st in ROWS}
if "run" not in ROWS: fps["run"] = fps["idle"]; rws["run"] = rws["idle"]
entry = {"file": fn, "wrap": W, "cw": cw, "ch": ch, "ax": ax, "ay": ay, "fps": fps, "rows": rws,
         "dispH": round(ch * CFG["disp_stand"] / CFG["stand"], 2)}
print("sheet", sheet.size, os.path.getsize(os.path.join(out, fn)) // 1024, "KB"); print(json.dumps(entry))
