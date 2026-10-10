// Builds firestore.rules. The same game rules apply to live data (database root) and test data (envs/test/...),
// so the body is written once here and placed under both. Run: node tools/build-rules.js
"use strict";
const fs = require("fs"), path = require("path");
const admins = require("../functions/admins.json");
const adminList = "[" + admins.map((u) => "'" + u + "'").join(", ") + "]";
/* Admin powers need Google sign-in (that is where 2-step verification lives). Only the CI emulator run (CI_ADMIN_ANY_PROVIDER=1) relaxes this. */
const adminProv = process.env.CI_ADMIN_ANY_PROVIDER === "1" ? "" : " && request.auth.token.firebase.sign_in_provider == 'google.com'";

const BODY = `
      // ---- players: each player writes only their own data. Wallet (gems), ledger (item history) and meta (account dates)
      //      are written by the server only, and readable only by that player and admins. ----
      match /players/{pid}/{coll}/{docId} {
        allow read: if signedIn() && (!(coll in serverOnly()) || isMe(pid) || isAdmin());
        allow write: if !(coll in serverOnly()) && (isMe(pid) || (isAdmin() && pid.matches('bot_.*'))) && open();
      }
      // ---- purchases: written by the server only; a player can read their own, admins all ----
      match /purchases/{id} {
        allow read: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid);
        allow write: if false;
      }
      // ---- legacy single-owner paths from the claude.ai version: admin only ----
      match /save/{d} { allow read, write: if isAdmin(); }
      match /session/{d} { allow read, write: if isAdmin(); }
      match /assets/{d} { allow read, write: if isAdmin(); }
      match /assetitems/{d} { allow read: if signedIn(); allow write: if isAdmin(); }

      // ---- cities: anyone signed in can claim an empty tile as their own; HP / fire fields are server-only ----
      match /cities/{cid} {
        allow read: if signedIn();
        allow create: if open() && signedIn() && (request.resource.data.owner == request.auth.uid || (isAdmin() && request.resource.data.owner.matches('bot_.*')))
                      && !request.resource.data.keys().hasAny(hpKeys());
        allow update: if open() && signedIn() && (resource.data.owner == request.auth.uid || isAdmin())
                      && request.resource.data.owner == resource.data.owner
                      && !request.resource.data.diff(resource.data).affectedKeys().hasAny(hpKeys());
        allow delete: if isAdmin() || (resource.data.owner == request.auth.uid && !resource.data.keys().hasAny(hpKeys()));
      }

      // ---- world chat: post as yourself only, max 2000 characters (v1019: was 500 - emoji art got cut), no edits ----
      match /worldchat/{mid} {
        allow read: if signedIn();
        allow create: if open() && signedIn() && request.resource.data.pid == request.auth.uid
                      && request.resource.data.text is string && request.resource.data.text.size() <= 2000
                      && request.resource.data.ts is number;
        allow update, delete: if isAdmin();
      }

      // ---- hand-painted map: admin only ----
      match /terrain/{d} { allow read: if signedIn(); allow write: if isAdmin(); }
      match /mapdecor/{d} { allow read: if signedIn(); allow write: if isAdmin(); }

      // ---- maintenance switch (v942): anyone may read it (shown before sign-in too), only the server writes it ----
      match /config/{d} { allow read: if true; allow write: if false; }
      match /packs/{d} { allow read: if signedIn(); allow write: if false; } // v943: shop packs / mail bundles - made in the admin panel (server writes)

      // ---- server bookkeeping ----
      match /adminlog/{d} { allow read: if isAdmin(); allow write: if false; }
      match /acplayers/{d} { allow read: if isAdmin(); allow write: if false; } // anti-cheat flags (v920): server writes, admins read
      // ---- v995 Security panel: bans (a player may read only their own, to show the notice), config, audit log, pre-flag snapshots ----
      match /bans/{d} { allow read: if isAdmin() || isMe(d); allow write: if false; }
      match /secconfig/{d} { allow read: if isAdmin(); allow write: if false; }
      match /secaudit/{d} { allow read: if isAdmin(); allow write: if false; }
      match /acsnap/{d} { allow read: if isAdmin(); allow write: if false; }

      // ---- shared world state used by every client (stage 2 will move these behind the server too) ----
      match /alliances/{aid} { allow read: if signedIn(); allow write: if signedIn() && open(); }
      match /alliances/{aid}/{sub}/{d} { allow read: if signedIn(); allow write: if signedIn() && open(); }
      match /allyindex/{pid} { allow read: if signedIn(); allow write: if signedIn() && open(); }
      match /chunks/{d} { allow read: if signedIn(); allow write: if signedIn() && open(); }
      match /marches/{d} { allow read: if signedIn(); allow write: if signedIn() && open(); }
      match /servers/{d} { allow read, write: if signedIn(); }
      match /world/{d} { allow read, write: if signedIn(); }
      match /_leases/{d} { allow read, write: if signedIn(); }
`;

const MAINT_LIVE = "/databases/$(database)/documents/config/maintenance", MAINT_TEST = "/databases/$(database)/documents/envs/$(env)/config/maintenance";
/* v995: a suspended / banned player (or one whose game an admin is rolling back) can't write anything. kind "ban" = for good, others until untilMs. */
const BAN_LIVE = "/databases/$(database)/documents/bans/$(request.auth.uid)", BAN_TEST = "/databases/$(database)/documents/envs/$(env)/bans/$(request.auth.uid)";
const notBanned = (P) => `(!exists(${P}) || (get(${P}).data.kind != 'ban' && get(${P}).data.untilMs < request.time.toMillis()))`;
const out = `rules_version = '2';
// GENERATED by tools/build-rules.js - edit that file, not this one.
// Live data sits at the database root, test data under envs/test/. Same rules for both.
service cloud.firestore {
  match /databases/{database}/documents {
    // A real account (Google or email). Guest/anonymous sign-ins are not enough.
    function signedIn() { return request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous'; }
    function isMe(pid) { return signedIn() && request.auth.uid == pid; }
    function isAdmin() { return signedIn() && request.auth.uid in ${adminList}${adminProv}; }
    function hpKeys() { return ['hp', 'hpT', 'burnLeft', 'raidedAt']; }
    function serverOnly() { return ['wallet', 'ledger', 'meta', 'mail']; }

    // ===== live =====
    function liveOpen() { return isAdmin() || (!(exists(${MAINT_LIVE}) && get(${MAINT_LIVE}).data.on == true) && ${notBanned(BAN_LIVE)}); } // v942: maintenance locks player writes; v995: so does a ban / suspension
${BODY.replace(/open\(\)/g, "liveOpen()")}
    // ===== test (same rules) =====
    match /envs/{env} {
      allow read, write: if false;
      function testOpen() { return isAdmin() || (!(exists(${MAINT_TEST}) && get(${MAINT_TEST}).data.on == true) && ${notBanned(BAN_TEST)}); }
${BODY.replace(/^      /gm, "        ").replace(/open\(\)/g, "testOpen()")}
    }
  }
}
`;
fs.writeFileSync(path.join(__dirname, "../firestore.rules"), out);
console.log("firestore.rules written, admins:", admins.length);
