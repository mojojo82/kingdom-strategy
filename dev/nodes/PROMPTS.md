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
