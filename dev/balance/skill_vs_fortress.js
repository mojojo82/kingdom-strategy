/* v1703 (Harley): every hero alone vs an enemy fortress with no heroes (HP 1e8, no cannon): fortress damage from ONE activation of the hero's main skill (the 2nd cast, everything it lands within ~5 s), plus their basic hit. Lv40 (skills 3) and Lv80 (skills 5). Run: NODE_PATH=$(npm root -g) node dev/balance/skill_vs_fortress.js */
const fs=require("fs"),path=require("path"),ROOT=path.join(__dirname,"../..");
(async()=>{const {chromium}=require("playwright");const GAME=fs.readFileSync(ROOT+"/test/index.html","utf8"),FAKE=fs.readFileSync(ROOT+"/dev/tests/fakefb.js","utf8");const store={},call=require(ROOT+"/dev/tests/fnrunner.js")(store);
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",args:["--no-sandbox"]});const ctx=await b.newContext({viewport:{width:430,height:932}});
await ctx.exposeFunction("__fbstore",(op,k,v)=>{if(op==="set")store[k]=JSON.parse(v);else if(op==="del")delete store[k];return JSON.stringify(store);});await ctx.exposeFunction("__fbcall",call);
await ctx.route(/mojojo82\.github\.io/,require(ROOT+"/dev/tests/siteroute.js")(GAME));
await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/,(r)=>r.fulfill({status:200,contentType:"application/javascript",body:FAKE}));
await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/,(r)=>r.fulfill({status:200,contentType:"application/javascript",body:""}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,(r)=>r.abort());
const P=await ctx.newPage();await P.goto("https://mojojo82.github.io/kingdom-strategy/test/",{timeout:180000});await P.waitForSelector("#ksAuth .box",{timeout:120000});
await P.fill("#ksE","sv"+process.pid+"@test.dev");await P.fill("#ksP","secret123");await P.click("#ksUp");await P.waitForSelector("#ksN",{timeout:120000});await P.fill("#ksN","Sim");await P.click("#ksGo");await P.waitForTimeout(5000);
await P.evaluate(()=>{ if (HERO_DEFS.ironlily) delete HERO_DEFS.ironlily.comingSoon; });
const r=await P.evaluate(()=>{const out={};for(const [lvl,arms,sk] of [[40,10,3],[80,25,5]]){const H=Object.keys(HERO_DEFS).filter(k=>!HERO_DEFS[k].comingSoon);const hs={};H.forEach(k=>{hs[k]={owned:true,level:lvl,stars:arms,skillLevels:{conquest:[sk,sk,sk],expedition:[sk,sk,sk]}};});
 const mk=(ros,isP)=>{const st=arenaSideStats(ros,hs,20,arenaBaseHpPlayer,false,null,null,undefined,ZERO_BONUS);(st.heroHp||[]).forEach(e=>{e.runL=arenaRunDist(400,240,ros.indexOf(e.id),isP);});return st;};
 out[lvl]={};
 for(const k of H){const A=mk([k],true),B=mk([],false);B.maxHp=1e8;A.maxHp=1e8;const a=(A.actives||[])[0];const at=(A.attackers||[]).filter(x=>x.id===k)[0]||{};const tr={src:{},aiSrc:{},perTick:[]};
  const sim=arenaMakeSim(A,B,{rng:worldPvpSeededRng("f"+k),critSeed:"f"+k,trace:tr,aiCannon:false,maxTicks:300});
  const sum=()=>Object.keys(tr.src).reduce((x,y)=>x+(y.indexOf("skill:"+k+"|")===0?0:tr.src[y]),0);
  let casts=[],prevHp=sim.aiHp,prevOther=sum(),perTick=[],hits=[],prevAtk=0;
  for(let t=0;t<300;t++){const r=sim.step();const drop=prevHp-sim.aiHp, oth=sum();perTick.push(drop-(oth-prevOther));prevHp=sim.aiHp;prevOther=oth;const atk=tr.src["atk:"+k]||0;if(atk>prevAtk){hits.push(atk-prevAtk);prevAtk=atk;}
   if((r.info.playerFlash||[]).indexOf(k)>=0)casts.push(t);if(r.done)break;}
  let one=null;if(casts.length>=2){const c=casts[1],nx=casts[2]!=null?casts[2]:c+11;let s2=0;for(let t=c;t<Math.min(nx,c+11);t++)s2+=perTick[t]||0;one=Math.round(s2);}else if(casts.length===1){let s2=0;for(let t=casts[0];t<casts[0]+11;t++)s2+=perTick[t]||0;one=Math.round(s2);}
  out[lvl][k]={name:HERO_DEFS[k].name,cls:HERO_DEFS[k].class,skillName:a?a.name:"-",value:a?Math.round(a.value):0,cd:a?a.cooldown:null,casts:casts.length,one:one,basic:Math.round(at.dmg||0),hit:hits.length?Math.round(hits.slice(-5).reduce((x,y)=>x+y,0)/Math.min(5,hits.length)):null};}
 }return out;});
console.log(JSON.stringify(r,null,0));await b.close();})();
