# Boss poses (hand-keyed, like the knight's chop): idle with the arm down, raising the arm palm-out, idle with the arm raised.
# World: +Y up, +Z = the way he faces, -X = his right. Arms/hands posed by pointing bones; legs by IK (feet planted, flat).
import json, base64, copy, numpy as np
src=open('/home/claude/kingdom-strategy/dev/knight/bake.py').read(); src=src[:src.index('J,BIN,walk,Tw,nw=bake')]; ns={}; exec(src,ns); glb,acc,trs=ns['glb'],ns['acc'],ns['trs']
F='../../art/originals/boss_dark_knight_rigged.glb'
J,BIN=glb(F); nodes=J['nodes']; skin=J['skins'][0]; joints=skin['joints']; names={i:n.get('name','') for i,n in enumerate(nodes)}
IBM=acc(J,BIN,skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
parent={}
for i,n in enumerate(nodes):
    for c in n.get('children',[]): parent[c]=i
base={i:[np.array(n.get('translation',[0,0,0]),float),np.array(n.get('rotation',[0,0,0,1]),float),np.array(n.get('scale',[1,1,1]),float)] for i,n in enumerate(nodes)}
order=[]; seen=set()
def visit(i):
    if i in seen: return
    if i in parent: visit(parent[i])
    seen.add(i); order.append(i)
for i in range(len(nodes)): visit(i)
idx={v:k for k,v in names.items()}
def nd(n): return idx['mixamorig:'+n]
def nrm(v): v=np.array(v,float); return v/np.linalg.norm(v)
def rotX(a): a=np.radians(a); c,s=np.cos(a),np.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def rotY(a): a=np.radians(a); c,s=np.cos(a),np.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def align(cur,tgt):
    cur=nrm(cur); tgt=nrm(tgt); v=np.cross(cur,tgt); c=float(np.dot(cur,tgt)); s=np.linalg.norm(v)
    if s<1e-8: return np.eye(3)
    vx=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]]); return np.eye(3)+vx+vx@vx*((1-c)/s**2)
def about(Gi,Rm):
    piv=Gi[:3,3].copy(); M=np.eye(4); M[:3,:3]=Rm; M[:3,3]=piv-Rm@piv; return M@Gi
REST={}
for i in order:
    L0=trs(*base[i]); REST[i]=(REST[parent[i]]@L0) if i in parent else L0
def blen(a,b): return np.linalg.norm(REST[nd(a)][:3,3]-REST[nd(b)][:3,3])
L1,L2=blen('RightUpLeg','RightLeg'),blen('RightLeg','RightFoot'); FOOT_Y=float(REST[nd('RightFoot')][1,3])
CHILD={'RightArm':'RightForeArm','RightForeArm':'RightHand','LeftArm':'LeftForeArm','LeftForeArm':'LeftHand'}
def knee(H,T,pole):
    d=T-H; dist=min(np.linalg.norm(d),(L1+L2)*0.999); u=d/np.linalg.norm(d); T=H+u*dist
    a=np.arccos(np.clip((L1*L1+dist*dist-L2*L2)/(2*L1*dist),-1,1)); p=pole-u*np.dot(pole,u); p=p/np.linalg.norm(p)
    return H+L1*(np.cos(a)*u+np.sin(a)*p),T
# ---- the poses
DOWN={'dir':{'RightArm':(-0.36,-0.93,0.1),'RightForeArm':(-0.17,-0.95,0.3),'RightHand':(-0.09,-0.95,0.3),
             'LeftArm':(0.74,-0.62,0.26),'LeftForeArm':(0.42,-0.82,0.4),'LeftHand':(0.3,-0.88,0.38)},   # flared out, elbow bent (Harley: bodybuilder look)
      'feet':{'R':(-0.28,0.04),'L':(0.30,-0.10)},'fyaw':{'R':-35,'L':8},'hip':(0.03,0.0),
      'rot':{'Hips':(0,0),'Spine1':(-3,0),'Head':(7,0)}}
DOWN_B=copy.deepcopy(DOWN); DOWN_B['hip']=(0.045,0.0); DOWN_B['rot']['Spine1']=(-1,0); DOWN_B['rot']['Head']=(8,0)
DOWN_B['dir']['RightForeArm']=(-0.19,-0.93,0.34); DOWN_B['dir']['LeftArm']=(0.76,-0.6,0.26); DOWN_B['dir']['LeftForeArm']=(0.44,-0.8,0.44)
UP={'dir':{'RightArm':(-0.66,-0.58,0.47),'RightForeArm':(-0.76,-0.44,0.48),'RightHand':(-0.58,0.58,0.57),   # pointing at the fortress, angled down; palm out   # arm out at shoulder height, palm out (fingers up)
           'LeftArm':(0.74,-0.62,0.24),'LeftForeArm':(0.42,-0.82,0.38),'LeftHand':(0.3,-0.88,0.36)},
    'feet':{'R':(-0.28,0.08),'L':(0.30,-0.12)},'fyaw':{'R':-35,'L':8},'hip':(0.035,0.0),
    'rot':{'Hips':(0,0),'Spine1':(-3,0),'Head':(10,-45)}}   # no chest turn (Harley); the head looks at the fortress   # chest turns a little, head the rest of the way: looking at the fortress
UP_B=copy.deepcopy(UP); UP_B['hip']=(0.05,0.0); UP_B['rot']['Spine1']=(-1,0); UP_B['dir']['RightArm']=(-0.66,-0.54,0.5); UP_B['dir']['RightHand']=(-0.57,0.66,0.5)
# v2 (Harley): attacker at his feet - hand aimed down toward the ground in front of him, head looking down at it. Chest still square.
LOW=copy.deepcopy(UP)
# target = where Gareth stands at point blank (fight screenshot): in front of the boss, toward the camera, ~knee height. Body turns a bit to the camera and leans in.
LOW['dir']['RightArm']=(-0.18,-0.55,0.82); LOW['dir']['RightForeArm']=(-0.08,-0.72,0.69); LOW['dir']['RightHand']=(-0.04,-0.78,0.62)   # closer in
LOW['dir']['LeftArm']=(0.78,-0.4,0.48); LOW['dir']['LeftForeArm']=(0.45,-0.3,0.84); LOW['dir']['LeftHand']=(0.35,-0.35,0.87)   # resting arm lifts and bends (braced, not limp)
LOW['rot']={'Hips':(4,14),'Spine1':(12,10),'Head':(38,-6)}
LOW_B=copy.deepcopy(LOW); LOW_B['hip']=(0.05,0.0); LOW_B['rot']['Spine1']=(14,10); LOW_B['dir']['RightArm']=(-0.18,-0.52,0.84); LOW_B['dir']['LeftArm']=(0.79,-0.37,0.49)
# Stomp (alternate low attack): lift the near (right) foot high, hold, slam it down where Gareth stands, settle.
STOMP_UP=copy.deepcopy(DOWN)
STOMP_UP['feet']={'R':(-0.2,0.2),'L':(0.30,-0.14)}; STOMP_UP['flift']={'R':0.62}; STOMP_UP['fyaw']={'R':-20,'L':8}; STOMP_UP['hip']=(0.0,-0.03)
STOMP_UP['rot']={'Hips':(-4,8),'Spine1':(-8,6),'Head':(26,-10)}
STOMP_UP['dir'].update({'RightArm':(-0.8,-0.4,0.45),'RightForeArm':(-0.6,-0.2,0.78),'RightHand':(-0.5,-0.3,0.8),'LeftArm':(0.8,-0.38,0.46),'LeftForeArm':(0.5,-0.25,0.83),'LeftHand':(0.4,-0.3,0.86)})
STOMP_HIT=copy.deepcopy(STOMP_UP)
STOMP_HIT['feet']={'R':(-0.16,0.36),'L':(0.30,-0.14)}; STOMP_HIT['flift']={'R':0.0}; STOMP_HIT['hip']=(0.1,0.04)
STOMP_HIT['rot']={'Hips':(8,8),'Spine1':(14,6),'Head':(30,-10)}
STOMP_HIT['dir'].update({'RightArm':(-0.75,-0.6,0.28),'LeftArm':(0.78,-0.55,0.3)})
FAST=-1
K=None
def ease(u): return u*u*(3-2*u)
def pose(t):
    for a in range(len(K)-1):
        if K[a][0]<=t<=K[a+1][0]:
            u=(t-K[a][0])/(K[a+1][0]-K[a][0]); u=u*u if a==FAST else ease(u); A,B=K[a][1],K[a+1][1]; Lr=lambda x,y:tuple(np.array(x,float)*(1-u)+np.array(y,float)*u)
            fy=lambda P,k:(P.get('fyaw') or {}).get(k,0)
            return ({k:nrm(nrm(A['dir'][k])*(1-u)+nrm(B['dir'][k])*u) for k in A['dir']},{k:Lr(A['rot'][k],B['rot'][k]) for k in A['rot']},{k:Lr(A['feet'][k],B['feet'][k])+(fy(A,k)*(1-u)+fy(B,k)*u,(A.get('flift') or {}).get(k,0)*(1-u)+(B.get('flift') or {}).get(k,0)*u) for k in A['feet']},Lr(A['hip'],B['hip']))
    Z=K[-1][1]; return ({k:nrm(v) for k,v in Z['dir'].items()},Z['rot'],{k:tuple(v)+((Z.get('fyaw') or {}).get(k,0),(Z.get('flift') or {}).get(k,0)) for k,v in Z['feet'].items()},Z['hip'])
def glob(t):
    D,Rt,FT,(drop,fwd)=pose(t); G={}; LEG={}
    for i in order:
        L=trs(*base[i]); Gi=(G[parent[i]]@L) if i in parent else L
        nm=names[i].replace('mixamorig:','')
        if nm=='Hips': Gi=Gi.copy(); Gi[1,3]-=drop; Gi[2,3]+=fwd
        if nm in Rt: p,y=Rt[nm]; Gi=about(Gi,rotY(y)@rotX(p))
        if nm in CHILD:
            c=idx['mixamorig:'+CHILD[nm]]; cur=(Gi@np.append(base[c][0],1))[:3]-Gi[:3,3]; Gi=about(Gi,align(cur,D[nm]))
        if nm in ('RightHand','LeftHand'): Gi=about(Gi,align(Gi[:3,:3]@np.array([0,1.0,0]),D[nm]))   # the hand points along its own Y axis
        if nm in ('RightUpLeg','LeftUpLeg'):
            side=nm[0]; H=Gi[:3,3].copy(); x,z,yw,lf=FT[side]; Kp,T=knee(H,np.array([x,FOOT_Y+lf,z]),rotY(yw)@np.array([0,0,1.0])); LEG[side+'shin']=T-Kp
            c=nd(side+('ight' if side=='R' else 'eft')+'Leg'); cur=(Gi@np.append(base[c][0],1))[:3]-H; Gi=about(Gi,align(cur,Kp-H))
        if nm in ('RightLeg','LeftLeg'):
            c=nd(nm.replace('Leg','Foot')); cur=(Gi@np.append(base[c][0],1))[:3]-Gi[:3,3]; Gi=about(Gi,align(cur,LEG[nm[0]+'shin']))
        if nm in ('RightFoot','LeftFoot'): Gi=Gi.copy(); Gi[:3,:3]=rotY(FT[nm[0]][2])@REST[i][:3,:3]   # flat, turned by its yaw
        G[i]=Gi
    return np.stack([G[j]@IBM[k] for k,j in enumerate(joints)])
def bake(keys,tl,fast=-1):
    global K,FAST; K=keys; FAST=fast; n=int(round(tl*30)); return np.array([glob(f/n*tl) for f in range(n)])
def pack(fr): return base64.b64encode(np.ascontiguousarray(fr[:,:,:3,:].transpose(0,1,3,2),dtype=np.float32).tobytes()).decode()
A={}
A['Boss Sequence']=(bake([(0,DOWN),(1.0,DOWN_B),(2.0,DOWN),(2.8,UP),(3.8,UP_B),(4.8,UP),(5.8,UP_B),(6.6,DOWN)],6.6),6.6)   # preview: idle, raise, raised idle, lower
A['Boss Sequence (low)']=(bake([(0,DOWN),(1.0,DOWN_B),(2.0,DOWN),(2.8,LOW),(3.8,LOW_B),(4.8,LOW),(5.8,LOW_B),(6.6,DOWN)],6.6),6.6)
A['Boss Raise (low)']=(bake([(0,DOWN),(0.8,LOW),(1.2,LOW)],1.2),1.2)
A['Boss Raised Idle (low)']=(bake([(0,LOW),(1.0,LOW_B),(2.0,LOW)],2.0),2.0)
A['Boss Stomp']=(bake([(0,DOWN),(0.45,STOMP_UP),(0.65,STOMP_UP),(0.78,STOMP_HIT),(1.05,STOMP_HIT),(1.6,DOWN)],1.6,fast=2),1.6)
A['Boss Idle']=(bake([(0,DOWN),(1.0,DOWN_B),(2.0,DOWN)],2.0),2.0)
A['Boss Raise']=(bake([(0,DOWN),(0.8,UP),(1.2,UP)],1.2),1.2)
A['Boss Raised Idle']=(bake([(0,UP),(1.0,UP_B),(2.0,UP)],2.0),2.0)
d=json.load(open('boss.json'))
d['anims']={**{k:{'len':v[1],'frames':pack(v[0])} for k,v in A.items()}, **d['anims']}
json.dump(d,open('boss3.json','w')); print({k:v[0].shape for k,v in A.items()})
