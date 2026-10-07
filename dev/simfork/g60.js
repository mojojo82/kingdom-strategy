const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => setScreen('conquest')); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const i = fortressCqImg(), c = document.getElementById('idleCanvas'); const w = c.width, h = c.height; const sc = fortressCqScale(); const off = document.createElement('canvas'); const tw = 360, th = Math.round(i.naturalHeight * tw / i.naturalWidth); off.width = tw; off.height = th; off.getContext('2d').drawImage(i, 0, 0, tw, th); return { nat: [i.naturalWidth, i.naturalHeight], canvas: [w, h], scale: sc, shipW: i.naturalWidth * sc, shipH: i.naturalHeight * sc, png: off.toDataURL('image/webp', 0.8), srcLen: i.src.length }; });
  console.log(JSON.stringify({ nat: r.nat, canvas: r.canvas, scale: r.scale, shipW: r.shipW, shipH: r.shipH, srcLen: r.srcLen, thumbLen: r.png.length }));
  fs.writeFileSync('/home/claude/simfork/ship_thumb.txt', r.png);
  await b.close();
})();
