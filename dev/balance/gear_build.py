# Test-only copy of the game with the 4 Arena gear bonuses as per-side multipliers (Harley, 20 Nov 2026).
# usage: python3 dev/balance/gear_build.py OUT.html '{"P":{"cannon":1,"hp":1,"atk":1,"skill":1},"A":{...}}'
import sys, json, re
out, cfg = sys.argv[1], json.loads(sys.argv[2])
for sd in ('P', 'A'):
    for k in ('cannon', 'hp', 'atk', 'skill'): cfg.setdefault(sd, {}).setdefault(k, 1)
s = open('test/index.html').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:70], s.count(a)); s = s.replace(a, b)
head = "var __GEAR = %s; function __BM(sd) { return __GEAR[sd].atk; } function __SK(sd) { return __GEAR[sd].skill; }\n" % json.dumps(cfg)
# cannon damage + fortress HP: scale the side's stats as the sim starts
rep("function arenaMakeSim(playerStats, aiStats, opts) {", head + "function arenaMakeSim(playerStats, aiStats, opts) {\n  playerStats = Object.assign({}, playerStats, { cannonMult: (playerStats.cannonMult || 1) * __GEAR.P.cannon, maxHp: playerStats.maxHp * __GEAR.P.hp }); aiStats = Object.assign({}, aiStats, { cannonMult: (aiStats.cannonMult || 1) * __GEAR.A.cannon, maxHp: aiStats.maxHp * __GEAR.A.hp });")
# hero basic attacks that land on the fortress
rep("if (meleeHit(pHH, aHH, aiStats, id, dmg)) playerDmg += dmg; } else if (posMode) { if (rangedHit(pHH, aHH, aiStats, id, dmg, hitTgt, 'p_')) { playerDmg += dmg; playerRangedAtk += dmg; }",
    "if (meleeHit(pHH, aHH, aiStats, id, dmg)) playerDmg += dmg * __BM('P'); } else if (posMode) { if (rangedHit(pHH, aHH, aiStats, id, dmg, hitTgt, 'p_')) { playerDmg += dmg * __BM('P'); playerRangedAtk += dmg * __BM('P'); }")
rep("if (meleeHit(aHH, pHH, playerStats, id, dmg)) aiDmg += dmg; } else if (posMode) { if (rangedHit(aHH, pHH, playerStats, id, dmg, hitTgt, 'a_')) { aiDmg += dmg; aiRangedAtk += dmg; }",
    "if (meleeHit(aHH, pHH, playerStats, id, dmg)) aiDmg += dmg * __BM('A'); } else if (posMode) { if (rangedHit(aHH, pHH, playerStats, id, dmg, hitTgt, 'a_')) { aiDmg += dmg * __BM('A'); aiRangedAtk += dmg * __BM('A'); }")
# hero skills that land on the fortress (direct, splash, storm, waves/throws, dive)
L = s.split('\n')
def fix(i, pairs):
    for a, b in pairs:
        assert a in L[i], (i, a); L[i] = L[i].replace(a, b)
idx = lambda key: [i for i, l in enumerate(L) if key in l]
i = idx("if (meleeHit(pHH, aHH, aiStats, a.key, av, 'p_')) { playerDmg += av;")[0]
fix(i, [("{ playerDmg += av; trAdd('skill:'", "{ playerDmg += av * __SK('P'); trAdd('skill:'"), ("playerDmg += splashFort;", "playerDmg += splashFort * __SK('P');"), ("{ playerDmg += av; projP += av; }", "{ playerDmg += av * __SK('P'); projP += av * __SK('P'); }")])
i = idx("if (meleeHit(aHH, pHH, playerStats, a.key, avA, 'a_')) aiDmg += avA;")[0]
fix(i, [("aiDmg += avA; if (a.splash)", "aiDmg += avA * __SK('A'); if (a.splash)"), ("aiDmg += splashFort;", "aiDmg += splashFort * __SK('A');"), ("{ aiDmg += avA; projA += avA; }", "{ aiDmg += avA * __SK('A'); projA += avA * __SK('A'); }")])
for i in idx("playerDmg += q.v; projP += q.v;"): fix(i, [("playerDmg += q.v; projP += q.v;", "playerDmg += q.v * __SK('P'); projP += q.v * __SK('P');")])
for i in idx("aiDmg += q.v; projA += q.v;"): fix(i, [("aiDmg += q.v; projA += q.v;", "aiDmg += q.v * __SK('A'); projA += q.v * __SK('A');")])
for i in idx("else { if (q.sd === 'P') playerDmg += q.v; else aiDmg += q.v; if (me && posMode) me.d = 1; }"):
    fix(i, [("if (q.sd === 'P') playerDmg += q.v; else aiDmg += q.v;", "if (q.sd === 'P') playerDmg += q.v * __SK('P'); else aiDmg += q.v * __SK('A');")])
s = '\n'.join(L)
a = "var pHH = mkHeroHp(playerStats, aRefA), aHH = mkHeroHp(aiStats, pRefA);"; s = s.replace(a, a + " window.__HH = [pHH, aHH];")
open(out, 'w').write(s)
print('ok', out)
