# Arena performance fixes (Nov 2026)

Harley's iPhone 15 Pro Max (iOS 18.7, home-screen app, 3x screen). Arena only unless noted.
Every fix was tested headless only; Harley checked the results on his phone.
Status: **paused on 21 Nov 2026 (v1781)**. The "waiting" list at the bottom is NOT done; resume it only if lag comes back.

## What we learned
- The drawing code itself is cheap on the phone (2-5 ms per frame out of 16 ms).
- The big freezes (110-290 ms) came from **iPhone Safari unpacking big hero sheets, throwing the unpacked picture away to save memory, and unpacking it again** on the next draw. `img.decode()` before the fight did not stop it.
- Pressing **New** in the Arena kept every bot's sheets in memory until Conquest opened, which made the memory problem worse.
- What's left (about 50 ms pauses when Fear starts, about 25 FPS for about 1 s when both sides fire beams) is the graphics chip, not memory.

## Tools (keep while testing; can be removed later)
| Version | What | Where |
|---|---|---|
| v1770 | Fear test: Spawn Fear, repeat every 6 s, hide each Fear part | Arena PERF panel > "Fear test" (folded) |
| v1772 | **Perf log**: every Arena fight on /test/ recorded on the phone (FPS per second, freezes and what caused them, drawing cost per layer / effect / hero sheet, skills and weapons fired). Last 8 fights, Copy / Share / Clear (one tap since v1777) | Arena PERF panel, top. `PL`, `plStart/plTick/plEnd`, localStorage `ks_perflog_v1` |
| v1776 | PERF panel fits without scrolling (perf log on top, other sections folded) | |

## Fixes in the game
| Version | Fix | Result | How to undo |
|---|---|---|---|
| v1765 | Fear pulse: grey wash instead of a "saturation" blend over the whole battle | headless faster | revert the `fearDrawPulse` wash line |
| v1771 | Fear red cracks: the blurred glow is drawn once into small pictures (12 fade x 6 pulse steps) and stamped, not 96 blurred strokes per frame | cracks 2.3 ms -> 0.1-0.5 ms per frame (headless), same look | PERF panel "Cracks: OLD way", or delete the baked branch in `fearCarve` |
| v1773 | Tom's guard sheet: knock-back dust removed, frame box 426 -> 340 px | 27 -> 22 MB in memory | point `tom_block` back to `tom_block_anim_v4.webp` (cw 426, ax 251.17) |
| v1774 | **Baelgor trimmed sheets** (main, skill, slash a/b, drain, Fear hand grab/desc): each frame in its own tight box (`dev/heroes/trim_sheet.py`, `HERO_TRIM`, `FEAR_TRIM`, `heroTrimBlit`) | about 298 -> 106 MB in memory; download 6.7 -> 8.2 MB | delete Baelgor's lines in `HERO_TRIM` / `FEAR_TRIM` (old sheets still in art/heroes/siphon/) |
| v1775 | **Arena unloads sheets** of heroes not in the current fight (on every New / screen open); `heroSheetKeys` covers every sheet of a hero (Tom's guard, Baelgor's drain were missing); Fear hand loaded with Baelgor | memory stays at the two current teams | remove the `heroSheetsRelease(keepA)` line in `renderArenaBattleScreen` |
| v1777-v1781 | **Unpacked copies (permanent since v1781)**: each loaded hero sheet and the Fear hand is turned into an ImageBitmap and drawn from that copy. Waits for `decode()` + 400 ms, checks the copy isn't blank (retries up to 3 more times), and **keeps the original `<img>`** | perf log: average FPS 50-56 -> 59-60, freezes of 100 ms or more 6-8 per fight -> 0, longest pause about 280 -> 56 ms | `HERO_BMP_ON = false` |

Things that went wrong (don't repeat):
- v1777 emptied the `<img>` after making the copy -> **all heroes invisible on iPhone** (headless Chrome was fine). v1778 switched it off.
- A copy made right as a picture finished loading came out **blank** on iPhone (new Arena opponent invisible). v1780 added the decode wait + blank check.
- v1768 split Baelgor into more sheets: no change (the total size stays the same). Reverted.
- v1758 changed the fight look while answering a question. Reverted. Questions are not change requests.

**Note on Baelgor:** his art may be redone. If a sheet is replaced, either rebuild the trimmed version (`python3 dev/heroes/trim_sheet.py IN.webp CW CH OUT.webp OUT.json`, then paste the json into `HERO_TRIM`) or delete his `HERO_TRIM` lines so the new sheet is drawn directly. The unpacked copies and the unloading work for any sheet, trimmed or not.

## Waiting (not done; resume only if lag comes back)
1. **Tom**: trim his main sheet (60 -> about 19 MB) and guard sheet (22 -> about 8 MB). Same look.
2. **Torvald**: idle on its own sheet (v1763/v1764) still needs a keep / revert verdict. Trimming would save little (17 MB).
3. **Laser / pulse beams**: about 25 FPS for about 1 s when both sides fire, low CPU -> the graphics chip (glow / blending). Also: one shared hum sound and a cap on sound starts.
4. **All heroes**: trim the other heroes' sheets (smaller gains each).
5. **Hex Shield**: heaviest weapon in headless tests.
6. **Fear start**: about 50 ms pauses when Fear begins (graphics chip, low CPU).
7. Arena screen-size fairness (zoom-to-fit vs crop-to-360): parked earlier.

Measured sheet sizes (unpacked, MB) before trimming: Baelgor main 62.5, skill 62.9, slash a 55.7, slash b 37.3, drain 46.8, Fear grab 18.5, desc 13.9; Tom main 60.3, guard 27.1, skill 8.1; Torvald 17.0 (+ idle 7.9, skill 9.5); Roran 11.0; Zarek 6.8; Kessa 5.5; Pip 4.2.
