"""
Extract sockets / data points / outdoor sockets (electrical plans, pp. 34–35)
and light switches (key-lighting plans, pp. 42–43) from the interior-design
package PDF, and convert them to plan millimetres (grid 1 / grid A origin).

    python3 tools/extract_electrical.py <part_2.pdf> > src/data/electrical.json
"""
import json, sys, warnings
import pymupdf
warnings.filterwarnings('ignore')
doc = pymupdf.open(sys.argv[1])

def cluster(rects, gap=5):
    out = []
    for r in rects:
        for c in out:
            if r.x0 < c.x1 + gap and r.x1 > c.x0 - gap and r.y0 < c.y1 + gap and r.y1 > c.y0 - gap:
                c |= r
                break
        else:
            out.append(pymupdf.Rect(r))
    # second pass merge
    merged = True
    while merged:
        merged = False
        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                a, b = out[i], out[j]
                if a.x0 < b.x1 + gap and a.x1 > b.x0 - gap and a.y0 < b.y1 + gap and a.y1 > b.y0 - gap:
                    out[i] = a | b; out.pop(j); merged = True; break
            if merged: break
    return out

def paths(pg, col):
    rs = []
    for p in pg.get_drawings():
        c = tuple(round(x, 2) for x in (p.get('color') or p.get('fill') or ()))
        if c == col:
            rs.append(p['rect'])
    return rs

def walls_bbox(pg):
    # bounding box of large black filled wall polygons
    bb = None
    for p in pg.get_drawings():
        f = p.get('fill')
        if f and max(f) < 0.05 and p['rect'].width * p['rect'].height > 30:
            bb = p['rect'] if bb is None else bb | p['rect']
    return bb

# calibration from the dimension chains on pp. 34/35 (text centres ↔ chain mm)
def fit(pairs):
    (p0, m0), (p1, m1) = pairs[0], pairs[-1]
    k = (m1 - m0) / (p1 - p0)
    return lambda p: m0 + (p - p0) * k

CAL = {
    33: (fit([(524, 997 - 27), (949, 12794 - 27)]), fit([(288, 2788 + 30), (897, 19679 + 30)])),
    34: (fit([(676, 4694 - 27), (967, 12794 - 27)]), fit([(288, 2788 + 30), (921, 2788 + 30 + (921 - 288) / 0.036055)])),
}
out = {'gf': {}, 'ff': {}}
ORANGE, BLUE, PINK = (0.98, 0.39, 0.16), (0.02, 0.25, 0.96), (0.9, 0.28, 0.7)
for pno, key in ((33, 'gf'), (34, 'ff')):
    pg = doc[pno]; fx, fy = CAL[pno]
    for name, col in (('socket', ORANGE), ('data', BLUE), ('outdoor', PINK)):
        out[key][name] = [[round(fx((c.x0 + c.x1) / 2)), round(fy((c.y0 + c.y1) / 2)), round(c.width, 1), round(c.height, 1)]
                          for c in cluster(paths(pg, col)) if c.width < 20 and c.height < 20]
# switches: key-lighting plans share the electrical plans' wall geometry → map via wall bounding boxes
for pno, ref, key in ((41, 33, 'gf'), (42, 34, 'ff')):
    pg, rp = doc[pno], doc[ref]
    a, b = walls_bbox(pg), walls_bbox(rp)
    fx, fy = CAL[ref]
    sx, sy = b.width / a.width, b.height / a.height
    conv = lambda x, y: (fx(b.x0 + (x - a.x0) * sx), fy(b.y0 + (y - a.y0) * sy))
    sw = []
    for c in cluster(paths(pg, ORANGE)):
        if c.width < 20 and c.height < 20:
            x, y = conv((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2)
            sw.append([round(x), round(y), round(c.width, 1), round(c.height, 1)])
    out[key]['switch'] = sw
    out[key]['_bbox'] = [list(a), list(b)]
json.dump(out, sys.stdout, indent=1)
