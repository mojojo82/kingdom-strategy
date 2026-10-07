const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; setScreen('world'); s.homeTileId=mapTileAt(s.map,64,30).id; shareTileToChat(s.homeTileId); chatTab='world'; setScreen('more','chat'); renderWorldChat();
    const vp=document.getElementById('mapviewport'); window.__log=[]; let last=vp.scrollTop;
    const orig=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop');
    Object.defineProperty(vp,'scrollTop',{get(){return orig.get.call(this);}, set(v){ window.__log.push([Math.round(performance.now()), 'set', Math.round(v), (new Error()).stack.split('\n')[2].trim().slice(0,90), this.clientHeight, this.scrollHeight]); orig.set.call(this,v); }}); });
  await p.waitForTimeout(300);
  await p.click('.chat-loc'); await p.waitForTimeout(1200);
  console.log(JSON.stringify(await p.evaluate(()=>{ const vp=document.getElementById('mapviewport'); return {log:window.__log, final:vp.scrollTop, sh:vp.scrollHeight, ch:vp.clientHeight, worldH:document.getElementById('mapworld').style.height}; }),null,0)); console.log(errs); await b.close();
})();
