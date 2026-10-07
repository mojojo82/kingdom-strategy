const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
const tex='data:image/webp;base64,'+fs.readFileSync('/home/claude/assets/grass_tile512_tint.webp').toString('base64');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  const setup = async (mode)=> p.evaluate(async({tex,mode})=>{
    setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
    terrainEnsure(); const h=tileXY(game.state.homeTileId); const ox=h[0]-6, oy=h[1]-6;
    for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const dx=x-8, dy=y-8; if(dx*dx+dy*dy<64+((x*7+y*3)%9)) { terrainArr[(oy+y)*terrainN+ox+x]=1; terrainMarkDirty(ox+x,oy+y);} }
    for(let y=9;y<13;y++) for(let x=9;x<14;x++){ terrainArr[(oy+y)*terrainN+ox+x]=3; terrainMarkDirty(ox+x,oy+y);} 
    if (mode==='tex') {
      const img=new Image(); img.src=tex; await img.decode(); const tc=document.createElement('canvas'); tc.width=img.width; tc.height=img.height; const tx=tc.getContext('2d'); tx.drawImage(img,0,0); const T=tx.getImageData(0,0,tc.width,tc.height).data, TW=tc.width, PER=4;
      const samp=(wx,wy,mir)=>{ let u=((wx/PER)%1+1)%1, v=((wy/PER)%1+1)%1; if(mir){ u=1-u; } const X=Math.min(TW-1,Math.floor(u*TW)), Y=Math.min(TW-1,Math.floor(v*TW)), o=(Y*TW+X)*4; return [T[o],T[o+1],T[o+2]]; };
      TERRAIN_PX=96;
      const orig=terrainDrawCell;
      terrainDrawCell=function(cv,i,j){ const ok=orig(cv,i,j); if(!ok) return false; /* re-shade grass pixels from the texture */
        const N=cv.width, ctx=cv.getContext('2d'), im=ctx.getImageData(0,0,N,N), d=im.data;
        for(let py=0;py<N;py++) for(let px=0;px<N;px++){ const o=(py*N+px)*4; if(!d[o+3]) continue; const r=d[o],g=d[o+1],bb=d[o+2]; if(!(g>r+15 && g>bb+40)) continue; /* grass-coloured */
          const wx=i-1+(px+0.5)/N, wy=j-1+(py+0.5)/N; let m=tnoise(wx*0.45,wy*0.45,9); m=Math.max(0,Math.min(1,(m-0.5)*3+0.5));
          const A=samp(wx,wy,false), B=samp(wx+1.7,wy+0.9,true);
          d[o]=A[0]*m+B[0]*(1-m); d[o+1]=A[1]*m+B[1]*(1-m); d[o+2]=A[2]*m+B[2]*(1-m); }
        ctx.putImageData(im,0,0); return true; };
      document.querySelectorAll('#mapTerrainLayer canvas').forEach(c=>{c.width=c.height=96;});
    }
    terrainClearAll(); setMapZoom(1); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:ox+8,y:oy+8}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,800));
    document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden');
  }, {tex,mode});
  
  
  await setup('tex'); await p.screenshot({ path: OUT+'grass_tint.png', clip:{x:0,y:140,width:430,height:620} });
  await b.close();
})();
