const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(1200);
  const v = await p.evaluate(() => { const r = document.getElementById('mapviewport').getBoundingClientRect(); return [r.left, r.top, r.width, r.height, innerHeight]; });
  console.log('viewport', JSON.stringify(v));
  const x = v[0] + 60, y = Math.min(v[1] + v[3] * 0.8, 760);
  console.log('point', x, y, await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) : null; }, [x, y]));
  await p.evaluate(() => { window.__ev = []; ['mousedown', 'mousemove', 'mouseup', 'pointerdown', 'pointermove'].forEach(t => window.addEventListener(t, e => window.__ev.push(t + ':' + e.buttons), true)); });
  await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 4; i++) { await p.mouse.move(x + i * 6, y - i * 6); await p.waitForTimeout(30); } await p.mouse.up();
  console.log(JSON.stringify(await p.evaluate(() => window.__ev)));
  await b.close();
})();
