# Performance audit - step 1 (measure), 20 Oct 2026, TEST v1317

Harley (18 Oct plan, started 20 Oct): Opus measures every screen and ranks the hot spots; step 2 = fix them one at a time with before/after numbers, same look.

**How:** `dev/simfork/p06_screen_audit.js` - phone-size page (430x932), nothing touched, CPU slowed 4x like a phone, 6 s per screen.
Per screen it records: frames per second, long tasks, CPU busy (script / style / layout / GC), DOM elements torn down and rebuilt per second, and a CPU
profile (self time per function, with the line in test/index.html; built-ins like drawImage are shown with the game function that called them).
Two runs: at the phone's 3x resolution (`perf_v1317_dpr3.json`) and at 1x (`perf_v1317_dpr1.json`, which takes most of the drawing cost out).
`HOOK="js"` runs an experiment after a screen's setup (try a fix before writing it).

**Big caveat:** the headless browser draws everything on the CPU (no graphics chip). Drawing-heavy screens (Conquest) look far worse here than on a
phone. Compare screens with each other; for Conquest the real numbers have to come from Harley's phone (Dev Tools FPS counter, per level).

## Summary (3x / 1x)

| Screen | fps 3x | fps 1x | CPU busy (JS) 1x | DOM rebuilt /s |
|---|---|---|---|---|
| Conquest village | 10.8 | 35 | 106% (30%) | 77 |
| Conquest graveyard | 9.3 | 33 | 104% (56%) | 67 |
| Conquest snow | 8.5 | 27 | 108% (65%) | 67 |
| Conquest forest | 7.5 | 33 | 107% (57%) | 67 |
| Conquest cave | 9.2 | 29 | 105% (67%) | 97 |
| Conquest crystal | 9.2 | 32 | 106% (58%) | 67 |
| Conquest lava | 10.2 | 35 | 103% (52%) | 67 |
| World map | 56.5 | 56 | 58% (29%) + style 19% | 84 |
| Heroes | 58.8 | 58 | 17% (8%) | 61 |
| City / Troops / More / Arena fight | 59-60 | 59-60 | 12-16% (5-7%) | 60-64 |

## Hot spots, ranked

1. **Conquest scene drawing** (biggest by far here; size on a phone unknown).
   - Hero sprites: `drawImage <- heroTintBlit` (line ~24762) is 20-62% of the CPU on every level except the village, plus `restore <- drawHeroAnim` 4-12%
     (the canvas flushing queued drawing). A quick test drawing the hero sheets from pre-unpacked copies did NOT help, so it is the drawing itself
     (big frames, scaled, several heroes + effects), not unpacking.
   - Lava cavern lake: `drawImage` in drawTmpEnvBg's animated layer (line ~25796) 18-46% - two frames of a big sheet blended every frame.
   - Sheets bigger than 4096 px (the largest picture many older phones' graphics chips accept in one piece - above it the phone may fall back to slow
     drawing): **lava lake 1446x5520**, **Roran 6838x422**, **Kessa animated card 6300x4410** (also ~110 MB of memory once unpacked, Heroes screen).
   - Needs: Harley's phone FPS per level (Dev Tools FPS counter) to know if this is real on a phone. Candidate fixes: split sheets to <=4096,
     draw the lake at its on-screen size once per frame step instead of blending two full frames, cache hero frames at their drawn size.
2. **World map: `updateMarchMarkers` (line ~19019) 18-21% of the CPU with none of our marches out** (other players' / stress lists still walked
   every frame), plus **style recalculation ~20%** (something on the map changes styles every frame). Real script work - would show on a phone.
3. **Panels rebuilt every second on every screen** (the 18 Oct finding, still there): 60-97 elements/s with nothing changing.
   - Hidden on phones, pure waste: `#modeTabs` 18/s, `#statsList` 15/s, `#heroesList` 9/s when not on Heroes, `#coreSaveDebugPanel` 8/s,
     `#formationsList` 4/s (Troops), `#cardsGrid` 5/s (world map run), `#idleForgeBtn` 1.5/s.
   - Visible (also flicker / missed-tap risk): `#resbar` 7/s (top bar, every screen), `#idleSkillbar` 7/s (Conquest), `#heroesList` 9/s (Heroes).
   - `renderHeroes` (line ~15806) empties and rebuilds the whole hero grid, setting every card picture again, every second on every screen
     (`set src <- @15812` ~1-1.5% CPU everywhere).
   - Fix pattern: v1280 renderPowerSlots - rebuild only when the data changed (a signature), skip panels that aren't shown.
4. **Conquest small stuff:** skill bar rebuild (`@28086`) ~2%, `renderIdleHeader` ~1%, fortress life (`@22538`) 1-3%.

City, Troops, More and the Arena fight are fine (59-60 fps, 12-16% busy - almost all of it the every-second rebuilds above).
No page errors.
