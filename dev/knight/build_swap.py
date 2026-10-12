# swap.html = the Gareth Sprite Swap mockup: current Gareth sheet (pulled from test/index.html) next to knight_sheet.webp
import re, base64, json
html = open('../../test/index.html').read()
old = re.search(r'\n  gareth: \{ src: "data:image/webp;base64,([^"]+)"', html).group(1)
t = open('swap.tpl.html').read()
c = re.search(r'\n  gareth: \{ src: "data:image/webp;base64,([^"]+)", w: (\d+), h: (\d+), ax: ([\d.]+), ay: ([\d.]+)', html[html.index('var HERO_CHARGE'):])
t = t.replace('__OLDCHARGE__', 'data:image/webp;base64,' + c.group(1)).replace('__OLDCHARGEMETA__', json.dumps({'w': float(c.group(2)), 'h': float(c.group(3)), 'ax': float(c.group(4)), 'ay': float(c.group(5))}))
new = base64.b64encode(open('knight_sheet.webp', 'rb').read()).decode()
t = t.replace('__OLD__', 'data:image/webp;base64,' + old).replace('__NEW__', 'data:image/webp;base64,' + new).replace('__META__', open('knight_sheet.json').read())
open('swap.html', 'w').write(t); print('swap.html written')
