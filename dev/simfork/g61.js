const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => { orbitShieldCfg.preview = true; orbitShieldCfg.trail = 30; setScreen('conquest'); }); await p.waitForTimeout(2500);
  console.log(JSON.stringify(await p.evaluate(()=>({cfg:orbitShieldCfg, sl:document.getElementById('osDepthVal').textContent+' '+document.getElementById('osLightVal').textContent}))));
  const c = await p.$('#idleCanvas'); await c.screenshot({ path: 'os_v817.png' });
  console.log(errs);
  await b.close();
})();
