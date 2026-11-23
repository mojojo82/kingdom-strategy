# Icon prompts (ChatGPT)

Every ChatGPT prompt used for the game's icons, copied word for word from Harley's ChatGPT history (exported 24 Nov 2026), oldest style first. Attachments are listed with their repo path where the file is in the repo.

**Which style to follow (Harley, 24 Nov 2026):** the icons from about a week back (14-17 Nov) are the most accurate reference for the game's icon style. The 14 Nov "Create Speedup Icons" chat set the item-icon look (thick dark outline, glossy cartoon shading, bright saturated colours, chunky shapes; style ref `art/originals/items/style_ref_existing_icons.png`), and later icon chats attach that same file. The same day's "Redraw Item Icons" chat tried a Kingshot-style alternative (thin soft outlines).

How to reuse: new chat, attach the same reference files, paste the prompt and change only the objects. Keep the layout rules: grid, equal cells, flat magenta #FF00FF or green #00FF00 background, no text, no tiles. Then key it (`python3 dev/skins/key_magenta.py`, or `dev/cards/key_frame.py IN OUT green`).


## Item icons - main style (14 Nov)

### Create Speedup Icons (2026-11-14)
ChatGPT: https://chatgpt.com/c/6af7e952-3cc0-83ec-9bcd-1ad5507087a0

**Prompt 1** - attached: `art/originals/items/style_ref_existing_icons.png`
```
The attached strip shows existing item icons from my mobile strategy game. Make NEW item icons in exactly this style: thick dark outline, glossy cartoon shading, bright saturated colours, simple bold shapes that read clearly at 40 px.

Layout: 6 icons in a 3 x 2 grid (3 columns, 2 rows), each centred in its own equal square cell with plenty of empty space around it. Flat solid magenta #FF00FF background everywhere. No text, no letters, no numbers, no frames, tiles or borders behind the icons.

The speedups are one family: the same golden hourglass, each with a different coloured emblem badge in front so they are easy to tell apart.
1. General speedup: golden hourglass with a blue lightning swirl badge.
2. Construction speedup: golden hourglass with an orange hammer badge.
3. Research speedup: golden hourglass with a purple glowing potion flask badge.
4. Troop Training speedup: golden hourglass with a red crossed-swords badge.
5. Healing speedup: golden hourglass with a green heart-with-cross badge.
6. Peace Shield: a big glowing blue-and-gold kite shield with a soft blue magic aura.
```

**Prompt 2**
```
Great. Same style, same rules (3 x 2 grid, equal square cells, flat magenta #FF00FF background, no text or numbers, no frames). Next 6 icons:
1. Advanced Teleport: a glowing purple-and-gold teleport scroll with a swirling portal rune.
2. Random Teleport: a blue teleport scroll with a question-mark swirl, simpler and plainer than the advanced one.
3. Alliance Teleport: a teleport scroll with a small green alliance banner flag on it.
4. Beginner Teleport: a small light-green teleport scroll with a sprout leaf, friendly and simple.
5. March Speed boost: a golden boot with blue wings and speed lines.
6. Recall: a golden war horn (bugle) with a curved return arrow.
```

**Prompt 3**
```
Great. Same style, same rules (3 x 2 grid, equal square cells, flat magenta #FF00FF background, no text or numbers, no frames). Next 6 icons:
1. Stamina: a glowing orange-red energy potion bottle with a lightning bolt on its label.
2. Hero Fragment Selector Chest: an ornate gold-and-purple chest, slightly open, with a golden jigsaw-puzzle-piece emblem on the front and a soft glow.
3. Weapon Fragment Selector Chest: a steel-and-gold chest with a crossed cannon-and-missile emblem on the front.
4. Custom Card Chest: a royal blue-and-gold chest with a fanned set of three playing cards (no symbols on the cards) peeking out.
5. Equipment Chest: a sturdy bronze-and-iron chest with a helmet-and-sword emblem.
6. Enhance Stone: a glowing cyan crystal stone with gold runes, for upgrading gear.
```

**Prompt 4**
```
Great. Same style and rules, but a 3 x 1 row this time (3 equal square cells side by side, flat magenta #FF00FF background, no text or numbers, no frames):
1. Anti-Scout: a dark blue hooded cloak with a closed golden eye emblem, meaning hidden from spies.
2. Custom Resource Chest: a wooden chest with gold trim, open, with a loaf of bread, a log, a stone and a gold coin spilling out together.
3. Resource Supply Chest: a plain wooden supply crate with a question mark on the side and a little bread, wood and stone peeking out.
```


## Item icons - Kingshot-style alternative (14 Nov)

### Redraw Item Icons (2026-11-14)
ChatGPT: https://chatgpt.com/c/6af7eeb9-f134-83ec-9ad3-6159184cb4b4

**Prompt 1** - attached: `art/originals/items/style_ref_kingshot_icons.png`, `art/originals/items/icons_v1_contact.jpg`
```
Image 1 shows item icons from the mobile game Kingshot (ignore the coloured tiles and the numbers - only the item art matters). Image 2 shows my game's current item icons.

I want my icons redrawn in the Kingshot ICON STYLE: soft painted 3D look, gentle shading and highlights, THIN soft outlines in a darker shade of each object's own colour (no thick black outlines), slightly muted pleasant colours, clean readable shapes. Keep each item's design and idea from image 2, only change the style.

Layout: 6 icons in a 3 x 2 grid (3 columns, 2 rows), each centred in its own equal square cell with plenty of empty space around it. Flat solid magenta #FF00FF background everywhere. No text, no letters, no numbers, no tiles or frames behind the icons.

This first sheet (top row of image 2, left to right): 1. General speedup (golden hourglass with a blue lightning badge at its lower LEFT), 2. Construction speedup (same hourglass, orange hammer badge lower left), 3. Research speedup (purple flask badge lower left), 4. Troop Training speedup (red crossed-swords badge lower left), 5. Healing speedup (green heart-cross badge lower left), 6. Peace Shield (blue-and-gold kite shield with a soft blue aura).
```

**Prompt 2**
```
Lovely. Same Kingshot style and same rules (3 x 2 grid, equal square cells, flat magenta #FF00FF background, no text or numbers, no tiles). Next 6, from the middle of image 2: 1. Advanced Teleport (purple-and-gold scroll with a swirling portal), 2. Random Teleport (blue scroll with a question-mark swirl), 3. Alliance Teleport (cream scroll with a green banner showing a handshake), 4. Beginner Teleport (light-green scroll with a sprout), 5. March Speed (golden boot with small white wings), 6. Recall (golden horn with a blue return arrow).
```

**Prompt 3**
```
Great. Same Kingshot style and rules (3 x 2 grid, equal square cells, flat magenta #FF00FF, no text or numbers, no tiles). Next 6: 1. Stamina (round red-orange potion bottle with a cork and a lightning emblem), 2. Hero Fragment Selector Chest (gold-and-purple chest, open and glowing, golden puzzle-piece emblem), 3. Weapon Fragment Selector Chest (steel-and-gold chest with a small cannon and a missile on the front), 4. Custom Card Chest (royal blue-and-gold chest with three blank cards fanned out of it), 5. Equipment Chest (bronze-and-iron chest with a knight helmet and sword), 6. Enhance Stone (glowing cyan crystal stone with gold runes).
```

**Prompt 4**
```
Great. Same Kingshot style and rules (3 x 2 grid, equal square cells, flat magenta #FF00FF, no text or numbers, no tiles). Next 6: 1. Anti-Scout (dark blue hooded cloak with a closed golden eye emblem), 2. Custom Resource Chest (open wooden chest with gold trim and a blue gem, bread, a log, a stone and a gold coin inside), 3. Resource Supply Crate (wooden crate with metal corners and a yellow question mark, bread, logs and stone on top), 4. Food (two golden loaves of bread), 5. Wood (a small stack of three logs), 6. Stone (a pile of grey stones).
```

**Prompt 5**
```
Great. Same Kingshot style and rules (3 x 2 grid, equal square cells, flat magenta #FF00FF, no text or numbers, no tiles). Next 6: 1. Gold (a small stack of gold coins with a crown stamp), 2. Gems (a big faceted blue diamond gem), 3. Valor (a gold medal with a red star centre and a red ribbon), 4. Conquest Books (a red leather skill book with gold corners and a ribbon bookmark), 5. Energon (a glowing blue lightning bolt crystal), 6. Research Points (a round glass potion flask with green liquid and a cork).
```

**Prompt 6**
```
Great. Same Kingshot style and rules, but a 2 x 1 row this time (2 equal square cells side by side, flat magenta #FF00FF, no text or numbers, no tiles): 1. Weapon Draw Ticket (a red ticket with a gold crown and perforated edge), 2. Hero Fragment (a golden jigsaw puzzle piece).
```


## Card socket icons (15 Nov)

### Create Game Icon Set (2026-11-15)
ChatGPT: https://chatgpt.com/c/6afa0aaa-2268-83ec-be99-a8bf041bc400

**Prompt 1** - attached: `art/originals/cards/tcg_concepts/orb_icon_ref.png`
```
The attached crop shows a small glowing crystal-orb emblem from a card in my game (it sits inside a round gold socket). I need a matching ICON SET as game assets, to place inside that socket. Same rendering style as the orb: polished, glowing, gem-like, painted 3D, readable at small size.

Make 6 icons, each ON ITS OWN, evenly spaced in a 3x2 grid, no socket ring, no frame, no text, flat solid GREEN #00FF00 background behind all of them:
1. CASTER - a glowing blue crystal orb (like the attached one)
2. INFANTRY - a sturdy knight's shield
3. RANGED - a drawn bow with an arrow
4. FORTRESS - a fortress / castle tower
5. WEAPON - a heavy cannon
6. ALL HEROES - a crown or laurel wreath
Each icon roughly circular in footprint, centred in its cell, same size as each other, with clear space between them. 1536x1024.
```

### Create Two Icons (2026-11-15)
ChatGPT: https://chatgpt.com/c/6afa109c-5148-83ec-a514-1d73d0d2852a

**Prompt 1** - attached: `art/originals/cards/icons_gpt_v1.png`
```
The attached sheet is the icon set for my game's cards. Make TWO more icons in exactly the same rendering style, size and finish (polished, glowing, gem-like, painted 3D), each on its own, side by side with clear space between them, no ring, no frame, no text, on a flat solid GREEN #00FF00 background:
1. SUMMON - a small round green ooze creature with glowing eyes rising out of a glowing summoning circle
2. BOSS - a fearsome horned monster skull with glowing eyes
Each icon roughly circular in footprint and the same size as the icons in the attached sheet. 1536x1024.
```

**Prompt 2**
```
Redo ONLY the SUMMON icon (the green ooze creature in the glowing circle) exactly as you drew it, alone and centred, on a flat solid MAGENTA #FF00FF background instead of green. 1024x1024.
```


## Menu / UI icons (17 Nov)

### Create Game UI Icons (2026-11-17)
ChatGPT: https://chatgpt.com/c/6afc1b4c-896c-83ec-9c37-dda0599ef6c2

**Prompt 1** - attached: `art/originals/events/featured_hero/icon_fhw.png`, `art/originals/events/featured_hero/tab_icons_v1_gpt.png`
```
Make game UI icons in EXACTLY the art style of the two attached images (the gold winged crest and the 4 event icons): glossy painted mobile-game icons, thick clean dark outlines, bright gold trim, rich blues and reds, soft highlights, chunky readable shapes, slight 3/4 view. Fantasy kingdom with a little tech.

Draw a 2x2 grid of FOUR separate icons, each centred in its quarter with plenty of space around it, on a flat solid magenta #FF00FF background. No text, no letters, no numbers, no frames or button backgrounds, no shadows on the background.

1 (top left) MAIL: a sealed royal envelope with a red wax seal stamped with a crown, gold edges.
2 (top right) DAILY TASKS: a parchment checklist board / clipboard with gold clip and two ticked boxes (must look different from the scroll-and-stopwatch event icon).
3 (bottom left) SEARCH: a gold-rimmed magnifying glass with a blue lens, a small sparkle on the glass.
4 (bottom right) BACKPACK: an adventurer's leather backpack with gold buckles and a rolled blanket on top.

Keep all four the same size and style so they match as a set. 1536x1024.
```

**Prompt 2**
```
Great. Now a second set of FOUR in exactly the same style, size and layout (2x2 grid, flat solid magenta #FF00FF background, no text, no frames):

1 (top left) IDLE REWARDS: an open wooden treasure chest overflowing with gold coins, a small crescent moon and stars floating above it (rewards collected while away).
2 (top right) RECON / INTEL: a brass spyglass telescope crossed over a rolled map with a red target marker.
3 (bottom left) DEALS: a gift bundle - a red gift box with a gold ribbon and a gold price-tag with a small gem on it.
4 (bottom right) SHOP: a royal shop front sign - a hanging gold shield-shaped signboard with a coin pouch and a blue gem on it (different from the market-stall event icon).

Match the first set exactly so all eight look like one set. 1536x1024.
```

**Prompt 3**
```
Perfect. Now a third set in exactly the same style, size and layout (2x2 grid, flat solid magenta #FF00FF background, no text, no frames):

1 (top left) WEAPONS: a sci-fantasy cannon / heavy gun turret barrel in steel and gold with a glowing blue energy core (our game has ship weapons like railguns and missile pods).
2 (top right) CARDS: a fanned hand of three trading cards with gold borders and a glowing gem on the front card.
3 (bottom left) ALLIANCE: a blue and gold heraldic shield with two hands clasped in a handshake on it and a small crown on top, two little flags behind.
4 (bottom right) SHOP (alternative): a small leather coin purse with gold coins and a blue gem spilling out.

Match the first two sets exactly. 1536x1024.
```

### Create game icons (2026-11-17)
ChatGPT: https://chatgpt.com/c/6afc84ec-d0c0-83ec-a988-ab47e3757286

**Prompt 1** - attached: `art/originals/ui/mapicons/refs/white_icons_ref.png`
```
Make game UI icons in EXACTLY the style of the attached image (the Inventory, Mail and Store icons): chunky, simple, flat-shaded mobile-game icons that are mostly WHITE / very light grey with soft grey-blue shading and grey-blue line details, rounded corners, a slight 3D look, clean dark-grey outline, a small coloured accent only where it helps (like the red-and-white striped awning on the store).

Draw THREE separate icons side by side in one row, each centred in its third with lots of space around it, on a flat solid magenta #FF00FF background. ONLY the icon itself - NO blue tile or button behind it, NO text, NO labels, NO notification dots.

1 (left) BACKPACK: a simple white backpack with a front pocket and a buckle strap (our game calls this Backpack).
2 (middle) MAIL: a white envelope with a soft grey V flap line, like the reference.
3 (right) STORE: a small white shop front with a red-and-white striped awning on top and a light blue window, like the reference.

All three the same size and style so they match as a set. 1536x1024.
```

### Create game icons (2026-11-22)
ChatGPT: https://chatgpt.com/c/6b025423-75e0-83ec-ae47-8f7b59a17eb1

**Prompt 1**
```
Make 15 game icons for the fortress weapons in my mobile strategy game (sci-fi fortresses battle each other; the weapons are mounted on the fortress and fire automatically). Style: polished, richly painted mobile-game item icons, chunky readable shapes, glowing energy effects, shiny metal with gold trim, bold colours, slight 3/4 view. Each icon is a clean standalone object/effect with NO background scene, NO tile, NO frame, NO text. Keep every icon compact and roughly square so it reads at small size.
Layout: ONE image, a 5 x 3 grid, lots of even space between icons, flat pure green #00FF00 background everywhere.
Row 1:
1) Missile Barrage - a rack firing two sleek missiles with short fiery trails.
2) Laser Beam - a heavy laser emitter blasting a thick continuous purple beam.
3) Pulse Beam - a smaller cyan emitter firing a short, segmented pulse of energy.
4) Orbit Shield - a fortress shield with three fireballs orbiting around it.
5) Hex Shield - a glowing blue hexagon-grid energy bubble shield.
Row 2:
6) EMP Gun - a dish emitter releasing a blue-white electric shockwave ring with crackling sparks (it stuns the enemy).
7) Railgun - a long, heavy magnetic rail cannon with charged blue electricity between the rails (one huge charged shot).
8) Clone Task - a glowing holographic knight figure stepping out of a projector pad (it summons a clone warrior).
9) Droid Call - a small hovering attack drone with twin guns.
10) Duplicate - two identical small turrets, one solid and one a glowing translucent copy beside it.
Row 3:
11) Deflector Dome - a half-dome energy barrier on a metal base deflecting incoming bullets.
12) IO Repair - small repair drones with green healing light and a wrench, mending metal plating.
13) Salvo Loader - a cannon ammo loader feeding a big glowing super shell into a breech.
14) Status Wave - a golden protective pulse wave spreading out from a small emitter (protects against stuns).
15) Projection Wall - a flat holographic energy wall panel projected from two small pylons.
```


## Gear material (Arcsteel), research, chests (21 Nov)

### Design gear material icons (2026-11-21)
ChatGPT: https://chatgpt.com/c/6b014a22-6b94-83ec-a535-ef713000203f

**Prompt 1** - attached: `art/originals/items/cut/enhance_stone.png`, `art/originals/items/ks/cut/energon.png`, `art/originals/items/ks/cut/valor.png`, `art/originals/items/cut/chest_equipment.png`
```
These 4 images are inventory item icons from my mobile game. Match their art style EXACTLY: glossy cartoon game icon, thick clean shapes, bright saturated colours, soft highlights, warm rim light, dark outline, no text.

Make a NEW item icon in that same style: the upgrade material for the player's GOVERNOR GEAR (helm, armour, gauntlet, ring, amulet - a fantasy world with heavy sci-fi tech). One single material used to level up all gear.

Show 4 different design options in a 2x2 grid, each one centred in its own square cell, on a plain light grey background, no text, no labels:
1. a glowing alloy ingot (metal bar with tech engravings and a faint energy glow)
2. a tech forging plate / armour plate fragment with rivets and a glowing core line
3. a bundle of glowing metal threads/wire spool (like a sci-fi version of silk thread)
4. a faceted energy-infused metal ore chunk
Each icon should read clearly at small size (48 px).
```

**Prompt 2**
```
I pick the TOP LEFT one (the glowing alloy ingot). Redraw ONLY that ingot as a single large icon, exactly the same design, colours, outline and style. Centred, filling about 80% of a square 1024x1024 canvas, with a little even space on every side. Background: flat solid pure green #00FF00, completely uniform, no shadow, no gradient, no glow spilling onto the background, no text.
```

### Create Research Icons (2026-11-21)
ChatGPT: https://chatgpt.com/c/6b017324-bcac-83ec-bc63-46a01b03e0a3

**Prompt 1** - attached: `art/originals/items/cut/enhance_stone.png`, `art/originals/items/ks/cut/energon.png`, `art/originals/items/ks/cut/valor.png`, `art/originals/items/arcsteel.png`
```
These are item icons from my mobile strategy game (fantasy with heavy tech). Match their art style exactly: chunky, bold, polished 3D-painted game icon, clean dark outline, bright saturated colours, soft top-left lighting, simple readable shapes.

Make 6 NEW icons in that exact style for my Research menu, one per research category. Each icon is an object only (no background shape, no frame, no hexagon, no text, no glow behind it):
1. Growth - a young green sprout growing out of a small gear
2. Economy - a small bulging coin sack with gold coins
3. Battle - two crossed swords
4. Fortress I (cannons) - a heavy black cannon ball / bomb with a lit fuse
5. Fortress II (command) - a lightning bolt over a small command banner
6. Fortress III (walls) - a sturdy steel shield with a gold rim

Arrange them in a 3x2 grid (3 across, 2 down), evenly spaced with plenty of room between them, all the same size, centred in their cells. Background: flat solid pure green #00FF00, completely uniform, no shadows on the background. 1536x1024.
```

**Prompt 2**
```
Great style. Now redo ONLY the three fortress icons so each one clearly hints at what that fortress type is about. Same exact style, same size, object only, no background shape, no text.
1. Fortress I - HEAVY CANNON (its focus is cannon damage): a heavy bronze-and-steel fortress cannon barrel firing, with a small muzzle flash and a cannonball, angled to the right.
2. Fortress II - COMMAND (its focus is heroes and faster hero skills): a commander's gold-trimmed helmet with a glowing blue skill gem on the front and a small glowing hourglass beside it.
3. Fortress III - BULWARK (its focus is toughness, more health and less damage taken): a thick stone fortress wall segment with battlements and a big steel tower shield bolted to the front.
Put the 3 icons in one row, evenly spaced with lots of room between them. Background: flat solid pure green #00FF00, completely uniform. 1536x1024.
```

**Prompt 3**
```
The cannon looks too much like another icon in my game, and the helmet looks like my gear icon. Make 4 new options, same exact style and size, object only, no background shape, no text, NO cannons and NO helmets:
1. Fortress I (cannon damage) option A: a neat pyramid stack of three black iron cannonballs with gold bands, the top one wrapped in flames.
2. Fortress I (cannon damage) option B: a single big black cannonball flying to the right with a fiery orange trail and a few sparks.
3. Fortress II (command: heroes and faster hero skills) option A: a golden general's baton with a glowing blue gem at the tip and a small blue lightning spark around it.
4. Fortress II (command) option B: an open glowing blue spell scroll with a small gold hourglass resting on it.
Put all 4 in one row, evenly spaced with lots of room between them. Background: flat solid pure green #00FF00, completely uniform. 1536x1024.
```

**Prompt 4**
```
Perfect. Now the icons for the research items inside the trees. Same exact style and size as the first 6, object only, no background shape, no text. Each must be clearly different from the others at small size.
Make these 9 in a 3x3 grid (left to right, top to bottom), lots of even space between them:
1. Paved Roads (march speed): a short stretch of stone road with a gold speed arrow over it
2. Efficient Builders (build speed): a crossed hammer and wrench
3. Drill Sergeant (training speed): a brass war horn with a red ribbon
4. Camp Expansion (more troops trained at once): a canvas army tent with a small flag
5. Scholarly Pursuit (research output): an open book with a glowing blue rune above it
6. Energon Siphon (energy income): a glowing green energy crystal in a gold holder
7. Field Logistics (longer idle storage time): a gold pocket watch resting on a small wooden crate
8. Logistics (gathering bonus): a wooden supply cart loaded with sacks
9. Irrigation (food production): a golden wheat sheaf with a blue water drop
Background: flat solid pure green #00FF00, completely uniform. 1536x1536.
```

**Prompt 5**
```
Great. Now 9 more, same style and size, object only, 3x3 grid (left to right, top to bottom), lots of even space:
1. Sharper Axes (wood production): a steel axe stuck in a wooden log
2. Deep Shafts (stone production): a pickaxe resting on a grey stone block
3. Prospecting (gold production): a shiny gold nugget in a small miner's pan
4. Grand Storage (protected resources): a sturdy iron-banded treasure vault door with a gold lock
5. Iron Discipline (infantry attack): a round steel infantry shield with a short sword behind it
6. Arcane Focus (caster attack): a glowing purple magic orb on a gold stand
7. Composite Bows (ranged attack): a curved recurve bow with one arrow
8. Elite Vanguard (all troops attack): a gold star medal on a red ribbon
9. Field Hospital (healing speed): a leather medical satchel with a red cross
Background: flat solid pure green #00FF00, completely uniform. 1536x1536.
```

**Prompt 6**
```
Now the FORTRESS I tree (theme: heavy cannon, iron, fire, orange sparks). Same exact style and size, object only, no background shape, no text, each one clearly different at small size, and none of them a cannon or a flying cannonball. Make 10 icons in a 5x2 grid (5 across, 2 down, left to right, top to bottom), lots of even space:
1. a single heavy iron artillery shell standing upright, gold band
2. a coiled belt of brass shells (ammo belt)
3. a steel gun barrel lying sideways with a gold adjustment gear on it
4. an orange fiery blast cloud with flying sparks
5. a thick riveted steel armour plate
6. a short section of dark iron fortress wall with a gold trim
7. a glowing orange fortress reactor core in an iron cage
8. an exploding shell bursting into metal shards
9. a gold sniper crosshair / targeting reticle with a red dot
10. a horned iron skull with glowing red eyes
Background: flat solid pure green #00FF00, completely uniform. 1536x1024.
```

**Prompt 7**
```
Now the FORTRESS II tree (theme: command and heroes - gold, royal blue, glowing blue skill gems). Same exact style and size, object only, no background shape, no text, clearly different from each other, NO helmets and NO batons. 8 icons in a 4x2 grid (left to right, top to bottom), lots of even space:
1. a war drum with two drumsticks
2. a gold hourglass with glowing blue sand
3. a stone signal tower with a glowing blue beacon on top
4. a set of interlocking gold clockwork gears with a blue gem in the middle
5. a royal blue war banner on a gold pole
6. an unrolled battle map with red pins and a gold compass
7. a sword crossed over a gold laurel wreath
8. a sword wreathed in blue flames
Background: flat solid pure green #00FF00, completely uniform. 1536x1024.
```

**Prompt 8**
```
Now the FORTRESS III tree (theme: toughness - grey stone, steel, a little gold). Same exact style and size, object only, no background shape, no text, clearly different from each other, NO round shields. 8 icons in a 4x2 grid (left to right, top to bottom), lots of even space:
1. a stack of big grey stone wall blocks with mortar lines
2. thick stone foundation pillars sunk into the ground
3. a squat granite keep tower with a small gold flag
4. a heart carved out of grey stone with a soft golden glow
5. three layered steel armour plates fanned out
6. an angled steel deflector plate with a bent arrow bouncing off it
7. a heavy iron portcullis gate with gold rivets
8. a glowing translucent golden dome barrier over a small stone base
Background: flat solid pure green #00FF00, completely uniform. 1536x1024.
```

### Create Open Reward Chests (2026-11-21)
ChatGPT: https://chatgpt.com/c/6b021f1f-326c-83ec-9ea7-d906fc8b18e0

**Prompt 1** - attached: chest_1.png (not in the repo), chest_2.png (not in the repo), chest_3.png (not in the repo)
```
These are 3 reward chests from my mobile game (wooden, blue, purple). Make an OPEN version of each chest for the 'already claimed' state. Keep each chest exactly the same design, colours, art style, outline, camera angle and size - only the lid is now opened back and the chest is empty inside (warm soft light inside, no gold or items spilling out, no sparkles). Lay them out in ONE image: top row = the 3 closed chests exactly as given (wooden, blue, purple, left to right), bottom row = the same 3 chests open, directly under their closed version. Lots of space between all chests. Flat pure green background #00FF00 everywhere, no shadows on the background, no text.
```

**Prompt 2**
```
Great. Now make a NEW CLOSED version of the purple chest that matches your open purple chest exactly (same gold frame, same purple panels, same gems, same proportions, same angle and size) - just with the lid closed. No pink glow or aura around it. Only this one chest, centred, flat pure green background #00FF00, no shadow, no text.
```


## Fortress weapon icons (22 Nov)

### Create Weapon Icons (2026-11-22)
ChatGPT: https://chatgpt.com/c/6b0251b7-0f90-83ec-b82f-450f33bf37d4

**Prompt 1** - attached: weapons_now.png (not in the repo)
```
These are 4 weapon icons from my mobile strategy game (Missile Barrage, Laser Beam, Orbit Shield, Hex Shield). They are fortress weapons that fire automatically. Make NEW icons for 6 weapons in this same painted, glowing sci-fi style, as clean standalone objects with NO background scene and NO square tile - each weapon/effect sits on its own so I can put it on a coloured rounded-square tile later. Layout: 3 columns x 2 rows, lots of space between them, flat pure green #00FF00 background everywhere, no text. Top row: 1) Missile Barrage - two sleek missiles with fiery trails going up-right; 2) Laser Beam - a compact purple laser emitter with a short bright beam; 3) Orbit Shield - a metal shield with 3 blue energy orbs circling it. Bottom row: 4) Railgun - a long magnetic rail cannon with blue electric arcs; 5) EMP Gun - a dish emitter releasing a blue-white shockwave ring; 6) Deflector Dome - a glowing hexagon energy dome on a small metal base. Keep effects (trails, beams, rings) compact so each icon stays roughly square and readable at small size.
```

### Create Fortress Weapon Icons (2026-11-22)
ChatGPT: https://chatgpt.com/c/6b025566-0c78-83ec-847e-bddd81f2c4f4

**Prompt 1** - attached: style_ref.png (not in the repo)
```
The attached image shows 4 item icons from my mobile game. Match their ART STYLE exactly: bright, simple and cartoony, smooth glossy surfaces with very little texture, a few bold saturated colours, big chunky rounded shapes, gold trim, a thick dark outline, soft simple shading, readable instantly at tiny size. Use only the style, not those objects.
Make 15 NEW icons in that style for the fortress weapons in my game (the weapons sit on a sci-fi fortress and fire automatically). Each icon is a clean standalone object with NO background, NO tile, NO frame, NO text, roughly square. Keep details few and bold - no fine panel lines, no tiny parts.
Layout: ONE image, a 5 x 3 grid, lots of even space between icons, flat pure green #00FF00 background everywhere.
Row 1: 1) Missile Barrage - a little launcher firing two chunky missiles with short flame puffs. 2) Laser Beam - a chunky emitter blasting a thick purple beam. 3) Pulse Beam - a small cyan emitter firing a short segmented energy pulse. 4) Orbit Shield - a shield with three fireballs circling it. 5) Hex Shield - a blue hexagon-pattern bubble shield.
Row 2: 6) EMP Gun - a dish shooting a blue electric shockwave ring. 7) Railgun - a long twin-rail cannon with blue electricity between the rails. 8) Clone Task - a glowing blue hologram knight standing on a round projector pad. 9) Droid Call - a cute small hovering attack drone with two little guns. 10) Duplicate - a small turret next to its glowing see-through copy.
Row 3: 11) Deflector Dome - a half-dome energy shield on a base, bouncing bullets off. 12) IO Repair - a little repair drone holding a wrench with green healing sparkles. 13) Salvo Loader - a big glowing cannon shell sliding into a cannon breech. 14) Status Wave - golden protective rings pulsing out of a small emitter. 15) Projection Wall - a flat glowing hologram wall between two short posts.
```

**Prompt 2**
```
Perfect. Make 2 more icons in exactly the same style, same outline thickness, same colours and same size as these 15: 1) Flak Burst - a stubby anti-air flak cannon firing three round shells that burst in small orange explosions. 2) Scatter Rounds - a short multi-barrel gun spraying a spread of small bullets. Side by side, lots of space between them, flat pure green #00FF00 background, no text, no tiles.
```


## Gear Reset (22 Nov)

### Create Gear Reset Icons (2026-11-22)
ChatGPT: https://chatgpt.com/c/6b032a6c-e178-83ec-b433-bc6be2894a4b

**Prompt 1** - attached: `art/originals/items/style_ref_existing_icons.png`, `art/originals/items/arcsteel.png`
```
Make a NEW game item icon in exactly the same art style as the attached icons (image 1 = the game's item icon style, image 2 = an item from the same set called Arcsteel, the material used to upgrade Overlord Gear). Style: bold chunky mobile-game icon, thick dark outline, glossy painted shading, bright saturated colours, gold trim, readable at small size. The new item is called "Gear Reset": a consumable that resets one piece of gear back to the start and refunds all the Arcsteel spent on it. Show 4 different concepts in a 2x2 grid, each a single object, centred, plain light grey background, NO text, NO letters, NO numbers. Ideas to explore: a glowing circular-arrow (rewind) emblem/rune token; a small gold-and-steel device or vial with a swirling reverse arrow; a glowing reset crystal/core with a circular arrow inside; a scroll or rune stone with a rewind symbol. Use cyan glow like Arcsteel plus gold, so it feels like part of the same gear family.
```
