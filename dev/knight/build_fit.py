# fit.html = the Knight Sword Fitting preview page with knight3.json baked in
t = open('fit.tpl.html').read(); open('fit.html', 'w').write(t.replace('__KNIGHT__', 'window.KNIGHT=' + open('knight3.json').read() + ';'))
print('fit.html written')
