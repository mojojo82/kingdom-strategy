# Boss prompts (ChatGPT)

Word for word from Harley's ChatGPT history (exported 24 Nov 2026).

The boss process (see project doc claude/boss-ideas.md):
1. Concept sheet: 2x2 grid of four body plans, pure side view facing LEFT, built from separate rigid parts, plain light grey, no text (see the Bone Reaper / Frost Hammer prompt 1).
2. Harley picks one. Then "redraw ONLY that design ... match the attached image exactly (our game's boss style ...)" with `art/originals/bosses/clockwork_dragon/serpent_style_v1.png` attached as the style reference, flat GREEN #00FF00 background.
3. Layers: "Edit the image you just made: REMOVE <the moving parts> ... keep EVERYTHING ELSE exactly identical ... paint in the parts they were covering". It comes back lined up, so the moving parts are cut straight from the approved picture.


## Rally / world-map boss (Kaiju rhino, 15 Nov)

### Design boss concepts (2026-11-15)
ChatGPT: https://chatgpt.com/c/6af93a72-01e4-83ec-a61d-a3f8a933ead2

**Prompt 1** - attached: `art/originals/skins/mech_test/ref_skin_mecha.png`, `art/originals/skins/mech_test/ref_skin_titan.png`
```
These two images are city skins from the world map of my fantasy strategy mobile game (high isometric 3/4 view about 35 degrees, polished painted 3D look, chunky mechanical detail, light wear). I'm designing a new alliance event like Kingshot's Bear Hunt: a giant boss appears on the world map at the alliance's trap and alliance members rally it together for 30 minutes. Design the BOSS in exactly the same art style, camera angle and level of detail as these images. Show 4 different concepts in a 2x2 grid, each a giant mechanical beast standing on its own round arena/platform base, menacing but readable at small size, clearly separated parts. Ideas: a colossal armoured war-bear mech, a siege-golem gorilla, a mechanical sea-dragon rising from a dock, a horned rhino-tank colossus. Plain light grey background, no text.
```

**Prompt 2**
```
Great. Redraw ONLY the bottom-right concept (the horned rhino-tank colossus on its round arena base) on its own, large, centred, taking about 80% of the image width, same art style and the SAME camera elevation as image 2 (the fountain). Facing towards the lower left like the fountain's front. Flat pure magenta #FF00FF background (no floor shadow, no gradient), no text. Square 1024x1024.
```

**Prompt 3**
```
Edit the last image: REMOVE the rhino completely and keep ONLY the round arena base, exactly the same design, same size, same position in the frame and same camera angle, so it lines up perfectly with the original. Fill in the arena floor where the rhino was standing (continue the stone floor tiles naturally, no shadow of the rhino). Keep the torches, spikes, banners and crests on the base. Flat pure magenta #FF00FF background, no text. Square 1024x1024.
```

**Prompt 4**
```
Now the opposite: take the rhino picture (the one with the rhino on the arena base) and REMOVE the arena base completely, keeping ONLY the rhino - exactly the same design, pose, size, position in the frame and camera angle, so it lines up with the original. Complete its feet and the underside of its body that the base hid. No floor, no shadow, no platform. Flat pure magenta #FF00FF background, no text. Square 1024x1024.
```


## Clockwork Dragon (23 Nov)

### Generate Dragon Concepts (2026-11-23)
ChatGPT: https://chatgpt.com/c/6b03e817-e1f0-83ec-a71b-2edca24aa6ca

**Prompt 1**
```
Concept art for a boss in my mobile strategy game: a "Clockwork Dragon" - a huge mechanical dragon built from brass, copper and dark steel plates, with visible gears, pistons and rivets, glowing furnace eyes and a glowing core in its chest, steam venting from its joints. It breathes a cone of hot steam.

Show 4 DIFFERENT design concepts in a 2x2 grid, each a full-body side view facing LEFT (it will stand on the right side of the screen and attack heroes on the left), plain light grey background, no text. Make the 4 clearly different from each other, for example:
1. a four-legged heavy siege dragon, low and armoured like a tank
2. a lean, upright two-legged wyvern with big gear-driven wings
3. a long serpent-like dragon made of segmented rings, coiled
4. an ornate royal/steampunk dragon with copper filigree and big gear wings

Design note: it will be animated by moving separate parts (head/neck, jaw, wings, legs, tail, chest gears), so keep the head, jaw, neck, wings, legs and tail clearly separated and readable.
```

**Prompt 2** - attached: `art/originals/bosses/clockwork_dragon/concept_serpent.png`, `art/originals/skins/mech_test/ref_skin_titan.png`, `art/originals/heroes/style_refs/ref1_torvald_sera_kessa_fullbody.png`
```
I picked the serpent (image 1). Now redraw THIS serpent clockwork dragon in my game's art style: images 2 and 3 are art from my game - match their rendering exactly: polished, richly painted semi-3D mobile-game look, warm key light from the upper left, deep shadows, crisp highlights, saturated colours, brass/copper/dark steel with real wear, glowing orange furnace light between the rings.

Keep the same design: horned dragon head with glowing eyes and open jaw breathing steam, a long body made of identical thick riveted barrel rings with small gears and glowing gaps between them, spikes along the back, a pointed spiked tail tip.

Pose: side view facing LEFT, the body laid out in a gentle horizontal S-wave (not tightly coiled), head raised at the left, tail at the right, so every ring is visible. Whole dragon in frame, no steam cloud. Flat solid magenta (#FF00FF) background, no text, wide image 1536x1024.
```

**Prompt 3**
```
Great. Now split this exact dragon (same style, colours, lighting and details) into SEPARATE PARTS for animation in code - an exploded parts sheet. Every part complete on its own (draw the hidden parts that would be covered by neighbours), not touching any other part, plenty of space between parts, all at the same scale as the dragon above, flat solid magenta (#FF00FF) background, no text, no labels, no shadows on the background. 1536x1024.

Parts (side view, facing LEFT like before):
1. HEAD without the lower jaw (horns, eyes, upper teeth), with a short neck stub at the back
2. LOWER JAW on its own (lower teeth), closed position, so it can rotate open from its hinge
3. BODY RING, plain: one riveted barrel ring with its back spike, seen from the side, straight (not bent), with a little of the glowing gear-filled core showing at both ends so rings can overlap each other
4. BODY RING with the small gear on its side (same size and shape as part 3)
5. BODY RING with the brass smokestack on top (same size and shape as part 3)
6. three smaller rings for the tail, getting smaller (same design as part 3, each one smaller)
7. TAIL TIP: the spiked blade tip on a short stub
8. a separate loose gear (front view, round) so it can spin
```


## Bone Reaper Mech (23 Nov)

### Boss Concept Art Sheet (2026-11-23)
ChatGPT: https://chatgpt.com/c/6b03f721-1818-83ec-a934-82b329dd5c39

**Prompt 1**
```
Concept art sheet for a video game boss: "Bone Reaper Mech". Make a 2x2 grid with FOUR different design ideas, each clearly separated.

The boss: a dark, skeletal war machine - a mechanical skeleton frame (iron/steel bones, pistons, cables) with two huge SCYTHE ARMS and a SKULL-shaped cockpit/head with a jaw that can open. Grim, undead-meets-machine feel, glowing eye lights (pick a colour per idea: green, red, purple, blue).

Rules for every idea:
- It is a GROUND boss that stands or crouches in one place (no flying). Different body plans per idea, e.g. a hunched two-legged reaper, a four-legged spider-like crawler, a torso on tank treads, a serpentine spine with a skull and scythes.
- Pure SIDE VIEW, facing LEFT, full body visible.
- Built from clearly separate rigid parts (skull, jaw, ribcage/torso, upper arm, forearm, scythe blade, legs) so it can be animated by moving the parts.
- Plain light grey background, no text, no labels.
```

**Prompt 2** - attached: `art/originals/bosses/clockwork_dragon/serpent_style_v1.png`
```
I pick the TOP RIGHT design (the four-legged crawler with the red eyes, exposed ribcage, two scythe arms and the skull head).

Redraw ONLY that design, keeping its design and body plan, but change the ART STYLE to match the attached image exactly (our game's boss style: polished, painterly 3D-ish game art, bold readable shapes, rich lighting and highlights, clean edges, a bit cartoony/fun rather than grim). Keep it a dark iron skeleton machine with bone-white skull and ribs, glowing red eyes and a red glow inside the ribcage - but use the same rendering, saturation and finish as the attached dragon.

- One single creature, large, centred, about 80% of the image width, full body visible with room around it
- Pure side view, facing LEFT, standing in an idle pose
- Flat solid GREEN background (#00FF00), no shadow on the background, no text
```

**Prompt 3**
```
Perfect, this is approved. Now I need it split into layers for animation, so the layers must line up EXACTLY with this image.

Edit the image you just made: REMOVE BOTH SCYTHE ARMS completely (both upper arms, forearms, scythe blades, their joints and their shoulder joints). Keep EVERYTHING ELSE exactly identical: same canvas size, same position, same scale, same pose, same colours and lighting, same legs, skull, ribcage and spikes. Paint in the parts of the body that the arms were covering (the back of the skull, the neck, the shoulder/torso area) so it looks complete. Same flat green background (#00FF00).
```


## Frost Hammer Automaton (23-24 Nov)

### Create Boss Concept Art (2026-11-23)
ChatGPT: https://chatgpt.com/c/6b040c13-111c-83ec-8e84-74bf0d760914

**Prompt 1**
```
Concept art sheet for a video game boss: "Frost Hammer Automaton". Make a 2x2 grid with FOUR different design ideas, each clearly separated.

The boss: a large ice-armoured knight MACHINE (a mechanical automaton, not a person inside armour) carrying a huge PISTON HAMMER - a giant war hammer whose head is driven by a steam/hydraulic piston. Frost theme: frosted steel plates, icicles, ice crystals growing on the armour, a glowing icy-blue core and eye lights, cold vapour venting.

Rules for every idea:
- It is a GROUND boss that stands in one place (no flying). Vary the body plan per idea, e.g. a tall upright knight, a hulking gorilla-like brute leaning on its knuckles, a squat dwarf-like heavy machine, a knight torso on a sled/treads.
- Its big attack is raising the hammer slowly overhead and SLAMMING it down - make the hammer clearly readable.
- Pure SIDE VIEW, facing LEFT, full body visible.
- Built from clearly separate rigid parts (head, torso, upper arm, forearm, hammer, legs) so it can be animated by moving the parts.
- Plain light grey background, no text, no labels.
```

**Prompt 2** - attached: `art/originals/bosses/clockwork_dragon/serpent_style_v1.png`
```
I pick the TOP LEFT design (the tall upright ice knight automaton with the glowing chest core, ice-crested helmet, chimneys on its back and the piston hammer held in both hands).

Redraw ONLY that design, keeping its design, proportions and body plan, but change the ART STYLE to match the attached image exactly (our game's boss style: polished, painterly 3D-ish game art, bold readable shapes, rich lighting and highlights, clean edges, a bit cartoony/fun). Keep its colours: frosted grey steel plates with brass trim, snow and icicles on the armour, pale blue ice crystals, glowing icy-blue core, eyes and hammer piston, white vapour from the chimneys - but use the same rendering, finish and lighting quality as the attached dragon (not its colours).

- One single machine, large, centred, full body visible with room around it (leave space above the head so the hammer could be raised later)
- Pure side view, facing LEFT, standing in an idle pose holding the hammer in both hands, hammer head low in front
- Flat solid GREEN background (#00FF00), no shadow on the background, no text
```

**Prompt 3**
```
Good. Now I need it split into layers for animation, so the layers must line up EXACTLY with this image.

Edit the image you just made: REMOVE BOTH ARMS (upper arms, elbows, forearms, hands) AND THE HAMMER completely, and also remove the smoke puffs. KEEP the two big shoulder pads/pauldrons exactly where they are. Keep EVERYTHING ELSE exactly identical: same canvas size, same position, same scale, same pose, same colours and lighting, same legs, torso, chest core, helmet, chimneys and ice. Paint in the parts of the body that the arms and hammer were covering (the sides of the torso, the hips, the thighs and knees) so the body looks complete. Same flat green background (#00FF00).
```

**Prompt 4** - attached: `art/originals/bosses/frost_hammer/style_v1.png`
```
Here is the approved ice knight again (attached). Redraw THIS image with ONE change to the pose: it now holds the hammer with ONE hand only.

- The NEAR arm (the arm closest to the viewer) holds the END of the hammer's handle in one fist, arm relaxed down at its side.
- The big hammer HEAD rests on the GROUND in front of the knight (to the left), standing upright on its flat face, with the handle angled up from the head to the hand.
- The FAR arm hangs free at its side with a closed fist, nothing in it.
- Keep everything else exactly the same: same machine design, same colours, ice, chimneys, helmet, chest core, same art style, same size and position of the body, same standing legs, pure side view facing LEFT.
- No smoke puffs this time.
- Flat solid GREEN background (#00FF00), no shadow on the background, no text.
```

**Prompt 5**
```
Great. Now I need this split into layers for animation, so it must line up EXACTLY with the image you just made.

Edit the image you just made: REMOVE the arm that holds the hammer (its upper arm, elbow, forearm and fist) AND the whole hammer. KEEP the big shoulder pad above that arm exactly where it is. Keep EVERYTHING ELSE exactly identical: same canvas size, same position, same scale, same pose, same colours and lighting, same legs, torso, chest core, helmet, chimneys, ice and the other (free) arm. Paint in the parts of the body the arm was covering (the side of the torso, hip and thigh) so the body looks complete. Same flat green background (#00FF00).
```

**Prompt 6** - attached: `art/originals/bosses/frost_hammer/style_v2_onehand.png`
```
Redraw the attached ice knight with one change to the hammer: the hammer now stands STRAIGHT UP AND DOWN (vertical). Its big head rests flat on the ground in front of the knight (to the left), and the handle points straight up from the head. The knight's near hand rests on / grips the TOP END of the vertical handle, arm relaxed at its side, like leaning on a cane. The other arm hangs free with a closed fist.

Keep everything else the same: same machine design, colours, ice, chimneys, helmet, chest core, art style, size and position, standing legs, pure side view facing LEFT. No smoke. Flat solid GREEN background (#00FF00), no text.
```

**Prompt 7**
```
Same image, one change: make the hammer's HANDLE much LONGER - the whole hammer (head on the ground + vertical handle) must be TALLER than the knight, with the top of the handle rising clearly above the top of his helmet. The handle stays perfectly vertical and straight up and down. The knight's near hand grips the handle at about shoulder height (not the top end), arm bent comfortably. Keep the hammer head the same size and on the ground in front of him. Keep everything else exactly the same: design, colours, size and position of the knight, art style, pure side view facing LEFT, no smoke, flat solid GREEN background (#00FF00), no text. Leave room above so the handle top is not cut off.
```

**Prompt 8**
```
Same image, one change: rotate the hammer HEAD 90 degrees so it sits the way a real hammer head does - the head is a big drum/block lying on its SIDE across the bottom of the handle, forming a "T" shape with the vertical handle (like the original image where the handle went into the side of the head). So the head's long axis is now horizontal, with one flat striking face pointing left and one pointing right, its side resting on the ground, and the handle going straight up out of the middle of its top. Keep the same head design (snow, icicles, ice crystals, brass bands, blue gems) and size. Keep everything else exactly the same: the tall vertical handle taller than the knight, his grip at shoulder height, design, colours, size and position, art style, pure side view facing LEFT, no smoke, flat solid GREEN background (#00FF00), no text.
```


## Other: Harley's boss character chat (23 Nov)

### Design Boss Character (2026-11-23)
ChatGPT: https://chatgpt.com/c/6b03f287-d408-83ec-a46a-178a1849910f

**Prompt 1** - attached: IMG_5176.jpeg (not in the repo)
```
Use this as inspiration to design a new character that is also a boss sprite
```

**Prompt 2**
```
Change the head design
```

**Prompt 3**
```
Undo that. Keep face visible
```

**Prompt 9 (24 Nov)** - attached: `art/originals/bosses/frost_hammer/style_v5_thead.png` -> `art/originals/bosses/frost_hammer/arm_parts_v1.png` (ChatGPT did not keep the scale; the parts are scaled in code)
```
The attached image is the FINAL approved ice knight. I am animating it in code: his hand will lift the hammer straight up and slam it straight down, so his near arm (the one holding the hammer) must bend at the elbow. In this image his UPPER ARM is hidden behind the big shoulder pad, so I need the arm drawn as separate parts.

Make an exploded PARTS SHEET of ONLY that near arm, in exactly the same design, colours, ice, brass rings, lighting and art style, at EXACTLY the same scale as the attached image (same thickness of the forearm and same size of the fist as in the attached picture):
1. UPPER ARM: the complete upper arm from the round shoulder ball-joint down to the elbow, drawn fully (the part normally hidden under the shoulder pad), pointing straight DOWN, with a round joint cap at the shoulder end and a round elbow joint at the bottom.
2. FOREARM: from the round elbow joint to the wrist cuff, drawn straight and horizontal, with a round elbow cap at the elbow end.
3. FIST: the closed fist gripping nothing (a hole where the handle goes), with its wrist cuff.
Do NOT draw the shoulder pad, the body or the hammer. Parts separated with lots of space between them, not touching. Flat solid GREEN background (#00FF00), no text, no labels, no shadows.
```

**Prompt 10 (24 Nov)** - attached: `art/originals/bosses/frost_hammer/style_v5_thead.png` -> `layer_nopad_gpt_unaligned.png` (NOT lined up - ChatGPT redrew the torso; not used. The shoulder pad was cut from the approved picture instead and the gap under it filled in code)
```
Edit the attached image (the final approved ice knight) for animation layers. It must line up EXACTLY with the attached image.

REMOVE: the near arm that holds the hammer (upper arm, elbow, forearm, fist), the whole hammer, AND the big near SHOULDER PAD (the spiky snowy armour plate on his left-side shoulder, closest to the hammer). Keep EVERYTHING ELSE exactly identical: same canvas size, same position, same scale, same colours and lighting, same helmet, chest core, torso, chimneys, legs, the other shoulder pad and the other arm. Where the removed shoulder pad and arm were, paint the bare mechanical SHOULDER JOINT (a round brass ball-joint socket on the side of the torso) and the side of the torso, so it looks complete. Same flat green background (#00FF00), no text.
```
