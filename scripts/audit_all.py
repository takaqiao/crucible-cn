"""
Comprehensive audit before release. Runs many independent checks and
prints a per-category summary + details. Exit code == total issue count.
"""
import json, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CJK = re.compile(r'[\u4e00-\u9fff]')

def load(p):
    with open(p, encoding='utf-8') as f: return json.load(f)

def walk(o, p=''):
    if isinstance(o, dict):
        for k, v in o.items():
            yield from walk(v, f'{p}.{k}' if p else k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, f'{p}[{i}]')
    else:
        yield p, o

issues = defaultdict(list)

def add(cat, msg):
    issues[cat].append(msg)

# ------------------ 1. AI prompt / harmony leak detection ------------------
LEAK_PAT = re.compile(
    r'ChatGPT|<\|start\|>|<\|end\|>|<\|channel\|>|<\|message\|>'
    r'|analysis to=all|professional Crucible|AI assistant'
    r'|Simplified Chinese only|glossary terms only|OpenAI|accessed via an API'
    r'|developer\d|assistant\d|system\d|Output only the translation'
    r'|Translate to|sentence meaning|Preserve all code-like'
    , re.I)

def check_leaks(path, data):
    for p, v in walk(data):
        if isinstance(v, str) and LEAK_PAT.search(v):
            add('ai_prompt_leak', f'{path}:{p} :: {v[:100]}')

# ------------------ 2. Template variable mismatches ------------------
VAR_RE = re.compile(r'\{([a-zA-Z_][\w]*)\}')
def check_template_vars():
    cn = load(os.path.join(ROOT, 'lang', 'cn.json'))
    en = load(os.path.join(ROOT, 'lang', 'en.json'))
    cm = dict(walk(cn)); em = dict(walk(en))
    for k, ev in em.items():
        cv = cm.get(k)
        if not isinstance(cv, str) or not isinstance(ev, str): continue
        if set(VAR_RE.findall(ev)) != set(VAR_RE.findall(cv)):
            add('template_var_mismatch', f'lang/cn.json:{k} en_vars={set(VAR_RE.findall(ev))} cn_vars={set(VAR_RE.findall(cv))}')

# ------------------ 3. HTML tag balance ------------------
OPEN_RE = re.compile(r'<(strong|em|p|h[1-6]|ul|ol|li|figure|figcaption|table|tr|td|th|thead|tbody|div|span|a|blockquote|section)(?:\s[^>]*)?>', re.I)
CLOSE_RE = re.compile(r'</(strong|em|p|h[1-6]|ul|ol|li|figure|figcaption|table|tr|td|th|thead|tbody|div|span|a|blockquote|section)>', re.I)
def check_html_balance(path, data):
    for p, v in walk(data):
        if not isinstance(v, str) or '<' not in v: continue
        open_counts = defaultdict(int); close_counts = defaultdict(int)
        for m in OPEN_RE.finditer(v): open_counts[m.group(1).lower()] += 1
        for m in CLOSE_RE.finditer(v): close_counts[m.group(1).lower()] += 1
        for tag in set(open_counts) | set(close_counts):
            if open_counts[tag] != close_counts[tag]:
                diff = open_counts[tag] - close_counts[tag]
                add('html_balance', f'{path}:{p} <{tag}> diff={diff:+d}')
                break

# ------------------ 4. @UUID pack name must be English (no CJK in id part) ------------------
UUID_RE = re.compile(r'@(?:UUID|Embed)\[([^\]]+)\]')
def check_uuid_ids(path, data):
    for p, v in walk(data):
        if not isinstance(v, str) or '@' not in v: continue
        for m in UUID_RE.finditer(v):
            ref = m.group(1)
            # Compendium.crucible.X.Y.id — the pack segment shouldn't be CJK
            if ref.startswith('Compendium.'):
                parts = ref.split('.')
                if len(parts) >= 3 and CJK.search(parts[2]):
                    add('uuid_cjk_pack', f'{path}:{p} {ref}')

# ------------------ 5. Nested name garbled (>2 tokens, ≥2 CJK tokens) ------------------
def check_garbled_names(path, data):
    for p, v in walk(data):
        if not isinstance(v, str): continue
        if not p.endswith('.name') and not p.endswith('.label') and not p.endswith('.title'): continue
        tokens = v.split()
        if len(tokens) <= 2: continue
        cjk = [t for t in tokens if CJK.search(t)]
        if len(cjk) >= 2:
            add('garbled_name', f'{path}:{p} :: {v!r}')

# ------------------ 6. "undefined" literal in strings ------------------
def check_undefined(path, data):
    for p, v in walk(data):
        if isinstance(v, str) and 'undefined' in v.lower() and 'undef' not in p.lower():
            add('undefined_literal', f'{path}:{p} :: {v[:120]}')

# ------------------ 7. Empty name where en has name ------------------
def check_empty_names(cn_path, en_path):
    cn = load(cn_path)
    try: en = load(en_path)
    except FileNotFoundError: return
    em = dict(walk(en))
    for p, v in walk(cn):
        if not p.endswith('.name'): continue
        ev = em.get(p)
        if isinstance(v, str) and v.strip() == '' and isinstance(ev, str) and ev.strip():
            add('empty_name', f'{cn_path}:{p}')

# ------------------ 8. Encoding garbage mojibake (U+FFFD, stray control chars) ------------------
MOJI_RE = re.compile(r'[\ufffd\u0000-\u0008\u000b-\u000c\u000e-\u001f]')
def check_mojibake(path, data):
    for p, v in walk(data):
        if isinstance(v, str) and MOJI_RE.search(v):
            add('mojibake', f'{path}:{p}')

# ------------------ 9. Entry-count mismatch between cn and en packs ------------------
def check_entry_counts(cn_path, en_path):
    cn = load(cn_path)
    try: en = load(en_path)
    except FileNotFoundError: return
    c = len(cn.get('entries', {}) or {})
    e = len(en.get('entries', {}) or {})
    if c != e:
        add('entry_count_mismatch', f'{os.path.basename(cn_path)}: cn={c} en={e}')

# ------------------ 10. Duplicate bilingual: CN contains both halves repeated ------------------
DUP_RE = re.compile(r'([\u4e00-\u9fff]{2,6})\s+([A-Za-z]+)\s+\1')
def check_duplicate_halves(path, data):
    for p, v in walk(data):
        if isinstance(v, str) and DUP_RE.search(v):
            add('duplicate_halves', f'{path}:{p} :: {v[:80]}')

# ------------------ Run all ------------------
def main():
    # lang
    for name in ('cn.json', 'en.json'):
        pass
    cn_lang = os.path.join(ROOT, 'lang', 'cn.json')
    en_lang = os.path.join(ROOT, 'lang', 'en.json')
    cn = load(cn_lang); en = load(en_lang)
    check_leaks('lang/cn.json', cn)
    check_template_vars()
    check_html_balance('lang/cn.json', cn)
    check_undefined('lang/cn.json', cn)
    check_mojibake('lang/cn.json', cn)

    # compendium
    cn_dir = os.path.join(ROOT, 'compendium', 'cn')
    en_dir = os.path.join(ROOT, 'compendium', 'en')
    for fn in sorted(os.listdir(cn_dir)):
        if not fn.endswith('.json'): continue
        cn_p = os.path.join(cn_dir, fn); en_p = os.path.join(en_dir, fn)
        d = load(cn_p)
        tag = f'compendium/cn/{fn}'
        check_leaks(tag, d)
        check_html_balance(tag, d)
        check_uuid_ids(tag, d)
        check_garbled_names(tag, d)
        check_undefined(tag, d)
        check_mojibake(tag, d)
        check_empty_names(cn_p, en_p)
        check_entry_counts(cn_p, en_p)
        check_duplicate_halves(tag, d)

    total = sum(len(v) for v in issues.values())
    print(f'Total issues: {total}\n')
    for cat, items in sorted(issues.items(), key=lambda x: -len(x[1])):
        print(f'== {cat}: {len(items)} ==')
        for it in items[:15]:
            print(f'  {it}')
        if len(items) > 15:
            print(f'  ... +{len(items)-15} more')
        print()
    sys.exit(min(total, 255))

if __name__ == '__main__':
    main()
