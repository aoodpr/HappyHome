"""
Extract interior wall runs from the architectural PDF vector data.

    python3 tools/extract_walls.py <drawings.pdf> <page index: 2=GF, 3=FF>

Finds pairs of parallel drawn lines 140–260 mm apart that overlap for at least
250 mm (two faces of a wall), merges them per wall centre line and prints the
solid stretches and the gaps between them (door / opening candidates), in plan
millimetres from grid 1 / grid A.
"""
import sys
import warnings
from collections import defaultdict

warnings.filterwarnings('ignore')
sys.argv += []
src = open(__file__.replace('extract_walls.py', 'check_walls.py')).read().split('for key, pno in')[0]
pdf, page = sys.argv[1], int(sys.argv[2])
sys.argv = ['x', pdf, '/dev/null']
_g = {}
exec(src.replace("data = json.load(open(walls_json))", "data = None"), _g)
H, V = _g['lines_of'](page)


def merge(intervals, gap=30):
    out = []
    for a, b in sorted(intervals):
        if out and a <= out[-1][1] + gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def pairs(lines, region):
    lines = [l for l in lines if region[0] <= l[0] <= region[1]]
    by_c = defaultdict(list)
    for c, a, b in lines:
        by_c[round(c / 5) * 5].append((a, b))
    cs = sorted(by_c)
    walls = defaultdict(list)  # (centre, thickness) -> intervals
    for i, c1 in enumerate(cs):
        for c2 in cs[i + 1:]:
            t = c2 - c1
            if t < 140:
                continue
            if t > 260:
                break
            for a1, b1 in merge(by_c[c1]):
                for a2, b2 in merge(by_c[c2]):
                    lo, hi = max(a1, a2), min(b1, b2)
                    if hi - lo >= 250:
                        walls[(round((c1 + c2) / 2), round(t))].append((lo, hi))
    return walls


def report(name, walls):
    print(f'---- {name} (centre, thickness): solid stretches  |  gaps')
    rows = []
    for (c, t), iv in walls.items():
        m = merge(iv, 60)
        total = sum(b - a for a, b in m)
        if total < 600:
            continue
        gaps = [(m[i][1], m[i + 1][0]) for i in range(len(m) - 1) if 500 <= m[i + 1][0] - m[i][1] <= 3200]
        rows.append((c, t, m, gaps))
    for c, t, m, gaps in sorted(rows):
        print(f'{c:6d} t{t:3d}: ' + ', '.join(f'{round(a)}–{round(b)}' for a, b in m)
              + ('   | gaps ' + ', '.join(f'{round(a)}–{round(b)}' for a, b in gaps) if gaps else ''))


report('horizontal walls (y)', pairs(H, (300, 21200)))
report('vertical walls (x)', pairs(V, (2200, 15800)))
