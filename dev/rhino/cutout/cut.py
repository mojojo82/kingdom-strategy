# cut the filtered rhino into parts (polygons in image px), patch the body behind them, write parts.json (+ png per part)
import json, base64, io, numpy as np, cv2
from PIL import Image, ImageDraw
im=Image.open('rhino.png').convert('RGBA'); W,H=im.size; A=np.asarray(im)
PARTS={ # name: (polygon, pivot, z order)  - z: lower draws first
 'legB':  ([(1170,700),(1330,660),(1500,680),(1536,760),(1536,1024),(1070,1024),(1090,880),(1120,780)], (1340,690), 0),
 'legF':  ([(600,720),(760,690),(950,700),(985,800),(1000,1024),(500,1024),(515,880),(560,790)], (790,700), 1),
 'cannonB':([(1290,330),(1330,270),(1450,130),(1480,40),(1536,40),(1536,130),(1410,300),(1355,350),(1320,355)], (1325,330), 2),
 'cannonF':([(1110,262),(1155,195),(1225,80),(1255,0),(1320,0),(1318,60),(1215,205),(1165,272),(1135,282)], (1140,262), 3),
 'body':  (None, (900,560), 4),
 'head':  ([(0,240),(140,260),(250,350),(330,290),(395,350),(470,320),(520,470),(505,640),(470,720),(380,775),(250,790),(120,740),(0,620)], (480,560), 5),
}
masks={}
for n,(poly,piv,z) in PARTS.items():
    if poly is None: continue
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(poly,fill=255); masks[n]=(np.asarray(m)>0)&(A[:,:,3]>0)
# cannons: everything within a band around each barrel's centre line (base -> tip), so no slivers stay on the body
yy,xx=np.mgrid[0:H,0:W]
for n,(b0,b1,hw) in {'cannonF':((1150,268),(1305,-20),44),'cannonB':((1338,322),(1525,25),46)}.items():
    bx,by=b0; dx,dy=b1[0]-bx,b1[1]-by; L2=dx*dx+dy*dy; tt=((xx-bx)*dx+(yy-by)*dy)/L2; px,py=bx+tt*dx,by+tt*dy
    masks[n]=(tt>=0)&(tt<=1.08)&(np.hypot(xx-px,yy-py)<hw)&(A[:,:,3]>0)
    PARTS[n]=(None,b0,PARTS[n][2])
masks['cannonF']&=~masks['cannonB']
# loose bits of the upper body (not joined to the main mass once the cannons are out) belong to the nearest cannon
rest=(A[:,:,3]>0)&~masks['cannonF']&~masks['cannonB']; nlab,cc=cv2.connectedComponents(rest.astype(np.uint8),connectivity=8)
big=np.bincount(cc.ravel())[1:].argmax()+1
for k in range(1,nlab):
    if k==big: continue
    m=cc==k; ys,xs=np.nonzero(m)
    if ys.mean()>360: continue
    cx=xs.mean(); masks['cannonF' if cx<1330 else 'cannonB']|=m
cut=np.zeros((H,W),bool)
for m in masks.values(): cut|=m
body=A.copy(); body[cut,3]=0
# joint overlap: the body keeps each part's own pixels for a short way in from where they join, so a moving part never opens a hole (no smudged patching)
body0=(body[:,:,3]>0).astype(np.uint8)*255; keep=np.zeros((H,W),bool)
for n,r in (('cannonF',5),('cannonB',5),('head',34),('legF',30),('legB',30)):
    keep|=(cv2.dilate(body0,np.ones((2*r+1,2*r+1),np.uint8))>0)&masks[n]
body[keep]=A[keep]; hole=keep
out={'w':W,'h':H,'parts':[]}
for n,(poly,piv,z) in sorted(PARTS.items(),key=lambda kv:kv[1][2]):
    a=body if n=='body' else np.where(masks[n][:,:,None],A,0).astype(np.uint8)
    ys,xs=np.nonzero(a[:,:,3]); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    p=Image.fromarray(a[y0:y1,x0:x1],'RGBA'); p.save(f'part_{n}.png'); b=io.BytesIO(); p.save(b,'PNG',optimize=True)
    out['parts'].append({'name':n,'x':int(x0),'y':int(y0),'px':piv[0],'py':piv[1],'src':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()})
json.dump(out,open('parts.json','w')); print([ (p['name'],p['x'],p['y']) for p in out['parts']], 'patched px', int(hole.sum()))
# check sheet: the parts pulled apart
v=Image.new('RGBA',(W+200,H+150),(30,40,60,255)); off={'legB':(60,90),'legF':(-30,110),'cannonB':(120,-40),'cannonF':(40,-60),'body':(0,0),'head':(-120,20)}
for p in out['parts']:
    v.alpha_composite(Image.open(f"part_{p['name']}.png"),(p['x']+100+off[p['name']][0],p['y']+75+off[p['name']][1]))
v.thumbnail((1000,700)); v.save('exploded.png')
