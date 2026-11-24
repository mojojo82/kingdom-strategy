import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
N=600  # 1 px = 2 map tiles (map is 1200x1200)
rng=np.random.default_rng(7)
def noise(sc, seed):
  r=np.random.default_rng(seed); g=r.random((N//sc+3,N//sc+3)).astype(np.float32)
  return cv2.resize(g,(N+3*sc,N+3*sc),interpolation=cv2.INTER_CUBIC)[:N,:N]
def fbm(seed, base=96):
  f=np.zeros((N,N),np.float32); a=1; tot=0; s=base
  for o in range(6): f+=noise(max(2,s),seed+o)*a; tot+=a; a*=0.5; s//=2
  return f/tot
yy,xx=np.mgrid[0:N,0:N]/N
def cut(f,frac=0.30): return f>np.quantile(f,1-frac)
def continents(): 
  cs=[(0.27,0.30),(0.72,0.24),(0.30,0.74),(0.74,0.72)]
  d=np.min([np.hypot(xx-a,yy-b) for a,b in cs],axis=0)
  return -d*2.2+fbm(11)*1.3
def archipelago():
  return fbm(21,base=48)*1.0+fbm(22,base=150)*0.6-np.hypot(xx-.5,yy-.5)*0.25
def pangaea():
  d=np.hypot((xx-.5)*1.15,(yy-.52)); return -d*2.4+fbm(31,base=120)*1.5
def ring():
  d=np.hypot(xx-.5,yy-.5); return -np.abs(d-0.33)*3.2+fbm(41,base=90)*1.1
def coastal():
  # land along the four map edges, open sea in the middle (kingdom borders become coastlines)
  e=np.minimum.reduce([xx,yy,1-xx,1-yy]); return -e*3.0+fbm(51,base=90)*1.0
def colour(land, seed):
  img=np.zeros((N,N,3),np.uint8); img[:]=(48,104,150)[::-1]
  dist=cv2.distanceTransform(land.astype(np.uint8),cv2.DIST_L2,5)
  sea=~land; dsea=cv2.distanceTransform(sea.astype(np.uint8),cv2.DIST_L2,5)
  img[sea&(dsea<6)]=(70,128,170)[::-1]  # shallows
  img[land]=(98,160,62)[::-1]
  m=fbm(seed+100,base=40); img[land&(m>0.58)]=(52,110,52)[::-1]   # forest
  m2=fbm(seed+200,base=60); img[land&(m2>0.62)&(dist>10)]=(150,150,150)[::-1]  # mountains
  img[land&(m2>0.68)&(dist>14)]=(225,230,235)[::-1]
  m3=fbm(seed+300,base=50); img[land&(m3>0.64)]=(176,132,86)[::-1]  # dirt
  img[land&(dist<2.5)]=(214,192,128)[::-1]  # beach
  return img
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22); F2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
cons=[('A  Four continents',continents,'one big landmass per quarter, sea lanes between'),('B  Archipelago',archipelago,'hundreds of islands of every size'),
      ('C  One supercontinent',pangaea,'a single huge island with bays, sea all round'),('D  Ring continent',ring,'land in a ring around an inner sea'),
      ('E  Coastal rim',coastal,'land along the kingdom edges, open sea in the middle')]
tiles=[]
for i,(name,fn,sub) in enumerate(cons):
  land=cut(fn()); lf=land.mean()
  im=Image.fromarray(cv2.cvtColor(colour(land,i*10),cv2.COLOR_BGR2RGB))
  can=Image.new('RGB',(N+20,N+74),(20,26,38)); can.paste(im,(10,64)); d=ImageDraw.Draw(can)
  d.text((12,8),name,fill=(240,201,95),font=F); d.text((12,36),sub+f'  ({lf*100:.0f}% land)',fill=(210,215,225),font=F2)
  # city-size marker: 1 base ~ 3 tiles -> 1.5 px; show a 20x20 tile box (old populated area) for scale
  d.rectangle([10+N//2-5,64+N//2-5,10+N//2+5,64+N//2+5],outline=(255,60,60),width=2)
  can.save(f'concept_{"ABCDE"[i]}.png'); tiles.append(can)
W,H=tiles[0].size; o=Image.new('RGB',(W*3,H*2),(20,26,38))
for i,t in enumerate(tiles): o.paste(t,((i%3)*W,(i//3)*H))
d=ImageDraw.Draw(o); d.text((2*W+20,H+80),'Whole kingdom: 1200 x 1200 tiles\nRed square = 20 x 20 tiles\n(the size of the original map)\n\nColours: green grass, dark green\nforest, brown dirt, grey/white\nmountains, sand beaches,\nlight blue shallows',fill=(220,225,235),font=F2,spacing=6)
o.save('land_concepts.png'); print(o.size)
