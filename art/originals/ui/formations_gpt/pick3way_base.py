from PIL import Image, ImageDraw
import numpy as np
P='/home/claude/kingdom-strategy/art/originals/ui/formations_gpt/pieces/'
p1=np.asarray(Image.open(P+'pick1.png').convert('RGB')).astype(np.float32); p3=np.asarray(Image.open(P+'pick3.png').convert('RGB')).astype(np.float32)
H,W=p1.shape[:2]
def goldness(a): r,g,b=a[...,0],a[...,1],a[...,2]; return (r>150)&(g>110)&(b<170)&(r-b>60)
# inside of the pill = not gold in EITHER picture, flood from the centre row (icons count as inside)
rim=goldness(p1)&goldness(p3)
inside=np.zeros((H,W),bool)
for y in range(H):
    l=0
    while l<W and rim[y,l]: l+=1
    r=W-1
    while r>=0 and rim[y,r]: r-=1
    if 0<l<r<W-1 and (r-l)>W*0.5: inside[y,l:r+1]=True
# dark texture: tile the empty dark end of pick1 (x 150-192) across; cyan: per-row colour from pick3's empty end
darkRow=np.median(p1[:,120:170],1)[:,None,:]; rng=np.random.default_rng(3); dark=np.repeat(darkRow,W,1)+rng.normal(0,2.2,(H,W,1))  # flat dark with a faint grain
cyRow=np.median(p3[:,120:170],1)[:,None,:]; cyan=np.repeat(cyRow,W,1)
def keyed(src, box, bg):
    x0,y0,x1,y1=box; a=src[y0:y1,x0:x1]
    r,g,b=a[...,0],a[...,1],a[...,2]
    if bg=='cyan': bgness=np.clip(((b-r)-25)/35,0,1)*np.clip((g-90)/40,0,1)
    else: bgness=np.clip((60-(r+g+b)/3)/30,0,1)
    return Image.fromarray(np.dstack([a,(1-bgness)*255]).astype(np.uint8),'RGBA')
bomb=keyed(p1,(10,6,58,48),'cyan'); shield=keyed(p1,(96,6,144,48),'dark')
S=8; bw,bh=34,40; bolt=Image.new('RGBA',(bw*S,bh*S),(0,0,0,0)); d=ImageDraw.Draw(bolt)
def poly(pts,c): d.polygon([(x*S,y*S) for x,y in pts],fill=c)
poly([(20,1),(5,22),(15,22),(11,39),(29,15),(18,15),(25,1)],(52,32,12,255))
poly([(20.6,4),(9,20.3),(18,20.3),(15.3,32.5),(25.6,16.8),(15.2,16.8),(22.3,4)],(250,196,52,255))
poly([(20.8,5.5),(11.5,19),(14.5,19),(21.6,7)],(255,240,160,255)); poly([(17.2,22.5),(15.3,30.5),(23.5,18.4),(21,18.4)],(222,132,30,255))
bolt=bolt.resize((bw,bh),Image.LANCZOS)
xs=np.where(inside.any(0))[0]; L,R=xs.min(),xs.max()+1; w3=(R-L)/3; cuts=[L,round(L+w3),round(L+2*w3),R]
icons=[bomb,bolt,shield]
def state(k):
    on=np.zeros((H,W),bool); on[:,cuts[k]:cuts[k+1]]=True
    fill=np.where(on[...,None],cyan,dark)
    X=np.where(inside[...,None],fill,p1)
    for xb in cuts[1:3]: X[:,xb-1:xb+1]=np.where(inside[:,xb-1:xb+1,None],X[:,xb-1:xb+1]*0.35,X[:,xb-1:xb+1])
    im=Image.fromarray(np.clip(X,0,255).astype(np.uint8)).convert('RGBA')
    for ic,a,b in zip(icons,cuts[:3],cuts[1:]): im.alpha_composite(ic,((a+b)//2-ic.width//2,27-ic.height//2))
    return im
outs=[state(k) for k in range(3)]
for k,o in enumerate(outs): o.save(f'pick3way_{k+1}.png')
s=4; sheet=Image.new('RGB',(W*s*3+40,H*s*2+60),(24,20,18)); dr=ImageDraw.Draw(sheet)
dr.text((10,4),"NOW (2 types): I on / III on",fill=(230,200,120))
for i,src in enumerate((p1,p3)): sheet.paste(Image.fromarray(src.astype(np.uint8)).resize((W*s,H*s),Image.NEAREST),(10+i*(W*s+10),20))
dr.text((10,H*s+34),"MOCKUP (3 types): I on / II on / III on",fill=(230,200,120))
for i,o in enumerate(outs): sheet.paste(o.convert('RGB').resize((W*s,H*s),Image.LANCZOS),(10+i*(W*s+10),H*s+50))
sheet.save('pick_mockup.png'); print(cuts)
