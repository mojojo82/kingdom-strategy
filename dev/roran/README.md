# Roran 3D (Meshy) - same pipeline as dev/kessa
Rigged model art/originals/roran_rigged.glb (23-bone mixamorig, 31k tris). Ranged hero: throws spears from a distance, no horse, no charge animation (Harley 13 Oct).
- `python3 -B bake_roran.py` -> roran.json; `python3 -B mixamo.py <fbx> "<Name>" inplace` adds a Mixamo anim (TAME/AMP/LEGREST env like dev/kessa); `python3 -B build_page.py` -> roran.html; `node render.js '{"Throw":[t,...]}'` -> frames/.
- Throw: art/originals/mixamo_roran_throw_object.fbx (Mixamo "Throw Object", 4.87 s). 0.5-1.5 s = bending down to pick up (Harley: not needed); aim ~2.0 s, wind-up 2.3-2.4, release ~2.5, follow-through to ~3.0 (spins toward the camera - needs taming).
- mixamo.py extras: T0/T1 = keep only that source window (s); TAME group `head` (Neck+Head) overrides spin so his eyes stay on the enemy.
- Throw draft (Harley OK'd the 1.8-3.0 window, face may turn a little if the eyes stay on the enemy): `T0=1.8 T1=3.0 REFT=1.8 TAME="spin=0.4,head=0.15,legs=0.4,hips=0.3" python3 -B mixamo.py ../../art/originals/mixamo_roran_throw_object.fbx "ThrowT" inplace`
- Harley prefers the ORIGINAL big motion (grander reads better at sprite size). Candidate: `T0=1.8 T1=3.0 REFT=1.8 TAME="head=0.3"` ("ThrowH": full body swing, only the head held toward the enemy). Preview page: claude.ai artifact "Roran Spear Throw".
- Side view for Roran (faces + throws screen-right like in the game): `ANG=1.3 node render.js ...` (the default -0.6 was Kessa's angle and showed him facing the camera).
- HEAD FIX (Harley: back of the head deformed on the throw): Meshy weighted the big hair partly to the shoulders and neck, so the arm swing dragged it.
  bake_roran.py (HEADFIX=1, default) moves every vert above y=1.00 fully onto the Head bone, blending 0.965-1.00. The Blender render needs the same reweight (do it on import).
- Idle: art/originals/mixamo_roran_great_sword_idle.fbx (Mixamo "Great Sword Idle", 3.67 s), `python3 -B mixamo.py ../../art/originals/mixamo_roran_great_sword_idle.fbx "Idle" inplace`. Preview page renamed "Roran Animations" (Throw / Throw eyes-on-enemy / Idle).
- Great Sword Idle = his hero card loop (Harley). Battle idle candidate: art/originals/mixamo_roran_great_sword_idle_2.fbx ("Idle2", 2 s, very still - likely needs AMP like Kessa).
- Battle idle draft: `AMP=7 REFT=0 python3 -B mixamo.py ../../art/originals/mixamo_roran_great_sword_idle_2.fbx "Idle2A" inplace` (x3 with LEGREST was still frozen - LEGREST drops the hip bob).
- Harley (16:10): turn his body toward the camera (profile makes chibis look thin), head looking right. mixamo.py HEADTURN=deg turns Spine2/Neck/Head (20/30/50%) about the vertical; +55 = eyes right. Camera options shown: ANG 1.3 side, 0.9, 0.6 (3/4), 0.35.
- Harley (16:14): idle from scratch instead - upright, legs a bit apart, body toward us, head 3/4 right. `python3 -B idle_make.py` -> "IdleS" (2 s breath loop; HEAD=25 deg head turn, BREATH=1.5), viewed at ANG=0.6. Harley 16:19: more toward us -> ANG=0.35 with HEAD=40, palms turned in (TW=70). The throw is right-handed (lance goes in his RIGHT hand).
- Fists (Harley 16:23): no finger bones, so bake_roran.py curls the finger verts in the mesh (FIST=-130 deg past the knuckle line KN=0.085). The Blender render needs the same mesh tweak.
- LANCE + GAME THROW (Harley 16:27 "run it"). Full rebuild order:
  `python3 -B bake_roran.py && python3 -B mixamo.py ../../art/originals/mixamo_roran_throw_object.fbx "Throw" inplace && python3 -B idle_make.py && python3 -B compose.py && python3 -B lance.py && python3 -B lanceanim.py && python3 -B build_page.py`
  then `HIDE=RThrow:0.9 ANG=0.35 node render.js '{"RThrow":[...],"IdleS":[...]}'`.
  - compose.py -> "RThrow" (51 frames @30): 6-frame blend idle->throw(1.8 s), throw 1.8-3.0 turned by YAW=-0.95 rad (so it reads side-on, flying right, at the idle's ANG 0.35), 9-frame blend back. Release = frame 27 (0.9 s).
  - lance.py builds the lance (wood, copper collar, steel leaf blade + side prongs) in its own space; lanceanim.py adds it as joint 23 to every anim: follows the right fist, upright in the idle, swings to point at the target (forward + up) during the blend-in; grip slides 0.48 -> 0.78 up the shaft.
  - render.js HIDE=anim:t hides the lance from t on (after the release); build_page.py patches the viewer for that (window.__noProp).
- TODO hero card (Harley 16:37 "don't forget the hi-res version for his hero card"): same as Kessa's card - Blender, Mixamo "Great Sword Idle"
  (art/originals/mixamo_roran_great_sword_idle.fbx, 3.67 s loop), waist-up, transparent, ~1600x1120, ~36-44 frames, soft card lighting; needs the head/hair reweight + fists on the Blender mesh too.
