const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
const FILE = process.argv[2] || 'game.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/'+FILE); await p.waitForTimeout(1500);
  // play conquest a bit, then go to World and lose while away
  await p.evaluate(()=>{ setScreen('conquest'); });
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{ setScreen('world'); });
  await p.waitForTimeout(500);
  const before = await p.evaluate(()=>{ const I=game.state.idle; I.playerHp = 0; return { hp:I.playerHp, enemies:I.enemies.length, lvl: I.chapter+'-'+I.levelNum }; });
  await p.waitForTimeout(15000);
  const mid = await p.evaluate(()=>({ pending: game.state.idle.pending && game.state.idle.pending.type, hp: Math.round(game.state.idle.playerHp), screen: appScreen }));
  await p.evaluate(()=>{ setScreen('conquest'); });
  await p.waitForTimeout(3000);
  const after = await p.evaluate(()=>{ const ov=document.getElementById('idleResult'); return { overlay: ov.style.display, cls: ov.className, pending: game.state.idle.pending && game.state.idle.pending.type, hp: Math.round(game.state.idle.playerHp), max: game.idlePlayerMaxHp(), killed: game.state.idle.enemiesKilledInLevel, enemies: game.state.idle.enemies.length }; });
  console.log(FILE, JSON.stringify({before, mid, after}));
  await p.screenshot({ path: OUT+'conq_'+FILE.replace('.html','')+'.png', clip:{x:0,y:0,width:430,height:600} });
  console.log(errs.slice(0,3)); await b.close();
})();
