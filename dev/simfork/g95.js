const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const info=await p.evaluate(()=>{ const s=game.state; s.troops.infantry=100; if(s.formations[0]) { s.formations[0].troops={infantry:30}; } setScreen('world');
    const home=tileXY(s.homeTileId); const t=s.map.filter(x=>x.type==='resource').sort((a,b)=>Math.hypot(a.x-home[0],a.y-home[1])-Math.hypot(b.x-home[0],b.y-home[1]))[0];
    goToWorldTile(t.id); return {forms:s.formations.length, tile:t.id}; });
  await p.waitForTimeout(800);
  console.log(info, await p.evaluate(()=>({btns:[...document.querySelectorAll('#armyform .formation-attack-btn')].map(b=>b.textContent+(b.disabled?' [disabled]':'')), hero:!!document.querySelector('#armyform select'), inputs:document.querySelectorAll('#armyform input').length, header:document.getElementById('tileinfoHeader').textContent})));
  await p.screenshot({path:'g95.png'});
  await p.click('#armyform .formation-attack-btn'); await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>({sel:selectedTile, cardVisible:(()=>{const el=document.getElementById('tileinfo'); return el? getComputedStyle(el).display+' '+el.innerHTML.length : 'none';})()})), await p.evaluate(()=>game.state.marches.map(m=>({action:m.action, army:m.army, tile:m.tileId}))), errs); await b.close();
})();
