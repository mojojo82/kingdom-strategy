/* v1015: research starts very cheap (level 1 = old level 1 / 600, ~1-3k RP) and climbs to the SAME level 10 as before. Run: node dev/simfork/g234_research_costs.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), P = await b.newPage(), errs = []; P.on("pageerror", (e) => errs.push(e.message));
  await P.route(/.*/, (r) => /^about|^data/.test(r.request().url()) ? r.continue() : r.abort());
  await P.setContent(fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8")); await P.waitForTimeout(1500);
  const r = await P.evaluate(() => { const g = createGame({ mapSize: 3, seed: 1 }), o = {};
    Object.keys(TECH_DEFS).forEach((k) => { const d = TECH_DEFS[k], old = (l) => Math.round(d.baseCost * Math.pow(d.costMult, l - 1)), c = [1, 2, 3, 10].map((l) => g.techCostFor(k, l));
      o[k] = { l1: c[0], l2: c[1], l3: c[2], l10: c[3], old1: old(1), old10: old(10) }; });
    const earlyAll = Object.keys(o).reduce((a, k) => a + o[k].l1 + o[k].l2 + o[k].l3, 0);
    return { o, earlyAll, academy1PerHour: 3 * 3600 }; });
  console.log("levels 1-3 of every tech:", r.earlyAll, "RP =", (r.earlyAll / r.academy1PerHour).toFixed(1), "h at Academy 1");
  Object.keys(r.o).forEach((k) => { const t = r.o[k];
    assert.ok(t.l1 <= 3500 && t.l1 >= 100, k + ": level 1 is cheap (" + t.l1 + ")");
    assert.ok(t.l1 < t.l2 && t.l2 < t.l3 && t.l3 < t.l10, k + ": costs climb");
    assert.ok(Math.abs(t.l10 - t.old10) <= 1, k + ": level 10 unchanged"); });
  assert.ok(r.earlyAll / (3 * r.academy1PerHour) < 10, "levels 1-3 of every tech in under 10 h of a level 3 Academy");
  assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
