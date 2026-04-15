"""
Deeper English-residue scan: find strings with substantial English
content where the English phrase doesn't appear in the EN counterpart
as-is. Specifically looks for long English word sequences (>=5 words,
>=30 chars) sitting inside otherwise-translated content.
"""
import json, os, re
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CJK = re.compile(r'[\u4e00-\u9fff]')

def strip_codes(s):
    s = re.sub(r'@[A-Za-z]+\[[^\]]+\](?:\{[^}]*\})?', ' ', s)
    s = re.sub(r'\[\[[^\]]*\]\]', ' ', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = re.sub(r'&[a-zA-Z0-9#]+;', ' ', s)
    s = re.sub(r'\{[A-Za-z_][\w.]*\}', ' ', s)
    s = re.sub(r'Compendium\.[\w\-.]+', ' ', s)
    s = re.sub(r'(?:https?://|modules/|systems/|icons/|assets/)\S*', ' ', s)
    s = re.sub(r'\S+\.(?:png|jpg|jpeg|webp|gif|svg|mp3|ogg|wav|webm|mp4)', ' ', s, flags=re.I)
    return s

LONG_PHRASE = re.compile(r'(?:[A-Z][a-z]+|[a-z]{3,})(?:[\s,]+(?:[A-Z][a-z]+|[a-z]{3,})){4,}')

def walk(obj, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f'{path}.{k}' if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f'{path}[{i}]')
    else:
        yield path, obj

def load(p):
    with open(p, encoding='utf-8') as f: return json.load(f)

def is_skip(path):
    if path == 'mapping' or path.startswith('mapping.'): return True
    if re.search(r'(^|\.)img($|\.|\[)', path): return True
    if re.search(r'(^|\.)icon($|\.|\[)', path): return True
    if re.search(r'texture', path, re.I): return True
    if path.endswith('._id') or path.endswith('.id'): return True
    if path.endswith('.folder') or path.endswith('.sort') or path.endswith('.type'): return True
    return False

def scan(cn_path, en_path):
    cn = load(cn_path)
    try:
        en = load(en_path)
        en_map = dict(walk(en))
    except FileNotFoundError:
        en_map = {}
    hits = []
    for p, v in walk(cn):
        if not isinstance(v, str) or not v: continue
        if is_skip(p): continue
        cleaned = strip_codes(v)
        # Find long English phrases
        for m in LONG_PHRASE.finditer(cleaned):
            phrase = m.group(0).strip()
            if len(phrase) < 30: continue
            # Is this phrase also present in the EN counterpart? Then it's
            # the expected bilingual-content pattern, skip
            en_v = en_map.get(p)
            if isinstance(en_v, str) and phrase in en_v:
                # Check: does the CN have CJK surrounding this phrase? If
                # not, it means this section is untranslated
                # Find position in original text
                idx = v.find(phrase[:20])
                ctx_left = v[max(0, idx-50):idx]
                ctx_right = v[idx+len(phrase):idx+len(phrase)+50]
                if not CJK.search(ctx_left + ctx_right):
                    hits.append({'path': p, 'phrase': phrase, 'cn_preview': v[:200]})
            else:
                hits.append({'path': p, 'phrase': phrase, 'cn_preview': v[:200]})
            break
    return hits

def main():
    report = {}
    cn_dir = os.path.join(ROOT, 'compendium', 'cn')
    en_dir = os.path.join(ROOT, 'compendium', 'en')
    for fn in sorted(os.listdir(cn_dir)):
        if not fn.endswith('.json'): continue
        h = scan(os.path.join(cn_dir, fn), os.path.join(en_dir, fn))
        if h: report[f'compendium/cn/{fn}'] = h
    # lang
    h = scan(os.path.join(ROOT, 'lang', 'cn.json'), os.path.join(ROOT, 'lang', 'en.json'))
    if h: report['lang/cn.json'] = h

    out = os.path.join(ROOT, 'release', 'untranslated-deep-report.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    total = sum(len(v) for v in report.values())
    print(f'Deep report: {out}')
    print(f'Total: {total}')
    for f, items in sorted(report.items(), key=lambda x: -len(x[1])):
        print(f'  {f}: {len(items)}')

if __name__ == '__main__':
    main()
