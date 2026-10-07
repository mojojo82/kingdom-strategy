/* Minimal load check: prints page errors, then "object function" if game and setScreen exist. */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('file:///home/claude/game.html');
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => typeof game + ' ' + typeof setScreen).catch(e => 'EVALFAIL ' + e.message);
  errs.forEach(x => console.log(x));
  console.log(r);
  await b.close();
})();
