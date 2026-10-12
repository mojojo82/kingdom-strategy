// renders anim frames on a see-through background: node render.js '<json {name:[times]}>'
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const JOBS = JSON.parse(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1100, height: 1000 } }); const e = []; p.on("pageerror", x => e.push(x.message));
  await p.goto("file://" + __dirname + "/fit.html"); await p.waitForTimeout(800);
  await p.addStyleTag({ content: "html,body{background:transparent!important}.wrap{max-width:none!important}.stage{background:none!important;border:0!important;height:760px!important}.plate,.name{display:none!important}" });
  await p.evaluate(() => { window.__pause = true; document.getElementById("spin").value = "0"; document.getElementById("cv").style.transform = ""; window.dispatchEvent(new Event("resize")); });
  await p.selectOption("#look", "cel"); await p.waitForTimeout(500);
  for (const [anim, times] of Object.entries(JOBS)) {
    await p.selectOption("#anim", anim);
    for (let i = 0; i < times.length; i++) {
      await p.evaluate(([v, a]) => { window.__setAng(a); window.__setT(v); }, [times[i], -Math.PI / 2]); await p.waitForTimeout(250);
      await (await p.$("#cv")).screenshot({ path: `${__dirname}/frames/${anim.replace(/\W/g, "")}_${String(i).padStart(2, "0")}.png`, omitBackground: true });
    }
  }
  console.log("errors", e); await b.close();
})();
