from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
X0,Y0,X1,Y1=170,180,760,660
I=np.array(Image.open('profile2/full.png').convert('RGB')).astype(float)[Y0:Y1,X0:X1]
B=np.array(Image.open('profile2/bg.png').convert('RGB')).astype(float)[Y0:Y1,X0:X1]
h,w=I.shape[:2]; lum=I.mean(2); bl=B.mean(2)
d=np.abs(I-B).max(2)
ship=(np.abs(I-B).sum(2)>70)|(lum<bl-45); ship=ndimage.binary_opening(ship,iterations=1)
keep=Image.new('L',(w,h),0); dr=ImageDraw.Draw(keep)
dr.rectangle([8,328,572,h],fill=255); dr.polygon([(15,205),(115,205),(118,268),(185,300),(185,330),(15,330)],fill=255); dr.polygon([(445,285),(560,285),(572,330),(440,330)],fill=255)
keep=np.array(keep)>0
m=ship&keep
r,g,b=I[...,0],I[...,1],I[...,2]
warm=(lum>110)&(r>g)&(g>b)&(r-b>60); m&=~(warm&(np.arange(h)[:,None]>440))
m&=~((np.arange(h)[:,None]<300)&(np.arange(w)[None,:]>115)&(np.arange(w)[None,:]<190)&(lum<80))
m=ndimage.binary_fill_holes(m); lab,n=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,n+1)); m=lab==np.argmax(sz)+1
# soft alpha only in a thin band at the edge; solid inside
inner=ndimage.binary_erosion(m,iterations=1); outer=ndimage.binary_dilation(m,iterations=1)
a=np.where(inner,1.0,np.where(outer,np.clip(d/70,0,1),0.0))
a=np.where(m&~inner,np.maximum(a,0.5),a)
# un-mix the background out of edge pixels
aa=np.maximum(a,0.08)[...,None]
Fc=np.clip(B+(I-B)/aa,0,255); Fc=np.where(inner[...,None],I,Fc)
# the hard cut line along the deck top (masts removed): keep it crisp
O=np.dstack([Fc,a*255]).astype(np.uint8)
Oim=Image.fromarray(O,'RGBA').resize((w*2,h*2),Image.LANCZOS)
Oa=np.array(Oim).astype(float)
# GPT patch (2x coords, already aligned to the old 2x cut which was the same crop region scaled... recompute offset)
A=np.array(Image.open('shipcut/gpt_aligned.png').convert('RGB')).astype(float)
old=np.array(Image.open('shipcut/concept_ship_hull_magenta_2x.png').convert('RGB'))
# old 2x cut was cropped to the ship bbox +20; find its offset in the full 2x crop
def bbm(a): mm=~((a[...,0]>200)&(a[...,1]<80)&(a[...,2]>200)); ys,xs=np.where(mm); return xs.min(),ys.min()
ys,xs=np.where(m); offx,offy=max(0,xs.min()-20)*2,max(0,ys.min()-20)*2
H2,W2=old.shape[:2]
Pa=Oa[offy:offy+H2,offx:offx+W2].copy()
M=np.array([255,0,255.])
ag=np.clip((np.sqrt(((A-M)**2).sum(2))-40)/120,0,1)
Fg=np.clip(M+(A-M)/np.maximum(ag,0.08)[...,None],0,255)
# patch mask (same as before)
O2=old.astype(float); r,g,b=O2[...,0],O2[...,1],O2[...,2]
gun=((np.abs(r-b)<25)&(np.abs(r-g)<25)&(O2.mean(2)>85)&(O2.mean(2)<200))|((b>r+20)&(b>g+40))|((r>150)&(g<80)&(b<90))
z=np.zeros((H2,W2),bool); z[290:515,195:900]=True; gun&=z
gun=ndimage.binary_closing(gun,iterations=6); gun=ndimage.binary_fill_holes(gun)
lab,n=ndimage.label(gun); sz=ndimage.sum(gun,lab,range(1,n+1)); gun=np.isin(lab,[i+1 for i in range(n) if sz[i]>2000])
hot=(((r>140)&(g<90)&(b<100))|((b>r+15)&(b>g+35)&(b>90)))&z&(Pa[...,3]>128)
gun=ndimage.binary_dilation(gun|ndimage.binary_dilation(hot,iterations=4),iterations=10)
bot=np.zeros_like(gun); bot[400:,170:930]=True; gun|=bot  # whole keel strip + hanging spikes from GPT's clean version
ring=ndimage.binary_dilation(gun,iterations=40)&~gun&(Pa[...,3]>250)&(ag>0.99)
for c in range(3):
  mo,so=Pa[...,c][ring].mean(),Pa[...,c][ring].std(); ma,sa=Fg[...,c][ring].mean(),Fg[...,c][ring].std()
  Fg[...,c]=np.clip((Fg[...,c]-ma)*(so/sa)+mo,0,255)
f=np.clip(ndimage.gaussian_filter(gun.astype(float),6)*1.3,0,1)
rgb=Pa[...,:3]*(1-f[...,None])+Fg*f[...,None]
al=Pa[...,3]*(1-f)+ag*255*f
# pedestal glow left on the outline: warm bright pixels near the edge -> transparent
edge=(al>10)&~ndimage.binary_erosion(al>200,iterations=4)
R,G,Bb=rgb[...,0],rgb[...,1],rgb[...,2]
glow=edge&(R>150)&(G>110)&(Bb<130)&(R-Bb>55)&((np.arange(al.shape[0])[:,None])>380)
al=np.where(glow,0,al)
# magenta spill on the outline
band=(al>5)&~ndimage.binary_erosion(al>200,iterations=3)
sp=np.minimum(rgb[...,0],rgb[...,2])-rgb[...,1]
fix=np.where(band&(sp>12),sp-12,0)
rgb=rgb.copy(); rgb[...,0]-=fix*0.85; rgb[...,2]-=fix*0.85; rgb=np.clip(rgb,0,255)
# remove tiny floating bits
solid=al>20; lab,n=ndimage.label(solid); sz=ndimage.sum(solid,lab,range(1,n+1)); al=al*(lab==np.argmax(sz)+1)
out=Image.fromarray(np.dstack([rgb,al]).round().clip(0,255).astype(np.uint8),'RGBA')
out.save('shipcut/ship_noguns_clean.png')
for bgc,name in [((40,50,75),'dark'),((230,200,150),'light')]:
  v=Image.new('RGBA',out.size,bgc+(255,)); v.alpha_composite(out); v.save('shipcut/clean_check_%s.png'%name)
print(out.size)
