"""
Compare the model's walls (src/data/building.js) with the wall-face lines in
the architectural PDF (sheets 3 and 4, 1:100).

    node --input-type=module -e "const m=await import('./src/data/building.js');
      process.stdout.write(JSON.stringify({gf:m.WALLS_GF,ff:m.WALLS_FF}))" > /tmp/walls.json
    python3 tools/check_walls.py <drawings.pdf> /tmp/walls.json

For every model wall, samples points every 100 mm along it and checks for a
drawn line on either face (±t/2, ±40 mm). Openings in the model are skipped;
drawn openings show up as gaps. Reports per-wall coverage and the stretches
where the drawing has no wall (model wall probably wrong) — plus long drawn
wall-face pairs that no model wall covers (wall probably missing).
"""
import json
import sys
import warnings

import pymupdf

warnings.filterwarnings('ignore')
pdf, walls_json = sys.argv[1], sys.argv[2]
doc = pymupdf.open(pdf)
data = json.load(open(walls_json))


def lines_of(pno):
    pg = doc[pno]
    w = pg.get_text('words')
    g1 = [x for x in w if x[4] == '1' and x[1] < 80][0]
    g10 = [x for x in w if x[4] == '10' and x[1] < 80][0]
    A = [x for x in w if x[4] == 'A' and x[0] < 300][0]
    L = [x for x in w if x[4] == 'L' and x[0] < 300][0]
    x1 = (g1[0] + g1[2]) / 2; x10 = (g10[0] + g10[2]) / 2
    yA = (A[1] + A[3]) / 2; yL = (L[1] + L[3]) / 2
    sx = (x10 - x1) / 15994; sy = (yL - yA) / 21425
    H, V = [], []
    for p in pg.get_drawings():
        col = p.get('color') or ()
        if col and max(col) > 0.6 and not (col[0] > 0.9 and col[1] < 0.8):  # skip light/coloured annotation layers
            continue
        for it in p['items']:
            pts = []
            if it[0] == 'l':
                pts = [(it[1], it[2])]
            elif it[0] == 're':
                r = it[1]
                pts = [((r.x0, r.y0), (r.x1, r.y0)), ((r.x0, r.y1), (r.x1, r.y1)), ((r.x0, r.y0), (r.x0, r.y1)), ((r.x1, r.y0), (r.x1, r.y1))]
            for a, b in pts:
                ax, ay = (a[0] - x1) / sx, (a[1] - yA) / sy
                bx, by = (b[0] - x1) / sx, (b[1] - yA) / sy
                if abs(ay - by) < 15 and abs(ax - bx) > 120:
                    H.append(((ay + by) / 2, min(ax, bx), max(ax, bx)))
                elif abs(ax - bx) < 15 and abs(ay - by) > 120:
                    V.append(((ax + bx) / 2, min(ay, by), max(ay, by)))
    return H, V


def covered(lines, c, s, tol=40):
    return any(abs(lc - c) <= tol and l0 - 20 <= s <= l1 + 20 for lc, l0, l1 in lines)


for key, pno in (('gf', 2), ('ff', 3)):
    H, V = lines_of(pno)
    print(f'\n==== {key.upper()} (sheet {pno + 1}) — walls whose drawn coverage is < 80 % ====')
    for w in data[key]:
        (ax, ay), (bx, by) = w['a'], w['b']
        hor = abs(ay - by) < 1
        lines = H if hor else V
        c = ay if hor else ax
        s0, s1 = sorted((ax, bx) if hor else (ay, by))
        half = w['t'] / 2
        ops = [(min(o[0], o[1]), max(o[0], o[1])) for o in w['o']]
        n = hit = 0
        bad = []
        for s in range(int(s0) + 60, int(s1) - 60, 100):
            if any(o0 <= s <= o1 for o0, o1 in ops):
                continue
            n += 1
            ok = covered(lines, c - half, s) or covered(lines, c + half, s) or covered(lines, c, s, 60)
            hit += ok
            if not ok:
                bad.append(s)
        if n and hit / n < 0.8:
            runs, start, prev = [], None, None
            for s in bad:
                if start is None:
                    start = prev = s
                elif s - prev > 150:
                    runs.append((start, prev)); start = prev = s
                else:
                    prev = s
            if start is not None:
                runs.append((start, prev))
            kind = 'ext' if w.get('ext') else 'rc' if w.get('rc') else 'int'
            print(f"  {kind:3} W({ax},{ay} → {bx},{by}) t{w['t']}: {100 * hit // n}% drawn; no drawn wall at "
                  + ', '.join(f'{a}–{b + 100}' for a, b in runs))
