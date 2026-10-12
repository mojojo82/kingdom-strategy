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
