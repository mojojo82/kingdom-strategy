"""Harley (19 Nov): "technically everyone's timers should be frozen while they are animating". Writes a TEST copy of the game where every hero's
skill timer stands still while their skill animation plays (skill sheet length; Hanzo also while his Storm is still pending = in the air), for the
balance harnesses (GAMEFILE=...). The real game is not changed.   python3 dev/balance/make_animfreeze_game.py OUT.html"""
import sys
s = open("test/index.html", encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70]); s = s.replace(a, b)
rep("  function isStunned(hh, id) {", """  function animSecOf(key) { if (typeof HERO_ANIMS === "undefined") return 0; var A = HERO_ANIMS[key + "_skill"]; if (A && A.rows && A.rows.skill) return A.rows.skill[1] / (A.fps.skill || 24);
    var B = HERO_ANIMS[key]; if (B && B.rows) { var r = B.rows.skill || B.rows.cast; if (r) return r[1] / ((B.fps && (B.fps.skill || B.fps.cast)) || 24); } return 0; }
  function animFreeze(sd, key) { var hh = sd === 'P' ? pHH : aHH, e = hh && hh.by[key], sc = animSecOf(key); if (e && sc > 0) e.animT = tick + Math.ceil(sc / dtS); if (window.__afLog) window.__afLog[key] = sc; }
  function animating(sd, key) { var hh = sd === 'P' ? pHH : aHH, e = hh && hh.by[key]; if (e && e.animT > tick) return true; return stormQ.some(function (q) { return q.sd === sd && q.key === key; }); }
  function isStunned(hh, id) {""")
rep("        playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key);", "        playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key); animFreeze('P', a.key);")
rep("        aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key);", "        aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key); animFreeze('A', a.key);")
rep("      playerCd[a.key] -= isStunned(pHH, a.key) ? 0 : cdStep;", "      playerCd[a.key] -= (isStunned(pHH, a.key) || animating('P', a.key)) ? 0 : cdStep;")
rep("      aiCd[a.key] -= isStunned(aHH, a.key) ? 0 : cdStep;", "      aiCd[a.key] -= (isStunned(aHH, a.key) || animating('A', a.key)) ? 0 : cdStep;")
rep("        cdMap[u.key] -= cdStep;\n        if (cdMap[u.key] > 0) return;\n        cdMap[u.key] += u.cooldown * cdM;", "        cdMap[u.key] -= animating(sdS, u.key) ? 0 : cdStep;\n        if (cdMap[u.key] > 0) return;\n        cdMap[u.key] += u.cooldown * cdM; animFreeze(sdS, u.key);")
open(sys.argv[1], "w", encoding="utf-8").write(s); print("ok")
