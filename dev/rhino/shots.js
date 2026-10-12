const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const ANIM = process.argv[2], TS = JSON.parse(process.argv[3]), ANG = process.argv[4];
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"] });
 const p = await b.newPage({ viewport: { width: 520, height: 820 } }); const e = []; p.on("pageerror", x => e.push(x.message)); p.on("console", m => { if (m.type() === "error") e.push(m.text()); });
 await p.goto("file://" + __dirname + "/rhino.html"); await p.waitForTimeout(1500); await p.selectOption("#anim", ANIM);
 if (ANG != null) await p.selectOption("#turn", "hold"); await p.evaluate(() => { window.__pause = true; });
 for (let i = 0; i < TS.length; i++) { await p.evaluate(([v, a]) => { window.__setT(v); if (a != null) window.__setAng(+a); }, [TS[i], ANG]); await p.waitForTimeout(250); await (await p.$("#stage")).screenshot({ path: __dirname + "/s" + i + ".png" }); }
 console.log(e); await b.close(); })();
