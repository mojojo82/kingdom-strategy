const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
require('fs').mkdirSync(OUT,{recursive:true});
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const info = await p.evaluate(()=>{ setScreen('world'); const P=provinces(); return { n:P.length, sample:P.slice(0,3).map(q=>({name:q.name,lvl:q.lvl,cx:q.cx|0,cy:q.cy|0,poly:q.poly&&q.poly.length})), at:[provinceAt(600,600).name, provinceAt(5,5).name, provinceAt(10,10).lvl] }; });
  console.log(JSON.stringify(info));
  for (const iso of [false,true]) {
    await p.evaluate(async(iso)=>{ if(mapIso!==iso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300)); },iso);
    for (const [z,tag] of [[0.001,'far'],[0.03,'farzoom'],[0.12,'mid'],[1,'near']]) {
      const st = await p.evaluate(async(z)=>{ setMapZoom(z); const home = tileXY(game.state.homeTileId); const pr = provinceAt(home[0],home[1]);
        // centre on a province boundary near home: centroid
        const vp=document.getElementById('mapviewport');
        if (z<=0.002) { vp.scrollLeft=(vp.scrollWidth-vp.clientWidth)/2; vp.scrollTop=Math.max(0,(vp.scrollHeight-vp.clientHeight)/2); }
        else { const c = (typeof tileCenterPx==='function') ? tileCenterPx(Math.round(pr.cx)+':'+0) : null; }
        renderVisibleTiles(); await new Promise(r=>setTimeout(r,200));
        const box=document.getElementById('mapProvinces'); return { cls: box.querySelector('.prov-label').className, mz: mapZoom, kids: box?box.children.length:-1, labels: box?box.querySelectorAll('.prov-label').length:-1, home, prov: pr.name };
      }, z);
      console.log(iso?'iso':'flat', tag, JSON.stringify(st));
      await p.screenshot({ path: OUT+(iso?'iso_':'flat_')+tag+'.png', clip:{x:0,y:62,width:430,height:700} });
    }
  }
  console.log('errs', errs); await b.close();
})();
