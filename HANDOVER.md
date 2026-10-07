# Kingdom Strategy — handover

Read this first if you're a new Claude session picking up this project. It's written so you can carry on exactly where the last session stopped.
Version history (what changed, why, how it was tested) is in **[dev/NOTES.md](dev/NOTES.md)**. Newest entries are at the bottom.

**State at handover (7 Oct 2026, game v915):** everything below is built, tested and deployed. The live game link still serves the
pre-Firebase v901 and is waiting for Harley's go-ahead. Harley's real save and custom art are still in the claude.ai artifact database (see "Open items").

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
   - Backups were `game_vNNN.html` (latest v915). Git history now does that job: commit each version with its number.
   - Add a `dev/NOTES.md` entry per version (`## vNNN` + bullet points).
   - Publish to the claude.ai artifact (`Artifact` tool, `url` above, a short `label`, **don't pass `capabilities`**; the `db` capability carries forward).
   - Copy to `test/index.html` and push. Copy to the root `index.html` **only when Harley approves** ("test first, then live").
2. **Server changes** (`functions/`, `tools/`, `ci/`, `admin/`, `test/index.html`): push to `main`. The `firebase` workflow then:
   - runs unit tests (`functions/test/core.test.js`), emulator security/function tests (`ci/integration.test.js`) and a real-browser end-to-end test of the game + admin site (`ci/e2e.test.js`);
   - only if all pass, deploys rules + functions, makes every exported function callable (`gcloud run services add-iam-policy-binding … allUsers`), and smoke-tests them.
   - Read results on the `ci-logs` branch: `git fetch origin ci-logs && git show origin/ci-logs:test.log`.
3. **The session's own sandbox can't reach Firebase, npm's `firebase` package or github.io.** Everything Firebase-side is verified through GitHub Actions.
   Local headless tests use stand-ins: `dev/tests/mockdb.js` (claude db), `dev/tests/fakefb.js` (Firebase compat SDK), `dev/tests/fnrunner.js` (runs the real `functions/index.js` against the stand-in store).
   `dev/simfork/*.js` are the test scripts by topic (paths inside assume the original `/home/claude/` layout; adjust).
   Sanity check: `dev/tests/e.js` must print `object function`.

## Harley's standing preferences (follow these)

- Keep reports concise. Explain things in plain terms; he's not a programmer.
- **Reproduce a bug before fixing it**; measure before and after. Testing is headless Chromium only, so never claim it was tested on his phone.
- Game UI style: dark navy and gold, flat cyan buttons, dashed and dotted borders. He **dislikes round, puffy, bushy trees and bushes**.
- Use `/* */` comments inside one-line functions.
- Inspiration: Shining Force 2, Ultima VII; genre references Kingshot / High Seas Hero.
- Fixes must not noticeably change the established look.
- Ask before doing anything expensive or irreversible. When he says stop or wait, stop.
- **No player tracking/analytics.** Only what's needed: purchase audit, item ledger, account created / last seen. Chat is not auto-deleted (his call, for now).

## Open items / to-dos

- **Switch-over:** when Harley wants to play on GitHub, copy his real save + custom art (hero art, card art, avatar; `assetitems`, ~47 docs incl. large images) from the
  claude.ai db (readable with the `ArtifactData` tool on the artifact URL) into Firebase (admin seed import path or an admin function), then `adminSetWallet` his gems.
  The legacy "owner" save is at `save/main` + root `assetitems/` in the claude db.
- **Go live:** copy `test/index.html` → root `index.html` when approved (the live world then imports `seed-world.json` the first time an admin opens it).
- Anti-cheat stage 2: server-checking normal progress (resources, buildings, troops) and battles. Only gems/premium are server-side now.
  Level-claim speed floor is the game's physical minimum (~350k gems/day if faked nonstop); tighten if Harley wants.
- Cost: zoomed-out world loads every city per session. Fine at 100 players; optimise (load nearby only) before ~several hundred.
- Payment provider for packs: not chosen. `deliverPurchase()` is ready for a verified webhook.
- Chat: message limit is 500 but the input box allows 1500 (silently cut), and alliance chat has no server-side length rule. Harley was asked what limit he wants.
- Earlier backlog (from the artifact era): march troop cap (City Guard uncapped until then), hero exclusivity guard vs attack, burning marker when zoomed out,
  per-skin flame spots, alliance gifts/help/rallies/reinforcements/province capture, Grass 2 still a trial in the paint menu.
- Parked idea (Harley: "leave it for now"): a "recent accounts on this device" list on the sign-in screen (name + partly hidden email, tap to sign in, ✕ to forget, max ~5, never stores passwords).
- Firebase warning seen in deploys: "Unhandled error cleaning up build images". Harmless, but old images in Artifact Registry may cost a few cents; clean up occasionally.

## Repo layout

```
index.html            live game (currently v901, pre-Firebase)
test/index.html       test game (latest)          seed-world.json (+ test/)  painted map imported once per env
admin/index.html      admin website
functions/            Cloud Functions: index.js, core.js (pure, unit-tested), items.json, packs.json, admins.json, test/
tools/build-rules.js  generates firestore.rules
ci/                   integration.test.js (emulator), e2e.test.js (real browser), package.json
.github/workflows/firebase.yml   test → deploy → invoker → smoke
dev/NOTES.md          full version history          dev/tests/  headless stand-ins          dev/simfork/  test scripts
dev/assets/           art sources (sprites, forest pieces, hills/mountains, fire sheet, grass tiles, obelisk, towers ...)
```
