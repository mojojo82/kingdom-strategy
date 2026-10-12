# Mech rhino boss - rigid rig (not in the game yet)

Harley's Meshy mech rhino (art/originals/rhino_mech_lowpoly.glb, ~5.1k tris, one joined mesh). He also made a 1.75M-triangle version (not kept - too heavy).
Mechs must not bend like skin, so this is a RIGID rig: `build.py` cuts the mesh into parts by region (body, head+horn, 2 cannon barrels, each leg's upper + lower)
and sets pivots (hips/knees at the top of each piece, neck at z 0.42, cannons at the base of each barrel). `rhino.tpl.html` animates whole parts about their
pivots (children follow parents). Build: `python3 build.py && python3 -c "t=open('rhino.tpl.html').read(); open('rhino.html','w').write(t.replace('__RHINO__','window.RHINO='+open('rhino.json').read()+';'))"`.
Animations so far: Idle, Walk (diagonal gait), Fire (cannons rise out of their mounts, swing forward 66 deg, L/R fire in turn with recoil). "Parts" pulls the pieces apart.
Plan (Harley): only a boss, a couple of animations; the finished sprite sheet goes through ChatGPT's 2D filter, so render with plain lighting.

Feet are planted (Harley): plantLegs() solves each leg (hip + knee, side plane) so its foot stays at its ground spot whatever the body does; the body sits ~0.018 crouched so the
legs always have bend. Walk: 62% of each step on the ground (foot slides back = planted while he moves forward), 38% lifting forward. Measured: Idle/Fire feet move < 0.001.
