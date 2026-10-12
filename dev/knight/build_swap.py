# swap.html = the Gareth Sprite Swap mockup: current Gareth sheet (pulled from test/index.html) next to knight_sheet.webp
import re, base64, json
html = open('../../test/index.html').read()
old = re.search(r'\n  gareth: \{ src: "data:image/webp;base64,([^"]+)"', html).group(1)
t = open('swap.tpl.html').read()
new = base64.b64encode(open('knight_sheet.webp', 'rb').read()).decode()
t = t.replace('__OLD__', 'data:image/webp;base64,' + old).replace('__NEW__', 'data:image/webp;base64,' + new).replace('__META__', open('knight_sheet.json').read())
open('swap.html', 'w').write(t); print('swap.html written')
