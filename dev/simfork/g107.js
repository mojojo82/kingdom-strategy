const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const iso of [false,true]) {
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  if (iso) await p.evaluate(()=>document.getElementById('devMapIsoBtn').click());
  const ids=await p.evaluate(()=>{ const s=game.state; setScreen('world'); const ht=mapTileAt(s.map,64,30); s.homeTileId=ht.id; const bt=mapTileAt(s.map,48,31); occupiedTileIds[bt.id]='bot_abc'; otherCityStatsCache['bot_abc']={power:1,townhallLevel:1,heroCount:1,troopsTotal:1};
    shareTileToChat(ht.id); shareTileToChat(bt.id); return [ht.id, bt.id]; });
  for (const id of ids) {
    await p.evaluate(()=>{ chatTab='world'; setScreen('more','chat'); renderWorldChat(); }); await p.waitForTimeout(500);
    await p.click(`.chat-loc[data-tile="${id}"]`); await p.waitForTimeout(1200);
    console.log(iso?'iso':'flat', id, JSON.stringify(await p.evaluate((id)=>{ const vp=document.getElementById('mapviewport'), v=vp.getBoundingClientRect(), el=mapTileEls[id]; const r=el?el.getBoundingClientRect():{left:0,width:0,top:0,height:0}; const xy=tileXY(id); const c=tileCenterPx({x:xy[0],y:xy[1]}); return {tileOffsetFromCentre:[Math.round(r.left+r.width/2-(v.left+v.width/2)), Math.round(r.top+r.height/2-(v.top+v.height/2))], expectedScroll:[Math.round(c.x-vp.clientWidth/2),Math.round(c.y-vp.clientHeight/2)], scroll:[vp.scrollLeft,vp.scrollTop], vpH:vp.clientHeight, sel:selectedTile, hasEl:!!el, screen:appScreen, vpW:vp.clientWidth}; }, id)));
  }
  console.log(errs); await p.close(); }
  await b.close();
})();
