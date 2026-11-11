# City skin prompts (ChatGPT) - skin process test, 11 Nov 2026

Attach in this order: 1) the skin (one picture: a 3D render OR a 2D painting, on a plain background), 2) art/originals/skins/mech_test/ref_skin_mecha.png,
3) art/originals/skins/mech_test/ref_skin_titan.png. Fresh chat. Result comes back on flat magenta; key it (dev/levels/build_graveyard.py `key`) and trim.
Swap the subject words ("mech on its round platform", "weapon, shield") for whatever the skin is.
ALSO swap the colour line: the one below is for the white/red/blue mech. For any other skin, say "keep the <skin>'s own <colours>, richer and warmer, with brass/gold instead of dull bronze; no flat dull colours" (olive mech, 11 Nov), and in the clean prompt replace "slightly brighter warm-white armour" with the skin's own colour.
Harley picks per skin (11 Nov: "case by case... comes down to the skin design"): always show the source as-is AND both restyles on the map, side by side.

## Base prompt 1 (Harley, 11 Nov: "record this as base prompt 1")
Gives a weathered, battle-worn look (worn painted metal, chips, dirt). With one picture it leans quite hard into the wear.

```
I'm making a city skin for my mobile strategy game's world map. Image 1 is my mech on its round platform (a 3D render). Images 2 and 3 are two of the existing city skins in the game: the art style it has to match.

Repaint my mech in EXACTLY the art style of images 2 and 3, so it looks like it was made by the same artist for the same game:
- same design, same pose, same weapon, same shield and same round platform as image 1, seen from the same high isometric angle (about 35 degrees from above), the whole thing in frame
- the painterly, highly detailed, semi-realistic mobile-game render look of images 2 and 3: strong warm key light from the upper left, deep cool navy / teal shadows on the right side, bright rim highlights on the edges, dark crevices between parts
- materials like images 2 and 3: painted metal armour with wear, scratches and chipped edges, gold trim, glowing teal lights - not clean plastic
- colours toned to sit with images 2 and 3: warm off-white armour, deeper red, darker royal blue, gold instead of plain yellow; no pure white, no flat bright primaries
- no black outlines
- plain flat solid magenta (#FF00FF) background, nothing else in the picture: no water, no shadow on the ground outside the platform, no text
- square image, 1024x1024
```
(For a 2D painting, write "(a 2D painting)" instead of "(a 3D render)".)

## Clean prompt (follow-up in the same chat, after base prompt 1)
```
Good direction. Now make a second version that is CLEANER and more heroic, closer to image 2 (the blue and gold mech skin): polished painted armour with only light edge wear (no rust, no dirt streaks), crisp bevelled panel edges catching the light, glossy highlights, a stronger gold trim, slightly brighter warm-white armour (still not pure white), the same deep navy/teal shadows and teal glow. Same design, pose, weapon, shield, platform and camera angle as before. Plain flat solid magenta (#FF00FF) background, square, 1024x1024.
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
- camera: high isometric 3/4 view, about 35 degrees from above, looking at the front corner, the whole thing in frame with a little margin
- soft even studio lighting, no strong cast shadows, no ground, no water, no people
- plain flat white background, nothing else in the picture, no text
- square image, 1024x1024
```
A second design can follow in the same chat ("Great. Now Design 2: ... same camera as Design 1").

## Meshy + render (Harley's steps - to be recorded)
- Meshy settings: ?
- Render: isometric 35 deg, light from one side (the relit render worked much better than even light), PNG. Transparent or non-black background preferred (dark shadow sides merge into black).
