const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const id=await p.evaluate(()=>{ const s=game.state; setScreen('world'); const t=s.map.find(x=>x.type==='resource'); goToWorldTile(t.id); return t.id; });
  await p.waitForTimeout(600);
  await p.click('#tileinfo .ti-star'); await p.waitForTimeout(200);
  await p.screenshot({path:'g98a.png'});
  await p.click('#tileinfo .ti-share'); await p.waitForTimeout(200);
  console.log('after star/share', await p.evaluate(()=>({bm:getBookmarks(), star:document.querySelector('#tileinfo .ti-star').textContent, last:getChatMessages().slice(-1)[0]})));
  // go elsewhere then use bookmark sheet
  await p.evaluate(()=>{ selectedTile=null; renderTileInfo(); document.getElementById('mapviewport').scrollLeft=0; document.getElementById('mapviewport').scrollTop=0; });
  await p.click('#mapBookmarksBtn'); await p.waitForTimeout(200); await p.screenshot({path:'g98b.png'});
  await p.click('#bookmarkSheet .bm-row span'); await p.waitForTimeout(600);
  console.log('after bookmark tap', await p.evaluate(()=>({sel:selectedTile, sheet:document.getElementById('bookmarkSheet').style.display})));
  // chat: open and tap location
  await p.evaluate(()=>{ selectedTile=null; renderTileInfo(); chatTab='world'; setScreen('more','chat'); renderWorldChat(); }); await p.waitForTimeout(400);
  await p.screenshot({path:'g98c.png'});
  await p.click('.chat-loc'); await p.waitForTimeout(600);
  console.log('after chat tap', await p.evaluate(()=>({sel:selectedTile, screen:appScreen})), id, errs);
  await b.close();
})();
