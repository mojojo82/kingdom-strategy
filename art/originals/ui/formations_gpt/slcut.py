from PIL import Image;import numpy as np,io,base64,json
A=np.asarray(Image.open('formations.png').convert('RGB')).astype(np.float32)
def matte(x0,y0,x1,y1,T=70):
  c=A[y0:y1,x0:x1].copy()
  # bg per row: average of tan above/below band -> use rows outside the object: take median of the crop's border pixels per row
  bg=np.median(np.concatenate([A[y0-6:y0-2,x0:x1].reshape(-1,3),A[y1+2:y1+6,x0:x1].reshape(-1,3)]),0)
  d=np.sqrt(((c-bg)**2).sum(2)); a=np.clip(d/T,0,1)
  fg=np.where(a[...,None]>0.02,(c-(1-a[...,None])*bg)/np.maximum(a[...,None],0.02),c)
  return np.dstack([np.clip(fg,0,255),a*255]).astype(np.uint8),bg
# knob: centre (395,409.5); crop 22 px radius box
k,bg=matte(373,388,418,433)
# kill anything beyond radius 21 (track bits on the right)
yy,xx=np.mgrid[388:433,373:418]; r=np.sqrt((xx-395)**2+(yy-410.5)**2)
k[...,3]=(k[...,3]*np.clip((21.5-r),0,1)).astype(np.uint8)
# remove track blue that touches knob on the right (x>413)
c0=A[388:433,373:418]; blu=(c0[...,2]>c0[...,0]+25)&(xx>=409); k[...,3]=np.where(blu|((xx>=409)&(r>18.6)),0,k[...,3]).astype(np.uint8)
Image.fromarray(k,'RGBA').save('fs/knob.png')
t,_=matte(560,399,632,422)
Image.fromarray(t,'RGBA').save('fs/trk_full.png')
capR=t[:,40:]; mid=t[:,10:11]; capL=capR[:,::-1]
out={}
for n,im in [('sl_knob',k),('sl_capR',capR),('sl_capL',capL),('sl_mid',mid)]:
  I=Image.fromarray(np.ascontiguousarray(im),'RGBA'); I.save('fs/'+n+'.png'); b=io.BytesIO(); I.save(b,'WEBP',lossless=True); out[n]=base64.b64encode(b.getvalue()).decode(); print(n,I.size,len(b.getvalue()))
json.dump(out,open('fs/slider_art.json','w'))
# preview on bg
W=Image.new('RGBA',(260*4,60*4),(205,160,100,255)); 
tr=Image.new('RGBA',(220,23),(0,0,0,0)); tr.paste(Image.fromarray(np.ascontiguousarray(capL),'RGBA'),(0,0)); 
m=Image.fromarray(mid,'RGBA').resize((220-64,23)); tr.alpha_composite(m,(32,0)); tr.alpha_composite(Image.fromarray(np.ascontiguousarray(capR),'RGBA'),(220-32,0))
base=Image.new('RGBA',(260,60),(30,30,60,255)); base.alpha_composite(tr,(20,19)); base.alpha_composite(Image.fromarray(k,'RGBA'),(90,8))
base.resize((1040,240),Image.NEAREST).save('z_slnew.png')
