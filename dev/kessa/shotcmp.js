const {chromium}=require('/opt/npm-tools/node_modules/playwright');(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});const p=await b.newPage({viewport:{width:820,height:900}});const e=[];p.on('pageerror',x=>e.push(x.message));
await p.goto('file://'+__dirname+'/cmp.html');await p.waitForTimeout(800);await p.screenshot({path:process.argv[2]+'/c1.png'});
await p.click('[data-m=arc]');await p.waitForTimeout(900);await p.screenshot({path:process.argv[2]+'/c2.png'});console.log(e);await b.close()})();
