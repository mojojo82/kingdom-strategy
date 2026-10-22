from PIL import Image;import numpy as np,cv2
src=np.asarray(Image.open('banners.png').convert('RGB')).astype(np.float32)[20:470,330:620]
bg=np.median(np.concatenate([src[:6].reshape(-1,3),src[-6:].reshape(-1,3),src[:,:6].reshape(-1,3)]),0)
d=np.sqrt(((src-bg)**2).sum(2)); a=np.clip((d-6)/40,0,1)
solid=(a>0.5).astype(np.uint8); h,w=solid.shape; ff=solid.copy(); fm=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,fm,(0,0),2)
inside=(ff!=2).astype(np.float32); inside=cv2.erode(inside,np.ones((3,3),np.uint8)); a=np.maximum(a,inside)
fg=np.where(a[...,None]>0.02,(src-(1-a[...,None])*bg)/np.maximum(a[...,None],0.02),src).clip(0,255)
ban=Image.fromarray(np.dstack([fg,a*255]).astype(np.uint8),'RGBA')
s=float(__import__('sys').argv[1]) if len(__import__('sys').argv)>1 else 0.55
bw,bh=round(290*s),round(450*s); ban=ban.resize((bw,bh),Image.LANCZOS)
nb=Image.open('nobanner.png').convert('RGBA'); base=Image.open('../kit/fs/card_blue.png').convert('RGBA')
x0=round(126-bw/2); y0=0
nb.alpha_composite(ban,(x0,y0))
B=np.asarray(base).astype(np.float32); N=np.asarray(nb).astype(np.float32).copy()
# badge back on top
yy,xx=np.mgrid[0:N.shape[0],0:N.shape[1]]; r=np.sqrt((xx-61)**2+(yy-73)**2); blue=(B[...,2]>B[...,0]+20); m=(np.clip(39.5-r,0,1)*(~blue))[...,None]
N=N*(1-m)+B*m
# slot1 corner back on top
panel=np.median(B[230:290,150:158,:3].reshape(-1,3),0)
reg=(slice(192,232),slice(152,205)); dd=np.abs(B[reg][...,:3]-panel).max(2); sm=(dd>28).astype(np.float32)
sm=cv2.GaussianBlur(sm,(3,3),0)[...,None]; N[reg]=N[reg]*(1-sm)+B[reg]*sm
Image.fromarray(N.clip(0,255).astype(np.uint8),'RGBA').save('card_guard.png')
Image.fromarray(N.clip(0,255).astype(np.uint8),'RGBA').crop((0,0,330,330)).resize((660,660)).save('z_cg.png')
print(bw,bh,x0)
