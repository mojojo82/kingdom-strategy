# frames/ -> boss_game.webp (phone-size sheet, rows below) + boss_game.json, and the hi-res backup in art/originals/sprites_hires/boss/
import glob, os, json
from PIL import Image
ROWS=[('idle','BossIdle',12),('raise','BossRaise',8),('raised','BossRaisedIdle',12),('raiseLow','BossRaiselow',8),('raisedLow','BossRaisedIdlelow',12),('stomp','BossStomp',16)]
def fr(n,i): return Image.open(f'frames/{n}_{i:02d}.png').convert('RGBA')
bb=None
for _,n,k in ROWS:
    for i in range(k):
        b=fr(n,i).getchannel('A').point(lambda v:255 if v>8 else 0).getbbox(); bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
idle=fr('BossIdle',0).getchannel('A').point(lambda v:255 if v>8 else 0).getbbox(); FIG=idle[3]-idle[1]; FEET=idle[3]; FX=(idle[0]+idle[2])/2
L,U,R,D=bb[0]-6,bb[1]-6,bb[2]+6,max(bb[3],FEET)+4
GFIG=340; S=GFIG/FIG; cw,ch=round((R-L)*S),round((D-U)*S)
COLS=12; NF=sum(k for _,_,k in ROWS); sheet=Image.new('RGBA',(cw*COLS,ch*((NF+COLS-1)//COLS))); q=0; start={}
HR='../../art/originals/sprites_hires/boss'; os.makedirs(HR,exist_ok=True)
for r,(key,n,k) in enumerate(ROWS):
    hs=Image.new('RGBA',((R-L)*k,D-U)); start[key]=q
    for i in range(k):
        c=fr(n,i).crop((L,U,R,D)); hs.paste(c,(i*(R-L),0)); sheet.paste(c.resize((cw,ch),Image.LANCZOS),((q%COLS)*cw,(q//COLS)*ch)); q+=1
    hs.save(f'{HR}/boss_{key}.webp',lossless=True,method=6)
sheet.save('boss_game.webp',quality=90,method=6)
meta={'cw':cw,'ch':ch,'ax':round((FX-L)*S,1),'ay':round((FEET-U)*S,1),'bodyH':GFIG,'cols':COLS,'anims':{k:[start[k],n] for (k,_,n) in ROWS},'fps':{'idle':6,'raise':10,'raised':6,'raiseLow':10,'raisedLow':6,'stomp':10},'stompHit':8}
json.dump(meta,open('boss_game.json','w')); json.dump({'cell':[R-L,D-U],'feet':[round(FX-L,1),FEET-U],'note':'facing left like the game boss; smooth shading, no outline; one lossless webp per row; game sheet = these at '+str(round(S,4))},open(HR+'/README.json','w'))
print('render body px',FIG,'scale',round(S,3)); print(meta, 'sheet', sheet.size, os.path.getsize('boss_game.webp'))
