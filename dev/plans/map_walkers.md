# Mini troops walking on the world map (mockup, 29 Nov 2026)

Harley's idea: small people occasionally walking near cities. Mockup only - nothing is in the game yet.
Mockup scripts (session scratchpad, not in the repo): walk.js (headless capture), walkers_overlay.js (the troops), prep_land.js (grass + Iron Sentinel skin).

## Decided (Harley)
- Real 3D models like the march ships, not flat sprites ("We already have 3d march ships").
- Detailed, not blocks: skeleton (hips, knees, ankles, shoulders, elbows, head), rounded parts, face.
- Medieval troops in the kingdom's navy + gold: knight (great helm, sword, shield), footmen (kettle / nasal helm, spear, shield), archers (hood, bow, quiver), spearman (gambeson), banner bearer (navy flag with gold cross), sergeant.
- Mainly on land. Walk near cities ("the sentinels") but never on them or on nodes.
- NO live lighting: shading baked into the vertex colours once. Keep them as light as possible.
- Each one has a trip: comes out of a city / node (grows in at its front) or in from the screen edge; walks road-like legs along the tile axes; goes into a city / node (shrinks away, deleted) or off screen (deleted). Max ~9, one every 1-2 s.
- Not shown at all when zoomed out further than map zoom 1.2.
- If two cities are close together, troops may walk through the gap between them (Harley, 29 Nov). So the "keep off" area is each base's real ground footprint (its platform / foundation, measured per skin) with a small margin - not the whole picture - and the route finder must be able to use narrow gaps (not just the two L-shaped routes the mockup tries).

## Measured (headless, mockup build) - too expensive as built
- Zoom 2: 60 -> 13 fps with ~8 soldiers; posing on the CPU 8.2 ms/frame, drawing 1.3 ms; ~12k triangles (~1,500 per soldier).
- Zoom 1.2: 13 -> 7.6 fps.
- Causes: CPU posing of every vertex; two extra full-screen canvases at full phone sharpness; no cheap distant version.

## How the real build should work
- Draw inside the march ships' 3D layer (marchGLDraw: canvas only around what's drawn, MARCH_GL_PX budget); shadows in the same pass.
- Pose on the GPU: mesh uploaded once per outfit, ~20 joint matrices per soldier per frame as uniforms.
- Cheap version (~200 triangles) for small sizes; none past zoom 1.2; nothing posed or drawn off screen; hard cap on count.
- Buildings in front must hide them via the map's draw order (the mockup just hid them).
- Avoid monsters (npc) too; check terrain so routes stay on land.
- Measure before / after (ms per frame, fps with / without) before showing Harley. Phone check is Harley's.
