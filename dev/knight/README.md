# 3D knight -> Gareth sprite frames

Turns the Meshy chibi knight (art/originals/knight_rigged.glb) plus Mixamo animations into side-view sprite frames
for Gareth, and builds two preview pages. Nothing here is in the game yet (Oct 2026: mockup stage).

**Rebuild everything:** `./run_all.sh` (a couple of minutes). Outputs (git-ignored): `fit.html` (3D preview, "Knight Sword Fitting"),
`frames/`, `knight_sheet.webp` + `knight_sheet.json` (the sprite sheet + cell size / feet anchor / rows / fps), `swap.html` ("Gareth Sprite Swap" mockup).

## Steps (run_all.sh)
1. `bake2.py` -> knight2.json: knight mesh, skin weights, texture; the sword cut from knight_with_sword.glb (its 2nd + 3rd biggest pieces, picked with troot.npy) and placed in the right-hand bone's space.
2. `chop4.py` -> knight3.json: adds "Overhead Chop" (hand-keyed, copies the old 2D Gareth attack; legs solved so feet stay flat) and "Idle (ready)" (stand-in breathing idle).
3. `mixamo.py <fbx> "<Name>" inplace` -> adds a Mixamo animation. The knight already uses Mixamo bone names, so each bone copies Mixamo's
   rotation change from rest; a per-bone fix maps the knight's A-pose onto Mixamo's T-pose first. `inplace` pins him to the spot.
   Mixamo download settings: **FBX ASCII** (text FBX - binary FBX is not read), Without Skin, 30 fps, In Place if offered. Any Mixamo character works.
4. `build_fit.py` -> fit.html. `render.js` renders the frames listed in `jobs.json` (anim name -> times in seconds) from the side, see-through background.
5. `pack.py` -> sprite sheet. Frames are mirrored so he faces right like the old sprite (the sword hand is the far hand, which shows his chest on the swing).
   Size: 3x Gareth's old pixel sheet (old figure ~61 px tall, new ~183 px). Rows: idle, chop, Mixamo slash, Mixamo run, Mixamo hit.
6. `build_swap.py` -> swap.html: current Gareth (pulled from test/index.html) next to the new frames.

**Swap one animation:** put the new FBX in art/originals, change its line in run_all.sh, run it again. Only that row changes.

Helpers: `moments.js '[t,...]' "<Anim>" [angle]` screenshots fit.html at given times (m0.png..), `strip.py N out.png [m]` joins them (m = mirror).
Grip used for the sword: rx 0, ry 90, rz -90, size x2.43 (fit.tpl.html).

Harley's picks so far (12 Oct 2026): attack = Mixamo slash, run = Mixamo run, hit = Mixamo impact. Still to come: proper idle, charge.
The Mixamo slash is 1.5 s; at the game's attack speed (16 frames at 22 fps, ~0.7 s) it is slower than Gareth's 0.5 s swing - trim when it goes in.
