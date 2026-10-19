// v942: writes version.json next to each game page from the KS_BUILD constant inside it, so a running game can tell a newer one is out.
// Run after bumping KS_BUILD:  node tools/stamp-version.js        CI check (fails if out of date):  node tools/stamp-version.js --check
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
let bad = 0;
for (const dir of ["test", "."]) {
  const page = path.join(ROOT, dir, "index.html"); if (!fs.existsSync(page)) continue;
  const m = /var KS_BUILD = "([^"]+)"/.exec(fs.readFileSync(page, "utf8")); if (!m) { console.log(dir + "/index.html: no KS_BUILD (older game) - skipped"); continue; }
  const file = path.join(ROOT, dir, "version.json"), want = JSON.stringify({ v: m[1] }) + "\n";
  const have = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (process.argv.includes("--check")) { if (have !== want) { console.log("OUT OF DATE: " + path.relative(ROOT, file) + " should say " + m[1]); bad++; } else console.log("ok " + path.relative(ROOT, file) + " = " + m[1]); }
  else { fs.writeFileSync(file, want); console.log("wrote " + path.relative(ROOT, file) + " = " + m[1]); }
}
// v1315: level art lives in art/levels/ and the game asks for levelArt("file.webp", "<fingerprint>"). Keep each fingerprint matching the file
// (so phones re-download a changed picture) and make sure every file exists.
const crypto = require("crypto");
for (const dir of ["test", "."]) {
  const page = path.join(ROOT, dir, "index.html"); if (!fs.existsSync(page)) continue;
  let src = fs.readFileSync(page, "utf8"), changed = 0;
  src = src.replace(/levelArt\("([^"]+)", "([0-9a-f]*)"\)/g, (all, file, h) => {
    const f = path.join(ROOT, "art", "levels", file);
    if (!fs.existsSync(f)) { console.log("MISSING level art: art/levels/" + file + " (used by " + dir + "/index.html)"); bad++; return all; }
    const want = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex").slice(0, 10);
    if (want === h) return all;
    if (process.argv.includes("--check")) { console.log("STALE fingerprint for " + file + " in " + dir + "/index.html"); bad++; return all; }
    changed++; return 'levelArt("' + file + '", "' + want + '")';
  });
  if (changed) { fs.writeFileSync(page, src); console.log("updated " + changed + " level art fingerprint(s) in " + dir + "/index.html"); }
}
process.exit(bad ? 1 : 0);
