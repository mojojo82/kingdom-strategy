const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const r=await p.evaluate(async()=>{ const s=game.state; s.troops.infantry=100; setScreen('world'); const ht=s.map.find(x=>x.type==='empty'&&x.x>=8&&x.x<=12&&x.y>=8&&x.y<=12); s.homeTileId=ht.id;
    const res=s.map.find(x=>x.type==='resource'); game.sendMarch({infantry:10},res.id,'gather',[]);
    const tgt=s.map.find(x=>x.type==='empty'&&x.x>=40&&x.y>=40&&!isTileTooCloseToCity(x.id)); goToWorldTile(tgt.id); await new Promise(r=>setTimeout(r,500));
    const btn=document.getElementById('teleportBtn'); const out={disabled:btn.disabled, msg:(document.getElementById('tileinfo').textContent.split('Teleport Here')[1]||'').slice(0,80)};
    const rr=await teleportTo(tgt.id); out.result=rr.reason; out.homeUnchanged=s.homeTileId===ht.id;
    s.marches=[]; renderTileInfo(); out.enabledAfterHome=!document.getElementById('teleportBtn').disabled; return out; });
  console.log(JSON.stringify(r), errs); await b.close();
})();
