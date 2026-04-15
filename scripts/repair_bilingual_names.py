"""For every dict node in CN packs that has a `name` field, look up the
parallel node in EN and ensure CN name follows `{CJK chunk} {EN name}`.
If current CN name is broken (any English token in it that isn't equal to
the EN trailing portion), rebuild it.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CJK = re.compile(r'[\u4e00-\u9fff]')

def first_cjk_chunk(s):
    """Return the leading CJK token (stops at first space or Latin letter)."""
    out = []
    for ch in s:
        if ch == ' ' or 'a' <= ch.lower() <= 'z':
            break
        out.append(ch)
    return ''.join(out).strip(' :,()（）·\'-')

def is_broken(cn_name, en_name):
    if not isinstance(cn_name, str) or not isinstance(en_name, str): return False
    if cn_name == en_name: return False
    if not CJK.search(cn_name): return False
    # Strip trailing EN name if present
    head = cn_name
    if cn_name.endswith(' ' + en_name):
        head = cn_name[:-len(en_name)-1]
    elif cn_name.endswith(en_name):
        head = cn_name[:-len(en_name)]
    else:
        # No EN tail at all but has Latin letters → broken
        if re.search(r'[A-Za-z]', cn_name): return True
        # No EN tail and pure CJK with inner space → likely doubled translation
        if ' ' in cn_name.strip(): return True
        return False
    head = head.rstrip()
    # Head should be a single CJK chunk (no inner spaces, no Latin)
    if re.search(r'[A-Za-z]', head): return True
    if ' ' in head: return True
    return False

def rebuild(cn_name, en_name):
    chunk = first_cjk_chunk(cn_name)
    if not chunk:
        # Fallback: keep CN tokens before first English run
        m = re.match(r'^([\u4e00-\u9fff·：（）()，,]+)', cn_name)
        chunk = m.group(0) if m else cn_name
    return f'{chunk} {en_name}'.strip()

def walk_pair(cn, en, fixed):
    if isinstance(cn, dict) and isinstance(en, dict):
        if 'name' in cn and 'name' in en:
            if is_broken(cn['name'], en['name']):
                new = rebuild(cn['name'], en['name'])
                fixed.append((cn['name'], new))
                cn['name'] = new
        for k, v in cn.items():
            if k in en:
                walk_pair(v, en[k], fixed)
    elif isinstance(cn, list) and isinstance(en, list):
        for a, b in zip(cn, en):
            walk_pair(a, b, fixed)

def main():
    cn_dir = os.path.join(ROOT, 'compendium', 'cn')
    en_dir = os.path.join(ROOT, 'compendium', 'en')
    total = 0
    for fn in sorted(os.listdir(cn_dir)):
        if not fn.endswith('.json'): continue
        cn_p = os.path.join(cn_dir, fn); en_p = os.path.join(en_dir, fn)
        if not os.path.exists(en_p): continue
        with open(cn_p, encoding='utf-8') as f: cn = json.load(f)
        with open(en_p, encoding='utf-8') as f: en = json.load(f)
        fixed = []
        walk_pair(cn, en, fixed)
        if fixed:
            with open(cn_p, 'w', encoding='utf-8') as f:
                json.dump(cn, f, ensure_ascii=False, indent=2)
            print(f'== {fn}: {len(fixed)} fixed')
            for o, n in fixed[:20]:
                print(f'  {o!r} -> {n!r}')
            if len(fixed) > 20:
                print(f'  ... +{len(fixed)-20}')
            total += len(fixed)
    print(f'\nTotal: {total}')

if __name__ == '__main__':
    main()
