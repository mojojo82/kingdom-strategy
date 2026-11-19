# Mail tabs (v1751): make each tab picture at the exact on-screen shape (1.304:1) by stretching only its plain middle rows,
# so the game draws it whole (no 9-slice = no hairline seams). Harley: "a near 1px gap there".
from PIL import Image; import io, hashlib, json
M='art/originals/ui/mail_v2/'
ASPECT=(0.8767-0.032)/5 / (0.0855*1474/973)   # tab box width / height, both in units of the panel width
out={}
for name in ('off','on'):
    im=Image.open(f'{M}tab2_{name}.png').convert('RGBA'); w,h=im.size
    th=round(w/ASPECT); top,bot=int(h*0.36),int(h*0.64)
    res=Image.new('RGBA',(w,th))
    res.paste(im.crop((0,0,w,top)),(0,0))
    res.paste(im.crop((0,top,w,bot)).resize((w,th-top-(h-bot)),Image.BICUBIC),(0,top))
    res.paste(im.crop((0,bot,w,h)),(0,th-(h-bot)))
    res.save(f'{M}tab3_{name}.png')
    b=io.BytesIO(); res.save(b,'WEBP',quality=92,method=6); d=b.getvalue(); hh=hashlib.md5(d).hexdigest()[:8]
    fn=f'test/assets/ui-mail-tab3{name}-{hh}.webp'; open(fn,'wb').write(d); out[name]=fn.split('test/')[1]
    print(name,(w,h),'->',res.size,out[name])
json.dump(out,open(M+'mail_tab3.json','w'),indent=1)
