import glob, math, os, random, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFilter
R='/home/claude/kingdom-strategy/'; LG=R+'art/originals/heroes/caelum/large/'; D='/tmp/claude-0/-home-claude/14deb026-a209-5dd6-bb00-0d996b7bcaaa/scratchpad/caemock/'
W,H=1280,704; FPS=24; S=0.44; AX,AY=559.5,707      # video px -> mock px, idle feet point in the video frames
bg=Image.open(R+'art/originals/backgrounds/arena_bg_1200x660.png').convert('RGB').resize((W,H)); GY=int(H*0.72)
cache={}
def fr(path, flip):
    k=(path,flip)
    if k not in cache:
        im=Image.open(path).convert('RGBA'); im=im.resize((round(im.width*S),round(im.height*S)),Image.LANCZOS)
        if flip: im=im.transpose(Image.FLIP_LEFT_RIGHT)
        cache[k]=im
    return cache[k]
def clip(name): return sorted(glob.glob(LG+name+'/*.webp'))
IDLE=clip('idle'); TAKE=clip('takeoff'); HOV=clip('hover'); SLAM=[D+'clean/%04d.png'%i for i in range(124)]
kes=sorted(glob.glob(R+'art/originals/heroes/kessa/large/idle/*.webp'))
KM=__import__('json').load(open(R+'art/originals/heroes/kessa/large/meta.json'))['idle']
def paste(canvas, path, X, Y, flip, ax=AX, ay=AY, vw=1152, scale_extra=1.0):
    im=fr(path,flip); axx=(vw-ax) if flip else ax
    canvas.alpha_composite(im,(round(X-axx*S),round(Y-ay*S)))
def target_img(face_right):
    im=Image.open(kes[0]).convert('RGBA'); s=0.36; im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    fx=KM['feet_x']*s
    if not face_right: im=im.transpose(Image.FLIP_LEFT_RIGHT); fx=im.width-fx
    return im,fx,KM['feet_y']*s
from PIL import ImageFont
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',30); FONT_S=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
def burst(canvas, x, y, age):   # pink lightning crater burst (additive), age in s
    if age<0 or age>0.75: return
    lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
    p=age/0.75; fade=(1-p)**1.3
    # flash
    if age<0.15:
        f=(1-age/0.15)*0.7; d.ellipse((x-95,y-110,x+95,y+40),fill=(int(255*f),int(190*f),int(255*f)))
    # glow pool + shock ring
    r=50+260*p**0.55
    for rr,k in [(r*1.0,0.25),(r*0.65,0.45),(r*0.3,0.9)]:
        d.ellipse((x-rr,y-rr*0.42,x+rr,y+rr*0.42),fill=(int(255*k*fade),int(60*k*fade),int(200*k*fade)))
    d.ellipse((x-r,y-r*0.42,x+r,y+r*0.42),outline=(int(255*fade),int(170*fade),int(250*fade)),width=6)
    rnd=random.Random(int(x)*3+int(age*20))
    for b in range(12):   # lightning bolts (re-rolled every few frames = crackle)
        ang=-math.pi*(0.05+0.9*rnd.random()); L=(90+170*rnd.random())*(0.5+0.7*min(1,p*3)); px,py=x,y; pts=[(px,py)]
        for s_ in range(7):
            px+=math.cos(ang)*L/7+rnd.uniform(-14,14); py+=math.sin(ang)*L/7+rnd.uniform(-14,14); pts.append((px,py))
        d.line(pts,fill=(int(255*fade),int(70*fade),int(220*fade)),width=9); d.line(pts,fill=(int(255*fade),int(225*fade),int(255*fade)),width=3)
    for c in range(9):   # ground cracks glowing
        ex=x+(c-4)*45+rnd.uniform(-20,20); d.line([(x,y),((x+ex)/2,y+rnd.uniform(2,10)),(ex,y+rnd.uniform(6,18))],fill=(int(255*fade),int(80*fade),int(230*fade)),width=4)
    for sp in range(26):   # sparks
        ang=-math.pi*rnd.random(); v=120+380*rnd.random(); sx=x+math.cos(ang)*v*age*1.4; sy=y+math.sin(ang)*v*age*1.4+300*age*age
        d.ellipse((sx-3,sy-3,sx+3,sy+3),fill=(int(255*fade),int(210*fade),int(255*fade)))
    lay=lay.filter(ImageFilter.GaussianBlur(1.5))
    base=np.asarray(canvas.convert('RGB')).astype(np.int16)+np.asarray(lay).astype(np.int16)
    canvas.paste(Image.fromarray(np.clip(base,0,255).astype(np.uint8)).convert('RGBA'))
frames=[]
def scene(dx, label):
    home=W//2; tx=home+dx; flip=dx<0; dirn=-1 if flip else 1
    timg,tfx,tfy=target_img(face_right=flip)   # enemies face him
    seq=[]
    for i in range(0,len(IDLE),3)[:6]: seq.append(('idle',IDLE[i],0))
    for i in range(0,88,2): seq.append(('take',TAKE[i],min(1,i/80)))
    for i in range(0,len(HOV),2)[:14]: seq.append(('hov',HOV[i],1))
    dist=abs(dx); nfall=max(5,int(5+dist/70)); 
    for j in range(nfall): seq.append(('fall',SLAM[50+min(7,int(j*8/nfall))],(j+1)/nfall))
    for i in range(58,112): seq.append(('imp',SLAM[i],0))
    for i in range(0,len(IDLE),3)[:8]: seq.append(('idle2',IDLE[i],0))
    LIFT=110; land=tx-dirn*int(118*S*2.2); hit_t=None; t=0
    for n,(kind,path,v) in enumerate(seq):
        c=bg.copy().convert('RGBA'); shake=0
        # target
        hit=hit_t is not None and n-hit_t>=0
        if not (hit and n-hit_t<4):
            off=(dirn*min(26,(n-hit_t)*3) if hit else 0)
            c.alpha_composite(timg,(round(tx-tfx+off),round(GY-tfy)))
        else:
            wht=Image.new('RGBA',timg.size,(255,255,255,0)); al=timg.getchannel('A'); wht.putalpha(al); c.alpha_composite(wht,(round(tx-tfx),round(GY-tfy)))
        if kind in ('idle',): paste(c,path,home,GY,flip)
        elif kind=='take': paste(c,path,home,GY-LIFT*(v**1.4),flip)
        elif kind=='hov': paste(c,path,home,GY-LIFT,flip)
        elif kind=='fall':
            p=v; x=home+(land-home)*(1-(1-p)**1.6); y=(GY-LIFT)+(LIFT+38)*(p**1.8)-math.sin(math.pi*p)*min(60,dist*0.08)
            paste(c,path,x,y,flip)
        elif kind in ('imp','idle2'):
            if hit_t is None: hit_t=n
            paste(c,path,land,GY,flip); 
            if kind=='imp' and n-hit_t<5: shake=7-(n-hit_t)
        if hit_t is not None:
            age=(n-hit_t)/FPS; burst(c,land+dirn*int(125*S),GY-6,age); c=c if c.mode=='RGBA' else c.convert('RGBA')
            if 2<=n-hit_t<30:
                d=ImageDraw.Draw(c); dy=(n-hit_t)*1.6; d.text((tx-50,GY-tfy-40-dy),"-1,240",fill=(255,235,120,255),font=FONT,stroke_width=3,stroke_fill=(120,0,60,255))
        d=ImageDraw.Draw(c); d.rectangle((0,0,W,34),fill=(10,14,40,200)); d.text((14,7),"Caelum - Riftbreaker Slam (mockup):  "+label,fill=(255,230,150,255),font=FONT_S)
        img=c.convert('RGB')
        if shake: img=Image.fromarray(np.roll(np.asarray(img),(random.randint(-shake,shake),random.randint(-shake,shake)),(0,1)))
        frames.append(img)
for dx,lab in [(40,"target right underneath him"),(230,"close target"),(480,"far target"),(-250,"target behind him (mirrored)"),(-470,"far target behind him")]:
    scene(dx,lab)
os.makedirs(D+'out',exist_ok=True)
for k,f in enumerate(frames): f.save(D+'out/%05d.jpg'%k,quality=88)
subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-framerate',str(FPS),'-i',D+'out/%05d.jpg','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p',D+'caelum_slam_mockup.mp4'],check=True)
print(len(frames),'frames')
