# City skin prompts (ChatGPT) - skin process test, 11 Nov 2026

Attach in this order: 1) the skin (one picture: a 3D render OR a 2D painting, on a plain background), 2) art/originals/skins/mech_test/ref_skin_mecha.png,
3) art/originals/skins/mech_test/ref_skin_titan.png. Fresh chat. Result comes back on flat magenta; key it (dev/levels/build_graveyard.py `key`) and trim.
Swap the subject words ("mech on its round platform", "weapon, shield") for whatever the skin is.
ALSO swap the colour line: the one below is for the white/red/blue mech. For any other skin, say "keep the <skin>'s own <colours>, richer and warmer, with brass/gold instead of dull bronze; no flat dull colours" (olive mech, 11 Nov), and in the clean prompt replace "slightly brighter warm-white armour" with the skin's own colour.
Harley picks per skin (11 Nov: "case by case... comes down to the skin design"): always show the source as-is AND both restyles on the map, side by side.

## Base prompt 1 = "STYLE 1" (Harley, 11 Nov: "record this as base prompt 1"; 15 Nov: he calls it style 1 - the weathered look)
Gives a weathered, battle-worn look (worn painted metal, chips, dirt). With one picture it leans quite hard into the wear.

```
I'm making a city skin for my mobile strategy game's world map. Image 1 is my mech on its round platform (a 3D render). Images 2 and 3 are two of the existing city skins in the game: the art style it has to match.

Repaint my mech in EXACTLY the art style of images 2 and 3, so it looks like it was made by the same artist for the same game:
- same design, same pose, same weapon, same shield and same round platform as image 1, seen from the same high isometric angle (about 44 degrees from above (the map angle since v1737; was 35)), the whole thing in frame
- the painterly, highly detailed, semi-realistic mobile-game render look of images 2 and 3: strong warm key light from the upper left, deep cool navy / teal shadows on the right side, bright rim highlights on the edges, dark crevices between parts
- materials like images 2 and 3: painted metal armour with wear, scratches and chipped edges, gold trim, glowing teal lights - not clean plastic
- colours toned to sit with images 2 and 3: warm off-white armour, deeper red, darker royal blue, gold instead of plain yellow; no pure white, no flat bright primaries
- no black outlines
- plain flat solid magenta (#FF00FF) background, nothing else in the picture: no water, no shadow on the ground outside the platform, no text
- square image, 1024x1024
```
(For a 2D painting, write "(a 2D painting)" instead of "(a 3D render)".)

## Clean prompt = "STYLE 2" (follow-up in the same chat, after base prompt 1; 15 Nov: Harley calls it style 2 - polished, light wear)
```
Good direction. Now make a second version that is CLEANER and more heroic, closer to image 2 (the blue and gold mech skin): polished painted armour with only light edge wear (no rust, no dirt streaks), crisp bevelled panel edges catching the light, glossy highlights, a stronger gold trim, slightly brighter warm-white armour (still not pure white), the same deep navy/teal shadows and teal glow. Same design, pose, weapon, shield, platform and camera angle as before. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.
```


## Soft prompt = "STYLE 3" (follow-up in the same chat, after style 2; Harley 23 Nov 2026: "add the soft one permanently as a 3rd style" - first used on Royal Castle v7)
Styles 1 and 2 are high contrast (strong sunlight). Style 3 = the clean look with soft, low-contrast daylight. Swap the colour words for the skin's own colours.
```
Now a third version based on the clean one, with much SOFTER, lower-contrast lighting. Both versions so far look like harsh, strong sunlight hitting the castle. Instead: soft, even, diffuse daylight (like a bright overcast day), a gentle key light from the upper left, shadows that are lighter and softer (soft cool blue-grey, not deep navy or near-black), smaller difference between the lit side and the shadow side, no blown-out bright highlights on the stone, only subtle rim light, and colours slightly more muted (calm cream stone, softer royal blue roofs, satin gold). Keep the same polish and detail, light edge wear, the same design, towers, roofs, flags, gates, cannons, plinth and camera angle. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.
```

---
# Getting the starting picture (DRAFT - to be filled in when Harley locks this part down)

## Design prompt (ChatGPT, for a new skin that will go to Meshy) - used for the two castles, 11 Nov
Attach existing skins for style (art/originals/skins/mech_test/ref_skin_castle.png, ref_skin_tower2.png, ref_skin_titan.png). Results: art/originals/skins/castle_designs/.
```
I'm designing new city skins (the player's base) for my 4X mobile strategy game's world map. The attached images are existing skins, for the game's art style only - don't copy them. This design will be turned into a 3D model with an image-to-3D tool (Meshy), so it has to be a clean, readable single object.

Design 1: <WHAT IT IS - list the main parts>
- the whole thing stands on a SQUARE plinth / platform: the footprint is a square seen as a diamond (corners pointing front, back, left and right), NOT round
- chunky, slightly stylised proportions like a premium mobile strategy game, every part clearly separated so it models well
- camera: high isometric 3/4 view, about 44 degrees from above (the map angle since v1737; was 35), looking at the front corner, the whole thing in frame with a little margin
- soft even studio lighting, no strong cast shadows, no ground, no water, no people
- plain flat white background, nothing else in the picture, no text
- square image, 1024x1024
```
A second design can follow in the same chat ("Great. Now Design 2: ... same camera as Design 1").

## Meshy + render (Harley's steps - to be recorded)
- Meshy settings: ?
- Render: isometric 44 deg (was 35 before v1737), light from one side (the relit render worked much better than even light), PNG. Transparent or non-black background preferred (dark shadow sides merge into black).

## Sea Furnace relight in Blender - 25 Nov 2026 (Codex chat "Model an isometric city base")
Why: the furnace was modelled by Codex with lighting OFF (three.js city-furnace.html, 19 Nov); all shading came from the ChatGPT style pass, so on the map it looks like it floats. Reference sent: the in-game skin (test/assets/city-skins-seafurnace-495ad41a.webp) as C:\Users\Harley\Downloads\seafurnace_ingame.png.
### Codex prompt 1
```
Next job: the city furnace from earlier in this chat (city-furnace - the last version with the square, equal 4-layer base and no helipad, the hollow chimney, dome and radar dish). It was built with lighting OFF; the lighting in the game came later from a ChatGPT style pass, so it looks like it floats above the grass. For reference, this is how it looks in the game now: C:\Users\Harley\Downloads\seafurnace_ingame.png (keep that design and those colours: red/cream striped chimney, dark steel building, cyan light strips, tan/gold platform). Please rebuild it in Blender (save as city-furnace-blender-v1.blend) and render it lit properly: (1) same 44 degree elevation / 45 degree rotation orthographic camera, whole thing in frame; (2) real materials and textures on every part (painted steel with wear, brushed metal, tan stone/metal deck plates, glass, glowing cyan strips); (3) gentle soft daylight - key light from the lower right of the image, soft fill so no side goes dark, NOT harsh; (4) make it sit on the ground: ambient occlusion so the lowest edge of the base platform is darker where it meets the ground, the bottom row of the plinth in soft shade, and a soft contact shadow on an invisible shadow-catcher ground plane that hugs the base (keep that shadow in the transparent PNG, semi-transparent); (5) transparent background. Export the .blend + transparent 1600 px PNG (city-furnace-blender-v1.png) and a preview over plain olive grass (#8C9B3E).
```
Result v1 (art/originals/skins/seafurnace_relight/codex_v1.png + .blend): grounded, contact shadow up-left; plainer than the in-game skin -> ChatGPT soft style next.
### ChatGPT style on the relit render (chat "Repaint City Skin Art"; attach codex_v1_white.png + the in-game skin + ref_skin_mecha) -> gpt_style1.png / style1_keyed.png / style1_contact.png (+ baked contact shadow)
```
I'm updating a city skin (an industrial sea furnace) for my mobile strategy game's world map. Image 1 is my new 3D render of it with correct lighting. Image 2 is how the skin looks in the game now (the detail level and colours I like). Image 3 is another city skin in the game: the art style.

Repaint image 1 in EXACTLY the art style of images 2 and 3, with the detail and colours of image 2:
- same design and camera as image 1: the red/cream striped hollow chimney with gold rim, the dark steel building with cyan light strips, the geodesic dome, the radar dish, the square stepped tan/gold platform with deck plates, pipes and corner bolts
- KEEP THE LIGHTING OF IMAGE 1, not image 2: soft light from the lower right, the upper-left faces in soft shade, and the lowest edge and bottom row of the base platform clearly darker where it meets the ground, so it looks like it sits firmly on the ground, not floating
- the painterly, highly detailed, semi-realistic mobile-game render look of images 2 and 3, rich materials (painted steel with wear, gold trim, glowing cyan strips, enamel stripes), no black outlines
- plain flat solid magenta (#FF00FF) background with NO shadow on it (I add the ground shadow in the game), nothing else, no text
- square image, 1024x1024
```
Style 2 (same chat):
```
Good direction. Now make a second version that is CLEANER and more polished, closer to image 3: well-kept steel and deck plates with only light edge wear (no rust streaks or dirt), crisp bevelled edges catching the light, the same colours, keeping the image 1 lighting (soft light from the lower right, the base's bottom row in shade so it sits on the ground). Same design, every part and camera angle as before. Plain flat solid magenta (#FF00FF) background with no shadow, square, 1024x1024.
```
Style 3 soft (same chat):
```
Now a third version based on the clean one, with much SOFTER, lower-contrast lighting: soft, even, diffuse daylight (like a bright overcast day), a gentle key light from the lower right, shadows that are lighter and softer (soft cool blue-grey, not deep navy or near-black), smaller difference between the lit side and the shadow side, no blown-out bright highlights, only subtle rim light, and colours slightly more muted (soft red and cream chimney, soft steel greys, soft tan deck, gentle cyan glow). Keep the base's bottom row in soft shade so it still sits on the ground. Keep the same polish and detail, the same design, every part and camera angle. Plain flat solid magenta (#FF00FF) background with no shadow, square, 1024x1024.
```
Harley: no blurry baked contact shadow (dropped).
style3_tuned.png = style 3 soft + contrast x1.12, saturation x1.15, brightness x0.97 (Harley: soft a tad washed out on water, clean too strong).

## Iron Sentinel relight (25 Nov 2026)
Source: Harley's Rhino render with the sun set (Manual, North 90, Azimuth 102.5, Altitude 54): art/originals/skins/ironsent_relight/rhino_render*.png. ChatGPT chat "Repaint Mech City Skin". Attached: 1) rhino_render_white.png, 2) mech_test/ref_skin_mecha.png, 3) mech_test/ref_skin_titan.png. Outputs: gpt_style1-3.png, style*_keyed.png.

### Style 1 (adapted base prompt 1)
I'm making a city skin for my mobile strategy game's world map. Image 1 is my mech on its round platform (a 3D render). Images 2 and 3 are two of the existing city skins in the game: the art style it has to match.

Repaint my mech in EXACTLY the art style of images 2 and 3, so it looks like it was made by the same artist for the same game:
- same design, same pose, same weapon, same shield and same round platform as image 1, seen from the same high isometric angle (about 44 degrees from above), the whole thing in frame
- KEEP THE LIGHT DIRECTION OF IMAGE 1: the key light comes from the lower right (camera side, right), the upper-left faces are in shade and the shadow on the platform falls to the upper left
- the painterly, highly detailed, semi-realistic mobile-game render look of images 2 and 3: strong warm key light, deep cool navy / teal shadows, bright rim highlights on the edges, dark crevices between parts
- materials like images 2 and 3: painted metal armour with wear, scratches and chipped edges, brass trim and rivets, glowing teal lights - not clean plastic
- keep the mech's own colours: olive-green armour, dark gunmetal joints, brass edges and bolts, teal lights; richer and warmer, no flat dull colours
- no black outlines
- plain flat solid magenta (#FF00FF) background, nothing else in the picture: no water, no shadow on the ground outside the platform, no text
- square image, 1024x1024

### Style 2 (clean)
Good direction. Now make a second version that is CLEANER and more heroic, closer to image 2: polished painted olive armour with only light edge wear (no rust, no dirt streaks), crisp bevelled panel edges catching the light, glossy highlights, a stronger brass trim, the same deep navy/teal shadows and teal glow, and the same light direction as image 1 (key light from the lower right, shade on the upper-left faces). Same design, pose, weapon, shield, platform and camera angle as before. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.

### Style 3 (soft)
Now a third version based on the clean one, with much SOFTER, lower-contrast lighting. Both versions so far look like harsh, strong sunlight hitting the mech. Instead: soft, even, diffuse daylight (like a bright overcast day), a gentle key light from the lower right, shadows that are lighter and softer (soft cool blue-grey, not deep navy or near-black), smaller difference between the lit side and the shadow side, no blown-out bright highlights, only subtle rim light, and colours slightly more muted (soft olive armour, soft gunmetal, satin brass, gentle teal glow). Keep the same polish and detail, light edge wear, the same design, pose, weapon, shield, platform and camera angle. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.

### Iron Sentinel relight v2 (25 Nov 2026)
Harley's second Rhino export (rhino_render2*.png). New ChatGPT chat "Repaint Mech City Skin", same three attachments order (rhino_render2_white.png, ref_skin_mecha.png, ref_skin_titan.png) and the SAME three prompts above, word for word (style 1, style 2, style 3). Outputs: v2_gpt_style1-3.png, v2_style*_keyed.png.

### Field Sentinel 2D look on Rhino render v2 (25 Nov 2026)
New ChatGPT chat "Redraw Mech City Skin". Attached: 1) ironsent_relight/rhino_render2_white.png, 2) ironsent_relight/ref_fieldsent_current.png (the current Field Sentinel skin on white). Output: v2_gpt_flat.png, v2_flat_keyed.png.

I'm making a city skin for my mobile strategy game's world map. Image 1 is my mech on its round platform (a 3D render). Image 2 is an existing city skin in the game of the same mech: the art style it has to match.

Redraw image 1 in EXACTLY the art style of image 2, so it looks like it was drawn by the same artist:
- same design, same pose, same weapon, same shield and same round platform as image 1, seen from the same high isometric angle as image 1 (about 44 degrees from above), the whole thing in frame
- the 2D illustrated look of image 2: clean dark outlines around every part, flat cel-shaded colour areas with one or two simple shade tones, crisp hard-edged highlights, very little texture, no photo-realistic rendering
- the colours of image 2: olive-green armour, dark gunmetal joints and platform, tan/brass trim and rivets
- KEEP THE LIGHT DIRECTION OF IMAGE 1: light from the lower right, the upper-left faces in shade
- plain flat solid magenta (#FF00FF) background, nothing else in the picture: no shadow on the ground outside the platform, no text
- square image, 1024x1024

## 6x6 capturable fortress relight (25 Nov 2026)
Codex chat "Model an isometric city base" (Harley sent it). Source: fortress-v4 (art/originals/skins/fortress6_relight/codex_v4.png).

Next job: the 6x6 capturable fortress from earlier in this chat (fortress-v4.blend - the castle with blue roofs, outward-facing single-barrel cannons, steel front gate and the thick riveted steel-plated base). Please open fortress-v4.blend and relight it in Blender WITHOUT changing the model: (1) same 44 degree elevation / 45 degree rotation orthographic camera, the whole fortress in frame with a small margin; (2) make sure every part has a real material/texture (pale stone blocks, blue roof tiles, gold trim, dark riveted steel plates on the base and gate, gunmetal cannons, wooden doors, glass windows) - texture anything that is still flat or untextured; (3) gentle soft daylight - key light from the lower right of the image so lit faces point camera-right and shadows fall towards the upper left, soft fill so no side goes dark, NOT harsh, no blown-out highlights; (4) ambient occlusion so the crevices, battlements and the bottom edge of the steel base read with depth; NO contact shadow, NO shadow-catcher plane, nothing outside the model itself; (5) transparent background. Save as fortress-v5.blend and a transparent 1600 px PNG fortress-v5-44deg.png (keep v4 untouched).

### Fortress soft style (ChatGPT chat "Repaint Fortress Artwork")
Attached: 1) fortress6_relight/codex_v5_white.png, 2) mech_test/ref_skin_mecha.png, 3) mech_test/ref_skin_titan.png. Outputs gpt_style1-3.png.

Style 1:
I'm making a capturable fortress for my mobile strategy game's world map (it covers a 6x6 tile area, four times a normal city). Image 1 is my fortress (a 3D render). Images 2 and 3 are two of the existing city skins in the game: the art style it has to match.

Repaint my fortress in EXACTLY the art style of images 2 and 3, so it looks like it was made by the same artist for the same game:
- same design, same layout, same castle, towers, walls, blue roofs, outward-facing cannons, steel front gate and the thick riveted steel-plated square base as image 1, seen from EXACTLY the same camera angle as image 1 (about 44 degrees from above, looking at the front corner), the whole thing in frame
- KEEP THE LIGHT DIRECTION OF IMAGE 1: the key light comes from the lower right (camera side, right), the upper-left faces are in shade and shadows fall to the upper left
- the painterly, highly detailed, semi-realistic mobile-game render look of images 2 and 3: strong warm key light, deep cool navy / teal shadows, bright rim highlights on the edges, dark crevices between parts
- materials like images 2 and 3: weathered stone blocks, painted metal with wear, scratches and chipped edges, gold trim and rivets - not clean plastic
- keep the fortress's own colours: pale cream stone, blue roof tiles, gold trim, dark steel base and gate, gunmetal cannons; richer and warmer, no flat dull colours
- no black outlines
- plain flat solid magenta (#FF00FF) background, nothing else in the picture: no water, no shadow on the ground outside the base, no text
- square image, 1024x1024

Style 2:
Good direction. Now make a second version that is CLEANER and more heroic, closer to image 2: polished stone and painted metal with only light edge wear (no rust, no dirt streaks), crisp bevelled edges catching the light, glossy highlights on the roof tiles and metal, a stronger gold trim, the same deep navy/teal shadows, and the same light direction as image 1 (key light from the lower right, shade on the upper-left faces). Same design, layout, castle, towers, walls, roofs, cannons, steel gate, steel base and camera angle as before. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.

Style 3:
Now a third version based on the clean one, with much SOFTER, lower-contrast lighting. Both versions so far look like harsh, strong sunlight hitting the fortress. Instead: soft, even, diffuse daylight (like a bright overcast day), a gentle key light from the lower right, shadows that are lighter and softer (soft cool blue-grey, not deep navy or near-black), smaller difference between the lit side and the shadow side, no blown-out bright highlights, only subtle rim light, and colours slightly more muted (soft cream stone, soft blue roofs, satin gold, soft gunmetal steel). Keep the same polish and detail, light edge wear, the same design, layout, cannons, gate, steel base and camera angle. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.

### Fortress 2D style (ChatGPT chat "Redraw Fortress")
Attached: 1) fortress6_relight/codex_v5_white.png, 2) fortress6_relight/ref_fieldsent2d.png (the new Field Sentinel skin). Output gpt_2d.png.

I'm making a capturable fortress for my mobile strategy game's world map (it covers a 6x6 tile area, four times a normal city). Image 1 is my fortress (a 3D render). Image 2 is an existing city skin in the game: the art style it has to match.

Redraw image 1 in EXACTLY the art style of image 2, so it looks like it was drawn by the same artist:
- same design, same layout, same castle, towers, walls, blue roofs, outward-facing cannons, steel front gate and the thick riveted steel-plated square base as image 1, seen from EXACTLY the same camera angle as image 1 (about 44 degrees from above, looking at the front corner), the whole thing in frame
- the 2D illustrated look of image 2: clean dark outlines around every part, flat cel-shaded colour areas with one or two simple shade tones, crisp hard-edged highlights, very little texture, no photo-realistic rendering
- the fortress's own colours: pale cream stone, blue roof tiles, gold/tan trim, dark steel base and gate, gunmetal cannons
- KEEP THE LIGHT DIRECTION OF IMAGE 1: light from the lower right, the upper-left faces in shade
- plain flat solid magenta (#FF00FF) background, nothing else in the picture: no shadow on the ground outside the base, no text
- square image, 1024x1024
