# Kessa 3D (Meshy) - preview
Harley's rigged Meshy mage (art/originals/kessa_rigged.glb; concept art/originals/kessa_concept_tpose.png; unrigged textured original kessa_textured_unrigged.glb).
Same 23-bone mixamorig skeleton as Gareth's knight, so dev/knight/mixamo.py-style retargets work. Built-in anims: Running, Walking, Rest pose (T-pose).
- `python3 -B bake_kessa.py` -> kessa.json (mesh, skin, 1024 texture, every GLB animation). Uses dev/boss/boss.tpl.html as the viewer (no sword).
- Page: `python3 -B build_page.py` (boss viewer, gloss cut from 0.35 to 0.06 so skin does not look oily - Harley).
- `ANG=0.6 node render.js '{"Running":[0,0.12]}'` renders frames/ (see-through). In the game Kessa faces right.
Not in the game. Next: Harley's Mixamo cast animation; glue on the gold staff with the green orb; chin/ankle joints can be nudged if needed.
- `python3 -B mixamo.py <fbx> "<Name>" inplace` (dev/kessa copy of dev/knight/mixamo.py: Kessa's GLB, kessa.json; her rig has no HeadTop_End/Toe_End so those keep their rest direction). Mixamo Idle = art/originals/mixamo_kessa_idle.fbx (8.3 s, subtle).
- Taming (Harley: less spin/step for the 1H magic attack): `TAME="spin=0.5,legs=0.35,staff=0.25,hips=0.4" python3 -B mixamo.py <fbx> "<Name>" inplace` keeps only that share of each group's motion (spin = hips/spine/neck/head, legs, staff = left arm, hips = hip travel), blending the rest toward the first frame's stance. Cast hand = right (pushes forward at ~1.1 s), staff hand = left.
- staff.py <anim> <time>: builds her staff in code (gold shaft, claw ring, green orb) and locks it to her LEFT hand, upright at that moment (use a separate grip per anim: tamed cast at 0, idle at 1.0). pack_cmp.py + cmp.tpl.html: side-by-side page (current sprite vs 3D: idle / attack / Arc Burst hold) - work in progress, not yet run.
- AMP=2.6 REFT=5.3 mixamo.py ... "Idle (lively)": exaggerates every bone around the stance at REFT (idle too still at game size - Harley); liveliest 2 s window of the Mixamo idle starts at 4.32 s.
- LEGREST=1 (Harley: idle legs looked awkward - bent front knee bulged the robe, mid-step feet): legs held in the rest stance, out of AMP, no hip travel. Current idle: LEGREST=1 AMP=2.6 REFT=5.3.
- Idle stance (Harley: too stiff, feet looked flat side-on next to the cast): LEGREST=1 LEGMIX=0.45 LEGTURN="30,-10" AMP=2.6 REFT=5.3 - legs 45% back toward the idle stance, right leg turned out 30 deg, left in 10 deg.
- pack_game.py <frames dir> <out.json>: TEST-mockup sheet (idle ping-pong 22 + attack 12) sized so her body matches the old sprite (dispH); game_shot.js (run from the scratch folder holding kessa_game.json) swaps it into HERO_ANIMS.kessa in the real TEST game and grabs old/new frames.

## LOCKED (Harley, 13 Oct 2026): sprite lighting = Blender "softer"
All of Kessa's sprite frames render in Harley's Blender (needs him on the desktop app, Blender MCP add-on running) with the dev/kessa/blender_portrait.py soft lights
(Key 120 W size 3.5 warm, Fill 50 W size 4 cool, Rim 110 W size 2, world (0.7,0.72,0.78) x0.55, Standard view transform, skin subsurface 0.08, matte), lights mirrored to her front (+Y),
EXPOSURE -0.85. Camera: ortho 2.6 at azimuth -0.75 from her front, height 1.0 looking at (0,-0.45,0.88). Frames cropped x 150-630 of 900x600, packed with pack_game.py (body = old sprite height).
Head rule: looks right / slight 3/4 right, never at the camera. Approved frames: art/originals/sprites_hires/kessa/softer (idle 12 + attack 12). Still to render: Arc Burst wind-up/hold/recovery, run, (hit).
Arc Burst (rendered 13 Oct, softer light): 15 frames in art/originals/sprites_hires/kessa/arcburst (160x200 cells, same crop as idle/attack) - 0-6 wind-up = attack frames 0-6 with the palm energy growing (g=(k/6)^2),
7-9 hold = attack frame 6 with the full energy ball (scale 0.92/1.08/1.0, loop these while the burst lasts), 10-14 recovery = attack frames 7-11 fading. Bolts NOT baked in (game draws them).
palms.json = palm point per frame in cell pixels (bolt start). Saved scene on Harley's PC: KingdomArt\kessa_sprites.blend.
Bolt textures: art/originals/sprites_hires/kessa/arcburst/bolts.png = 4 strips (500x100 each, stacked), rendered in Blender (core + 2 halos, BoltMat/BoltHalo/BoltHalo2), brightened x1.9 after (the -0.85 sprite exposure dulled them). Game stretches a strip palm->target, height ~60% of its length scale, swapping strips every ~70 ms.
