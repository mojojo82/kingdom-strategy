# Chapter boss (3D) - poses

Harley's rigged Meshy dark knight (art/originals/boss_dark_knight_rigged.glb) posed by hand to match the current boss sprite. `./build.sh` makes boss.html
(published as "Boss Pose"). Not in the game yet.

Poses (boss_pose.py, same method as dev/knight: bones pointed in world directions, legs by IK with flat turned feet, hands along their own Y axis):
- DOWN / DOWN_B: idle, arm down; near (right) foot turned out 35 deg; left arm flared (Harley: bodybuilder look). APPROVED.
- UP / UP_B: right arm raised palm-out toward the fortress, angled down; chest square, head turned to the fortress. APPROVED.
- LOW / LOW_B: target at his feet (Gareth at point blank stands in front of his legs): body turned a little to the camera, leaning in, arm reaching
  down-forward, left arm lifted + bent (braced). APPROVED.
- STOMP_UP / STOMP_HIT: alternate low attack - knee to belt height, slam down (fast u^2 segment) a touch inward. Under review.
Game angle in the preview: "Hold angle" at -0.6 (he faces screen-left like the sprite). Hi-res sprite sheets go to art/originals/sprites_hires/boss when made.
