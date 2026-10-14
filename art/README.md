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
| boss_dark_knight_rigged.glb | Chapter boss "Heroic Dark Knight" from Meshy AI, rigged (Mixamo names, 23 bones, 11.6k tris, 4096 texture) with Meshy's Idle_11, as sent (33 MB). The zip also had Running/Walking copies (not kept) | 3D | v1112 tried as the chapter boss, v1113 off again (placeholder - too slim next to the pixel art); poses + tools in dev/boss |
| sprites_hires/gareth/ | Gareth's game frames at full render size (863x606 cells, ~4.5x the game sheet), one lossless webp per row: idle, run, attack, hit, charge, hop | backup | v1100 sheet is made from these frames (dev/knight/pack_game.py) |
| sprites_hires/boss/ | Boss game frames at full render size, smooth shading, no outline (one lossless webp per row: idle 12, raise 8, raised 12, raiseLow 8, raisedLow 12, stomp 16) | backup | rendered at 2x (779 px body); game sheet (v1112 BOSS3D) = these shrunk to a 340 px body, packed 12 per line (dev/boss/pack.py) |

| rhino_mech_lowpoly.glb | Mech rhino (tank-green weathered armor, twin back cannons) from Meshy AI, low-poly export (5.1k tris, 2 x 4096 textures, 32 MB) | 3D | not in the game yet - future chapter boss; rigid rig in dev/rhino |
| sprites_hires/rhino/rhino_idle_strip.png | Rhino idle, 12 frames (one breath, 3.9 s) at 1235x847 per frame, plain lighting, transparent, facing left (game angle) - the raw render Harley takes to ChatGPT for the 2D filter | backup | not in the game yet (dev/rhino/render.js) |
| rhino_2d_gpt_test.png | Mech rhino after Harley's ChatGPT 2D filter (pink/blue pixel style, checkerboard drawn into the picture) | 1536x1024 | not in the game - 2D cutout animation test (dev/rhino/cutout) |
| tank_boss_gpt_parts.png | Steampunk siege tank boss, ChatGPT parts sheet (turret+cannon, hull, track loop, road wheel, sprocket), facing left, dark gradient background | 1536x1024 | not in the game - 2D cutout test (dev/tank) |
| weapon_turrets_sheet.png | 18 pixel weapon turrets (barrel + matching base each), 3 rows x 6, dark background - Harley's sheet. Row 2 #6 (purple beam) is the Laser Beam turret already in the game (BEAM_TURRET_IMG); the rest are unused | 1536x1024 | Laser turret in game; others for weapons without art |
| sprites_hires/weapon_barrels/barrel_rR_C.png | The 18 barrels cut from weapon_turrets_sheet.png (row R, column C), no bases, transparent, full size | backup | in game (200px webp copies in WEAPON_BARREL): Missile Barrage r1_4, Laser r2_6, Pulse Beam r2_4, Railgun r3_4, Scatter Rounds r1_3, Flak Burst r2_2, EMP Gun r3_1 |
| ghost_ship2_gpt_magenta.jpg | New ghost ship from ChatGPT (Harley, from a reference; 3 masts, tattered sails, bone serpent bow, side blades) on magenta | 1024x1024 | not in the game - candidate fortress skin / Leonardo animation source |
| ghost_ship3_gpt_grey.png | Ghost ship v3 from ChatGPT (Harley): 3 masts, black tattered sails, bone serpent bow, 4 side spikes; grey gradient background with drop shadow (hard to cut - ask for magenta next time) | 1024x1024 | not in the game - mockup only |
| ghost_ship4_magenta.psd | Ghost ship v4 (Harley, gpt-image-1.5): same design as v3 on clean magenta - cuts out cleanly | 1024x1024 | not in the game - mockup / animation source |
| explosions_gpt_sheet.png | 10 rows of pixel explosions from ChatGPT on magenta (fire bursts, ground blasts, smoke, dust) | 1536x1024 | row 7 = tank shell hit, row 5 = big/killing hit (sprites_hires/explosions, dev/tank/boom); mockup only so far |
| kessa_rigged.glb | Kessa (Stormcaller) 3D: Meshy image-to-3D from kessa_concept_tpose.png, rigged in Meshy (mixamorig, 23 bones, Running + Walking), 10.2k faces, 4096 texture | 3D | not in the game - dev/kessa |
| roran_concept_apose.png | Roran chibi concept (A-pose, copper armour, navy cape, no lance) - reference for his Meshy model | concept | not in the game |
| roran_rigged.glb | Roran Meshy model, rigged (23-bone mixamorig skeleton like Kessa/Gareth, 31k tris, 1 PNG texture; built-in Running/Walking). The 2.1M-tri unrigged original (88 MB) is not kept | model | not in the game yet |
| mixamo_roran_throw_object.fbx | Mixamo "Throw Object" for Roran's spear throw (ASCII FBX, 4.87 s; the bend-down pick-up part gets cut) | anim | dev/roran preview only |
| mixamo_roran_great_sword_idle.fbx | Mixamo "Great Sword Idle" for Roran's hero card loop (Harley) (ASCII FBX, 3.7 s loop, two-handed grip) | anim | dev/roran preview only |
| mixamo_roran_great_sword_idle_2.fbx | Mixamo "Great Sword Idle 2" for Roran's battle idle (ASCII FBX, 2 s loop, wide ready stance) | anim | dev/roran preview only |
| mixamo_kessa_idle.fbx | Mixamo idle Harley picked for Kessa (ASCII FBX, without skin, 8.3 s) | anim | dev/kessa preview only |
| mixamo_kessa_1h_magic_attack.fbx | Mixamo "Standing 1H Magic Attack 01" for Kessa (ASCII FBX, 2.3 s) | anim | dev/kessa preview only |
| mixamo_kessa_1h_magic_attack_02.fbx | Mixamo "Standing 1H Magic Attack 02" (throw; spins her back to the camera - not picked) | anim | dev/kessa preview only |
| mixamo_kessa_happy_idle.fbx | Mixamo "Happy Idle" for Kessa's hi-res hero card loop (2.93 s, loops cleanly) | anim | dev/kessa |
| kessa_textured_unrigged.glb | Same model before rigging (textured, 2 textures) | 3D | backup |
| kessa_concept_tpose.png | Meshy concept image Harley approved (T-pose, sleeves clear of the body, bigger head) | 1024x1024 | source for kessa_rigged.glb |
| mixamo_kessa_idle.fbx | Mixamo idle Harley picked for Kessa (ASCII FBX, without skin, 8.3 s) | anim | dev/kessa preview only |
| mixamo_kessa_1h_magic_attack.fbx | Mixamo "Standing 1H Magic Attack 01" for Kessa (ASCII FBX, 2.3 s) | anim | dev/kessa preview only |
| mixamo_kessa_1h_magic_attack_02.fbx | Mixamo "Standing 1H Magic Attack 02" (throw; spins her back to the camera - not picked) | anim | dev/kessa preview only |
| mixamo_kessa_happy_idle.fbx | Mixamo "Happy Idle" for Kessa's hi-res hero card loop (2.93 s, loops cleanly) | anim | dev/kessa |
| sprites_hires/tank/*.png | Tank parts cut out at full size (hull, turret, barrel, wheel, sprocket, one tread plate), transparent | backup | not in the game (dev/tank/parts.py) |
| sprites_hires/kessa/card/kessa_card_sheet.webp | Kessa animated hero card: 36 frames (6x6) of Happy Idle at 1050x735, transparent, Blender soft light (full 1600x1120 PNGs on Harley's PC) | sheet | in the TEST game (HERO_CARD_ANIM.kessa, v1119) |
| hero_cards/gareth_card_hailuo_green.mp4 | Gareth hero card video as made by Harley in Leonardo (Hailuo), 768x768, 24 fps, 6.6 s, green background (first frame is the grey ref) | original | source |
| hero_cards/gareth_card_game.mp4 | Gareth full hero card: green keyed out, Epic purple (#9b59d6 -> #6a35a8) baked in, frames 2-158 forward then back (13 s loop), H.264 crf 28, 1.1 MB | video | in the TEST game (HERO_CARD_VIDEO.gareth, v1139) |
| hero_cards/kessa_card_hailuo_grey.mp4 / kessa_card_game.mp4 | Kessa hero card video from Harley (Leonardo/Hailuo), grey background kept on purpose, full clip as is (226 frames, ends near its start pose so it loops); game copy H.264 crf 28, 0.6 MB | video | in the TEST game (HERO_CARD_VIDEO.kessa, v1144) |
| hero_cards/ironlily_card_hailuo.mp4 (1:1, v1149) + ironlily_card_hailuo_4x3.mp4 (4:3, v1151) / ironlily_card_game.mp4 / ironlily_still.webp | Iron Lily (placeholder hero) card clip from Harley; game copy since v1151 = the 4:3 clip: frames 1-131 intro + loop of the held close-up (frames 132-226, last 24 blended into the start), loopStart 5.458 s; earlier 1:1 version (Hailuo, grey bg + red waves); game copy = frames 1-183 intro + a 43-frame loop of the held close-up (frames 170-226, last 14 blended into the start), keyframe at 7.625 s; still = close-up frame for the small card | video | in the TEST game (v1149) |
| hero_cards/gareth_still.webp, kessa_still.webp, ironlily_still.webp | one frame of each hero's card video (Gareth frame 60 of the purple game clip, Kessa frame 60, Iron Lily frame 60 of the 4:3 clip), 360x480 | still | hero list small cards (v1152) |
| ui/hero_card/reference_skull_cannon_stat_card.psd + harley_hue_shift.png | Harley's hero card reference (PSD) and his Photoshop hue shift to gold (the look to keep) | original | source |
| ui/hero_card/frame_clean_rgba.png | Harley's hue-shifted frame with the PSD's transparency, old text/skull/icons removed | edit | source of the slices |
| ui/hero_card/top.webp, mid.webp, bot.webp, row.webp | the frame cut for the game: top (title+portrait), 4px repeating middle, bottom, one stat row; drawn at 1091px | slices | in the TEST game (v1140 hero card) |
| sprites_hires/kessa/toon/ | Kessa battle sprites in the "Gareth look" (cel shading + 1 px outline): idle 12, attack 12, arc 15 at 160x200; raw/ = Blender renders before the outline (full 480x600 renders on Harley's PC, KingdomArt\toon) | frames | in the TEST game (HERO_ANIMS.kessa, v1122) |
| sprites_hires/roran/ | Roran battle frames from Blender (Gareth-look shader): raw/ = renders scaled /3 to 263x211 (idle 24, throw 51), toon/ = + 1 px outline. Full 1246x831 renders on Harley's PC (KingdomArt\roran\full) | frames | in the TEST game (HERO_ANIMS.roran, v1123) |
