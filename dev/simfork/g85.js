const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; s.heroes.gareth.owned=true; if(!s.conquestRoster.includes('gareth')) s.conquestRoster.unshift('gareth'); setScreen('conquest'); });
  await p.waitForTimeout(12000);
  console.log(await p.evaluate(()=>{ const v=idleAnim.heroVis.gareth; idleAnim.skTgtX={gareth: Math.max(60, v.x-130)}; idleAnim.skillFlash.gareth=1; idleAnim.chargeFlashPrev={gareth:false}; return {vx:v.x}; }));
  const c=await p.$('#idleCanvas');
  for(let i=0;i<4;i++){ await p.waitForTimeout(110); console.log(i, await p.evaluate(()=>{const m=heroChargeMem.c_gareth; return m?{left:m.left,from:Math.round(m.fromX),end:Math.round(m.endX),cx:Math.round(m.cx)}:null;})); await c.screenshot({path:`g85_${i}.png`}); }
  await p.waitForTimeout(1200); console.log(await p.evaluate(()=>({vx:idleAnim.heroVis.gareth.x, mem:!!heroChargeMem.c_gareth})), errs); await b.close();
})();
