const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const ids=await p.evaluate(()=>{ const s=game.state; s.troops.infantry=120; if(s.formations[0]) s.formations[0].troops={infantry:30}; setScreen('world');
    const home=tileXY(s.homeTileId); const res=s.map.filter(x=>x.type==='resource').sort((a,b)=>Math.hypot(a.x-home[0],a.y-home[1])-Math.hypot(b.x-home[0],b.y-home[1]));
    const empty=s.map.find(x=>x.type==='empty' && Math.abs(x.x-home[0])>6 && x.x<20 && x.y<20 && !isTileTooCloseToCity(x.id));
    const other=s.map.find(x=>x.type==='empty' && x.id!==empty.id && Math.abs(x.x-home[0])>8 && x.x<20 && x.y<20);
    occupiedTileIds[other.id]='bot_9f3a2c'; otherCityStatsCache['bot_9f3a2c']={power:32037,townhallLevel:7,heroCount:4,troopsTotal:1800};
    return {gold:(res.find(r=>r.resourceType==='gold')||res[0]).id, wood:(res.find(r=>r.resourceType==='wood')||res[0]).id, home:s.homeTileId, empty:empty.id, other:other.id}; });
  const shots=[];
  for (const k of ['gold','home','other','empty','wood']) { await p.evaluate(id=>goToWorldTile(id), ids[k]); await p.waitForTimeout(700); await p.evaluate(()=>renderTileInfo()); await p.waitForTimeout(200);
    const r=await p.evaluate(()=>{ const e=document.getElementById('tileinfo').getBoundingClientRect(); return [e.left,e.top,e.width,e.height]; }); await p.screenshot({path:`g99_${k}.png`, clip:{x:Math.max(0,r[0]-4),y:Math.max(0,r[1]-4),width:r[2]+8,height:r[3]+8}}); shots.push(k); }
  console.log(shots, errs); await b.close();
})();
