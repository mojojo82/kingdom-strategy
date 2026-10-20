# Kingdom Strategy — handover

Read this first if you're a new Claude session picking up this project. It's written so you can carry on exactly where the last session stopped.
Version history (what changed, why, how it was tested) is in **[dev/NOTES.md](dev/NOTES.md)**. Newest entries are at the bottom.

**State at handover (12 Oct 2026, TEST game v1325):** everything below is built and tested; TEST is deployed. **LIVE updated to v1198 on 16 Oct 2026 (Harley: no players yet, it doubles as a backup).** Later versions are TEST only until Harley says. Harley's real save and custom art are still in the claude.ai artifact database (see "Open items").

---

## Links

| What | Link |
|---|---|
| GitHub repository | https://github.com/mojojo82/kingdom-strategy |
| Live game (players) | https://mojojo82.github.io/kingdom-strategy/ (root `index.html`, data at the Firestore root) |
| Test game | https://mojojo82.github.io/kingdom-strategy/test/ (`test/index.html`, data under `envs/test/`) |
| Admin website | https://mojojo82.github.io/kingdom-strategy/admin/ (`admin/index.html`) |
| GitHub Actions (tests + deploy) | https://github.com/mojojo82/kingdom-strategy/actions |
| CI logs (readable without the Actions UI) | branch `ci-logs`: `test.log`, `test-status.txt`, `deploy.log`, `deploy-status.txt` |
| Pages settings | https://github.com/mojojo82/kingdom-strategy/settings/pages (deploy from branch `main`, root) |
| Repo secrets | https://github.com/mojojo82/kingdom-strategy/settings/secrets/actions (`FIREBASE_SERVICE_ACCOUNT`) |
| Firebase console | https://console.firebase.google.com/project/kingdom-strategy/overview |
| Firestore data | https://console.firebase.google.com/project/kingdom-strategy/firestore |
| Firebase Auth users | https://console.firebase.google.com/project/kingdom-strategy/authentication/users |
| Google Cloud IAM (deploy key roles) | https://console.cloud.google.com/iam-admin/iam?project=kingdom-strategy |
| Org policies (checked: none block us) | https://console.cloud.google.com/iam-admin/orgpolicies?project=kingdom-strategy |
| Billing / budgets | https://console.cloud.google.com/billing/budgets |
| Cloud Billing API (had to be enabled) | https://console.developers.google.com/apis/api/cloudbilling.googleapis.com/overview?project=862432836712 |
| Functions base URL | https://us-central1-kingdom-strategy.cloudfunctions.net/ (callable functions, region us-central1) |
| claude.ai artifact (the game as Harley iterates on it) | https://claude.ai/artifact/Mt8BNeiwSBBu83VaSbAGbW |
| claude.ai artifact: fire tuner | https://claude.ai/artifact/PJZzZg6wpgwL8PHiNXaskp |

Firebase project id `kingdom-strategy`, project number `862432836712`. The web config is in the game (`#ksFirebaseAdapter`) and in `admin/index.html`. It's not a secret.

## Accounts and who holds what (no personal details here; ask Harley)

- **Firebase/Google Cloud owner:** Harley's main Google account. Project is on the **Blaze** plan with a **$10/month budget alert**.
- **GitHub:** `mojojo82` (Harley, signs in with Google, 2FA on). The Claude GitHub App is installed on this repo, so sessions can push.
- **Game admin:** one account, uid `ZPTZEZC4XfSx4KA4rPJY6GHMmMC3`. Admin powers require **Google sign-in** (2-step verification lives there).
  The list lives in `functions/admins.json` (server + rules) and `ADMIN_UIDS` in the game's adapter (UI only). To add or remove an admin, edit both and push.
- **Deploy key:** service account `firebase-adminsdk-fbsvc@kingdom-strategy.iam.gserviceaccount.com`, stored as GitHub secret `FIREBASE_SERVICE_ACCOUNT`.
  Roles: Editor, Service Account User, Cloud Functions Admin, Cloud Run Admin (+ Firebase defaults).
- Auth providers on: Google, Email/Password. Authorized domain added: `mojojo82.github.io`. Anonymous sign-in should be OFF.

## How it fits together

```
claude.ai artifact ── window.claude.use("db") ──► claude.ai shared db        (Harley's iteration copy; his real save lives here)
GitHub Pages game  ── #ksFirebaseAdapter shim ──► Cloud Firestore            (same game file; same db API; envs/test/ for /test/)
                   └─ KS_BACKEND.call(name)   ──► Cloud Functions (functions/index.js) ── everything worth gems / server-checked
admin/index.html   ── signs in (Google) ───────► admin* Cloud Functions
```

- **One game file.** `index.html` / `test/index.html` is the same single-file game as the artifact. The `#ksFirebaseAdapter` script in `<head>` only switches on off claude.ai
  (github.io / web.app / firebaseapp.com / `?fb=1` / `?emu=1` on localhost) and provides `window.claude.use("db")` backed by Firestore. It also does sign-in
  (overlay `#ksAuth`: Google, email/password; the Firebase uid is the player id), nested-array encoding (`{__arr:[]}`), `acquire()` leases (`_leases/` + transaction), and the 🔥 env/status chip.
- **Server-only data** (written only by Cloud Functions; rules block clients):
  - `players/<uid>/wallet/main`: gems, last paid Conquest level
  - `players/<uid>/ledger/*`: every item change: `{item, delta, balance?, reason, ref, by?, at}`
  - `players/<uid>/mail/*`: admin gifts (claimed once)
  - `players/<uid>/meta/account`: `createdAt`, `lastSeen` only
  - `purchases/<provider>_<receipt>`: delivered once per receipt
  - city HP fields `hp, hpT, burnLeft, raidedAt` on `cities/*`
- **Functions** (`functions/index.js`, pure rules in `functions/core.js`):
  - game: `claimLevel` (order + speed floor from the game's own pace), `extinguishBase`, `repairBase`, `extinguishAllyBase`, `hitBase` (no friendly fire, 30s per target), `relocateCity`, `touch`, `claimMail`
  - admin: `adminGrantGems`, `adminSetWallet`, `adminDeliverPurchase`, `adminMarkPurchase`, `adminSendMail` (one / all), `adminCatalog`, `adminFindPlayers`, `adminPlayerInfo`
- **Item catalogue** `functions/items.json`: `wallet` items (gems) live on the server; `save` items (resources, troops, shards, ...) are added to the save at `path` when a mail is claimed.
  Adding an item is one line. Packs: `functions/packs.json` (only a test pack so far).
- **Rules** are generated: edit `tools/build-rules.js`, never `firestore.rules`. The same body is placed at the root (live) and under `envs/{env}` (test).
- **Saving:** cloud save every 60s, plus within ~1.5s after a player tap/key that leads to `persist()`, plus on page hide. Gems are re-asserted from the wallet every 5s.

## How to work on it

1. **Game changes:** edit the single game file. In the original session it was `/home/claude/game.html`; in a new session use `test/index.html` from this repo as the source.
   - Backups were `game_vNNN.html` (latest v946). Git history now does that job: commit each version with its number.
   - Add a `dev/NOTES.md` entry per version (`## vNNN` + bullet points).
   - **Bump `KS_BUILD` in `test/index.html` and run `node tools/stamp-version.js`** (writes `test/version.json`). Players' games compare the two and show a "New version ready - Update" banner; CI fails if they don't match. When copying to live, run it again so the root `version.json` is written too.
   - Every now and then (not every version - Harley: it slows things down), publish to the claude.ai artifact (`Artifact` tool, `url` above, a short `label`, **don't pass `capabilities`**; the `db` capability carries forward). Last published: v933.
   - Copy to `test/index.html` and push. Copy to the root `index.html` **only when Harley approves** ("test first, then live").
   - **After every push, check the `firebase` workflow passed** (`gh run list --workflow firebase --limit 1`), not just Pages. If it failed, nothing server-side deploys. The raw log can't be downloaded from a Claude session; read the failing lines with `gh api repos/mojojo82/kingdom-strategy/check-runs/<job id>/annotations` (job id from `gh api repos/.../actions/runs/<run id>/jobs`). It went unnoticed from v998 to v1019.
2. **Server changes** (`functions/`, `tools/`, `ci/`, `admin/`, `test/index.html`): push to `main`. The `firebase` workflow then:
   - runs unit tests (`functions/test/core.test.js`), emulator security/function tests (`ci/integration.test.js`) and a real-browser end-to-end test of the game + admin site (`ci/e2e.test.js`);
   - only if all pass, deploys rules + functions, makes every exported function callable (`gcloud run services add-iam-policy-binding … allUsers`), and smoke-tests them.
   - Read results on the `ci-logs` branch: `git fetch origin ci-logs && git show FETCH_HEAD:test.log` (origin/ci-logs may be stale - use FETCH_HEAD).
3. **The session's own sandbox can't reach Firebase, npm's `firebase` package or github.io.** Everything Firebase-side is verified through GitHub Actions.
   Local headless tests use stand-ins: `dev/tests/mockdb.js` (claude db), `dev/tests/fakefb.js` (Firebase compat SDK), `dev/tests/fnrunner.js` (runs the real `functions/index.js` against the stand-in store).
   `dev/simfork/*.js` are the test scripts by topic (paths inside assume the original `/home/claude/` layout; adjust).
   Sanity check: `dev/tests/e.js` must print `object function`.

## Harley's standing preferences (follow these)
- **Weapon fix list (15 Oct):** while working through dev/audit/weapons_conquest_vs_arena.md, after EVERY completed request write the numbered list back to Harley showing what's left (done ones ticked), so he can track progress.

- Keep reports concise. Explain things in plain terms; he's not a programmer.
- **Reproduce a bug before fixing it**; measure before and after. Testing is headless Chromium only, so never claim it was tested on his phone.
- Game UI style: dark navy and gold, flat cyan buttons, dashed and dotted borders. He **dislikes round, puffy, bushy trees and bushes**.
- Use `/* */` comments inside one-line functions.
- **One rule set for heroes:** a hero and its skills must work exactly the same in Conquest and Arena (no per-mode rules or stats); balance as an in-between. Check every hero change with `node dev/balance/run.js --vs <saved run>` (Conquest walls, swap test, Arena round-robin). 10+ more heroes are planned before the live play test.
- Inspiration: Shining Force 2, Ultima VII; genre references Kingshot / High Seas Hero.
- Fixes must not noticeably change the established look.
- Ask before doing anything expensive or irreversible. When he says stop or wait, stop.
- **No player tracking/analytics.** Only what's needed: purchase audit, item ledger, account created / last seen. Chat is not auto-deleted (his call, for now).
- **Mobile first.** Don't change the mobile layout unless asked. PC is only for Harley's checking/testing; the PC redesign is parked (branch `wip/pc-layout`).
- **Art:** keep every asset twice - the full-size original in `art/originals/` (never shrunk) and a phone-size copy in the game. Show a mockup before new art goes into the game.
- **Combat is deterministic:** no dice in fights (fixed patterns / seeds instead of random rolls).
- **Bots are equal to players:** a bot gets the same combat kit a player of its level could have (heroes, weapons, fortress research of either type, Esper, gear bonus).
- **World PvP = Arena + troops:** the same fight rules as Arena (including both sides' weapons), just with troops and resolved instantly.
- **Don't add new stats.** Solve balance with the stats/systems that already exist.
- **Not every hero has to be a winner.** Weak heroes are fine - rate them honestly (e.g. Torvald is Rare).
- **The meta build must stay the strongest overall weapon build.** Not unbeatable - it should win a high % of fights unless the opponent
  sets up specifically to counter it. No combat change or new weapon/system may accidentally beat it. Check often: `node dev/balance/run.js --only meta`
  (round robin of builds; prints a WARNING if the meta isn't on top) and `node dev/balance/loop.js` (every build incl. each Duplicate copy choice).
  Loop (from Harley's memory): META = EMP + Railgun + Clone Task; COUNTER = EMP + Status Wave + any; COUNTER-COUNTER = Hex Shield + Railgun + Duplicate (copying Hex). Not on top yet - see NOTES v966-v968.
- **Nothing a weapon fires is instant** - every projectile travels (Conquest and Arena, sims included). Damage / stun / knockout happens when it lands.
- **All art is an admin tool, the same for every player** (v982) - hero art, card art, skill icons, sprites, Esper art, ground/trees: stored once in `assetitems/<key>` (index `assetitems/_shared_index`), only admins upload. **The only player-controlled image is each player's own avatar.**
- **Cards are one shared catalog, admins only edit it** (v977): names / type / effect text live in `assetitems/cardcatalog` (all read, admin write), not in each save. Card effects come from the catalog name (or the card's ID code #n). Card IDs (1-30) are fixed; the album grid position is only each player's own visual sort order (state.cardOrder) - players move/sort freely, effects/equips follow the card ID.
- **Card 10 (Overclock) is for the future Type 2 fortress** (Harley): Fortress 2 tech (not built yet) will give an innate skill cooldown bonus; card 10 needs >25% cooldown bonus so it stays dead until then. Don't "fix" its trigger.
- **Card 3 (Desperate Spark) is strong on purpose** (Harley, v988): Kessa +200% ATK always on, even in 5-hero teams (sims: a 5-hero team with it beats teams 10 levels higher). Future cards will compete for the slot, so only Kessa-focused builds take it. Don't nerf it unless Harley asks.
- **Kessa's 3rd Conquest skill, Storm Mark, is WIP** (Harley, 15 Oct 2026): it will be completely changed or heavily modified. Today it only works in Conquest (Arc Burst marks enemies 4 s, +2%/level damage from ranged heroes; `stormMark`, idleMarkMult) - the Arena never had it, which breaks the "same in Conquest and Arena" rule. Don't build on it, port it to Arena or balance around it until Harley decides the new version. The Hanzo vs Kessa Arena sims (NOTES v992-v994) never included it.
- **Hanzo is blatantly powerful on purpose** (Harley, v992): VIP-pack only (`vipOnly`: can't be recruited with resources, kept off bots for now). Tuned so skill level 3 is worrying, 4 dominant, 5 a force of nature (see NOTES v992). Don't nerf without Harley.
  v993 (Harley): no further buffs - Kessa (Arc Burst knocks him out mid-leap, plus Projection Wall) is his natural counter; "without kessa hes already dominating the whole game".
- **Level art never moves the fight** (Harley, 19 Oct 2026, repeated from the v1263 floor episode): when placing new backgrounds, and above all the ground/road, never move the fortress, heroes or enemies to suit where the ground got drawn - it breaks attacks and projectiles. The road's walking line must land on the existing ground line (groundY) and look the same eye-level as the village road. If a ground layer comes out at the wrong elevation, size or height, we make a new ground layer (or adjust only the art's own placement/scale), never the sprites.
- **Level art workflow** (v1294-v1299): ChatGPT composite (1536x1024, attach the village refs) -> GPT splits far / near / road on magenta in the same chat -> dev/levels/build_*.py (key, seam, road flattened to the village eye-level) -> sky taken from the composite. Draw backdrops at ~1 phone px per source px; softness is a per-layer setting (Dev Tools "Scenery sharpness"), never baked into the art. Harley (19 Oct): those buttons are ESSENTIAL - what works on one level doesn't work on another, so every level/layer gets tuned by eye on his phone; keep the row in Dev Tools for good. Leonardo upscalers smear GPT's pixel style - don't use them for this. Harley (19 Oct): when an indoor level's top doesn't reach tall phones, DON'T mirror/fake the ceiling in code - ask GPT for an extension pass (extend the image upward) instead.
- **Level art loads per level** (v1315, Harley: "why would you need to pull that on first load if the player can only be in 1 chapter at a time"): level pictures are NOT inside the game file. They live in `art/levels/*.webp` and the game names them with `levelArt("file.webp", "<fingerprint>")` in TMP_ENV_BG. The game fetches the level you are on, then quietly the next chapter's, from the always-running 1 s tick - on EVERY screen, not just while the Conquest scene draws (v1319: Harley was farming 4-2, sat on the world map, and Conquest opened on the dark fallback because only drawIdleAnim fetched). Each picture also pre-decodes on arrival (preloadConquestAssets pattern) so the first draw doesn't hitch. Until art arrives the level's own dark colours show. The village (chapter 1) stays built in. To add/replace a level picture: save the .webp in art/levels/, reference it with `levelArt("name.webp", "")`, run `node tools/stamp-version.js` (fills/refreshes every fingerprint; `--check` fails on a stale or missing one). Same files serve TEST and LIVE (`../art/levels/` from /test/), so never overwrite a file LIVE uses with untested art - give new art a new name. Publishing to the claude.ai artifact now needs the level files passed with `files` (published path `art/levels/<name>.webp`). Local headless tests that route github.io to the game must serve `/art/levels/` from the repo (scratchpad lazytest.js does).
- **Level select / farming** (v1317, Harley 20 Oct): every player can go back to any stage they have completed (tap the 📍 stage in the Conquest bar). A farmed stage is endless hordes, no boss, never clears. `state.idle.chapter/levelNum` stay the BEST progress (server, ranks, level gems, events only see that); `state.idle.farm = {ch, lv}` is the stage being farmed and everything the fight reads (enemy strength, backdrop, labels) uses the stage (idleStageCh/Lv). Kill pay x (stage / best stage) - Harley: "link it to the level they're on... 1-19 earns more than 1-10". The Idle Chest's Valor rate doesn't learn while farming. Fade between stages; the picked level's art loads on tap and any level not on screen / next / picked is let go.
- **Weapon build rankings are saved in `dev/balance/WEAPON_BUILDS.md`** - update it after weapon/combat changes so the info is never lost.
- **Both sides act at the same moment.** EMP vs EMP stuns both; a hero knocked out this instant still gets this instant's swing; identical teams always draw (test g208). No attacker-goes-first wins.

## Open items / to-dos
- **Keyword colours:** "Summon link" is always pink (#ff7ad9, class kw-summon, helper kwHtml() next to escapeHtml). Add new keywords to kwHtml so they colour everywhere.
- **RULE (Harley, 15 Oct): weapons and heroes work EXACTLY the same in Conquest and Arena. The only allowed difference is the target** (Conquest: enemies + bosses; Arena: the opponent's heroes + fortress). BUT some of today's differences are on purpose (Harley, 15 Oct) - **don't fix anything from the audit (dev/audit/weapons_conquest_vs_arena.md) until Harley marks which ones**. Item 1 (Duplicate) FIXED v1186; item 2 (Railgun KO / droneOff / cloneDelay Arena-only) = KEEP AS IS, intended; item 3 (Railgun waits for an enemy in Conquest) = KEEP AS IS; item 6 (EMP stun stacking in Conquest) = KEEP AS IS; item 4 (Cannon Doctrine boosts weapons) FIXED v1189; item 20 ATK half (bot/other-side weapons get their ATK bonus) FIXED v1190, Duplicate-target half = KEEP AS IS; item 19 (Conquest reloads carry over between levels) = KEEP AS IS; item 17 (beam time lost with no target in Conquest) = KEEP AS IS; item 15 (IO Repair + Duplicate stack in Arena) FIXED v1191; item 10 (Droid Call damage base incl. ATK bonus in Conquest) FIXED v1192; item 14 (Orbit/Dome protect heroes from ranged hits in Arena too) FIXED v1193; item 13 (Orbit Hex Link recharge in Conquest) FIXED v1194; item 9 (Projection Wall Lv50 Mirror) FIXED v1195 in Arena; item 8 (Wall in Conquest) FIXED v1196 - built the same as Arena, ready for future Conquest enemies that hit ranged heroes (none do yet); item 5 (EMP Aftershock in Conquest) FIXED v1198; item 11 (Droid pierce) FIXED v1197 - ignores defence AND Dome/Orbit in both modes; Conquest enemies may carry e.projRed (idleEnemyProjRed) for future bots with Dome/Orbit - when those arrive, apply it to every projectile, not just the drone; item 18 (Drop Signal rush / Railgun cloneDelay Arena-only) = KEEP AS IS - but if Harley ever adds a bot/opponent to Conquest, these (and EMP extras, Railgun hero KO) need wiring there; item 7 (EMP resets reloads / cancels beams, Wall, repair in Arena) = KEEP AS IS (same future-bot note). AUDIT COMPLETE (16 Oct) - every item fixed, kept or parked; item 16 (missiles independent in Arena) FIXED v1187. Item 12 (Support Power works in Conquest only - Hex, Sera, Torvald) = needs consideration later, not now. The Duplicate-in-Conquest patch is parked untested on branch wip/dup-conquest.
- **Weapon power (v1199, Harley):** every OWNED weapon adds power (equipped or not): max Elite 140K / Super Rare 280K / Epic 420K / Legendary 700K, Lv1 = 70% of max, even steps to Lv50 (from High Seas Hero: weapons ~4% of a big account; all 15 maxed = 5.74M). Until the fragment-unlock system exists, "owned" = has fragments, above Lv1, or equipped - switch powerFromWeapons to the real unlock when it lands. Arena power breakdown (arenaGovernorPowerBreakdown) doesn't include weapons yet.
- **Sword of Power power (v1200, Harley):** 8,600 power per lane level (ATK + HP + DEF levels), High Seas Hero's real rate (their 417 component levels = 3.6M). Milestones add none. No level cap, so it keeps growing.
- **Equipment power (v1201, Harley):** worn pieces only, 36,000 x (ATK + HP + DEF + bonus lines %) - rarity and roll luck both count. Average Legendary ~1.18M, full worn set ~11.8M (= High Seas Hero's top set). Bag gear adds nothing.
- **Power Details popup (v1202, Harley):** tap your power (top bar #powerBadge or the Governor Profile power line) -> City (Buildings, Research, Fortress research) / Army (Heroes, Troops) / Arsenal (Weapons, Equipment, Sword of Power), each with % of total. game.powerBreakdown() is the single source; governorPower() is its sum. Add new power sources there.
- **Building power (v1203, Harley's Kingshot video):** one curve KS_BUILD_CURVE (Kingshot Range/Barracks power per level, Lv30 = 304,700) x BUILDING_POWER_MULT: Town Hall x5, Academy x1.1, Barracks/Mage Tower/Archery Range x1, resource buildings x0.1 - all match Kingshot. v1212 (Harley's 2nd video, exact): Warehouse x1.1 (Kingshot Storehouse), Infirmary x0.75. Wall (20 lv) = the curve at round(1.5 x lv) like Kingshot's Guard Station. Each level's value is the building's power (not a running sum). Maxed buildings = 3.38M (was 23.4M, the Wall alone was 21M).
- **Troop power per unit** [3,4,6,9,13,20,28,38,50,66] (T1-T10, TROOP_POWER_BY_TIER): Harley checked against Kingshot, 16 Oct - correct, don't change.
- **IDEAS for later (Harley, 17 Oct):** dev/plans/ideas.md - list of easy features not in the game yet (daily tasks, login rewards, peace shield, gift codes, alliance help, power leaderboard, ...). Nothing decided; Harley picks.
- **OPEN - Monsters (v1215 first pass, 16 Oct):** map monsters + Search are in (see NOTES v1215). Still to do / tune with Harley: reward and strength numbers, real monster art (placeholders are Conquest bosses), Elite monsters + alliance rallies, alliance events (Harley named Kingshot's Caesar's Fury and Vikings - NOT now), shared-monster cheating (rewards come from the phone, like Conquest).
- **OPEN - Sword of Power essence cost (Harley, 17 Oct):** the sawtooth base price should NOT grow +18% per 10-level block (tgCost: base = 10 x 1.18^block). Harley will give the correct numbers later - do not change until then. Lord power stays a flat 8,600 per level.
- **OPEN - Reward sound is from High Seas Hero (v1249, 17 Oct):** Harley picked the Rewards-popup sound cut from his High Seas Hero screen recording (sfx/reward_popup.mp3). It belongs to that game - swap it for a licensed / own sound before the game goes public. The old free Pickup / Chest clips are still in REWARD_SFX.
- **OPEN - Meta build not on top (found 18 Oct, v1252 check):** `node dev/balance/run.js --only meta` says the META missile+laser+railgun build is NOT the strongest (Clone+railgun+Hex F3 ~95-98%, META F3 48-71%). Same result on v1251, so it was already like that before the weapon level bonus. Ask Harley what to do.
- **Harley keeps "Glows" ON on purpose** (20 Oct): it runs better off, but leaving it on forces us to keep finding other ways to optimise. Never suggest turning it off as the fix.
- **IN PROGRESS - Performance audit (Harley, 18 Oct; step 1 done 20 Oct - ranked results in dev/audit/perf_audit_step1.md, script dev/simfork/p06_screen_audit.js):** find other "update code" waste like v1255. Plan: (1) Opus measures every screen (world map, Conquest, city/rig, Arena, Heroes) at phone-speed CPU (THROTTLE=4) + CPU profiles, ranks hot spots (tools: dev/simfork/p04_stress_parts.js, p03_march_fps.js); (2) Harley switches to Fable to read the hot spots and fix them one at a time with before/after numbers, same look. Patterns to look for: DOM rewritten when unchanged, whole panels rebuilt every 1 s tick, CSS repaint animations/filters.
  - **FIXED in v1318 (20 Oct, Fable):** the per-second rebuilds below are now gated - each panel only rebuilds when what it shows changed (signature on the element; resbar updates its numbers in place; the skillbar only rebuilds when roster / size / timer-text / AUTO / icons change - its live cooldown parts were already per-frame via cached nodes). DOM churn 60-97/s -> 1-5/s on every screen; see dev/audit/perf_audit_step1.md + perf_v1318_dpr1.json. World map FIXED in v1320: updateMarchMarkers skips its whole frame when nothing is on the sea (own + foreign + stress all empty; ~16% of a phone-speed core -> 0.04 ms/frame), and the sea-foam streaks animate via el.animate with resolved values instead of var() CSS keyframes (the var() kept every streak on the main thread; style recalc 18% -> 11%). Same look - foam, ships, wakes, cleanup all verified. Still open: #rigQ / #formationsList / #infirmaryPanel / #tileinfo stragglers (~1-4/s), Conquest drawing (60 fps on Harley's iPhone 15 Pro Max - only matters for weaker phones; oversized sheets DONE in v1322: lava lake re-folded 1x24 -> 2x12 (2892x2760, from the lossless master at the pipeline's q80; anim.cols in drawTmpEnvBg) and Roran 26x2 -> 13x4 (3419x844, wrap: 13 in HERO_ANIMS - each logical row = 2 physical rows; worst visible frame diff 0.52/255, alpha identical). Both now under the 4096 px texture limit of older phones. (The third one, the Kessa card sheet, turned out DEAD - her card has played the v1139 video ever since, so v1321 deleted the 1.76 MB sheet: game file 28.0 -> 26.3 MB, original archived in art/originals/kessa_card_sheet_6300x4410.webp)). Original 18 Oct findings:** render() in test/index.html runs every 1 s tick and rebuilds panels even when nothing changed.
    Measured headless on a 430x932 phone, test account, 5 s per screen with nothing touched (top-level elements torn down + rebuilt per second):
    - VISIBLE (fix first - also tap/flicker risk, esp. in the Blue style): #resbar (top bar gems/valor/books) 7/s on every screen; #idleSkillbar
      (Conquest AUTO + 5 hero circles) 7/s; #heroesList (Heroes screen cards) 9/s; #rigQ (City build queue line) 1/s.
    - HIDDEN on phones (wasted work): #modeTabs (old PC tab buttons) 18/s; #statsList 15/s; #heroesList when not on Heroes 9/s;
      #coreSaveDebugPanel 8/s; #marchesList 1/s; #formationsList on Troops 4/s; #infirmaryPanel, #tileinfo 1/s.
    - Fix pattern = v1280's renderPowerSlots: only rebuild when the data changed (a signature check), and skip panels that aren't shown.
      Real accounts have more heroes/marches, so each rebuild costs more than in the test.
    - Measuring script: dev/simfork/p05_tick_churn.js (MutationObserver counting removed nodes per container).
  - Esper slot note: if the Esper comes back into the Conquest card boxes, it needs its own change check (renderPowerSlots no longer rebuilds the row, v1280).
- **OPEN - Raids steal resources (Harley, 16 Oct):** attacking a city doesn't take resources yet. When it does, the Warehouse's protected amount (protectedReserve(): 1,000 + 500 per Warehouse level + research storageFlat, per resource) is what can't be stolen - like Kingshot's Storehouse. Until then the Warehouse only gives power and meets requirements.
- **OPEN - Anti-cheat (Harley, 16 Oct: "seeing the topic is enough to prompt me"):** first do the 3 IAM grants so the save checker runs (below). Ideas discussed: account-age budget (catches drip-feed edits), compare players, "owns what the server never gave" (Hanzo / Iron Lily / pack & event items vs ledger), server-held VIP level (protects every VIP gate), consistency checks (building vs Town Hall, troop tier vs building, stars vs fragments, weapon level vs fragments, Conquest vs team power), server checks for PvP battles before rankings, hide `game` + obfuscate the LIVE copy near launch, confirm Dev Tools are admin-only.
- **PLANNED - "Juice" pass on the UI (Harley, 20 Oct):** his measuring stick is "does this game look good / how does it compare to the top of the genre in the app stores". Biggest visual gap to top-tier games isn't art, it's juice: menus and panels in those games are "poppy" and bubbly - buttons squash on tap, panels slide/bounce in with easing, rewards burst and fly to the resource bar, numbers count up; ours "just appear and disappear (if we're lucky)" (Harley, after studying a game's menus that morning). Plan when he calls it: pick ONE screen, make every interaction on it feel top-shelf (tap squash, eased slide-ins, reward flight), show him, lock the pattern as reusable CSS/JS, then roll it across screens. Keep the Classic look - juice is motion, not a restyle; gold gradient stays reward-only. Mind the perf work (v1318-v1320): animations should be transform/opacity (compositor), never per-frame style recalc or layout.
  - This is TWO passes he wants: **juice** (motion) and **dressing** (the static look: worked corners, edge trim, subtle texture - AFK Arena-style finish in our Classic palette, no restyle). Harley will record menu videos as feel references: High Seas Hero (the Century boat game he actively plays - in maintenance mode since March; much of KS's naval DNA comes from it), plus Clash Royale / AFK Arena as benchmarks.
  - **Hit list + progress:** the Stats window on Conquest (DONE v1323 - the pattern-setter); still to do: all the City tabs that aren't the main rig; the Backpack; the Level Select; the main Hero view (the index/grid, not the cards). Mockup first each time.
  - **The pattern kit (v1323, art/originals/ui/):** stats_frame_gpt_1024x1536.png = the ornate panel frame (GPT, from Harley's 3 refs: AFK Arena star popup = overall template, AFK bag = shaped tabs, Fortress Saga = perimeter ornaments + header plaque; Harley's calls: cyan active tab, green values, AFK-style lozenge buttons brown/cyan, X only on Stats). stats_mock_gpt_v1 = the first mock (has the tab row + amber tab). stats_row_strip_844x65.png = cleaned stretchable row strip. tab_active_cyan / tab_inactive.png. Workflow that worked: GPT mock from refs -> Harley picks -> slice -> live HTML mock -> GPT repair pass for the no-tab bottom (same trick as the volcano ceiling). Each panel's frame is ~63 kB as webp. The refs are other games' screenshots - do NOT commit them.
  - **Icons (Harley, 20 Oct):** the brown icons sitting in the blue chrome STAY in the brown/bronze family (they now read as on-theme with the dressing direction). He plans to redo some to be more eye-pleasing, but any redo keeps the brown theme - match them toward the kit's bronze-and-gold treatment, never recolor them away from brown.
- **PARKED - Arena targeting (Harley, 16 Oct):** idea of heroes (and the cannon) hitting frontline -> back line -> fortress, like Fortress Saga. Tested, parked as "interesting to come back to"; cannon targeting stays as is. Results + patches: dev/audit/arena_targeting_experiment.md.
- **OPEN - weapons are all free from day one (Harley, 15 Oct, NOT fixed yet on purpose):** today any new player can equip any 3 weapons, Legendaries included; the Weapon Draw only gives level-up fragments. Wanted later: **Epic and Legendary weapons need at least 2 of their own fragments to unlock** before they can be equipped (Elite / Super Rare stay free unless Harley says otherwise). Don't change it yet - Harley is testing weapons on the tomhector account. Ask him before fixing (what happens to weapons already equipped, and whether his test account keeps everything).
- **Balance (9 Oct, v954-v968)** - details in dev/NOTES.md. Test kit: `node dev/balance/run.js --vs v959` (Conquest walls + Gareth's first KO,
  swap test, Arena round-robin). Done: one ranged-on-hero rule for both modes; boss "tank rule"; deterministic combat; Death Strike (Gareth slot 2,
  fires with Shield Slam); Arena fortress HP = +100 per hero power (fights ~30-40 s, were <1 s); Fortress III braced hull (super bursts x0.6);
  Salvo Loader (Elite weapon, amplifies Fortress I's super burst - useless without Fortress I research by design); bots carry weapons /
  Fortress III / Esper; world PvP uses both sides' weapons; Torvald -> Rare. Open: with PARTIAL research Fortress III beats Fortress I at
  every stage (Harley to pick a fix); plain damage weapons are flat (don't grow with heroes) so they're weak in PvP; empty skill slots:
  Roran 2, Torvald 2, Gareth 1, Lyra 1; Salvo Lv50 is a plain +200% for now (any opener boost at Lv50 flips the maxed F1-vs-F3 endgame);
  Gareth/Torvald weak in Arena (Harley: fine for now). Planned: energy-wave bosses (hit all heroes + fortress) -> re-tune with the kit.
- **Events (v946):** admin panel > 🎉 Events; Burst of Life template there (Harley to add a banner and Save). Event progress is checked against the `power` the game writes into each cloud save - client-reported like the rest of the save (anti-cheat flags apply). Neptune (Titan Fountain) skin is now earn-only.
- **Shop (v943):** admin panel > 🛒 Shop & packs (library, tabs, price tiers). In-game: More > Shop, buy button says payments coming soon. Next: connect a payment provider (Stripe recommended for now; see the chat notes on Apple Pay / tax / Xsolla), then the buy button calls it and the webhook calls deliverPurchase(). MXN/EUR/TRY tier prices are suggestions - Harley to check.
- **Maintenance mode (v942):** admin panel > 🛠️ Maintenance mode, per environment. Server doc `<root>config/maintenance`; while on, rules refuse player writes and Cloud Functions refuse non-admin calls; the game shows a lock screen (admins get a red bar and can play); turning it off reloads everyone onto the newest version. Live game (root, still v901) has no lock screen yet, but the server lock already applies to it.
- **Art originals (8 Oct):** every new art asset is kept twice: the full-size original in `art/originals/` (see art/README.md) and a phone-size copy in the game. Never shrink the originals. PC/HD version is parked (mockups on the claude.ai Design canvas "Kingdom Strategy PC Redesign"; PC layout work on branch `wip/pc-layout`, not merged) - Harley is focusing on mobile; PC is just for his checking/testing.
- **Before a public launch (Harley: "a topic of interest later"):** move the images and sounds out of the single game file into separate cached files, so an update doesn't make every player re-download all the art. Measured 13 Oct (TEST v1118): 16.3 MB (11.1 MB gzipped download), of which 11.3 MB is 307 embedded pictures/sounds and 5.0 MB code; LIVE 13.9 MB. Biggest: Gareth sheet 0.43 MB, a screen background 0.35, laser sound 0.26, fortress skins ~0.25 each, village backdrops ~0.23 each.
- **Kessa 3D (in progress, dev/kessa/README.md):** 3D Kessa is in TEST (v1120: idle, attack, Arc Burst + Blender bolts; v1121 same cast + bolt in the Arena; v1122 "Gareth look" - his cel shading + thin dark outline, dev/kessa/pack_toon.py) and her animated hero card (v1119). 3D Roran in TEST (v1123, dev/roran/README.md): idle made from scratch, Mixamo throw + lance, same Gareth look; Arena still throws the old javelin from his slot.
- **Before adding the play-testers:** move Vanaheim on the world map to the bottom-left edge of Kingdom 1, i.e. `WORLD_ATLAS` server1 from x:0,y:1 to x:-1,y:1 (two numbers; bases/saves untouched). Harley is keeping it next to Atlantis for now to test Vanaheim-Atlantis interactions.
- **App stores (later):** thin store app that loads the game from the web (updates skip review); needs Apple/Google in-app payments for gems, a native extra (e.g. push notifications) for Apple, and a "minimum shell version" check.

- **Switch-over (tool built 8 Oct):** admin panel > 📦 Import a save into my account, with the file kingdom_owner_save.json (made from the claude.ai db). Original note: when Harley wants to play on GitHub, copy his real save + custom art (hero art, card art, avatar; `assetitems`, ~47 docs incl. large images) from the
  claude.ai db (readable with the `ArtifactData` tool on the artifact URL) into Firebase (admin seed import path or an admin function), then `adminSetWallet` his gems.
  The legacy "owner" save is at `save/main` + root `assetitems/` in the claude db.
- **Go live:** copy `test/index.html` → root `index.html` when approved (the live world then imports `seed-world.json` the first time an admin opens it).
- **Kingdoms (servers), planned, MUST happen before the public test:** Harley's model: kingdoms are like the observable universe. **Atlantis
  (server0) is Harley's private kingdom beyond the edge: players never reach it, never see it as a neighbour, never see its name.** Players start in
  Kingdom 1, 2, ... TODAY every new signup is assigned to Atlantis (until 1,000 players): fine for now (Harley, 7 Oct: only he is testing), must change before the public test. So: new signups must go to Kingdom 1
  (made real, not the placeholder drawing) or a playtest kingdom; Atlantis is never assigned/drawn/named to players; existing Atlantis accounts stay
  unless moved. Earlier notes: (1) Public test (a small group of friends): Harley UNDECIDED between a separate
  playtest kingdom or "Kingdom 1" (NOTE: "Kingdom 1" is the shaded placeholder neighbour drawn top-left of the world map, NEIGHBOUR_KINGDOMS,
  not a real server yet; Atlantis = server0 = the only real kingdom). Either way = making a second kingdom real. Options: a separate playtest kingdom / Kingdom 1 (keeps Atlantis clean; needs pre-launch signups routed there) or Atlantis (works today: every new signup goes
  to Atlantis until it has 1,000 players). Deciding question: should the testers get a head start in the public kingdom? (2) At real launch Harley
  may move all testers to a new kingdom: an admin-only "move players to kingdom X". Account, progress, heroes, items, gems and mail stay; they get a fresh
  spot on the new map, and the city starts clean (no HP/fire carried over). Alliances belong to the kingdom they were made in (`allyPath` uses the server
  prefix), so they stay behind unless moved with the members: Harley undecided. (3) Later a player "transfer event" (rules TBD) reusing the same move.
  Prerequisite for any second kingdom: the Cloud Functions (`relocateCity`, base hits/fires) use `R + "cities/"` with no server prefix, i.e. Atlantis only.
- **Anti-cheat save check is built but SWITCHED OFF in deploys** (`functions/features.json` saveTriggers=false): the first deploy failed because the
  save trigger needs 3 one-time IAM grants that only the project owner (Harley) can make (Google Cloud console > IAM > Grant access):
  `service-862432836712@gcp-sa-pubsub.iam.gserviceaccount.com` -> Service Account Token Creator; `862432836712-compute@developer.gserviceaccount.com`
  -> Cloud Run Invoker AND Eventarc Event Receiver. After that set saveTriggers=true and push. (Emulator/CI tests always run it.)
- **No base may cover a resource** (Harley, v1000): any tile of a base's 3x3 block holding a resource makes the spot illegal for every placement (claim, teleport, new-player spot, random bots, bot alliances) until that tile stops being a resource (tileBlockReason). Bases placed before v1000 are not moved.
- **Backpack** (Harley, v1023): every consumable lives in the Backpack (brown backpack on the World map and in Conquest), by category (Resources / Speedups / Items / Heroes), with Use / Go. New consumables are added to `BAG_ITEMS`. The red bag in the top bar stays a read-only "what I own" overview (Harley). Resource chests are next: Harley is sending Kingshot's chest info; levels are fixed amounts per level.
- **Map look is shared** (v1021): the isometric sliders (tile size, base art size, base height in Dev Tools > Visuals > Effects & Sound) are one setting for every player (doc `assetitems/_mapiso`); an admin moving them saves it for all. Per-skin alignment sits on top of it.
- **Base skin alignment** (Harley, v1013): each base skin's picture has its own left/right, up/down (in tiles) and size, set by an admin in Dev Tools > Visuals > 🏰 Base skin alignment and shared with every player (doc `assetitems/_skinalign`). The 3x3 squares (grid) never move. New skins start at 0 / 0 / x1.
- **Idle Chest** (Harley, v1003): fills 24/7 (online and offline) up to 8h; Field Logistics research raises it to 16h and makes drops a little faster (20 → 16 min). Holds Energon, Valor, 25% of resource production and an item every 20 min. Regular items: draw tickets, speedups, Research Points. Rare: hero shards (owned, non-VIP heroes), Conquest Books. **Never gems, weapon fragments or cards.** Pops up only when full; otherwise the 🌙 World map icon. Rolled in the game (client side), like the rest of the save.
- **The game runs on the server's clock** (Harley, v1004): on load and whenever the app comes back to the front it reads the web server's time (the page's Date header); if the phone is over a minute off, the difference is added to the game clock (`ksClockSkew`, inside `vnow()`). The game doesn't tick until that check is done (5 s timeout, then it carries on and re-checks every 10 min). Don't add game timing on raw `Date.now()`; use `vnow()`.
- **Security panel (v995, admin site > 🛡️ Security):** live feed, overview stats, players, oddities (top reasons, repeat offenders), bans, limit sliders,
  auto-rollback switch, audit log. Per player (Anti-cheat tab): dismiss / watch / trust / hide from rankings & events / roll back / suspend / ban / lift.
  Data: `<env>secconfig/main` (autoRevert + limit overrides, read by the save trigger), `bans/<uid>` (kind suspend|ban|restore; rules block that player's
  writes; the game shows a notice; "restore" = 60 s lock while a rollback lands, the open game reloads once), `acsnap/<uid>` (last good save from before
  the first flag of an episode; a dismiss starts a new episode), `secaudit` (every action). Rollback keeps the cheated save as save/backup_<time>.
  Trusted players are never auto-rolled back. "Hidden" = claimEvent refused (no multiplayer rankings exist yet; future rankings must skip `restricted`).
  No device / multi-account matching: the no-tracking rule. Nothing reaches the panel until the save trigger is switched on (the 3 IAM grants above).
- Anti-cheat stage 2 (v920): save plausibility checks run on every save (once switched on), FLAG ONLY (admin site: "⚑ Flagged players"). Next: review real flags,
  tighten the bounds (functions/core.js AC), then decide whether to switch on AC_REVERT (puts the previous save back; destructive). Battles are not checked.
  Level-claim speed floor is the game's physical minimum (~350k gems/day if faked nonstop); tighten if Harley wants.
- (Fixed v918: cannon/weapon kills now wait for the killing shot; drone/railgun drawn.)
- Cost: v919 made map chunks load nearby-only and stopped the 5-min full re-read. Still loaded in full per session: all cities of the kingdom
  (needed for zoomed-out markers; bounded by the 1,000-player cap) and all active marches. Revisit if a kingdom gets busy.
- Payment provider for packs: not chosen. `deliverPurchase()` is ready for a verified webhook.
- Chat: message limit is 500 but the input box allows 1500 (silently cut), and alliance chat has no server-side length rule. Harley was asked what limit he wants.
- Earlier backlog (from the artifact era): march troop cap (City Guard uncapped until then), hero exclusivity guard vs attack, burning marker when zoomed out,
  per-skin flame spots, alliance gifts/help/rallies/reinforcements/province capture, Grass 2 still a trial in the paint menu.
- Parked idea (Harley: "leave it for now"): a "recent accounts on this device" list on the sign-in screen (name + partly hidden email, tap to sign in, ✕ to forget, max ~5, never stores passwords).
- Firebase warning seen in deploys: "Unhandled error cleaning up build images". Harmless, but old images in Artifact Registry may cost a few cents; clean up occasionally.

## Repo layout

```
index.html            live game (v1198 since 16 Oct 2026)
test/index.html       test game (latest)          seed-world.json (+ test/)  painted map imported once per env
admin/index.html      admin website
functions/            Cloud Functions: index.js, core.js (pure, unit-tested), items.json, packs.json, admins.json, test/
tools/build-rules.js  generates firestore.rules
ci/                   integration.test.js (emulator), e2e.test.js (real browser), package.json
.github/workflows/firebase.yml   test → deploy → invoker → smoke
dev/NOTES.md          full version history          dev/tests/  headless stand-ins          dev/simfork/  test scripts
dev/assets/           art sources (sprites, forest pieces, hills/mountains, fire sheet, grass tiles, obelisk, towers ...)
```
