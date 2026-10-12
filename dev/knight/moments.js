const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const TS = JSON.parse(process.argv[2]), ANIM = process.argv[3] || "Overhead Chop", ANG = process.argv[4];
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 520, height: 900 } }); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + __dirname + "/fit.html"); await p.waitForTimeout(800);
  await p.selectOption("#anim", ANIM); await p.evaluate(() => { document.getElementById("speed").value = 0; }); await p.selectOption("#look", "cel"); await p.evaluate(() => { var s = document.getElementById("spin"); if (s) s.value = "0"; window.__pause = true; document.getElementById("cv").style.transform = ""; });
  for (let i = 0; i < TS.length; i++) { if (ANG != null) await p.evaluate((a) => window.__setAng(+a), ANG); await p.evaluate((v) => window.__setT(v), TS[i]); await p.waitForTimeout(400); await (await p.$("#stage")).screenshot({ path: __dirname + "/m" + i + ".png" }); }
  console.log(errs); await b.close();
})();
