const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => { setScreen('conquest'); document.getElementById('devOozeBlobBtn').click(); }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const o={type:'infantry'}, bo={type:'boss'}; const n0=weldSparks.length; spawnHitFx(bo,100,100,1,24,0); const nb=weldSparks.filter(x=>x.blob).length; spawnHitFx(o,200,120,1,24,0); return {on:oozeBlobsOn, skin:ENEMY_INFANTRY_SKIN, afterBoss:nb, blobs:weldSparks.filter(x=>x.blob).length, btn:document.getElementById('devOozeBlobBtn').textContent}; });
  console.log(JSON.stringify(r));
  await p.evaluate(()=>{for(let i=0;i<3;i++)spawnOozeBlobs(200,150,1,30);}); await p.waitForTimeout(120);
  await (await p.$('#idleCanvas')).screenshot({path:'blob.png'});
  console.log(errs); await b.close();
})();
