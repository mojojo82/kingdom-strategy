const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  const r=await p.evaluate(async()=>{ const M=game.state.map; const out={afterBoot:M.count};
    setScreen('world'); await new Promise(r=>setTimeout(r,500)); out.afterWorld=M.count;
    const node=mapTileAt(M,15,19); out.nodeBefore=node.amountLeft; node.amountLeft-=1234;
    MAP_CHUNK_KEEP=30; // force eviction
    const vp=document.getElementById('mapviewport'); setMapZoom(1);
    for(let i=0;i<60;i++){ const x=(i*37)%200, y=(i*53)%200; const c=tileCenterPx({x,y}); vp.scrollLeft=c.x-200; vp.scrollTop=c.y-300; renderVisibleTiles(); }
    out.chunksAfterScroll=M.count; out.nodeChunkKept=!!M.chunks['0_0']; out.nodeAfter=mapTileAt(M,15,19).amountLeft;
    // an untouched far chunk regenerates identically
    const far=mapTileAt(M,150,150); out.farId=far.id; delete M.chunks['7_7']; M.count--; out.farAgain=mapTileAt(M,150,150).id;
    return out; });
  console.log(JSON.stringify(r), errs); await b.close();
})();
