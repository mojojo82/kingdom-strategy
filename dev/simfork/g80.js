const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  console.log(await p.evaluate(()=>({v:document.getElementById('devMarch3dBob').value,l:document.getElementById('devMarch3dBobVal').textContent,b:march3dBob})));
  await p.evaluate(()=>{ const e=document.getElementById('devMarch3dBob'); e.value=100; e.dispatchEvent(new Event('input')); }); console.log(await p.evaluate(()=>march3dBob), errs); await b.close();
})();
