# Ship (fortress) design process - work in progress (Harley, 13 Nov 2026)

Becomes a skill once Harley settles the process/look. Notes so far:

## Design rules (Harley)
- Ships are designed WITH heroes riding them (Bonewake = the ideal structure: big, detailed, clear deck). Voidspire-style ships made without a deck are the old way.
- Movement types are all options: hover/floating, tracks, wheels/rail, legs/walkers, naval vessels, unorthodox designs, even ridden creatures.
- Deck types are all options: open flat deck with low rails (heroes fully visible); high walls that only show the heroes' heads; fully enclosed with windows.
- Art style = the hero art style (style_refs/ref1), detailed painted 3D look - not the old pixel Ironclad.

## Steps used for Ironclad (hover-barge, v1)
1. ChatGPT, new chat. Attach: the ship being redesigned (identity), art/originals/bonewake2/cq_c.png (deck structure), style_refs/ref1 (art style). Prompt: keep the identity, long flat readable open deck, nothing tall mid-deck (towers at the back), 2x2 grid of four concepts (one per movement type), pure side view facing right, plain light grey, no text.
   -> art/originals/ships/ironclad/ironclad_concepts_v1.png. Harley picked B (hover) - closest to the current Ironclad.
2. Same chat: "redraw ONLY concept B" large, ~85% of the width, centred, flat MAGENTA, thruster glow kept close. ChatGPT returned two versions (a, b) - keep both.
3. Key: python3 dev/skins/key_magenta.py IN OUT (-> *_cut.png). Find the deck surface row (wood colour scan) for the hero spots.
4. Mockup: dev/ships/ship_mock.js (SHIP=cut.png TAG=x LAYOUT='{"size":1,"lift":12,"layout":{"h0":[x,y]...}}') - headless Conquest, Bonewake shot for size, then the new ship pushed as a test skin with the same on-screen width as Bonewake and hero spots h0 (front) .. h4 (back) as fractions of the picture.
   -> art/originals/ships/ironclad/ironclad_mockup_v1.png

## Download quirk
- Browser downloads sometimes stay as <uuid>.tmp in Downloads (never renamed) - stage the .tmp (newest.py shows it) and rename on our side.

## TWO STYLE TYPES (Harley, 13 Nov 2026 - keep both until he settles; he will design more ships to decide)

### Style A - "Outlined game asset" (made Ironclad II)
- Look: dark outlines round every panel, flatter shading, little texture, chunky geometric panels, glowing accent lights. Brighter / more cartoony than Bonewake.
- Refs to attach: the ship being redesigned (identity) + art/originals/bonewake2/cq_c.png (deck structure) + art/originals/heroes/style_refs/ref1 (hero style).
- Prompt words: "in the image-3 art style" (hero style), plus the deck/structure brief. ChatGPT turns this into the outlined look by itself.
- Note: Harley did NOT like the first Blackwatch outputs made with this setup (blackwatch_concepts_v1/v2), even though the setup was the same as Ironclad II.

### Style B - "Painted render" (made Blackwatch II)
- Look: like Bonewake 2 and the heroes - NO outlines, soft directional light (upper left), gentle gradients, deep shadows in recesses, real material texture and wear (scratches, grime in seams), muted natural colours, small subtle lights (not neon).
- Ref to attach: art/originals/ships/style_ref_bonewake2.png (Bonewake 2 on grey) as the STYLE guide, plus the chosen concept (design).
- Prompt words: "change the ART STYLE to match the attached image ('Bonewake 2'): a painted, almost 3D-rendered look - NO dark outlines around shapes; soft directional lighting from the upper left with gentle gradients and deep shadows in the recesses; real material texture and wear ...; muted, natural colours; lights small and subtle, not neon."
- WATCH OUT: ChatGPT copies Bonewake's brown/bronze palette. Always state the hull colour explicitly ("dark grey / light black gunmetal, cool neutral tones, no brown, no bronze, no copper, no rust colour"), or fix with a follow-up: "keep this exact image ... change the COLOUR of the armour to ...".
- Typical flow: concepts in style A (fast, readable for picking a design) -> chosen design redrawn in style B -> recolour if needed.

## Deck types (how heroes ride)
- Open deck (Ironclad II): heroes drawn over the whole ship; one picture (cq). Hero spots h0-h4 on the planks.
- Gallery / window (Blackwatch II): layered skin. back = full hull, front = hull with the opening cut out; heroes drawn between. Feet sit low behind the hull (h y ~0.875) so heads + shoulders fill the opening. barsAbove: true puts their HP bars over the heads (drawn after the front layer).
  - Cutting the opening: flood fill from the middle of the opening with a GRADIENT tolerance (neighbour difference <= 3, value < 55) - a plain dark threshold leaks into the dark hull; then close + fill holes; feather 1 px. See dev/ships/patch_bw2.py and the art in art/originals/ships/blackwatch/.
- Railing in front of heroes (future ships): same layered method, the rail goes in the front picture.

## Putting a ship in the game
- Store ~900-1000 px wide (sharp on a 3x phone, the ship is ~550 real px on screen). cqScale = 400 * 0.5366 / width -> same on-screen length as Bonewake. Never squash; regenerate if a different shape is needed.
- lift 12 = floats a little above the ground. defLayout: h0 (front) .. h4 (back) hero feet, c = cannon (turret muzzle), w0-w2 weapon mounts on the hull side, ko = back of the ship.
- Arena draws layered skins in two passes (back before the riders, front after) since v1530; riders ride the deck in Arena since v1529.
- Mockups: ALWAYS capture at deviceScaleFactor 3 (real phone sharpness) and never enlarge crops - 1x/2x captures looked blurry to Harley. Turn off the bot's weapons (o.weapons = [], o.esper = null) and give both sides the same level so riders are still standing.

## Lessons from Voidspire II (13 Nov 2026)
- Melee reach (Harley): in Arena melee heroes swing at the enemy hull from the ground. Tall ships with long fins/spikes underneath leave them hitting air - keep the underside low and compact. When asked, REDUCE a fin (shorten it), do not delete it.
- meleeFront (skin field, fraction of the picture from the back): where melee heroes stop - set it to where the hull is low enough to hit (measure the hull's front edge at 76-88% of the picture height). A long nose spear with air under it otherwise makes them stand in front of nothing. Default = the picture's front edge.
- Glassed windows: dev/ships/glass_layers.py CUT OUT x0 y0 x1 y1 (GLASS_TB / GLASS_TR env loosen the violet test for paler painted glass) - back = deep violet interior, front = glass at ~45% opacity; heroes drawn between.
- Violet ships: generate on GREEN, key with dev/ships/key_green.py.
- Tall ships: hero feet must sit so heads fill the window (check in a 3x capture before sending).

## Style C - "Gritty Bonewake 1" (13 Nov 2026; Harley: style C is the one for now)
- Ref: art/originals/ships/style_ref_bonewake1.png (the full-size Bonewake 1 original on grey). Use a SEPARATE ChatGPT chat with only this ref, so it doesn't mix in styles A/B.
- Prompt words: "match the attached image exactly - the same rendering style: dark, gritty, heavily detailed and textured, etched / ink-and-paint look with fine linework in the details, desaturated muted colours, weathered and grimy, deep shadows. Use only its STYLE - not its design."
- Reads as part of the dark Arena/Conquest scenes (Harley asked which looks most normal: C).

## Animated treads / wheels (Crawler B and C, v1533)
- Keep the original hull and CUT the treads off it: dev/ships/split_tracks.py (horizontal cut under the armour band + polygons to keep armour that hangs over the tracks + holes where sprockets showed through).
- Ask ChatGPT (same chat as the ship) for ONLY the tread unit, no covers, using the full ship as the reference -> align it under the hull (same length + bottom line, even scale).
- Atlas H3 Max 5 s, Image = End = the tread unit on magenta: tracks roll (top run forward, bottom backward), wheels turn clockwise. Measure the runs' shift per frame; find a loop (best frame pair ~34 frames apart) -> dev/ships/tread_sheet.py (every 2nd frame, 12 fps, 3-frame cross-fade) -> sheet + rx/ry/tw/th.
- Game: skin anim with under: true (drawSkinPart draws the sheet BEFORE the hull). back = hull without treads (dark window interior), front = hull minus window openings.
- Don't animate a strip cut from the finished ship (armour texture shimmers) - split hull and treads instead (Harley).
- Hull movement: anim.bob (fraction of ship height) rumbles the hull layers while an under-sheet (treads) stays put; fortHullPoint carries riders/cannon/weapons with it (v1534).

## Walker legs (v1535)
- From an approved final: ask ChatGPT (same chat) for the body WITHOUT legs (keep the hip housings, paint the hidden armour) and separately for ONLY the legs (complete, same positions). Both came back aligned with the final (0 px shift) - check with a shift search anyway.
- Atlas 5 s, Image = End = the legs on magenta: walk on the spot, diagonal pairs, hip tops fixed ("treadmill"). The leg tops still rise/fall ~9% of the ship's height -> measure them per frame and use that as the body's bobTrack so the body rides the legs.
- dev/ships/build_walker.py: body layers (window = biggest dark region in the slit box), leg sheet (60 frames, every 2nd, 12 fps, stored at 0.6 size via anim.sw/sh), far legs tucked behind the body (alpha cut where the body is), spots across the window.
- Game: legs = anim.sheet drawn over the back layer (not under), body bobs via anim.bobTrack (hullBobPx). Riders' level numbers move above their HP bars on barsAbove skins.
- Walker v2 (Harley): animate the WHOLE lower half below a cut line through the body (belly + hips + legs) in one Atlas clip instead of legs alone; the upper body follows the lower half's measured rise/fall. Legs must never be covered by the front layer (anim.over draws them last). Walkers stand still in Arena (anim.walk + still).
- Walker v3 RULE (Harley): never animate a cut-out with a missing area or stitch two parts. Cut the hull cleanly where its panels overhang; get the moving part from ChatGPT on the full composite ("remove the hull", fill/extend the hidden top with detail) so it is complete; animate it whole and draw it UNDER the hull. Same idea as the crawler treads.
- Hull separation: also from ChatGPT ("remove the legs/lower portion, keep only the hull with a finished underside") - not a hand cut (Harley, v1538). Both pieces come from the same approved composite, so they line up.
- Harley may hand-cut the hull himself (white = removed area). Key magenta + white and bake a static drop shadow under his cut edges into the hull PNG with dev/ships/hull_shadow.py IN OUT (shadow in the art, never in code) - Walker v1539.
- Legs/moving limbs can be a CODE RIG instead of an Atlas clip (Harley prefers it - smooth at any frame rate): ask ChatGPT for an exploded parts sheet (every part complete, round hinge caps at joints, bones drawn vertical), measure hinge circles (cv2.HoughCircles), pack an atlas + pivots, draw with IK live (Walker v1540: build_walker_rig.py, walker_rig_params.py, drawWalkerRig). Hip drums etc. the hull doesn't have come as one more part.
- Floating mecha (v1547): split the design into parts with ChatGPT (head, torso, upper arms, forearm+hand as one, NO ball joints - limbs float with "fairy glue"), redraw parts that do not match the concept (torso with huge shoulders, head options). A held weapon must be drawn INTO the real hand piece (same perspective) - a flat weapon with its own fist looked wrong; check the weapon's line is straight through the fist (dev/mecha/fix_staff_line.py). Separate hero platforms in flat 2D side view go in the front layer; keep them out of the left (off-screen) part and away from the Arena HP bar.
