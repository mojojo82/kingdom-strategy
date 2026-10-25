import numpy as np, json, random, cv2, subprocess, os
from PIL import Image, ImageDraw, ImageFont
dist=np.load('dist.npy'); J=json.load(open('frames.json')); F=J['F']; ANC=J['anc']; good=json.load(open('jumps.json'))
N=len(F); random.seed(7)
nexti=lambda i: i+1 if i+1<N and F[i+1][0]==F[i][0] else None
fut=lambda i,k: (lambda r: r)(min(i+k, max(x for x in range(N) if F[x][0]==F[i][0])))
# v3: no joins while she's in the air (flips/jumps) - from 4 frames before take-off to 2 after landing
NOJ=set()
for v in set(x[0] for x in F):
  ids=[i for i in range(N) if F[i][0]==v]; fl=float(np.median([ANC[i][1] for i in ids]))
  air=[i for i in ids if ANC[i][1]<fl-12]
  for i in air:
    for d in range(-4,3):
      if i+d in ids: NOJ.add(i+d)
print('no-join frames',len(NOJ))
JF={}
for i,j,d in good:
  if dist[fut(i,10),fut(j,10)] < 12: continue          # must lead somewhere different
  if F[j][1] > (124 if F[j][0]==0 else 243)-40: continue # not into the held ending
  if F[j][1] < 24 or F[i][1] < 24 or i in NOJ or j in NOJ: continue # v2k: never jump into/out of the standing intro
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
  if n is None or (F[i][1] > (124 if F[i][0]==0 else 243)-30 and i not in NOJ):
    L=lambda x: 124 if F[x][0]==0 else 243
    j=min(range(N),key=lambda x: (dist[i,x] + 4*used.get(x,0)) if (F[x][1] < L(x)-40 and F[x][1]>=24 and x not in NOJ and (F[x][0]!=F[i][0] or abs(x-i)>30)) else 1e9); used[j]=used.get(j,0)+1; cuts.append((len(seq),i,j)); i=j; seg=0; continue
  i=n
print('cuts',len(cuts))
json.dump({'seq':seq,'cuts':cuts},open('walk.json','w'))
# render
W,H=853,480; BM=json.load(open('bigmeta.json')); off=np.array([0.,0.]); os.makedirs('out',exist_ok=True)
try: fnt=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',24)
except: fnt=None
def bigname(k): return ('big1' if F[k][0]==0 else 'big2')+'/%04d.png'%F[k][1]
prev=None; cutset={c[0]:c for c in cuts}; label=''; lab_t=0
for t,k in enumerate(seq):
  if t in cutset:
    _,a,b=cutset[t]; off=off+(np.array(ANC[a])-np.array(ANC[b]))*np.array([1,0]); off[1]=0;  # v2: floor locked - both clips share the same camera/floor, only x is aligned at joins
    label=f'JOIN  clip {"AB"[F[a][0]]} f{F[a][1]}  ->  clip {"AB"[F[b][0]]} f{F[b][1]}'; lab_t=24
  tgt=np.array([W*0.45,H*0.92])-np.array(ANC[k]); off=off+(tgt-off)*0.04*np.array([1,0])+ (tgt-off)*0.0*np.array([0,1])
  bn=bigname(k); im=Image.open(bn); im=im.resize((max(1,im.width//2),max(1,im.height//2)),Image.LANCZOS); x0,y0=BM[bn]
  canvas=Image.new('RGBA',(1280,720),(30,34,52,255)); canvas.alpha_composite(im,(int(round(off[0]*1.5+x0*0.5)),int(round(off[1]*1.5+y0*0.5))))
  if t>0 and t-1 in cutset or (t in cutset):
    pass
  if prev is not None and (t in cutset or t-1 in cutset or t-2 in cutset):
    canvas=Image.blend(prev,canvas,0.5 if t in cutset else 0.75)
  d=ImageDraw.Draw(canvas); d.text((10,8),f'clip {"AB"[F[k][0]]}  frame {F[k][1]}',fill=(200,200,220),font=fnt)
  if lab_t>0: d.text((10,32),label,fill=(255,210,80),font=fnt); lab_t-=1
  prev=canvas.copy(); canvas.convert('RGB').save(f'out/{t:04d}.png')
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i','out/%04d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','lily_linked_2k_test.mp4'])
print('done')
