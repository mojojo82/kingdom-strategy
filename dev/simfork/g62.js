const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const f of ['game_v817','game']) {
    const p = await b.newPage({ viewport: { width: 420, height: 800 } });
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/'+f+'.html'); await p.waitForTimeout(2000);
    await p.evaluate(() => { orbitShieldCfg.preview = true; setScreen('conquest'); }); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const c=document.createElement('canvas'); c.width=420;c.height=250; const x=c.getContext('2d'); const set=orbitShieldSet('bench'); const t0=performance.now(); for(let i=0;i<200;i++){ set.last=performance.now()-16; orbitShieldStep(set,200,150,120); orbitShieldDrawPass(x,set,false); orbitShieldDrawPass(x,set,true);} return {ms:(performance.now()-t0)/200, n:set.P.length}; });
    console.log(f, JSON.stringify(r), errs);
    if (f==='game') await (await p.$('#idleCanvas')).screenshot({path:'os_v818.png'});
    await p.close();
  }
  await b.close();
})();
