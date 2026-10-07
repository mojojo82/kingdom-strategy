const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>setScreen('city')); await p.waitForTimeout(500);
  console.log(await p.evaluate(()=>{ game.state.resources.food=1e9;game.state.resources.wood=1e9;game.state.resources.stone=1e9;game.state.resources.gold=1e9; render(); const btn=[...document.querySelectorAll('button')].find(x=>/^(Upgrade|Build|Builders busy)$/.test(x.textContent.trim())); if(!btn) return 'none'; const c=getComputedStyle(btn); const sel=[]; for(const sh of document.styleSheets){ try{ for(const r of sh.cssRules){ if(r.selectorText && btn.matches(r.selectorText)) sel.push(r.selectorText+' {'+r.style.cssText.slice(0,500)+'}'); } }catch(e){} } return {cls:btn.className, parent:btn.parentElement.className, bg:c.backgroundImage, bgc:c.backgroundColor, border:c.border, radius:c.borderRadius, shadow:c.boxShadow, pad:c.padding, color:c.color, font:c.fontSize+' '+c.fontWeight, rules:sel.slice(-6)}; }));
  await b.close();
})();
