from PIL import Image;import numpy as np, cv2, base64, io, json
def alpha(p):
  a=np.asarray(Image.open(p).convert('RGB')).astype(int)
  r,g,b=a[...,0],a[...,1],a[...,2]
  navy=((b>r+12)&((r+g+b)/3<90)).astype(np.uint8)
  n,lab=cv2.connectedComponents(navy)
  edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
  m=np.isin(lab,list(edge)).astype(np.float32)
  m=cv2.GaussianBlur(m,(3,3),0)
  A=(255*(1-m)).astype(np.uint8)
  return Image.fromarray(np.dstack([a.astype(np.uint8),A]),'RGBA')
out={}
for n in ['header','reserve','card_blue','card_red','card_purple']:
  im=alpha('fs/'+n+'.png') if n.startswith('card') else alpha('fs/'+n+'.png')
  im.save('fs/'+n+'_a.png')
  b=io.BytesIO(); im.save(b,'WEBP',quality=88,method=6); out[n]=b.getvalue()
for n in ['btn_blue','pill_brown','guard_patch','bar_patch','pick1','pick3']:
  im=Image.open('fs/'+n+'.png').convert('RGB'); b=io.BytesIO(); im.save(b,'WEBP',quality=88,method=6); out[n]=b.getvalue()
for k,v in out.items(): open('fs/'+k+'.webp','wb').write(v)
print({k:len(v) for k,v in out.items()}, sum(len(v) for v in out.values()))
json.dump({k:base64.b64encode(v).decode() for k,v in out.items()},open('fs/art.json','w'))
