# Resource node prompts (ChatGPT)

## Wood node v2 - 24 Nov 2026 (Harley's 3D render restyled with the city-skin prompts)
Source: art/originals/nodes/wood_v2/render_harley.png (Harley's render, transparent; attached on white as render_harley_white.png).
Fresh chat. Attach in this order: 1) render_harley_white.png, 2) art/originals/skins/mech_test/ref_skin_mecha.png, 3) art/originals/skins/mech_test/ref_skin_titan.png.
Results: gpt_style1/2/3.png (1254x1254, magenta), keyed with dev/skins/key_magenta.py -> style1/2/3_keyed.png.
Note: GPT turned the soft fading ground of the render into a hard grass diamond.

### Style 1 (sent first)
```
I'm making a resource node (a wood / lumber camp) for my mobile strategy game's world map. Image 1 is my lumber camp on its patch of ground (a 3D render). Images 2 and 3 are two of the existing city skins in the game: the art style it has to match.

Repaint my lumber camp in EXACTLY the art style of images 2 and 3, so it looks like it was made by the same artist for the same game:
- same design, same buildings, same thatched roofs, same log piles, sawhorse, crossed axes, pine trees, fence and the same ground patch as image 1, seen from the same high isometric angle as image 1, the whole thing in frame
- the painterly, highly detailed, semi-realistic mobile-game render look of images 2 and 3: strong warm key light from the upper left, deep cool navy / teal shadows on the right side, bright rim highlights on the edges, dark crevices between parts
- materials like images 2 and 3: real weathered timber with grain, straw thatch with texture, worn iron axe heads - not clean plastic or low-poly
- keep the lumber camp's own colours (golden thatch, brown timber, green pines, dirt and grass ground), richer and warmer; no flat dull colours
- no black outlines
- plain flat solid magenta (#FF00FF) background, nothing else in the picture: no water, no shadow on the ground outside the patch, no text
- square image, 1024x1024
```

### Style 2 (same chat)
```
Good direction. Now make a second version that is CLEANER and more polished, closer to image 2: well-kept timber with only light edge wear (no rot, no dirt streaks), crisp bevelled edges catching the light, glossy highlights on the axe heads, neat golden thatch, the lumber camp's own colours (golden thatch, warm brown timber, green pines), the same deep navy/teal shadows. Same design, buildings, log piles, trees, fence, ground patch and camera angle as before. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.
```

### Style 3 = soft (same chat)
```
Now a third version based on the clean one, with much SOFTER, lower-contrast lighting. Both versions so far look like harsh, strong sunlight hitting the lumber camp. Instead: soft, even, diffuse daylight (like a bright overcast day), a gentle key light from the upper left, shadows that are lighter and softer (soft cool blue-grey, not deep navy or near-black), smaller difference between the lit side and the shadow side, no blown-out bright highlights on the thatch, only subtle rim light, and colours slightly more muted (calm straw-gold thatch, soft warm brown timber, muted pine green, soft earthy ground). Keep the same polish and detail, light edge wear, the same design, buildings, log piles, axes, trees, fence, ground patch and camera angle. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.
```

## Bread mill (food node) - 24 Nov 2026, Codex + Blender (first run of the Codex process, HANDOVER "New map items from scratch")
Codex app on Harley's PC, chat "Model an isometric city base" (GPT-6 Astra, Medium). Inspiration image (Harley's, from another game - inspiration only): art/originals/nodes/breadmill/inspiration_harley.jpg, put on his PC as C:\Users\Harley\Downloads\breadmill_inspiration.jpg.

### Codex prompt 1
```
New item for the game: a FOOD resource node, a bread mill. Inspiration only, don't copy it: C:\Users\Harley\Downloads\breadmill_inspiration.jpg - and don't use any of our existing node art as a reference. Model it in Blender, same pipeline as the timber workshop v2: (1) one compact scene on a roughly square (diamond) footprint: a stone-and-timber windmill with a thatched cap and four sail frames with cloth sails, a small stone bread oven with a chimney, flour sacks and barrels, stacked wheat sheaves, a short wooden fence with a scarecrow, a small hand cart - chunky, clearly separated shapes that still read at phone size; (2) camera: the same isometric camera as before, 44 degree elevation, whole thing in frame with a small margin; (3) ground: a soft, patchy dirt patch that fades through a grassy fringe to transparency (no hard slab or rim), like the workshop v2; (4) real materials/textures on EVERY part (thatch, stone, plaster, timber grain, cloth sails, burlap sacks, straw) - no flat untextured surfaces; (5) lighting: gentle, soft daylight, not harsh - key light from the lower right of the image so shadows fall towards the upper left, soft fill, no blown-out highlights; (6) transparent background. Return the .blend, a transparent PNG (~1600 px) and a preview over grass.
```
Result v1 (codex_v1_44deg.png): good layout + feathered ground, but sails / plaster / oven / sacks / dirt flat, scarecrow simple.

### Codex prompt 2 (texture + lighting pass)
```
Good start - layout and the feathered ground work. Before I accept it, a texture and lighting pass in Blender, please: (1) the sails read as flat white panels - give the cloth a visible canvas weave, slight off-white/cream tint, some wear and a soft sag between the frame bars; (2) the plaster upper of the mill is plain white - add a lime-plaster texture with slight colour variation, small cracks and a little grime near the timber beams; (3) the bread oven is flat grey - give it clay-plaster / stone texture with soot darkening around the mouth and chimney top, and a warm ember glow inside the mouth; (4) the flour sacks look smooth - burlap weave, a few folds and tied tops; (5) the dirt patch is one flat beige - add subtle variation (darker damp patches, small pebbles, a worn path from the cart to the mill door, a little spilled straw); (6) the scarecrow is very simple - straw poking out of the sleeves and hat, patched tunic; (7) lighting: keep it gentle and soft, but make sure the key light really comes from the lower right of the image (lit faces toward the camera-right, soft shade on the upper-left faces) with a soft fill so no side goes dark. Same camera, framing and layout. Re-export the .blend and the transparent 1600 px PNG as v2 (keep v1).
```
Result v2 (codex_v2_44deg.png, codex_v2.blend): accepted for the test run.
