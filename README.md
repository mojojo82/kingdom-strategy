# Kingdom Strategy

- `index.html` — live game (players). Data at the root of Firestore.
- `test/index.html` — test build. Data under `envs/test/` in Firestore, so testing never touches live players.
- `firestore.rules` — Firestore security rules (paste into the Firebase console).

The Firebase backend switches on automatically when the game runs on github.io. Inside claude.ai the game keeps using the claude.ai database.
A small 🔥 badge bottom-left shows which backend/env is running and whether it connected (tap it for details).
