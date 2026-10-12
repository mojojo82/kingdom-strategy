# kessa.html from the boss viewer; skin should not be glossy: the specular highlight is cut from 0.35 to 0.06 (boss armour keeps 0.35)
t=open('../boss/boss.tpl.html').read().replace('Chapter Boss<small>3D POSE PREVIEW</small>','Kessa<small>3D PREVIEW</small>')
a='pow(max(dot(N, H), 0.0), 40.0) * 0.35;'; assert t.count(a)==1; t=t.replace(a,'pow(max(dot(N, H), 0.0), 40.0) * 0.06;')
open('kessa.html','w').write(t.replace('__KNIGHT__','window.KNIGHT='+open('kessa.json').read()+';'))
