const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('devMapIsoBtn').click()); await p.waitForTimeout(500);
  console.log(await p.evaluate(()=>({cloud: typeof cloudDb!=='undefined' && !!cloudDb, pid: typeof PLAYER_ID!=='undefined'?PLAYER_ID:null})));
  // fake cloudDb to exercise the success path
  await p.evaluate(() => {
    window.cloudDb = { doc: function(path){ return { acquire: function(){ return Promise.resolve({acquired:true}); }, get: function(){ return Promise.resolve({exists:false, data:function(){return null;}}); }, set: function(){ return Promise.resolve(); }, delete: function(){ return Promise.resolve(); } }; } };
  });
  const r = await p.evaluate(async () => {
    const [x,y]=tileXY(game.state.homeTileId); const target=(x+6)+","+y; selectedTile=target; renderVisibleTiles(); renderTileInfo();
    const btn=document.getElementById('teleportBtn'); if(!btn) return {nobtn:true, html: document.getElementById('tileinfo').innerText};
    btn.click(); await new Promise(r=>setTimeout(r,800));
    return {status: document.getElementById('teleportStatus') && document.getElementById('teleportStatus').textContent, home: game.state.homeTileId, target};
  });
  console.log(JSON.stringify(r)); console.log(errs); await b.close();
})();
