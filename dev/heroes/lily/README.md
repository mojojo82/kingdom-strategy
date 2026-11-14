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
