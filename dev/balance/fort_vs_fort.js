/* v1703 (Harley): fortress type vs type with MAXED research trees. Same 5 heroes on both sides (40 random teams, Lv80 5* skills 5), both sides swapped, 2 seeds: F1 vs F2, F1 vs F3, F2 vs F3 (+ mirrors), win %% and fight length. Run: NODE_PATH=$(npm root -g) node dev/balance/fort_vs_fort.js */
const fs=require("fs"),path=require("path"),ROOT=path.join(__dirname,"../..");
(async()=>{const {chromium}=require("playwright");const GAME=fs.readFileSync(process.env.GAMEFILE||(ROOT+"/test/index.html"),"utf8"),FAKE=fs.readFileSync(ROOT+"/dev/tests/fakefb.js","utf8");const store={},call=require(ROOT+"/dev/tests/fnrunner.js")(store);
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",args:["--no-sandbox"]});const ctx=await b.newContext({viewport:{width:430,height:932}});
await ctx.exposeFunction("__fbstore",(op,k,v)=>{if(op==="set")store[k]=JSON.parse(v);else if(op==="del")delete store[k];return JSON.stringify(store);});await ctx.exposeFunction("__fbcall",call);
await ctx.route(/mojojo82\.github\.io/,require(ROOT+"/dev/tests/siteroute.js")(GAME));
await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/,(r)=>r.fulfill({status:200,contentType:"application/javascript",body:FAKE}));
await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/,(r)=>r.fulfill({status:200,contentType:"application/javascript",body:""}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,(r)=>r.abort());
const P=await ctx.newPage();await P.goto("https://mojojo82.github.io/kingdom-strategy/test/",{timeout:180000});await P.waitForSelector("#ksAuth .box",{timeout:120000});
await P.fill("#ksE","sv"+process.pid+"@test.dev");await P.fill("#ksP","secret123");await P.click("#ksUp");await P.waitForSelector("#ksN",{timeout:120000});await P.fill("#ksN","Sim");await P.click("#ksGo");await P.waitForTimeout(5000);
await P.evaluate(()=>{ if (HERO_DEFS.ironlily) delete HERO_DEFS.ironlily.comingSoon; });
const r=await P.evaluate(()=>{const lvl=80,arms=25,sk=5,H=Object.keys(HERO_DEFS).filter(k=>!HERO_DEFS[k].comingSoon),hs={};H.forEach(k=>{hs[k]={owned:true,level:lvl,stars:arms,skillLevels:{conquest:[sk,sk,sk],expedition:[sk,sk,sk]}};});
 const FM=ft=>{const T=ft===3?FORTRESS3_TREE:ft===2?FORTRESS2_TREE:FORTRESS1_TREE,F=ft>1?{_type:ft}:{};Object.keys(T).forEach(k=>{F[k]=T[k].maxLevel;});return F;};
 let rs=31;const rnd=()=>{rs=(rs*1103515245+12345)&0x7fffffff;return rs/0x7fffffff;};const pick=n=>{const a=H.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n);};
 const mk=(ros,isP,ft)=>{const st=arenaSideStats(ros,hs,20,arenaBaseHpPlayer,false,null,FM(ft),undefined,ZERO_BONUS);(st.heroHp||[]).forEach(e=>{e.runL=arenaRunDist(400,240,ros.indexOf(e.id),isP);});return st;};
 const TM=[];for(let i=0;i<40;i++)TM.push(pick(5));
 const info={};[1,2,3].forEach(ft=>{const st=mk(TM[0],true,ft);info["F"+ft]={hp:Math.round(st.maxHp),bonus:JSON.stringify(fortressBonusFrom(FM(ft)))};});
 const res={};const len={};
 for(const [x,y] of [[1,2],[1,3],[2,3],[1,1],[2,2],[3,3]]){let w=0,n=0,full=0,T=0;
  TM.forEach((t,i)=>{for(let s=0;s<2;s++){for(const sw of [0,1]){const a=sw?y:x,b=sw?x:y;const sim=arenaMakeSim(mk(t,true,a),mk(t,false,b),{rng:worldPvpSeededRng("F"+x+y+i+s+sw),critSeed:"F"+x+y+i+s+sw});let tk=0,r;do{r=sim.step();tk++;}while(!r.done);T+=tk;if(tk>=133)full++;n++;const xWon=sw?(r.winner==="ai"):(r.winner==="player");w+=xWon?1:(r.winner==="draw"?0.5:0);}}});
  res["F"+x+" vs F"+y]={xWins:Math.round(100*w/n),avgSec:Math.round(T/n*ARENA_TICK_MS/100)/10,fullTime:Math.round(100*full/n)+"%",n};}
 return {info,res};});
console.log(JSON.stringify(r,null,0));await b.close();})();
