import json,base64
P=json.load(open('parts.json')); out={}
for k,r in P.items(): out[k]={'r':r,'src':'data:image/png;base64,'+base64.b64encode(open(k+'.png','rb').read()).decode()}
s=open('live.tpl.html').read().replace('__PARTS__',json.dumps(out)).replace('__BG__','data:image/webp;base64,'+base64.b64encode(open('bg.webp','rb').read()).decode())
J=json.load(open('boom.json'))
for n in J: J[n]['src']='data:image/png;base64,'+base64.b64encode(open(n+'.png','rb').read()).decode()
s=s.replace('__BOOM__',json.dumps(J))
open('live.html','w').write(s)
