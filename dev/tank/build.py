import json,base64
P=json.load(open('parts.json')); out={}
for k,r in P.items(): out[k]={'r':r,'src':'data:image/png;base64,'+base64.b64encode(open(k+'.png','rb').read()).decode()}
open('tank.html','w').write(open('tank.tpl.html').read().replace('__PARTS__',json.dumps(out)))
