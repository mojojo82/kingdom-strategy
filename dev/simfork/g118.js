const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/mock/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(async()=>{ const s=game.state; s.homeTileId='640,700'; ['300,420','820,300','900,880','420,980','150,700','1010,560','600,200','700,1000'].forEach((id,i)=>occupiedTileIds[id]='bot_m'+i);
    setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300));
    document.querySelectorAll('#mapOverlayCtl, #fpsCounter, #fleetHud').forEach(e=>e.style.visibility='hidden');
    setMapZoom(0.001); const vp=document.getElementById('mapviewport'); vp.scrollLeft=(vp.scrollWidth-vp.clientWidth)/2; vp.scrollTop=Math.max(0,(vp.scrollHeight-vp.clientHeight)/2); renderVisibleTiles(); });
  // region definitions
  const variants = {
    grid: `(x,y)=>Math.floor(x/200)+Math.floor(y/200)*6`,
    voronoi: `(()=>{ const seeds=[]; let r=7; const rnd=()=>{ r=(r*16807)%2147483647; return r/2147483647; }; for(let gy=0;gy<6;gy++) for(let gx=0;gx<6;gx++) seeds.push([ (gx+0.15+rnd()*0.7)*200, (gy+0.15+rnd()*0.7)*200 ]); return (x,y)=>{ let bi=0,bd=1e18; for(let i=0;i<seeds.length;i++){ const dx=x-seeds[i][0], dy=y-seeds[i][1], d=dx*dx+dy*dy; if(d<bd){bd=d;bi=i;} } return bi; }; })()`,
    rings: `(x,y)=>{ const dx=x-600, dy=y-600, d=Math.max(Math.abs(dx),Math.abs(dy)), a=(Math.atan2(dy,dx)+Math.PI)/(2*Math.PI); if(d<120) return 0; if(d<330) return 1+Math.floor(a*4); return 5+Math.floor(a*8); }`,
    provinces: `(()=>{ const seeds=[]; let r=11; const rnd=()=>{ r=(r*16807)%2147483647; return r/2147483647; }; seeds.push([600,600]); for(let k=0;k<6;k++){ const a=k/6*2*Math.PI+0.3; seeds.push([600+Math.cos(a)*230, 600+Math.sin(a)*230]); } for(let k=0;k<12;k++){ const a=k/12*2*Math.PI+rnd()*0.3; seeds.push([600+Math.cos(a)*470, 600+Math.sin(a)*470]); } for(let k=0;k<16;k++){ const a=k/16*2*Math.PI+rnd()*0.2; const R=650+rnd()*120; seeds.push([Math.min(1190,Math.max(10,600+Math.cos(a)*R)), Math.min(1190,Math.max(10,600+Math.sin(a)*R))]); } return (x,y)=>{ let bi=0,bd=1e18; for(let i=0;i<seeds.length;i++){ const dx=x-seeds[i][0], dy=y-seeds[i][1], d=dx*dx+dy*dy*(i===0?1:1); if(d<bd){bd=d;bi=i;} } return bi; }; })()`
  };
  for (const [name, fsrc] of Object.entries(variants)) {
    await p.evaluate(({name,fsrc})=>{
      const f=eval(fsrc); const old=document.getElementById('mockRegions'); if(old) old.remove();
      const world=document.getElementById('mapworld'), g=isoGeom(), n=1200, C=8, m=n/C; const W=parseFloat(world.style.width), H=parseFloat(world.style.height);
      const cv=document.createElement('canvas'); cv.id='mockRegions'; const S=6; cv.width=Math.ceil(W*S); cv.height=Math.ceil(H*S); cv.style.cssText='position:absolute;left:0;top:0;width:'+W+'px;height:'+H+'px;pointer-events:none;z-index:2;';
      world.insertBefore(cv, document.getElementById('mapMarchLayer')); const ctx=cv.getContext('2d'); ctx.scale(S,S);
      const P=(x,y)=>isoCenterG(g,x-0.5,y-0.5); // tile-corner -> world px
      const id=[]; for(let j=0;j<m;j++){ id.push([]); for(let i=0;i<m;i++) id[j].push(f(i*C+C/2,j*C+C/2)); }
      const pal=['#e6c45a','#6fb7e6','#8fd16f','#e08a6c','#b48be6','#5fd1c0','#e6a35a','#7f9be6','#d16fa8','#a8d16f','#e6e06c','#6fd18f'];
      const ringLvl = name==='rings' ? (r=>r===0?6:r<=4?4:2) : (name==='provinces' ? (r=>r===0?7:r<=6?5:r<=18?3:1) : null);
      // fills
      for(let j=0;j<m;j++) for(let i=0;i<m;i++){ const r=id[j][i]; const a=P(i*C,j*C), b2=P((i+1)*C,j*C), c=P((i+1)*C,(j+1)*C), d=P(i*C,(j+1)*C);
        ctx.fillStyle=pal[r%pal.length]; ctx.globalAlpha= ringLvl ? 0.08+0.035*ringLvl(r) : 0.16; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b2.x,b2.y); ctx.lineTo(c.x,c.y); ctx.lineTo(d.x,d.y); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha=1;
      // boundaries
      const seg=(A,B)=>{ ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke(); };
      ctx.lineCap='round';
      [['rgba(0,0,0,.45)',2.2],['rgba(255,255,255,.9)',1.1]].forEach(([col,lw])=>{ ctx.strokeStyle=col; ctx.lineWidth=lw/ (1); ctx.setLineDash(name==='grid'?[]:[3,2]);
        for(let j=0;j<m;j++) for(let i=0;i<m;i++){ if(i+1<m && id[j][i]!==id[j][i+1]) seg(P((i+1)*C,j*C),P((i+1)*C,(j+1)*C)); if(j+1<m && id[j][i]!==id[j+1][i]) seg(P(i*C,(j+1)*C),P((i+1)*C,(j+1)*C)); } });
      // labels
      const acc={}; for(let j=0;j<m;j++) for(let i=0;i<m;i++){ const r=id[j][i]; (acc[r]=acc[r]||[0,0,0]); acc[r][0]+=i*C+C/2; acc[r][1]+=j*C+C/2; acc[r][2]++; }
      ctx.setLineDash([]); ctx.textAlign='center'; ctx.textBaseline='middle';
      Object.keys(acc).forEach(r=>{ const a=acc[r]; const q=P(a[0]/a[2],a[1]/a[2]); const lv= ringLvl? ringLvl(+r) : (name==='grid'? 1+Math.min(5,Math.floor(Math.max(Math.abs(a[0]/a[2]-600),Math.abs(a[1]/a[2]-600))>500?0: (5-Math.floor(Math.max(Math.abs(a[0]/a[2]-600),Math.abs(a[1]/a[2]-600))/120)))) : 1+Math.max(0,5-Math.floor(Math.hypot(a[0]/a[2]-600,a[1]/a[2]-600)/130)));
        const isC = (name!=='grid' && +r===0 && (name==='rings'||name==='provinces'));
        ctx.font='bold '+(isC?7:4.6)+'px "Chakra Petch", sans-serif'; ctx.lineWidth=1.4; ctx.strokeStyle='rgba(0,0,0,.6)'; const t= isC? '👑 Capital' : 'Lv '+lv; ctx.strokeText(t,q.x,q.y); ctx.fillStyle= isC? '#ffd36b' : '#fff'; ctx.fillText(t,q.x,q.y); });
    }, {name, fsrc});
    await p.waitForTimeout(300);
    await p.screenshot({ path: OUT+name+'.png', clip:{x:0,y:62,width:430,height:600} });
  }
  // mid-zoom close look at a provinces boundary with real markers
  await p.evaluate(()=>{ setMapZoom(0.35); const c=tileCenterPx({x:600,y:830}); const vp=document.getElementById('mapviewport'); vp.scrollLeft=c.x-215; vp.scrollTop=c.y-300; renderVisibleTiles(); });
  await p.waitForTimeout(400); await p.screenshot({ path: OUT+'provinces_mid.png', clip:{x:0,y:62,width:430,height:600} });
  console.log(errs); await b.close();
})();
