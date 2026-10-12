# Kessa 3D (Meshy) - preview
Harley's rigged Meshy mage (art/originals/kessa_rigged.glb; concept art/originals/kessa_concept_tpose.png; unrigged textured original kessa_textured_unrigged.glb).
Same 23-bone mixamorig skeleton as Gareth's knight, so dev/knight/mixamo.py-style retargets work. Built-in anims: Running, Walking, Rest pose (T-pose).
- `python3 -B bake_kessa.py` -> kessa.json (mesh, skin, 1024 texture, every GLB animation). Uses dev/boss/boss.tpl.html as the viewer (no sword).
- Page: `python3 -B -c "t=open('../boss/boss.tpl.html').read().replace('Chapter Boss<small>3D POSE PREVIEW</small>','Kessa<small>3D PREVIEW</small>'); open('kessa.html','w').write(t.replace('__KNIGHT__','window.KNIGHT='+open('kessa.json').read()+';'))"`
- `ANG=0.6 node render.js '{"Running":[0,0.12]}'` renders frames/ (see-through). In the game Kessa faces right.
Not in the game. Next: Harley's Mixamo cast animation; glue on the gold staff with the green orb; chin/ankle joints can be nudged if needed.
