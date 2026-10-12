# kessa.json for the 3D preview template (dev/boss/boss.tpl.html): mesh, skin, texture, every animation in the rigged GLB; no sword
import json, io, base64, numpy as np
from PIL import Image
src=open('../knight/bake.py').read(); src=src[:src.index('J,BIN,walk,Tw,nw=bake')]; ns={}; exec(src,ns); glb,acc,trs,slerp=ns['glb'],ns['acc'],ns['trs'],ns['slerp']
F='../../art/originals/kessa_rigged.glb'
J,BIN=glb(F); nodes=J['nodes']; skin=J['skins'][0]; joints=skin['joints']; names=[nodes[j]['name'] for j in joints]
IBM=acc(J,BIN,skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
parent={}
for i,n in enumerate(nodes):
    for c in n.get('children',[]): parent[c]=i
base={i:(np.array(n.get('translation',[0,0,0]),float),np.array(n.get('rotation',[0,0,0,1]),float),np.array(n.get('scale',[1,1,1]),float)) for i,n in enumerate(nodes)}
def bake(an,fps=30):
    samp=[]
    for ch in an['channels']:
        s=an['samplers'][ch['sampler']]; samp.append((ch['target']['node'],ch['target']['path'],acc(J,BIN,s['input']).ravel(),acc(J,BIN,s['output'])))
    T=max(s[2].max() for s in samp); nf=max(2,int(round(T*fps))); out=[]
    for f in range(nf):
        t=f/nf*T; loc={i:[v.copy() for v in base[i]] for i in base}
        for node,path,inp,o in samp:
            if len(inp)<2: ix={'translation':0,'rotation':1,'scale':2}[path]; loc[node][ix]=o[0].astype(float); continue
            k=np.searchsorted(inp,t,side='right')-1; k=max(0,min(k,len(inp)-2)); u=0 if inp[k+1]==inp[k] else np.clip((t-inp[k])/(inp[k+1]-inp[k]),0,1)
            ix={'translation':0,'rotation':1,'scale':2}[path]; a,b=o[k].astype(float),o[k+1].astype(float)
            loc[node][ix]=slerp(a,b,u) if path=='rotation' else a+(b-a)*u
        G={}
        def g(i):
            if i in G: return G[i]
            M=trs(*loc[i]); G[i]=(g(parent[i])@M) if i in parent else M; return G[i]
        out.append(np.stack([g(j)@IBM[k] for k,j in enumerate(joints)]))
    return np.array(out),T
p=J['meshes'][0]['primitives'][0]; A=p['attributes']
P=acc(J,BIN,A['POSITION']).astype(np.float32); N=acc(J,BIN,A['NORMAL']).astype(np.float32); UV=acc(J,BIN,A['TEXCOORD_0']).astype(np.float32)
JI=acc(J,BIN,A['JOINTS_0']).astype(np.uint8); W=acc(J,BIN,A['WEIGHTS_0']).astype(np.float32); I=acc(J,BIN,p['indices']); I=I.astype(np.uint32 if I.max()>65535 else np.uint16).ravel()
img=J['images'][J['textures'][J['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]; bv=J['bufferViews'][img['bufferView']]
im=Image.open(io.BytesIO(BIN[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB'); print('tex',im.size)
im=im.resize((1024,1024),Image.LANCZOS); b=io.BytesIO(); im.save(b,'WEBP',quality=88,method=6); tex='data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
f32=lambda a: base64.b64encode(np.ascontiguousarray(a,dtype=np.float32).tobytes()).decode()
anims={}
for an in J['animations']:
    nm={'Armature|clip0|baselayer':'Rest pose'}.get(an['name'],an['name']); fr,T=bake(an); anims[nm]={'len':float(T),'frames':f32(fr[:,:,:3,:].transpose(0,1,3,2))}; print(nm,fr.shape,round(T,2))
hand=names.index('mixamorig:RightHand')
out={'p':f32(P),'n':f32(N),'uv':f32(UV),'j':base64.b64encode(JI.tobytes()).decode(),'w':f32(W),'i':base64.b64encode(I.tobytes()).decode(),'i32':I.dtype==np.uint32,'tex':tex,'nj':len(joints),'hand':hand,'anims':anims,
     'sword':{'p':f32(np.zeros((3,3))),'n':f32(np.tile([0,1,0],(3,1))),'uv':f32(np.zeros((3,2))),'i':base64.b64encode(np.array([0,1,2],np.uint16).tobytes()).decode(),'tex':tex,'handO':[0,0,0],'handR':[1,0,0,0,1,0,0,0,1]}}
json.dump(out,open('kessa.json','w')); print('KB',len(json.dumps(out))//1024,'verts',len(P),'idx',I.dtype, 'bounds',P.min(0).round(3),P.max(0).round(3))
