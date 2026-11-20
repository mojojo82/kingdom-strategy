# Governor gear: spread each piece's cap over Harley's 40 steps (Grey ... Red T3). Steps grow towards Red.
CAPS = {'Cannon damage': 70, 'Fortress HP': 15, 'Hero attack vs fortress': 50, 'Hero skill vs fortress': 65, 'Boss damage': 420}
STEPS = [('Grey', ['', '1*']), ('Blue', ['', '1*', '2*', '3*']),
         ('Purple', ['', '1*', '2*', '3*', 'T1', 'T1 1*', 'T1 2*', 'T1 3*']),
         ('Yellow', ['', '1*', '2*', '3*', 'T1', 'T1 1*', 'T1 2*', 'T1 3*', 'T2', 'T2 1*', 'T2 2*', 'T2 3*', 'T3']),
         ('Red', ['', '1*', '2*', '3*', 'T1', 'T1 1*', 'T1 2*', 'T1 3*', 'T2', 'T2 1*', 'T2 2*', 'T2 3*', 'T3'])]
WEIGHT = {'Grey': 1.0, 'Blue': 1.25, 'Purple': 1.5, 'Yellow': 2.0, 'Red': 2.75}
names = [(t, (t + ' ' + s).strip()) for t, ss in STEPS for s in ss]
w = [WEIGHT[t] for t, _ in names]; tot = sum(w)
cum = []; c = 0
for x in w: c += x; cum.append(c / tot)
if __name__ == '__main__':
    print(len(names), 'steps')
    print('| Step | ' + ' | '.join(CAPS) + ' |'); print('|---' * (len(CAPS) + 1) + '|')
    for i, (t, n) in enumerate(names):
        print(f'| {i+1}. {n} | ' + ' | '.join(f'+{CAPS[k]*cum[i]:.1f}%' for k in CAPS) + ' |')
