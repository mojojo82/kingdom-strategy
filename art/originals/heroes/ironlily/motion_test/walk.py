import numpy as np, json, random, cv2, subprocess, os
from PIL import Image, ImageDraw, ImageFont
dist=np.load('dist.npy'); J=json.load(open('frames.json')); F=J['F']; ANC=J['anc']; good=json.load(open('jumps.json'))
N=len(F); random.seed(7)
nexti=lambda i: i+1 if i+1<N and F[i+1][0]==F[i][0] else None
fut=lambda i,k: (lambda r: r)(min(i+k, max(x for x in range(N) if F[x][0]==F[i][0])))
JF={}
for i,j,d in good:
  if dist[fut(i,10),fut(j,10)] < 12: continue          # must lead somewhere different
  if F[j][1] > (124 if F[j][0]==0 else 243)-40: continue # not into the held ending
  JF.setdefault(i,[]).append((j,d))
print('usable jump-from frames',len(JF))
seq=[]; i=0; seg=0; cuts=[]; used={}
TOTAL=24*24
while len(seq)<TOTAL:
  seq.append(i); seg+=1
  n=nexti(i)
  opts=JF.get(i,[])
  want = seg>=18 and opts and (random.random()<0.35 or n is None or F[i][1] > (124 if F[i][0]==0 else 243)-20)
  if want:
    # prefer cross-video
    cand=sorted(opts,key=lambda x:x[1]+4*used.get(x[0],0))[:6]; cross=[c for c in cand if F[c[0]][0]!=F[i][0]]
    j=random.choice(cross or cand)[0]; used[j]=used.get(j,0)+1; cuts.append((len(seq),i,j)); i=j; seg=0; continue
  if n is None or F[i][1] > (124 if F[i][0]==0 else 243)-30:
    L=lambda x: 124 if F[x][0]==0 else 243
    j=min(range(N),key=lambda x: (dist[i,x] + 4*used.get(x,0)) if (F[x][1] < L(x)-40 and (F[x][0]!=F[i][0] or abs(x-i)>30)) else 1e9); used[j]=used.get(j,0)+1; cuts.append((len(seq),i,j)); i=j; seg=0; continue
  i=n
print('cuts',len(cuts))
json.dump({'seq':seq,'cuts':cuts},open('walk.json','w'))
# render
W,H=832,480; off=np.array([0.,0.]); os.makedirs('out',exist_ok=True)
try: fnt=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
except: fnt=None
def load(k): return np.load(F[k][2])
prev=None; cutset={c[0]:c for c in cuts}; label=''; lab_t=0
for t,k in enumerate(seq):
  if t in cutset:
    _,a,b=cutset[t]; off=off+np.array(ANC[a])-np.array(ANC[b]); label=f'JOIN  clip {"AB"[F[a][0]]} f{F[a][1]}  ->  clip {"AB"[F[b][0]]} f{F[b][1]}'; lab_t=24
  tgt=np.array([W*0.45,H*0.92])-np.array(ANC[k]); off=off+(tgt-off)*0.04*np.array([1,0])+ (tgt-off)*0.0*np.array([0,1])
  a=load(k); im=Image.fromarray(a,'RGBA')
  canvas=Image.new('RGBA',(W,H),(30,34,52,255)); canvas.alpha_composite(im,(int(round(off[0])),int(round(off[1]))))
  if t>0 and t-1 in cutset or (t in cutset):
    pass
  if prev is not None and (t in cutset or t-1 in cutset or t-2 in cutset):
    canvas=Image.blend(prev,canvas,0.5 if t in cutset else 0.75)
  d=ImageDraw.Draw(canvas); d.text((10,8),f'clip {"AB"[F[k][0]]}  frame {F[k][1]}',fill=(200,200,220),font=fnt)
  if lab_t>0: d.text((10,32),label,fill=(255,210,80),font=fnt); lab_t-=1
  prev=canvas.copy(); canvas.convert('RGB').save(f'out/{t:04d}.png')
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i','out/%04d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','lily_linked_test.mp4'])
print('done')
