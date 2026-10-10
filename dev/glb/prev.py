import numpy as np, json, sys
out=[]
for f in sys.argv[1:]:
    d=np.load(f); out.append({'name':f,'pos':d['pos'].astype(np.float32).ravel().round(4).tolist(),'col':(d['col']/255).astype(np.float32).ravel().round(3).tolist(),'T':d['T'].astype(int).ravel().tolist()})
json.dump(out,open('/tmp/claude-0/glb/prev.json','w'))
