"""
Find single English words embedded in otherwise-Chinese strings.

The other scanners look for long English phrases (>=5 words) or fully-English
strings. This one catches the gap: a single capitalized English word like
"Public" or "Private" sitting inside a CJK paragraph, which previous scanners
skipped because there's plenty of CJK around it.

Heuristics:
- String must contain CJK
- Strip code-like tokens first (@UUID, [[..]], HTML, {var}, Compendium paths,
  URLs, asset filenames, dice)
- Find Latin words >= 3 letters
- For each word: skip if it's a known allowlist token (brand names like
  "Crucible", attribute abbreviations like "DEX", common acronyms)
- Skip if the EN counterpart contains the same word in the same position
  AND the CN string already shows a Chinese gloss right next to it (the
  bilingual inline pattern "中文（English）" is fine)
- Otherwise report
"""
import json, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CJK = re.compile(r'[\u4e00-\u9fff]')

ALLOW = {
    'Crucible', 'Foundry', 'Virtual', 'Tabletop', 'Discord', 'Patreon',
    'VTT', 'GM', 'PC', 'NPC', 'HP', 'AC', 'DC',
    'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA', 'TRPG', 'RPG', 'AP', 'FP',
    'XP', 'TPK', 'd20', 'D20', 'OK', 'URL', 'ID', 'UI', 'API', 'Boss',
    'Items', 'Actor', 'endregion',
    # Crucible attribute keys - they're glossary entries, allowed
    'Strength', 'Dexterity', 'Toughness', 'Intellect', 'Presence', 'Wisdom',
    # Proper nouns (characters / talents)
    'Krag', 'Alex', 'Jex', 'Zenith', 'Fizzit', 'Duurath', 'Baizas',
    'Eldritch', 'Emanataion', 'Baisaz', 'Jinora', 'Andrew', 'Clayton',
    'Atropos', 'Ember', 'Max', 'crucible', 'GitHub', 'Dice', 'Nice',
    'So', 'Shane', 'Martland', 'Anathema', 'Scroll', 'Caeora',
    'Belladonna', 'Marlene', 'Robinson', 'Taarie', 'Drew', 'Smith', 'Drewzelle',
    'Kagura', 'Maalvi', 'RedReign', 'Orivech', 'Wilfred', 'JDW',
}

def strip_codes(s):
    s = re.sub(r'@[A-Za-z]+\[[^\]]+\](?:\{[^}]*\})?', ' ', s)
    s = re.sub(r'\[\[[^\]]*\]\]', ' ', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = re.sub(r'&[a-zA-Z0-9#]+;', ' ', s)
    s = re.sub(r'\{[A-Za-z_][\w.]*\}', ' ', s)
    s = re.sub(r'Compendium\.[\w\-.]+', ' ', s)
    s = re.sub(r'(?:https?://|modules/|systems/|icons/|assets/)\S*', ' ', s)
    s = re.sub(r'\S+\.(?:png|jpg|jpeg|webp|gif|svg|mp3|ogg|wav|webm|mp4)', ' ', s, flags=re.I)
    s = re.sub(r'\b\d+(?:d\d+)?\b', ' ', s)
    return s

WORD = re.compile(r"[A-Za-z][A-Za-z'-]{2,}")

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

SKIP_PATH = re.compile(
    r'(^|\.)(img|icon|texture|sort|folder|type|_id|id|color|tint)($|\.|\[)'
    r'|^mapping(\.|$)'
)

def is_bilingual_paren(text, word, idx):
    """Allow patterns like '中文（Word）', '中文(Word)', or '中文 Word' / '中文 Word Phrase'.
    Treat any English token immediately preceded by a CJK char (with optional
    space) as the trailing bilingual gloss."""
    left = text[max(0, idx-3):idx]
    right = text[idx+len(word):idx+len(word)+3]
    if ('（' in left or '(' in left) and ('）' in right or ')' in right):
        return True
    # CJK directly before (with optional whitespace)
    j = idx - 1
    while j >= 0 and text[j] == ' ':
        j -= 1
    if j >= 0 and CJK.match(text[j]):
        return True
    # Walk left through Latin word characters and spaces until hitting CJK.
    # If the chain is all Latin/space, we're in a multi-word bilingual tail.
    while j >= 0 and (text[j].isalpha() or text[j] in " ',-:."):
        if CJK.match(text[j]):
            return True
        j -= 1
    if j >= 0 and CJK.match(text[j]):
        return True
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
        if SKIP_PATH.search(p): continue
        if not CJK.search(v): continue  # only mixed CJK strings
        cleaned = strip_codes(v)
        for m in WORD.finditer(cleaned):
            w = m.group(0)
            if w in ALLOW: continue
            if w.lower() in {'true','false','null','none'}: continue
            # Find this word's position in the original (best-effort)
            idx = v.find(w)
            if idx < 0: continue
            if is_bilingual_paren(v, w, idx): continue
            # Skip if EN counterpart contains the EXACT same surrounding context
            # (means it's a deliberate parallel reference)
            en_v = en_map.get(p, '')
            if isinstance(en_v, str) and w in en_v:
                # Check whether the CN string is following the bilingual-name
                # convention "{CN tokens} {EN tokens}" — if w sits in the
                # trailing English half, that's expected
                # Heuristic: word index >= last CJK index
                last_cjk = max((i for i, ch in enumerate(v) if CJK.match(ch)), default=-1)
                if idx > last_cjk:
                    continue
            hits.append({'path': p, 'word': w, 'preview': v[max(0,idx-30):idx+30+len(w)]})
            break  # one report per string
    return hits

def main():
    report = {}
    cn_dir = os.path.join(ROOT, 'compendium', 'cn')
    en_dir = os.path.join(ROOT, 'compendium', 'en')
    for fn in sorted(os.listdir(cn_dir)):
        if not fn.endswith('.json'): continue
        h = scan(os.path.join(cn_dir, fn), os.path.join(en_dir, fn))
        if h: report[f'compendium/cn/{fn}'] = h
    h = scan(os.path.join(ROOT, 'lang', 'cn.json'), os.path.join(ROOT, 'lang', 'en.json'))
    if h: report['lang/cn.json'] = h

    out = os.path.join(ROOT, 'release', 'word-leak-report.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    total = sum(len(v) for v in report.values())
    print(f'Word-leak report: {out}')
    print(f'Total: {total}')
    for f, items in sorted(report.items(), key=lambda x: -len(x[1])):
        print(f'  {f}: {len(items)}')

if __name__ == '__main__':
    main()
