from PIL import Image
import numpy as np, json, cv2
from scipy import ndimage
F=np.array(Image.open('full.png').convert('RGB')).astype(np.int32)
E=np.array(Image.open('empty.png').convert('RGB')).astype(np.int32)
B=np.array(Image.open('bg.png').convert('RGB')).astype(np.int32)
def cut(name,src,box,ref='bg',fill=True,t0=18,t1=70,extra=None):
  x0,y0,x1,y1=box
  S={'full':F,'empty':E}[src][y0:y1,x0:x1]
  if ref=='bg':
    d=np.abs(S-B[y0:y1,x0:x1]).sum(2)
    if src=='full': d=np.maximum(d,np.abs(E[y0:y1,x0:x1]-B[y0:y1,x0:x1]).sum(2)*0)  # full vs bg only
  else:
    d=np.abs(S-E[y0:y1,x0:x1]).sum(2)
  a=np.clip((d-t0)/(t1-t0),0,1)
  if fill:
    core=ndimage.binary_fill_holes(a>0.5); core=ndimage.binary_opening(core,iterations=1)
    a=np.maximum(a,core.astype(float))
    # drop tiny islands
    lab,n=ndimage.label(a>0.05); 
    if n>1:
      sz=ndimage.sum(a>0.05,lab,range(1,n+1)); keep=np.isin(lab,[i+1 for i in range(n) if sz[i]>=max(30,0.002*sz.max())]); a=a*keep
  rgba=np.dstack([S,(a*255)]).astype(np.uint8)
  im=Image.fromarray(rgba,'RGBA')
  if extra: im=extra(im)
  im.save('parts/%s.png'%name)
  return {'x':x0,'y':y0,'w':x1-x0,'h':y1-y0}
def inpaint_badge(im):
  a=np.array(im); rgb=a[...,:3].copy(); h,w=rgb.shape[:2]
  yy,xx=np.mgrid[0:h,0:w]; cx,cy=w/2,h/2; r=np.hypot(xx-cx,yy-cy)
  lum=rgb.astype(int).sum(2)
  m=((lum<330)&(r<w*0.27)).astype(np.uint8)
  m=cv2.dilate(m,np.ones((5,5),np.uint8))
  out=cv2.inpaint(rgb[...,::-1].copy(),m,6,cv2.INPAINT_TELEA)[...,::-1]
  a[...,:3]=out; return Image.fromarray(a,'RGBA')
L={}
L['title']=cut('title','full',(150,28,446,82))
L['back']=cut('back','full',(50,5,145,108))
L['gear']=cut('gear','full',(774,5,868,108))
L['pill']=cut('pill','full',(344,106,575,176))
L['stoneL']=cut('slot_stone','empty',(30,178,186,326))
L['dashed']=cut('slot_dashed','full',(32,321,180,470))
L['card']=cut('card_frame','empty',(70,719,224,881))
L['portrait']=cut('portrait_frame','empty',(53,924,289,1161))
L['namebar']=cut('namebar','empty',(301,924,871,1000))
L['ic_power']=cut('ic_power','full',(314,1050,380,1124),ref='empty')
L['ic_kills']=cut('ic_kills','full',(314,1126,370,1176),ref='empty')
L['ic_ally']=cut('ic_ally','full',(314,1179,370,1228),ref='empty')
L['ic_kingdom']=cut('ic_kingdom','full',(314,1228,370,1278),ref='empty')
L['ic_chapter']=cut('ic_chapter','full',(312,1283,372,1333),ref='empty')
L['badge']=cut('badge','full',(776,1034,870,1132),ref='empty',extra=inpaint_badge)
L['pencil']=cut('pencil','full',(218,1096,302,1184),ref='empty')
L['hex1']=cut('hex1','full',(45,1371,235,1617))
L['hex2']=cut('hex2','full',(263,1371,444,1619))
L['hex3']=cut('hex3','full',(472,1371,654,1616))
L['hex4']=cut('hex4','full',(682,1371,871,1612))
json.dump(L,open('parts/layout.json','w'),indent=0)
# contact sheet over checker to inspect
import glob
fs=sorted(glob.glob('parts/*.png'));W=1200;x=y=0;rowh=0
sheet=Image.new('RGBA',(W,1400),(255,0,255,255))
for f in fs:
  im=Image.open(f)
  if x+im.width>W: x=0;y+=rowh+10;rowh=0
  sheet.alpha_composite(im,(x,y));x+=im.width+10;rowh=max(rowh,im.height)
sheet.crop((0,0,W,y+rowh)).save('parts_sheet.png');print(len(fs))

# --- fixes ---
def unred(im):
  a=np.array(im); rgb=a[...,:3].astype(int)
  h,w=rgb.shape[:2]; yy,xx=np.mgrid[0:h,0:w]
  m=((rgb[...,0]>180)&(rgb[...,1]<80)&(rgb[...,2]<80)&(xx>w*0.7)&(yy<h*0.3)).astype(np.uint8)
  m=cv2.dilate(m,np.ones((17,17),np.uint8))
  return m
# stone from full with the red dot removed (dot area -> taken from the empty version, which has no dot)
x0,y0,x1,y1=(30,174,190,326)
S=F[y0:y1,x0:x1].copy(); Ee=E[y0:y1,x0:x1]
m=unred(Image.fromarray(np.dstack([S,np.full(S.shape[:2],255)]).astype(np.uint8)))>0
S[m]=Ee[m]
d=np.maximum(np.abs(S-B[y0:y1,x0:x1]).sum(2),np.abs(Ee-B[y0:y1,x0:x1]).sum(2))
a=np.clip((d-18)/52,0,1); a=np.maximum(a,ndimage.binary_fill_holes(a>0.5))
lab,n=ndimage.label(a>0.05); sz=ndimage.sum(a>0.05,lab,range(1,n+1)); a=a*np.isin(lab,[np.argmax(sz)+1])
Image.fromarray(np.dstack([S,a*255]).astype(np.uint8),'RGBA').save('parts/slot_stone.png'); L['stoneL']={'x':x0,'y':y0,'w':x1-x0,'h':y1-y0}
# hex buttons: alpha limited to the button shape (empty vs bg), achievements red dot painted out
for k,(x0,y0,x1,y1) in enumerate([(45,1371,235,1617),(263,1371,444,1619),(472,1371,654,1616),(682,1371,871,1612)]):
  S=F[y0:y1,x0:x1].copy()
  shape=ndimage.binary_fill_holes(np.abs(E[y0:y1,x0:x1]-B[y0:y1,x0:x1]).sum(2)>40)
  shape=ndimage.binary_opening(shape,iterations=2); shape=ndimage.binary_dilation(shape,iterations=2)
  lab,n=ndimage.label(shape); sz=ndimage.sum(shape,lab,range(1,n+1)); shape=lab==np.argmax(sz)+1
  a=ndimage.gaussian_filter(shape.astype(float),0.8)
  rm=unred(Image.fromarray(np.dstack([S,np.full(S.shape[:2],255)]).astype(np.uint8)))
  if rm.sum()>0:
    S=cv2.inpaint(S.astype(np.uint8)[...,::-1].copy(),rm,7,cv2.INPAINT_TELEA)[...,::-1].astype(np.int32)
    # outside the button shape the dot sat on the strip: cut it away
  Image.fromarray(np.dstack([S,a*255]).astype(np.uint8),'RGBA').save('parts/hex%d.png'%(k+1))
# pencil: just its round badge
x0,y0,x1,y1=L['pencil']['x'],L['pencil']['y'],L['pencil']['x']+L['pencil']['w'],L['pencil']['y']+L['pencil']['h']
im=np.array(Image.open('parts/pencil.png'));h,w=im.shape[:2];yy,xx=np.mgrid[0:h,0:w]
cy,cx=1139-y0,260-x0
r=np.hypot(xx-cx,yy-cy); circ=np.clip((40-r)/2,0,1)
im[...,3]=(im[...,3]*circ).astype(np.uint8); Image.fromarray(im).save('parts/pencil.png')
json.dump(L,open('parts/layout.json','w'),indent=0)
fs=sorted(glob.glob('parts/*.png'));x=y=0;rowh=0
sheet=Image.new('RGBA',(W,1400),(255,0,255,255))
for f in fs:
  im=Image.open(f)
  if x+im.width>W: x=0;y+=rowh+10;rowh=0
  sheet.alpha_composite(im,(x,y));x+=im.width+10;rowh=max(rowh,im.height)
sheet.crop((0,0,W,y+rowh)).save('parts_sheet.png')
