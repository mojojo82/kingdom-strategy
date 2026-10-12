#!/bin/sh
# Boss 3D poses -> boss.html preview (Boss Pose page). Run from dev/boss.
set -e; cd "$(dirname "$0")"
python3 -B bake_boss.py      # boss.json: mesh, skin, texture (1024), Meshy idle
python3 -B boss_pose.py      # boss3.json: + Boss Idle / Raise / Raised Idle (+ low versions) / Stomp / sequences
python3 -B -c "t=open('boss.tpl.html').read(); open('boss.html','w').write(t.replace('__KNIGHT__','window.KNIGHT='+open('boss3.json').read()+';'))"
