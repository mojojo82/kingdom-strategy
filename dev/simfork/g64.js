const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => setScreen('conquest')); await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => { const r=[]; document.querySelectorAll('*').forEach(e=>{ if(e.children.length<=2 && /^\s*\S*\s*Gareth\s*$/.test(e.textContent) ) r.push(e.outerHTML.slice(0,300)+' || PARENT '+e.parentElement.className+' '+e.parentElement.id); }); return r.slice(0,4).join('\n'); }));
  await b.close();
})();
