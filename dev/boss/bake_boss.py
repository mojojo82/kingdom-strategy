# boss.json for the knight preview template: mesh, skin, texture, Meshy idle; no sword (empty)
import sys, json, io, base64, numpy as np
from PIL import Image
src=open('/home/claude/kingdom-strategy/dev/knight/bake.py').read(); src=src[:src.index('J,BIN,walk,Tw,nw=bake')]; ns={}; exec(src,ns); glb,acc,bake=ns['glb'],ns['acc'],ns['bake']
F='../../art/originals/boss_dark_knight_rigged.glb'
J,BIN,fr,T,_=bake(F)
J,BIN=glb(F); skin=J['skins'][0]; joints=skin['joints']; names=[J['nodes'][j]['name'] for j in joints]
p=J['meshes'][0]['primitives'][0]; A=p['attributes']
P=acc(J,BIN,A['POSITION']).astype(np.float32); N=acc(J,BIN,A['NORMAL']).astype(np.float32); UV=acc(J,BIN,A['TEXCOORD_0']).astype(np.float32)
JI=acc(J,BIN,A['JOINTS_0']).astype(np.uint8); W=acc(J,BIN,A['WEIGHTS_0']).astype(np.float32); I=acc(J,BIN,p['indices']).astype(np.uint16).ravel()
img=J['images'][J['textures'][J['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]; bv=J['bufferViews'][img['bufferView']]
im=Image.open(io.BytesIO(BIN[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB'); print('tex',im.size)
im=im.resize((1024,1024),Image.LANCZOS); b=io.BytesIO(); im.save(b,'WEBP',quality=86,method=6); tex='data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
f32=lambda a: base64.b64encode(np.ascontiguousarray(a,dtype=np.float32).tobytes()).decode()
print('bounds', P.min(0).round(3), P.max(0).round(3))
hand=names.index('mixamorig:RightHand')
out={'p':f32(P),'n':f32(N),'uv':f32(UV),'j':base64.b64encode(JI.tobytes()).decode(),'w':f32(W),'i':base64.b64encode(I.tobytes()).decode(),'tex':tex,'nj':len(joints),'hand':hand,
     'anims':{'Meshy Idle':{'len':float(T),'frames':f32(fr[:,:,:3,:].transpose(0,1,3,2))}},
     'sword':{'p':f32(np.zeros((3,3))),'n':f32(np.tile([0,1,0],(3,1))),'uv':f32(np.zeros((3,2))),'i':base64.b64encode(np.array([0,1,2],np.uint16).tobytes()).decode(),'tex':tex,'handO':[0,0,0],'handR':[1,0,0,0,1,0,0,0,1]}}
json.dump(out,open('boss.json','w')); print('KB',len(json.dumps(out))//1024, 'frames', fr.shape)
