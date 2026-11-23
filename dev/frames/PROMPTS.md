# Avatar frame prompts (ChatGPT)

Word for word from the 22 Nov 2026 "Design Avatar Frames" chat (exported 24 Nov 2026).
- Prompt 1 = the first (simple) set; Harley then asked for richer frames.
- Prompt 2 = the approved set (Coronation, Kaiju Rampage, Arena Champion, Kingdom Festival) - "oh yes these are fantastic".
- Prompt 3 = the next set (Pathfinder, Boss Breaker, Siege Breaker, Hero's Spotlight).

How to reuse: continue in the same chat, or start a new one attaching the approved sheet as the style reference, and use prompt 3 as the template (4 frames per sheet, 2x2 grid, light grey background, opening flat white, no text). Frame 1 of a set can be the easy starter reward. Cut the sheet with `python3 dev/frames/cut_frames.py`. Frame ideas list: project doc claude/avatar-frame-ideas.md.


## Avatar frames (22 Nov)

### Design Avatar Frames (2026-11-22)
ChatGPT: https://chatgpt.com/c/6b03386d-1ea0-83ec-bd30-26a82d48ecc0

**Prompt 1** - attached: `art/originals/items/style_ref_existing_icons.png`, `art/originals/ui/gov_gear/code_mock_v4_contrast.png`
```
Design 4 AVATAR FRAMES for my mobile strategy game, shown in a 2x2 grid on a plain light grey background, NO text.

Art style: match image 1 (the game's item icons) and the gold/orange gear tiles in image 2 - cartoony, fun, chunky shapes, thick dark outline, glossy painted shading, bright saturated colours. Not realistic, not ornate.

Rules for EVERY frame (very important):
- A square frame with softly rounded corners that goes AROUND a square player portrait.
- The border band is THIN: about 8-10% of the frame's width. The centre opening is big and completely empty (fill it with flat white so I can cut it out).
- Decorations are SMALL and sit ON the border: only at the top centre and/or the corners, sticking out just a little. Nothing covers the opening.
- All 4 frames the same size and the same opening size.

The 4 frames:
1. "Overlord Crown" - polished gold border with a small chunky cartoon crown at the top centre holding a glowing cyan gem; tiny gold studs in the corners.
2. "Arcsteel" - steel-grey metal border with glowing cyan energy lines running along it, chunky bolts in the four corners, a small cyan crystal at the top centre (sci-fi tech).
3. "Kaiju Bite" - green scaly monster-hide border, little white cartoon teeth along the top edge and a small claw gripping the bottom-right corner, cute rather than scary.
4. "Iron Fleet" - bronze riveted hull-plate border like a warship, a tiny cute cannon poking out of the top-left corner, a small anchor hanging from the bottom centre.
```

**Prompt 2**
```
Great style. Now a NEW set of 4 avatar frames, same cartoony style and same square opening size, 2x2 grid, light grey background, NO text. This time each frame must be RICHER and tell a little story - these are event / achievement reward frames, so each one is built from several themed elements that wrap around and decorate the border (the border itself can be made of the theme, e.g. a creature's body or ribbons), with elements sticking out more at the corners and top. The centre opening must still stay big, square and completely empty (flat white). Nothing may cover the opening.

1. "Coronation" (royal reward): border made of a royal-purple velvet sash with gold trim twisting around the frame; a jewelled golden sceptre lying diagonally across the top-left corner; a small golden orb with a cyan gem resting on the bottom-right corner; little gold tassels hanging from the sash.
2. "Kaiju Rampage" (world boss event): a chubby cute cartoon kaiju monster whose spiky tail runs along the top edge and wraps down one side; its grinning head with stubby horns peeks round the bottom-left corner; a glowing cyan energy orb in its claw at the bottom-right; a few rubble chunks and city-building blocks around its feet.
3. "Arena Champion" (PvP season reward): two stone-and-steel pillars as the left and right sides, each topped with a burning brazier; a steel shield with two crossed swords at the top centre; a red champion banner hanging across the top between the pillars; a small gold laurel plaque at the bottom centre.
4. "Kingdom Festival" (anniversary celebration): colourful bunting flags strung across the top; fireworks bursting at the top-right corner; a wrapped gift box with a big ribbon bow sitting on the bottom-left corner; party streamers and confetti curling around the sides.
```

**Prompt 3**
```
Perfect, I love the second set. Make the NEXT 4 avatar frames in exactly the same style, size and square opening as the second set (rich, story-telling, cartoony, pieces may overlap the edge of the opening a little), 2x2 grid, light grey background, opening flat white, NO text. Frame 1 is an EASY starter reward so make it a bit simpler than the others; frames 2-4 are harder event rewards and can be as rich as the second set.

1. "Pathfinder" (easy starter reward, for finishing the first chapter): an old parchment-map border with a curled corner; a brass compass at the top centre; a dotted red trail running along the bottom edge ending in a small red X; a little wooden signpost at one corner.
2. "Boss Breaker" (Boss Rush event): a cracked horned boss helmet at the top centre; a big war hammer and an axe crossed behind the top-left corner; a row of small cartoon boss-skull trophies along the bottom edge; chunky iron border with dents.
3. "Siege Breaker" (alliance siege event): a wooden battering ram with an iron ram-head lying along the top edge; a torn alliance banner hanging down the left side; broken castle-gate planks and rubble at the bottom-right corner; a big curved rhino-horn trophy mounted at the bottom-left.
4. "Hero's Spotlight" (featured hero week reward): red theatre curtains drawn back at both top corners with gold tassels; a big gold star medal on a blue ribbon at the top centre; two stage spotlights beaming from the bottom corners; a few sparkles.
```
