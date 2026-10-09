# Weapon builds — rankings (TEST v987, 9 Oct 2026)

Made with `node dev/balance/loop.js`, the real TEST game engine run headless. No cards, no fortress research.
Every 3-weapon build fights a fixed field of 73 builds, once attacking and once defending.
**Score = win rate %** against that field (100 = beats everything both ways).
651 builds are tested, and Duplicate builds count once for each copy choice ("dup>hex" = Duplicate copying Hex Shield).
Salvo Loader is left out because it needs Fortress I research.

Raw results: `dev/balance/results/loop_v987_lv20.json`, `_lv40.json`, `_lv80.json`.
Rerun: `node dev/balance/loop.js --cond '{"lvl":40,"arms":10,"wl":30}' --save name`

**Short names:** emp = EMP Gun, railgun = Railgun, clone = Clone Task, droid = Droid Call, dup = Duplicate, hex = Hex Shield, orbit = Orbit Shield, wave = Status Wave, dome = Deflector Dome, io = IO Repair, wall = Projection Wall, missile = Missile Barrage, laser = Laser Beam, flak = Flak Burst, scatter = Scatter Rounds, pulse = Pulse Beam.

## The loop (what it's meant to be)

| Role | Build | Idea |
|---|---|---|
| META | EMP + Railgun + Clone | strongest overall, should sit on top |
| COUNTER | EMP + Status Wave + any | beats the meta |
| COUNTER-COUNTER | Hex Shield + Railgun + any | beats the counters, loses to the meta |

**Without cards the meta is NOT #1 at any stage** (rank 38 at Lv20, 3 at Lv40, 7 at Lv80).
**Harley (9 Oct): fine for now. The meta build currently REQUIRES the Drop Signal card.**
With the Drop Signal card (v973 runs), only its counters beat it at Lv40 and Lv80. Lv20 is still broken.

## Watch list (score / rank)

| Build | Lv20 | Lv40 | Lv80 |
|---|---|---|---|
| emp+railgun+clone (META) | 94 / #38 | 99 / #3 | 97 / #7 |
| emp+railgun+wave (counter) | 82 / #112 | 98 / #4 | 95 / #12 |
| hex+railgun+wave | 96 / #14 | 96 / #6 | 96 / #9 |
| hex+railgun+dup>hex (counter-counter) | 97 / #7 | 94 / #10 | 97 / #6 |
| railgun+dup>railgun+wave | 97 / #10 | 90 / #28 | 93 / #19 |

## Top 15 at each stage

| # | Lv20 (heroes Lv20, weapons Lv10) | Lv40 (heroes Lv40, weapons Lv30) | Lv80 (heroes Lv80, weapons Lv50) |
|---|---|---|---|
| 1 | hex+emp+railgun 100 | hex+emp+railgun 99 | hex+emp+clone 99 |
| 2 | emp+railgun+dup>railgun 100 | hex+emp+clone 99 | hex+emp+dup>hex 99 |
| 3 | hex+railgun+dup>railgun 99 | **emp+railgun+clone 99** | hex+emp+railgun 98 |
| 4 | orbit+railgun+dup>railgun 98 | emp+railgun+wave 98 | orbit+hex+railgun 97 |
| 5 | emp+railgun+dup>emp 98 | hex+emp+dup>hex 97 | hex+emp+dome 97 |
| 6 | railgun+droid+dup>railgun 98 | hex+railgun+wave 96 | hex+railgun+dup>hex 97 |
| 7 | hex+railgun+dup>hex 97 | orbit+emp+clone 95 | **emp+railgun+clone 97** |
| 8 | hex+railgun+dome 97 | hex+emp+dome 95 | orbit+hex+emp 96 |
| 9 | hex+railgun+io 97 | orbit+emp+railgun 94 | hex+railgun+wave 96 |
| 10 | railgun+dup>railgun+wave 97 | hex+railgun+dup>hex 94 | hex+emp+io 95 |
| 11 | orbit+hex+railgun 96 | orbit+hex+emp 93 | hex+railgun+droid 95 |
| 12 | hex+railgun+clone 96 | hex+emp+droid 93 | emp+railgun+wave 95 |
| 13 | hex+railgun+droid 96 | emp+railgun+droid 93 | orbit+emp+railgun 94 |
| 14 | hex+railgun+wave 96 | emp+clone+droid 93 | hex+emp+droid 94 |
| 15 | railgun+clone+dup>railgun 96 | emp+clone+dup>clone 93 | hex+railgun+dome 94 |

## Builds that beat the meta both ways

- **Lv20 (38 builds):** almost any Railgun build with a shield (hex / orbit / dome) or Duplicate copying Railgun. Railgun dominates early (EMP 13s at weapon Lv10 vs Railgun 10s).
- **Lv40 (7):** orbit+emp+wave, hex+emp+dup>hex, hex+emp+wave, emp+railgun+wave, emp+clone+wave, emp+dome+wave, emp+io+wave.
- **Lv80 (8):** orbit+hex+emp, orbit+emp+wave, hex+emp+dup>hex, hex+emp+wave, emp+railgun+wave, emp+clone+wave, emp+dome+wave, emp+io+wave.

The cheapest meta-beater at Lv40 is hex+emp+dup>hex (1 Legendary, score 97). It also beats the counter-counter.

## Best Duplicate builds (best copy choice)

| Lv20 | Lv40 | Lv80 |
|---|---|---|
| emp+railgun+dup>railgun 100 | hex+emp+dup>hex 97 | hex+emp+dup>hex 99 |
| hex+railgun+dup>railgun 99 | hex+railgun+dup>hex 94 | hex+railgun+dup>hex 97 |
| orbit+railgun+dup>railgun 98 | emp+clone+dup>clone 93 | railgun+dup>railgun+wave 93 |
| railgun+droid+dup>railgun 98 | railgun+dup>railgun+wave 90 | orbit+hex+dup>hex 90 |
| railgun+dup>railgun+wave 97 | orbit+railgun+dup>railgun 88 | emp+clone+dup>clone 90 |

## Counter-counter check (Lv40)

All Hex + Railgun + X builds beat 12–14 of the 15 counters but lose to the meta both ways, so that part of the loop works.
The best are hex+railgun+clone (beats 14/15) and hex+railgun+dup>hex (13/15).

## History / what's been tried

- **Drop Signal card (v973):** with both sides carrying it, only the counters beat the meta at Lv40/Lv80. Lv20 is still Railgun-dominated.
- **Lv20 fix found in sim:** EMP cooldown 8s from weapon Lv10. Not built yet.
- **Rejected:** Fabricator Bay (makes EMP dead weight), two droids, 4× droid plus counter tweaks, Hex nerf, "Duplicate can't copy shields".
- **Clone Task** is 3× at Lv30 (v971). Weapon shots fly for 1.8s (v968). Both sides act at the same moment (v969).

## Kessa-only build (card 11 baseline, v987)

Sim: Kessa alone + cards 11, 2, 3, 4, 8 vs a normal 5-hero team with no cards, same weapon build on both sides (5 builds × attack/defend × 3 seeds). Kessa side's win %.
Rerun: `node dev/balance/kessa_solo.js`.

- Today, card 11 with 1 hero gives **+20% ATK** and Kessa-only wins **0%** at every level gap tested.
- A 1-hero fortress has about **1/5 the HP** (5,825 vs 28,225 at Lv40), because Arena fortress HP grows with hero power. That is the real problem; ATK alone can't fix it.
- With ATK only (no extra HP), Kessa-only needs +400–600% to beat players 10–20 levels lower.
- **Same level: 0% even with +300% ATK and 5× fortress HP.** Kessa-only can't beat an equal 5-hero team.

| Kessa Lv40 vs Lv30 team | +20% ATK | +100% | +200% | +300% |
|---|---|---|---|---|
| fortress HP ×1 (today) | 0 | 0 | 0 | 0 |
| ×2 | 0 | 0 | 0 | 80 |
| ×3 | 0 | 0 | 68 | 80 |
| ×5 (same as 5 heroes) | 0 | 57 | 80 | 97 |

Kessa Lv80 vs a Lv60 team gives almost the same table (×3 / +200% = 73, ×2 / +300% = 97).

### Kessa's 3 cards only (11, 2, 3), v987

Grid over the three cards' numbers. Kessa win %, same setup as above. "always" = the health condition removed.
Rerun: `node dev/balance/kessa_cards.js "[40,30]"`.

- **The health conditions are the problem.** A 1-hero fortress dies so fast that "<50%" and "<30%" buffs barely get a chance to fire. Card 3 always on is worth far more than a bigger number.
- **Vs Lv30 (mid tier)**, wins come from:
  - card 11 +200% with card 3 +200% always on → **97%**
  - card 11 +300% with card 3 +100% always on → 87–97%
  - card 11 +100% with card 3 +200% always and card 2 +500% always → 97%
- **Vs Lv20:** card 11 +100% with card 3 +100% always on → 100%.
- **Vs equal Lv40:** best result is 38% (card 11 +400%, card 3 +200% always, card 2 +500% always). Basically not winnable.
- With today's numbers (card 11 +20%, card 3 +20% under 50%, card 2 +30% under 30%): 0% at every gap.
