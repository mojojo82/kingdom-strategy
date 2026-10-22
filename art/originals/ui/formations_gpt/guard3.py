from PIL import Image;import numpy as np,cv2
N=np.asarray(Image.open('gpt_black.png').convert('RGB')).astype(np.float32)[247:659]
B=np.asarray(Image.open('../kit/fs/card_blue.png').convert('RGB')).astype(np.float32)
d=np.abs(N[:250,:216]-B[:250,:216]).max(2)
m=(d>45).astype(np.uint8)
P=np.zeros_like(m); P[:130,:211]=1; P[130:183,:200]=1; P[183:250,:152]=1; m*=P
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8)); m*=P
n,lab,st,_=cv2.connectedComponentsWithStats(m); k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=(lab==k).astype(np.uint8)
h,w=m.shape; ff=m.copy(); fm=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,fm,(0,0),2); m=np.maximum(m,(ff==0).astype(np.uint8))
mf=cv2.GaussianBlur(m.astype(np.float32),(3,3),0)[...,None]
out=B.copy(); out[:250,:216]=N[:250,:216]*mf+B[:250,:216]*(1-mf)
# badge from base on top (no blue cloth)
yy,xx=np.mgrid[0:250,0:216]; r=np.sqrt((xx-61)**2+(yy-73)**2); blue=B[:250,:216,2]>B[:250,:216,0]+20
bm=(np.clip(38.5-r,0,1)*(~blue))[...,None]; out[:250,:216]=out[:250,:216]*(1-bm)+B[:250,:216]*bm
Image.fromarray(out.clip(0,255).astype(np.uint8)).save('card_guard3.png')
Image.fromarray(m*255).save('m3.png')
Image.fromarray(out.clip(0,255).astype(np.uint8)).crop((0,0,330,330)).resize((660,660)).save('z_g3.png')
