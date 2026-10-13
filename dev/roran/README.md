# Roran 3D (Meshy) - same pipeline as dev/kessa
Rigged model art/originals/roran_rigged.glb (23-bone mixamorig, 31k tris). Ranged hero: throws spears from a distance, no horse, no charge animation (Harley 13 Oct).
- `python3 -B bake_roran.py` -> roran.json; `python3 -B mixamo.py <fbx> "<Name>" inplace` adds a Mixamo anim (TAME/AMP/LEGREST env like dev/kessa); `python3 -B build_page.py` -> roran.html; `node render.js '{"Throw":[t,...]}'` -> frames/.
- Throw: art/originals/mixamo_roran_throw_object.fbx (Mixamo "Throw Object", 4.87 s). 0.5-1.5 s = bending down to pick up (Harley: not needed); aim ~2.0 s, wind-up 2.3-2.4, release ~2.5, follow-through to ~3.0 (spins toward the camera - needs taming).
