# Iron Lily redo (Nov 2026) - working notes

Design: top-right recolour (pale silver-grey, slate trim, charcoal hair, red blade) - art/originals/heroes/ironlily/recolour/lily_grey_design_v1.png.
Start frames: art/originals/heroes/ironlily/redo/lily_start_v1.png (green), lily_start_v1_small.png (85%, for big moves).
All Atlas clips: art/originals/heroes/ironlily/redo/clips/ (H3 Max, 5 s, Image = End = start frame).

## Moves (Harley's picks so far)
- Run: lily_run_v1 - KEPT
- Attack 1 slash: lily_atk1_v1 - KEPT
- Attack 2 spin slash: lily_spin_v1 - not circled (kept)
- Attack 3 jump chop: lily_chop_v1 - not circled (kept)
- Flip: lily_flip_v4 ("B") - KEPT (side aerial like Harley's reference)
- Evasive kick: PARKED. Tried cartwheel, butterfly kick (v1-v3), butterfly twist (v1, v2 - to be played reversed).

## Skill - "ball of death" flurry (1-2 s, chaotic, code slashes on top)
- LOGGED option A: lily_flurryA_v1 - Atlas baked thick orange trails (look flat / 2D, cover the code slashes). A1 = A + detached bigger slashes.
- C: lily_flurryC_v1 (asked for no effects; light smears left, 6 swings). C2: lily_flurryC2_v1 (faster, more chaotic, 8 swings).
- Code slashes: dev/heroes/lily/lily_slash_fx.js - one crescent per REAL swing (angles measured from each clip), styles ATTACHED / DETACHED
  (detached = Harley's "physically disconnect, bigger, like the ref video"). Look: white-hot edge, crimson body, streaky see-through tail,
  wisps, tip flare, sparks (Harley: realistic like his reference, not flat 2D).
- Mockups: dev/heroes/lily/skill_mock.js (+ key_soft.py for see-through glow); videos lily_skill_fx_v1_AC.mp4, lily_skill_fx_v2.mp4.
- Crimson Oath: either becomes skill 2 or gets replaced (Harley, undecided).

## Painted slashes (picked look, 15 Nov)
- Harley: "this is the exact look" - ChatGPT hand-drawn anime slashes: sheets art/originals/heroes/ironlily/redo/fx/lily_slash_sheet_v1.png (mixed), v2 (wide/flat + tight half-moons). Sheet 3 (quick flicks + near-full circles) is drawn in the same ChatGPT chat ("Game VFX Sprite Sheet") but not downloaded yet (computer went offline).
- cut_slashes.py OUT sheet1 sheet2 ... -> slashes/ (16 cut, 13 usable; hooks rejected automatically by the arc-fit check).
- Animation: clip A itself can't be used (its baked trails can't be made to match). Best so far: A-redo 2 (lily_flurryA2_2) played 1.5x and twice ("previous one was better" than 2x / 3 times).
- measure_swings.py now also TRACKS the blade tip and fits each swing's own arc (SWINGS_A22T): slashes sit on her real blade path, not round her chest.
- **PICKED (Harley 15 Nov): the TRACKED version** (lily_skill_fx_v9_tracked.mp4, right side): A-redo 2 at 1.5x played twice, painted slashes on her real blade path (SWINGS_A22T). v10 = same with all 19 shapes from 3 sheets.

## Balance verdict (Harley 15 Nov, v1615): "Lily is an absolute monster but Hanzo still dices her" - OK as is for now.
- Best melee teams with Lily vs the 3 best ranged teams: 100% (without her 40-80%). 5 ranged vs 5 melee with her: melee 98%.
- Hanzo + 4 vs Lily + the same 4 (all 15 teammate sets, 300 fights): Hanzo's team 300-0. Duels: Hanzo 100, Lily 87, Roran 78, Kessa 68.
