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
