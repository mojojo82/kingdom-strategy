import numpy as np, json, sys
d = np.load(sys.argv[1]); json.dump({'pos': d['pos'].astype(np.float32).ravel().round(4).tolist(), 'col': d['col'].astype(int).tolist()}, open(sys.argv[2], 'w'))
