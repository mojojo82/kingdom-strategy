from PIL import Image;import numpy as np,io,base64,json
def L(n): return np.asarray(Image.open('p_'+n+'.png').convert('RGBA')).astype(np.float32)
card=L('card')
on=card[200-19:200+19,46-19:46+19]; off=card[200-19:200+19,84-19:84+19+1][:, :38]
sb=L('starbar'); 
def rowfill(img,x0,x1,y0,y1):
  Lc=img[y0:y1,x0-2:x0+1].mean(1);R=img[y0:y1,x1:x1+3].mean(1); t=np.linspace(0,1,x1-x0)[None,:,None]; img[y0:y1,x0:x1]=Lc[:,None]*(1-t)+R[:,None]*t
rowfill(sb,26,408,14,75)
out={}
def put(n,arr=None,im=None):
  im=im or Image.fromarray(arr.clip(0,255).astype(np.uint8),'RGBA'); im.save('f_'+n+'.png'); b=io.BytesIO(); im.save(b,'WEBP',quality=90,method=6); out[n]=base64.b64encode(b.getvalue()).decode(); print(n,im.size,len(b.getvalue()))
put('star_on',on); put('star_off',off); put('tag',sb)
for n in ['panel','close','card','b_shield','b_gem','b_bow','btn_red','btn_blue']: put(n,im=Image.open('p_'+n+'.png').convert('RGBA'))
json.dump(out,open('hpg_art.json','w')); print(sum(len(v) for v in out.values())*3//4)
