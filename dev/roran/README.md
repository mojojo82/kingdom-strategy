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
