# .glb -> game march model (v1051)
No 3D libraries are needed (pip/npm were unreachable when this was written):
1. `load.py` reads a .glb by hand (positions, normals, UVs, indices, textures).
2. Find separate pieces (connected components after welding) - that is how the 6 rocks round the Haunted Pirate Ship were found (they were separate pieces at ground level) and removed in `decimate.py` (component ids hard-coded there).
3. `python3 decimate.py <cell>` = vertex-clustering decimation; cell 0.055 -> ~4.6k triangles. Texture colours are baked into per-vertex colours.
4. `prev.py` + `prev.js` render previews (WebGL, headless Chromium) at several angles.
5. Encode as { c, h, p (int16 xyz b64), i (uint16 b64), col (uint8 rgb b64) } and add a model in marchGL (`marchGL.models`) + a MARCH_SKINS entry with `model:`.
