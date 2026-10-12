const fs=require("fs");const ROOT="/home/claude/kingdom-strategy";
const {chromium}=require("/opt/npm-tools/node_modules/playwright");
const FAKE=fs.readFileSync(ROOT+"/dev/tests/fakefb.js","utf8"),GAME=fs.readFileSync(ROOT+"/test/index.html","utf8");
const store={},call=require(ROOT+"/dev/tests/fnrunner.js")(store); const FR=JSON.parse(fs.readFileSync("cardframes.json","utf8"));
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]}),errs=[];
const ctx=await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:3});
await ctx.exposeFunction("__fbstore",(op,k,v)=>{if(op==="set")store[k]=JSON.parse(v);else if(op==="del")delete store[k];return JSON.stringify(store)});
await ctx.exposeFunction("__fbcall",call);
await ctx.route(/mojojo82\.github\.io/,r=>r.fulfill({status:200,contentType:"text/html",body:GAME}));
await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/,r=>r.fulfill({status:200,contentType:"application/javascript",body:FAKE}));
await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/,r=>r.fulfill({status:200,contentType:"application/javascript",body:""}));
await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
const P=await ctx.newPage();P.on("pageerror",e=>errs.push(e.message));
await P.goto("https://mojojo82.github.io/kingdom-strategy/test/");await P.waitForSelector("#ksAuth .box");
await P.fill("#ksE","card@test.dev");await P.fill("#ksP","secret123");await P.click("#ksUp");
await P.waitForSelector("#ksN",{timeout:15000});await P.fill("#ksN","Card");await P.click("#ksGo");await P.waitForTimeout(5000);
await P.evaluate((FR)=>{window.__FR=FR;game.state.heroes.kessa.owned=true;game.state.heroes.kessa.level=Math.max(game.state.heroes.kessa.level||1,30);setScreen("heroes");},FR);
await P.waitForTimeout(1500);
// grid card: put the first frame in Kessa's card art
await P.evaluate(()=>{document.querySelectorAll(".hcard").forEach(c=>{const i=c.querySelector(".hcard-art"),n=c.textContent;if(c.onclick&&c.onclick.toString().indexOf("openHeroDetail")>=0){}});});
const gridClip=await P.evaluate(()=>{const g=document.querySelector(".hero-grid");if(!g)return null;const r=g.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:Math.min(r.height,420)}});
// grid: find Kessa's card by its art alt or name
const g2=await P.evaluate(()=>{setScreen("heroes");const cards=[...document.querySelectorAll(".hcard")];const kc=cards.find(c=>{const a=c.querySelector(".hcard-art");return a&&a.alt==="Kessa"})||cards.find(c=>c.querySelector(".hcard-ph")&&c.textContent.indexOf("⚡")>=0);if(!kc)return null;kc.id="kcardX";const r=kc.parentElement.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:Math.min(r.height,300)}});
await P.waitForTimeout(800);
for(let k=0;k<36;k+=3){await P.evaluate(k=>{const kc=[...document.querySelectorAll(".hcard")].find(c=>{const a=c.querySelector(".hcard-art");return a&&a.alt==="Kessa"});if(!kc)return;let a=kc.querySelector(".hcard-art");if(!a){a=document.createElement("img");a.className="hcard-art";kc.prepend(a);const ph=kc.querySelector(".hcard-ph");if(ph)ph.remove()}a.src=window.__FR[k]},k);await P.waitForTimeout(30);if(g2)await P.screenshot({path:`cg_${String(k/3).padStart(2,"0")}.png`,clip:g2});}
console.log(JSON.stringify({g2,errs:errs.slice(0,3)}));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
