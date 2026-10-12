# Art originals

Full-size art exactly as Harley made it. **Never shrink these.** The game uses smaller phone-size copies made from them
(kept small so the single game file stays light and Conquest stays fast). A future PC / HD version would use these originals.

Rule (Harley, 8 Oct 2026): every new art asset is kept twice - the original here, and a phone-size copy in the game.

| File | What it is | Size | In-game copy |
|---|---|---|---|
| gareth_run_4x4.png | Gareth run cycle, 16 frames (4x4 grid, ~317x310 per frame) | 1269x1240 | HERO_ANIMS.gareth run row (111x66 frames). Note: arms barely move - Harley may redraw |
| gareth_charge.png | Gareth charge / skill lunge | 1536x1024 | HERO_CHARGE.gareth (303x145) |
| fortress_default.png | Default fortress ship, cropped, sparrow removed | 1034x409 | fortress cq image (170x67) |
| fortress_default_with_sparrow.png | The same, as sent (with the small sparrow ship) | 1344x768 | - |
| watchtower2.png | Watchtower II city skin (lighthouse base), as sent | 1254x1254 | CITY_SKINS.tower2: trimmed, squashed to 88.6% height (its ground was ~33deg, our map is 35deg-from-flat ISO_K), 560x466 webp, map scale 1.15 |

Still missing originals: Gareth idle (8 frames) and attack (11 frames).
| cards_grid_18.png | Card art for the 18 named cards, as sent (one 6x3 grid from GPT, ~290px per card). Harley will regenerate each in hi-res later | 1774x887 | CARD_ART_BUILTIN (180x180 webp each, v1035) |
| cards/01_iron_vanguard.png ... cards/18_drop_signal.png | The grid cut into one file per card (290x290), in card order | 290x290 | - |
| profile_slot_stone.png | Stone tile for one of the 6 Overlord Profile slots, as sent (white background) | 1254x1254 | GP_SLOT_STONE (white cut out, 124x124 webp, v1036): Overlord Profile top-left slot full size, top-right 80% |
| gear_4_items.png | 4 gear items on black, as sent (red sword, gold sword, ice shield, arcane staff) | 1254x1254 | mockup 10 Oct: each cut out (black removed, glow kept), on a stone tile in the Overlord Profile slots |
| pirate_ship_city.png | Pirate ship ("Ghost Galleon") city skin, as sent (white background) | 1447x1087 | CITY_SKINS.pirate (v1049): white cut out, empty border trimmed, FULL size 1270x1033 webp (Harley: don't downsize - he sizes it with the skin alignment), scale 1.0 |
| haunted_pirate_ship.glb | Haunted Pirate Ship 3D model from Meshy AI, as sent (1.3M triangles, 3 x 2048 textures, 46 MB) | 3D | PIRATE3D_MODEL (v1051): 6 rocks removed, decimated to ~4.6k triangles, texture baked to vertex colours; march skin "Ghost Galleon". Tools in dev/glb/ |
| obsidian_sword.glb | Obsidian RPG sword, 3D model from Meshy AI, as sent (3,186 triangles, 3 textures: colour / metal-roughness / normal, 6.6 MB) | 3D | SOP_SWORD (v1096, Sword of Power screen): mesh packed (int16 positions, int8 normals, uint16 UVs), textures 512px webp (~105 KB together); drawn by sopSwordCreate with the campfire flame shader |
| sword_shrine_bg.png | Dark stone shrine with an altar, from ChatGPT, as sent | 1024x1536 | SOP_SHRINE (v1096): 640x960 webp (69 KB), Sword of Power top half; its altar (x 345-680, top face y ~852) takes the sword tip |
| stone_pedestal.png | Stone pedestal, as sent (white background) | 1254x1254 | not in the game (used in the concept, replaced by the shrine's own altar) |
| fortress_ship_iso.png | Fortress ship rendered by Harley in Rhino at ~35 deg (transparent background, with the small drone above it) | 1689x931 | v1098: map sprite FORT_SHIP_SRC (drone removed, 1240x781 webp), 3 sizes in the paint sprite list (base, ~2 bases, ~3 bases) |
| fortress_ship_iso_2d.png | The same fortress ship after Harley's ChatGPT 2D-paint filter (with the drone; dark shadow under the hull from his light tests - may be redone) | 1688x932 | v1099: FORT_SHIP_SRC (drone removed, 1240x733 webp) - the 3 map sprite sizes use this one |
| knight_rigged.glb | Chibi knight from Meshy AI, rigged (Mixamo bone names) with Meshy's "Right Hand Sword Slash", as sent (9.1 MB) | 3D | v1100: Gareth's sprite sheet (HERO_ANIMS.gareth, 2896x804 webp, 181x134 cells) + charge lunge (HERO_CHARGE.gareth) + hop row. Tools: dev/knight/ |
| knight_with_sword.glb | The same knight posed holding a sword, from Meshy AI, as sent (9.1 MB) | 3D | not in the game - the sword is cut from it and fixed to the rigged knight's right hand (dev/knight/bake2.py) |
| mixamo_sword_shield_slash.fbx | Mixamo "Sword And Shield Slash", skeleton only, as sent | animation | v1100: Gareth's attack row (11 frames; put on the knight by dev/knight/mixamo.py, held in place) |
| mixamo_standard_run.fbx | Mixamo "Standard Run", skeleton only, as sent | animation | v1100: Gareth's run row (16 frames) |
| mixamo_sword_shield_impact.fbx | Mixamo "Sword And Shield Impact" (hit reaction, the doubled-over one - replaced the first, head-snap version 12 Oct), skeleton only, as sent | animation | v1100: Gareth's hit row (10 frames) - plays on a big hit with a small slide back (Harley) |
| boss_dark_knight_rigged.glb | Chapter boss "Heroic Dark Knight" from Meshy AI, rigged (Mixamo names, 23 bones, 11.6k tris, 4096 texture) with Meshy's Idle_11, as sent (33 MB). The zip also had Running/Walking copies (not kept) | 3D | not in the game yet - posed in dev/boss (Boss Pose preview) |
| sprites_hires/gareth/ | Gareth's game frames at full render size (863x606 cells, ~4.5x the game sheet), one lossless webp per row: idle, run, attack, hit, charge, hop | backup | v1100 sheet is made from these frames (dev/knight/pack_game.py) |
| sprites_hires/boss/ | Boss game frames at full render size, smooth shading, no outline (one lossless webp per row: idle 12, raise 8, raised 12, raiseLow 8, raisedLow 12, stomp 16) | backup | rendered at 2x (779 px body); game sheet (not in the game yet) = these shrunk to a 340 px body, packed 12 per line (dev/boss/pack.py) |

