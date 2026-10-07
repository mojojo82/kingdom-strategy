const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/'+(process.argv[2]||'game.html')); await p.waitForTimeout(2000);
  for (const iso of [false,true]) {
    const r=await p.evaluate(async(iso)=>{ setScreen('world'); if (iso!==mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300)); setMapZoom(1);
      const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:400,y:400}); vp.scrollLeft=c.x-200; vp.scrollTop=c.y-300; renderVisibleTiles();
      // profile pieces
      let tR=0, tT=0, tM=0; const origT=terrainRenderRange; window.terrainRenderRange=function(){ const a=performance.now(); const r=origT.apply(this,arguments); tT+=performance.now()-a; return r; };
      const frames=[]; for(let i=0;i<120;i++){ vp.scrollLeft+=9; vp.scrollTop+=5; const a=performance.now(); renderVisibleTiles(); const d=performance.now()-a; frames.push(d); tR+=d; }
      window.terrainRenderRange=origT;
      // a real layout/paint pass cost: force reflow each step
      let tL=0; for(let i=0;i<60;i++){ vp.scrollLeft+=9; vp.scrollTop+=5; const a=performance.now(); renderVisibleTiles(); void document.getElementById('mapworld').offsetHeight; tL+=performance.now()-a; }
      frames.sort((a,b)=>a-b);
      return {iso, avgRenderMs:+(tR/120).toFixed(2), p95:+frames[Math.floor(frames.length*.95)].toFixed(2), terrainMs:+(tT/120).toFixed(2), withLayoutMs:+(tL/60).toFixed(2), els:Object.keys(mapTileEls).length, resEls:Object.values(mapTileEls).filter(d=>/resource/.test(d.className)).length, htmlLen: Object.values(mapTileEls).reduce((a,d)=>a+d.innerHTML.length,0)}; }, iso);
    console.log(JSON.stringify(r));
  }
  console.log(errs); await b.close();
})();
