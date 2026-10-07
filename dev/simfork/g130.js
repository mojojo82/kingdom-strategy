const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  console.log(await p.evaluate(()=>{ const n=mapSizeTiles(), c={}; let tot=0;
    for (let cy=0; cy<n; cy+=100) for (let cx=0; cx<n; cx+=100) game.state.map.resourcesIn(cx,Math.min(n-1,cx+99),cy,Math.min(n-1,cy+99)).forEach(t=>{ c[t.resourceType]=(c[t.resourceType]||0)+1; tot++; });
    return JSON.stringify({n, tot, c, icon: RES_ICON.food.slice(0,80)}); }));
  await b.close();
})();
