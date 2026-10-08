# Kingdom Strategy — start here

Before doing anything else, read **HANDOVER.md** (the full handover). Version history is in **dev/NOTES.md** (newest at the bottom).

Rules that matter most (details in HANDOVER.md):
- Work on `test/index.html` (the TEST game). Copy to the root `index.html` (LIVE) **only when Harley says so** — "test first, then live".
- Harley is not a programmer: short, plain-language reports. Ask before anything expensive or irreversible; when he says stop or wait, stop.
- Reproduce a bug before fixing it, and measure before and after. Testing is headless Chromium only — never claim it was tested on his phone.
- Don't change the established look (dark navy + gold, brown/bronze game panels, flat cyan buttons, dashed/dotted borders) unless asked. The gold gradient button (#f0c95f→#c98f1e) is for occasional reward moments only.
- Each version: bump the number, add a dev/NOTES.md entry, commit and push. Publish to the claude.ai artifact only now and then, not every version.
- Anti-cheat revert (`AC_REVERT`) stays off until Harley asks. No player tracking or analytics.
- Mobile first: don't touch the mobile layout unless asked (PC is only for Harley's testing).
- Heroes/skills work the same in Conquest and Arena; combat has no dice; bots get the same kit as players; don't add new stats. Check balance changes with `node dev/balance/run.js`.
- Art: keep the full-size original in `art/originals/` plus a phone-size copy; show a mockup before new art goes in.
