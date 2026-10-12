// rhino frames on a see-through background: node render.js <anim> '<times json>' <outdir> [angle]
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const A = process.argv[2], TS = JSON.parse(process.argv[3]), OUT = process.argv[4], ANG = process.argv[5] || -1.15;
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"] });
 const p = await b.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 }); const e = []; p.on("pageerror", x => e.push(x.message));
 await p.goto("file://" + __dirname + "/rhino.html"); await p.waitForTimeout(1500);
 await p.addStyleTag({ content: "html,body{background:transparent!important}.wrap{max-width:none!important}.stage{background:none!important;border:0!important;height:800px!important}" });
 await p.selectOption("#anim", A); await p.selectOption("#turn", "hold"); await p.evaluate((a) => { window.__pause = true; window.__setAng(+a); window.dispatchEvent(new Event("resize")); }, ANG); await p.waitForTimeout(500);
 for (let i = 0; i < TS.length; i++) { await p.evaluate((v) => window.__setT(v), TS[i]); await p.waitForTimeout(200); await (await p.$("#cv")).screenshot({ path: `${OUT}/${String(i).padStart(2, "0")}.png`, omitBackground: true }); }
 console.log("errors", e); await b.close(); })();
