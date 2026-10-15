# Weapons: Conquest vs Arena audit (15 Oct 2026, TEST v1185)

Harley's rule: every weapon (and hero) works exactly the same in both modes. The ONLY allowed difference is the target:
Conquest = enemies + bosses, Arena = the opponent's heroes + fortress. Anything else that differs is a bug.

Found by reading the code (line numbers = test/index.html at v1185). Nothing fixed yet.

**Harley (15 Oct): some of these differences are intentional.** He is going through this list and will say which get fixed. Confirmed bug: Duplicate. Don't touch the rest until he marks them.

## Every weapon
- Cannon Doctrine card (+70% on Fortress I) boosts weapons in Arena (31312) but not in Conquest (only cannon 8686 + heroes 8895).
- Arena weapons only ever hit the fortress (toAi 31311-31324), never heroes - only hero attacks hit heroes.
- Conquest weapon cooldowns carry over between level attempts (never reset); Arena starts every battle at a full cooldown (30827).
- Conquest holds fire (but spends the cooldown) when no enemy has arrived (8214); Arena always fires.
- Bots/sim weapons use dmg without the ATK bonus (simWeaponsFromCfg 31412) and pick Duplicate's target by list order.

## Missile Barrage, Flak Burst, Scatter Rounds
- Conquest: one shot per missile, 0.16 s apart, each can miss / carry to the next enemy (8249, 8476). Arena: the whole volley lands as one hit (31381, 31206).
- Duplicate copies them in Arena (50%, half cooldown later) - not in Conquest (8757).

## Laser Beam, Pulse Beam
- Conquest: beam time with no target in front is lost (8513). Arena: always full damage.
- Duplicate copies them in Arena - not in Conquest.

## Salvo Loader - same.

## Railgun
- Arena: also knocks out EVERY enemy hero on hit (31117), and its droneOff / cloneDelay levels work (31119-31120). Conquest: only % of max HP, never reads droneOff / cloneDelay (8838).
- Conquest waits for an enemy before firing (8837); Arena fires on the countdown, lands after a short flight.

## EMP Gun
- Lv 50 Aftershock (second stun) only exists in Arena (31105); Conquest ignores it (8870).
- Conquest stuns stack (adds time, 8870); Arena doesn't stack (31092).
- Arena: EMP also resets enemy weapon reloads, cancels beams, Wall and repair (31107-31110).

## Droid Call
- Damage base differs: Conquest uses ranged power without ATK bonus / attack speed (8847); Arena uses real ranged hero damage per second incl. ATK bonus (31079).
- "Pierce" means skip defence in Conquest, skip Dome/Orbit in Arena.

## IO Repair
- With Duplicate: Conquest heals with both copies at once; Arena's copy overwrites the first (31167). Fires at exactly 85% HP only in Arena.

## Deflector Dome
- Conquest also cuts ranged/boss shots aimed at heroes (8585); Arena only protects heroes from Shuriken Storm (ranged hits on heroes go unreduced, 30918).

## Clone Task
- Template hero can differ (first infantry in roster order vs side list). No template: Conquest retries every tick, Arena waits a cooldown.
- Drop Signal "rush" and Railgun cloneDelay only in Arena.

## Hex Shield
- Conquest adds the Equipment "support" bonus to the pool (8076); Arena doesn't (30786).
- Duplicate copying Hex adds to the pool in Arena only (31443).
- Orbit's Hex Link recharge only in Arena (31178).

## Orbit Shield
- Lv 10+ Hex Link: Arena only (31083). Conquest reduces ranged hits on heroes (8585); Arena doesn't (30927, 31317).

## Projection Wall
- Not implemented in Conquest at all (no branch in idleFxWeaponTick, "inert" 8755). Arena: blocks Shuriken Storm on ranged heroes (30904).
- Lv 50 Mirror not implemented in either mode.

## Status Wave
- Inert in Conquest (nothing stuns you there); Arena blocks stuns + Reflect (31091). Mostly a target difference.

## Duplicate
- Copies Laser / missiles / Hex Shield in Arena only. The picker offers them in Conquest too, where they silently do nothing - and if no pick, the fallback can land on one of them.
