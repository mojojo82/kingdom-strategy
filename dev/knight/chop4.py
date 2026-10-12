# Overhead Chop v2 - copies Gareth's 2D attack sprite: stance -> sword cocked high behind the head (weight back)
# -> whips forward into a deep lunge, arm straight out at chest height -> recover.
# Limbs are posed by pointing each bone in a world direction (+Y up, +Z = the way he faces, -X = his right).
import json, base64, numpy as np
src=open('bake.py').read(); src=src[:src.index('J,BIN,walk,Tw,nw=bake')]; ns={}; exec(src,ns)
glb,acc,trs=ns['glb'],ns['acc'],ns['trs']
F='../../art/originals/knight_rigged.glb'
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
def rotX(a): a=np.radians(a); c,s=np.cos(a),np.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def rotY(a): a=np.radians(a); c,s=np.cos(a),np.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def align(cur,tgt):
    cur=cur/np.linalg.norm(cur); tgt=tgt/np.linalg.norm(tgt); v=np.cross(cur,tgt); c=float(np.dot(cur,tgt)); s=np.linalg.norm(v)
    if s<1e-8: return np.eye(3)
    vx=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]]); return np.eye(3)+vx+vx@vx*((1-c)/s**2)
def about(Gi,Rm):
    piv=Gi[:3,3].copy(); M=np.eye(4); M[:3,:3]=Rm; M[:3,3]=piv-Rm@piv; return M@Gi

# bone -> the child joint that gives its direction
CHILD={'RightArm':'RightForeArm','RightForeArm':'RightHand','LeftArm':'LeftForeArm','LeftForeArm':'LeftHand'}
# spine / hips / head: (pitch, yaw) extra rotation. pitch>0 leans forward, yaw>0 turns the right shoulder forward.
# arms/blade: world directions. feet: where each ankle stands (x, z) - legs are solved so feet stay flat on the ground.
# hips: (drop, forward). spine/hips/head rot: (pitch, yaw); pitch>0 leans forward, yaw>0 turns the right shoulder forward.
READY={'dir':{'RightArm':(-0.3,-0.9,0.35),'RightForeArm':(-0.05,-0.35,1),'blade':(0,-0.45,1),
              'LeftArm':(0.35,-0.9,0.1),'LeftForeArm':(0.15,-0.7,0.6)},
       'feet':{'R':(-0.24,0.12),'L':(0.26,-0.12)},'hip':(0.03,0.0),
       'rot':{'Hips':(0,-10),'Spine1':(5,-5),'Head':(-4,10)}}
WIND={'dir':{'RightArm':(-0.35,0.9,-0.15),'RightForeArm':(-0.05,0.55,-1),'blade':(0.05,0.85,-0.6),
             'LeftArm':(0.35,-0.8,0.4),'LeftForeArm':(0.15,-0.45,1)},
      'feet':{'R':(-0.24,0.16),'L':(0.26,-0.16)},'hip':(0.05,-0.05),
      'rot':{'Hips':(-4,-22),'Spine1':(-10,-20),'Head':(4,30)}}
STRIKE={'dir':{'RightArm':(-0.12,-0.05,1),'RightForeArm':(0,0.02,1),'blade':(0.05,0.08,1),
               'LeftArm':(0.35,-0.65,-0.65),'LeftForeArm':(0.1,-0.8,-0.5)},
        'feet':{'R':(-0.22,0.36),'L':(0.24,-0.24)},'hip':(0.15,0.08),
        'rot':{'Hips':(10,20),'Spine1':(18,22),'Head':(-14,-25)}}
FOLLOW={'dir':{'RightArm':(-0.12,-0.6,0.8),'RightForeArm':(0,-0.62,0.8),'blade':(0.05,-0.45,0.89),
               'LeftArm':(0.35,-0.6,-0.7),'LeftForeArm':(0.1,-0.75,-0.6)},
        'feet':{'R':(-0.22,0.36),'L':(0.24,-0.24)},'hip':(0.17,0.09),
        'rot':{'Hips':(14,24),'Spine1':(26,26),'Head':(-20,-28)}}
TL=1.1
K=[(0.00,READY),(0.26,WIND),(0.34,WIND),(0.44,STRIKE),(0.54,FOLLOW),(0.68,FOLLOW),(1.10,READY)]
FAST=2; CARRY=3   # FAST accelerates into the hit; CARRY keeps the momentum going (ease-out) into the follow-through   # the segment that is the hit: accelerates (u^2)
def ease(u): return u*u*(3-2*u)
def nrm(v): v=np.array(v,float); return v/np.linalg.norm(v)
def pose(t):
    for a in range(len(K)-1):
        if K[a][0]<=t<=K[a+1][0]:
            u=(t-K[a][0])/(K[a+1][0]-K[a][0]); u=u*u if a==FAST else (u*(2-u) if a==CARRY else ease(u)); A,B=K[a][1],K[a+1][1]
            L=lambda x,y:tuple(np.array(x,float)*(1-u)+np.array(y,float)*u)
            F4=lambda f:tuple(f)+(0,-1,0,0,0.97)[len(f)-4:] if len(f)>=4 else (f[0],FOOT_Y,f[1],0.0,0,-1,0,0,0.97)
            return ({k:nrm(nrm(A['dir'][k])*(1-u)+nrm(B['dir'][k])*u) for k in A['dir']},
                    {k:L(A['rot'][k],B['rot'][k]) for k in A['rot']},{k:L(F4(A['feet'][k]),F4(B['feet'][k])) for k in A['feet']},L(A['hip'],B['hip']))
    Z=K[-1][1]; F4=lambda f:tuple(f)+(0,-1,0,0,0.97)[len(f)-4:] if len(f)>=4 else (f[0],FOOT_Y,f[1],0.0,0,-1,0,0,0.97); return ({k:nrm(v) for k,v in Z['dir'].items()},Z['rot'],{k:F4(v) for k,v in Z['feet'].items()},Z['hip'])

d0=json.load(open('knight2.json')); Rh=np.array(d0['sword']['handR']).reshape(3,3).T
def vrot(rx,ry,rz):
    a,b,c=np.radians([rx,ry,rz]); X=np.array([[1,0,0],[0,np.cos(a),-np.sin(a)],[0,np.sin(a),np.cos(a)]]); Y=np.array([[np.cos(b),0,np.sin(b)],[0,1,0],[-np.sin(b),0,np.cos(b)]]); Z=np.array([[np.cos(c),-np.sin(c),0],[np.sin(c),np.cos(c),0],[0,0,1]])
    return Z@Y@X
BLADE_BIND=Rh@vrot(0,90,-90)@np.array([0,1.0,0])
hand_j=[k for k,j in enumerate(joints) if names[j]=='mixamorig:RightHand'][0]; hand_node=joints[hand_j]
FOOT_Y=0.185   # rest ankle height
REST={}
for i in order:
    L0=trs(*base[i]); REST[i]=(REST[parent[i]]@L0) if i in parent else L0
def blen(a,b): return np.linalg.norm(REST[nd(a)][:3,3]-REST[nd(b)][:3,3])
L1,L2=blen('RightUpLeg','RightLeg'),blen('RightLeg','RightFoot')
FLAT_BIND=Rh@vrot(0,90,-90)@nrm((-0.12,0,-0.99))   # the sword's flat side (its thinnest direction)
def knee(H,T,pole):
    d=T-H; dist=min(np.linalg.norm(d),(L1+L2)*0.999); u=d/np.linalg.norm(d); T=H+u*dist
    a=np.arccos(np.clip((L1*L1+dist*dist-L2*L2)/(2*L1*dist),-1,1)); p=pole-u*np.dot(pole,u); p=p/np.linalg.norm(p)
    return H+L1*(np.cos(a)*u+np.sin(a)*p),T
def frame(b,f):  # orthonormal frame from blade axis + flat-side normal
    b=nrm(b); f=f-b*np.dot(f,b); f=nrm(f); return np.stack([b,f,np.cross(b,f)],1)
SIGN=[None]
def glob(t):
    D,Rt,FT,(drop,fwd)=pose(t); G={}; LEG={}
    for i in order:
        L=trs(*base[i]); Gi=(G[parent[i]]@L) if i in parent else L
        nm=names[i].replace('mixamorig:','')
        if nm=='Hips': Gi=Gi.copy(); Gi[1,3]-=drop; Gi[2,3]+=fwd
        if nm in Rt:
            p,y=Rt[nm]; Gi=about(Gi,rotY(y)@rotX(p))
        if nm in CHILD:
            c=idx['mixamorig:'+CHILD[nm]]; cur=(Gi@np.append(base[c][0],1))[:3]-Gi[:3,3]; Gi=about(Gi,align(cur,D[nm]))
        if nm in ('RightUpLeg','LeftUpLeg'):
            side=nm[0]; H=Gi[:3,3].copy(); x,fy,z,_,dx,dy,dz,w,rf=FT[side]; Tg=(1-w)*np.array([x,fy,z])+w*(H+nrm((dx,dy,dz))*rf*(L1+L2)); Kp,T=knee(H,Tg,np.array([0,-0.3,1.0])); LEG[side+'shin']=T-Kp
            c=nd(side+('ight' if side=='R' else 'eft')+'Leg'); cur=(Gi@np.append(base[c][0],1))[:3]-H; Gi=about(Gi,align(cur,Kp-H))
        if nm in ('RightLeg','LeftLeg'):
            c=nd(nm.replace('Leg','Foot')); cur=(Gi@np.append(base[c][0],1))[:3]-Gi[:3,3]; Gi=about(Gi,align(cur,LEG[nm[0]+'shin']))
        if nm in ('RightFoot','LeftFoot'):   # flat on the ground: same turn as at rest
            Gi=Gi.copy(); Gi[:3,:3]=rotX(FT[nm[0]][3])@REST[i][:3,:3]
        if i==hand_node:   # blade points along 'blade' with its flat side kept facing sideways (edge leads the chop)
            Hb=Gi[:3,:3]@IBM[hand_j][:3,:3]; cb=Hb@BLADE_BIND; cf=Hb@FLAT_BIND
            if SIGN[0] is None: SIGN[0]=1.0 if cf[0]>=0 else -1.0
            Rm=frame(D['blade'],np.array([SIGN[0],0,0]))@frame(cb,cf).T; Gi=about(Gi,Rm)
        G[i]=Gi
    return G
def bakeAt(t):
    G=glob(t); return np.stack([G[j]@IBM[k] for k,j in enumerate(joints)])
import copy
def bake(keys,tl,fast=-1,carry=-1,n=None):
    global K,TL,FAST,CARRY
    K,TL,FAST,CARRY=keys,tl,fast,carry; SIGN[0]=None
    n=n or int(round(tl*30)); return np.array([bakeAt(f/n*tl) for f in range(n)])
def pack(fr): return base64.b64encode(np.ascontiguousarray(fr[:,:,:3,:].transpose(0,1,3,2),dtype=np.float32).tobytes()).decode()
chop=bake(K,TL,2,3)
RB=copy.deepcopy(READY); RB['hip']=(0.06,0.0); RB['rot']['Spine1']=(9,-5); RB['rot']['Head']=(-7,10); RB['dir']['blade']=(0,-0.52,1); RB['dir']['RightForeArm']=(-0.05,-0.42,1); RB['dir']['LeftForeArm']=(0.15,-0.78,0.5)
idle=bake([(0,READY),(0.5,RB),(1.0,READY)],1.0)
# Charge (Gareth's Shield Slam lunge, from Harley's charge art): stand -> crouch -> push off -> airborne charge pose (held).
# Sprite frames: 0.2 crouch, 0.35 push-off, 0.5 charge.
CROUCH={'dir':{'RightArm':(-0.25,-0.85,-0.3),'RightForeArm':(-0.05,-0.3,1),'blade':(0,-0.2,1),
               'LeftArm':(0.35,-0.85,0.25),'LeftForeArm':(0.15,-0.5,0.9)},
        'feet':{'R':(-0.24,0.22),'L':(0.26,-0.22)},'hip':(0.19,-0.03),
        'rot':{'Hips':(16,-8),'Spine1':(30,-8),'Head':(-26,8)}}
LAUNCH={'dir':{'RightArm':(-0.1,-0.35,0.95),'RightForeArm':(0,-0.12,1),'blade':(0,-0.05,1),
               'LeftArm':(0.3,-0.6,-0.7),'LeftForeArm':(0.15,-0.6,-0.7)},
        'feet':{'R':(-0.22,0.36,0.40,25),'L':(0.24,0.185,-0.34,0)},'hip':(0.02,0.1),
        'rot':{'Hips':(26,8),'Spine1':(38,10),'Head':(-36,-8)}}
CHARGE={'dir':{'RightArm':(-0.05,0.04,1),'RightForeArm':(0,0.04,1),'blade':(0,0.04,1),             # sword arm thrust straight ahead
               'LeftArm':(0.3,-0.35,-0.9),'LeftForeArm':(0.15,-0.5,-0.85)},
        # front leg tucked under (knee bent), back leg trailing behind with a slight bend - like Harley's charge art
        'feet':{'R':(-0.12,0.5,0.0,45,-0.04,-1,-0.25,1,0.72),'L':(0.12,0.5,-0.3,80,0.04,-0.5,-1,1,0.85)},
        'hip':(-0.16,0.15),
        'rot':{'Hips':(42,12),'Spine1':(20,12),'Head':(-46,-12)}}                                    # leaning well forward, head up
charge=bake([(0,READY),(0.2,CROUCH),(0.35,LAUNCH),(0.5,CHARGE),(0.8,CHARGE),(1.0,READY)],1.0)
d=json.load(open('knight2.json'))
# Back-hop (the game's HERO_HOP: 9 frames, the game lifts him itself while frames 1-5 play). One pose per 0.1 s.
def RD(**kw):
    import copy; k=copy.deepcopy(READY)
    for a,b in kw.items(): k[a]=b
    return k
HOPK=[RD(hip=(0.12,0),rot={'Hips':(8,-10),'Spine1':(14,-5),'Head':(-10,10)}),                                   # 0 crouch
      RD(feet={'R':(-0.24,0.08),'L':(0.26,-0.16)},hip=(-0.06,0),rot={'Hips':(-6,-10),'Spine1':(-6,-5),'Head':(4,10)}), # 1 push off (legs straight)
      RD(feet={'R':(-0.22,0.36,0.16,25),'L':(0.24,0.4,-0.08,25)},hip=(0.0,0)),                                     # 2-4 tucked in the air
      RD(feet={'R':(-0.22,0.38,0.18,25),'L':(0.24,0.42,-0.06,25)},hip=(0.0,0)),
      RD(feet={'R':(-0.22,0.36,0.16,25),'L':(0.24,0.4,-0.08,25)},hip=(0.0,0)),
      RD(feet={'R':(-0.24,0.24,0.12,10),'L':(0.26,0.26,-0.14,10)},hip=(0.0,0)),                                    # 5 legs reaching down
      RD(hip=(0.12,0),rot={'Hips':(8,-10),'Spine1':(12,-5),'Head':(-8,10)}),                                       # 6 land
      RD(hip=(0.17,0),rot={'Hips':(12,-10),'Spine1':(18,-5),'Head':(-14,10)}),                                     # 7 absorb
      READY]                                                                                                        # 8 ready
hop=bake([(i*0.1,k) for i,k in enumerate(HOPK)]+[(0.9,READY)],0.9)
d['anims']={'Hop':{'len':0.9,'frames':pack(hop)},'Overhead Chop':{'len':1.1,'frames':pack(chop)},'Idle (ready)':{'len':1.0,'frames':pack(idle)},'Charge':{'len':1.0,'frames':pack(charge)}, **d['anims']}
json.dump(d,open('knight3.json','w')); print('chop',chop.shape,'idle',idle.shape)
