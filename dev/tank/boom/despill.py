import numpy as np
from PIL import Image
for n in ['hit','big']:
    a=np.asarray(Image.open(n+'.png')).astype(float); r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
    s=np.clip((np.minimum(r,b)-g)/255,0,0.95)   # pink mixed into the colour (smoke drawn see-through over magenta)
    k=1-s
    a[...,0]=np.clip((r-s*255)/k,0,255); a[...,2]=np.clip((b-s*255)/k,0,255); a[...,1]=np.clip(g/k,0,255)
    a[...,3]=al*k
    Image.fromarray(a.astype(np.uint8)).save(n+'.png')
    bg=Image.new('RGBA',(a.shape[1],a.shape[0]),(30,40,60,255)); bg.alpha_composite(Image.fromarray(a.astype(np.uint8))); bg.save(n+'_view.png')
