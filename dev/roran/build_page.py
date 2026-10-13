# roran.html from the boss viewer; skin should not be glossy: the specular highlight is cut from 0.35 to 0.06 (boss armour keeps 0.35)
t=open('../boss/boss.tpl.html').read().replace('Chapter Boss<small>3D POSE PREVIEW</small>','Roran<small>3D PREVIEW</small>')
a='pow(max(dot(N, H), 0.0), 40.0) * 0.35;'; assert t.count(a)==1; t=t.replace(a,'pow(max(dot(N, H), 0.0), 40.0) * 0.06;')
open('roran.html','w').write(t.replace('__KNIGHT__','window.__GRIP={rx:0,ry:0,rz:0,ox:0,oy:0,oz:0,ss:1/2.43};window.KNIGHT='+open('roran.json').read()+';'))  # staff (staff.py) is already in bind space: no grip turn, size 1
