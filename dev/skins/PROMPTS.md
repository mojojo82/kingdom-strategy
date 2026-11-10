# City skin prompts (ChatGPT) - skin process test, 11 Nov 2026

Attach in this order: 1) the skin (one picture: a 3D render OR a 2D painting, on a plain background), 2) art/originals/skins/mech_test/ref_skin_mecha.png,
3) art/originals/skins/mech_test/ref_skin_titan.png. Fresh chat. Result comes back on flat magenta; key it (dev/levels/build_graveyard.py `key`) and trim.
Swap the subject words ("mech on its round platform", "weapon, shield") for whatever the skin is.

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
