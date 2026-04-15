"""
Thorough English-residue scanner for crucible-cn.

Walks compendium/cn + lang/cn in parallel with compendium/en + lang/en.
For every leaf string, strips code-like tokens (@UUID / @Embed / [[..]] /
HTML tags / attrs / media URLs / Compendium.crucible.X / class names /
{template} vars / hex colors / numbers) then classifies:

  pure_english  : CJK absent AND alphabetic word >= 3 letters present
  identical     : CN string equals EN string after code-stripping (suspect)
  mixed_suffix  : CN string ends with a long Latin run (>=8 chars) that is
                  NOT present in the EN counterpart beyond the expected
                  "{CN} {EN}" bilingual pattern
  name_no_en    : leaf under a "name" key with 0 alphabetic chars and EN
                  key has alphabetic content (optional info)

Keys whose leaf is a pure identifier/path/asset are skipped — we treat them
as non-translatable:
  _id / id / img / icon / flags / type / folder / sort / ownership /
  system.*.value numeric, any string matching URL/path/asset patterns,
  keys whose path contains one of those segments.
"""
import json, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CJK = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf]')
WORD = re.compile(r'[A-Za-z]{3,}')
LONG_LATIN_TAIL = re.compile(r'([A-Za-z][A-Za-z \'\-,:()]{6,})\s*$')

SKIP_KEY_SEGMENTS = {
    '_id', 'id', 'img', 'icon', 'sort', 'ownership', 'folder', 'flags',
    '_stats', 'prototypetoken.texture', 'texture', 'scale', 'color',
    'effects[*].icon', 'tint',
}
SKIP_KEY_EXACT = {'_id', 'id', 'img', 'icon', 'sort', 'folder', 'tint', 'color'}

ASSET_RE = re.compile(
    r'^(https?://|/|modules/|systems/|icons/|assets/|worlds/|data/)'
    r'|\.(png|jpg|jpeg|webp|gif|svg|mp3|ogg|wav|m4a|webm|mp4|ttf|woff2?)(\?|$)'
    r'|^#[0-9a-fA-F]{3,8}$',
    re.I,
)

ID_RE = re.compile(r'^[A-Za-z0-9]{8,}$')  # foundry short ids
UUID_RE = re.compile(r'^[0-9a-f\-]{16,}$', re.I)

def strip_codes(s: str) -> str:
    if not s:
        return ''
    # @Markers: @UUID[...]{label?}, @Embed[...], @Condition[...], @Advantage,
    # @Action, @Compendium, @Localize, @Check, @Ref
    s = re.sub(r'@[A-Za-z]+\[[^\]]+\](?:\{[^}]*\})?', ' ', s)
    # [[/...]], [[...]] rolls
    s = re.sub(r'\[\[[^\]]*\]\]', ' ', s)
    # HTML tags
    s = re.sub(r'<[^>]+>', ' ', s)
    # HTML entities
    s = re.sub(r'&[a-zA-Z0-9#]+;', ' ', s)
    # Template vars {foo}
    s = re.sub(r'\{[A-Za-z_][\w.]*\}', ' ', s)
    # Compendium paths
    s = re.sub(r'Compendium\.[\w\-.]+', ' ', s)
    # Dice/numbers/units that aren't real words
    s = re.sub(r'\b\d+(?:d\d+)?\b', ' ', s)
    return s

def meaningful_english_words(text: str):
    """Return Latin words of 3+ letters that look like real English."""
    cleaned = strip_codes(text)
    out = []
    for m in WORD.finditer(cleaned):
        w = m.group(0)
        if UUID_RE.match(w) or ID_RE.match(w):
            continue
        # common non-English latin short tokens to ignore
        if w.lower() in {'xxx', 'yyy', 'aaa'}:
            continue
        out.append(w)
    return out

def is_skippable_path(path: str) -> bool:
    # path segments joined by '.'; array indices become [i]
    segs = re.split(r'[.\[]', path)
    for seg in segs:
        seg = seg.rstrip(']')
        if seg in SKIP_KEY_EXACT:
            return True
    # also skip "system.description.value" textures etc.
    if re.search(r'(^|\.)img($|\.)', path): return True
    if re.search(r'(^|\.)icon($|\.)', path): return True
    if re.search(r'(^|\.)texture(\.|$)', path): return True
    if re.search(r'prototypeToken\.texture', path, re.I): return True
    if path.endswith('._id') or path.endswith('.id'): return True
    if path.endswith('.folder'): return True
    if path.endswith('.sort'): return True
    if path.endswith('.type'): return True
    # Babele DSL at the pack root is not user-visible content
    if path == 'mapping' or path.startswith('mapping.'):
        return True
    return False

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
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def scan_pack(cn_path, en_path):
    """Return list of dicts: {path, reason, cn, en}."""
    cn = load(cn_path)
    try:
        en = load(en_path)
    except FileNotFoundError:
        en = None

    findings = []

    # Collect EN leaves by path for cross-check
    en_map = {}
    if en is not None:
        for p, v in walk(en):
            en_map[p] = v

    for p, v in walk(cn):
        if not isinstance(v, str) or not v:
            continue
        if is_skippable_path(p):
            continue
        if ASSET_RE.search(v):
            continue
        # Skip pure @-markup strings (e.g. "@UUID[...]{label}")
        stripped = strip_codes(v).strip()
        if not stripped:
            continue

        words = meaningful_english_words(v)
        has_cjk = bool(CJK.search(v))
        en_val = en_map.get(p)

        # Case 1: identical to EN — untranslated
        if isinstance(en_val, str) and en_val == v and words:
            findings.append({'path': p, 'reason': 'identical', 'cn': v, 'en': en_val})
            continue

        # Case 2: CN has English words but no Chinese at all — leftover
        if words and not has_cjk:
            # But allow tech names / brand terms if EN counterpart is the same
            # (e.g. "Crucible" which should stay as is). Heuristic: if length
            # <= 30 and == EN, it was allowed above. Otherwise report.
            findings.append({'path': p, 'reason': 'pure_english', 'cn': v, 'en': en_val})
            continue

        # Case 3: long Latin tail that doesn't belong (only check name-like keys
        # to reduce noise)
        if has_cjk and re.search(r'(^|\.)(name|label|title|caption)($|\.|\[)', p, re.I):
            tail = LONG_LATIN_TAIL.search(v)
            if tail:
                # Expected bilingual "{CN} {EN}" pattern -> tail equals en_val name
                # Compare: strip leading spaces/punct
                tail_text = tail.group(1).strip()
                if isinstance(en_val, str) and en_val.strip().endswith(tail_text):
                    pass  # expected bilingual form
                else:
                    # only flag if > 12 chars to reduce noise
                    if len(tail_text) >= 12:
                        findings.append({'path': p, 'reason': 'unexpected_latin_tail', 'cn': v, 'en': en_val})

    return findings

def scan_lang(cn_path, en_path):
    cn = load(cn_path); en = load(en_path)
    cn_map = dict(walk(cn)); en_map = dict(walk(en))
    findings = []
    for k, ev in en_map.items():
        if not isinstance(ev, str): continue
        cv = cn_map.get(k)
        if not isinstance(cv, str): continue
        words = meaningful_english_words(cv)
        has_cjk = bool(CJK.search(cv))
        if cv == ev and words:
            findings.append({'path': k, 'reason': 'identical', 'cn': cv, 'en': ev})
        elif words and not has_cjk and ev != '':
            # If EN is also the same short token (brand), skip
            if cv == ev:
                continue
            findings.append({'path': k, 'reason': 'pure_english', 'cn': cv, 'en': ev})
    return findings

def main():
    report = {}
    # Compendium
    cn_dir = os.path.join(ROOT, 'compendium', 'cn')
    en_dir = os.path.join(ROOT, 'compendium', 'en')
    for fn in sorted(os.listdir(cn_dir)):
        if not fn.endswith('.json'): continue
        cn_p = os.path.join(cn_dir, fn)
        en_p = os.path.join(en_dir, fn)
        f = scan_pack(cn_p, en_p)
        if f:
            report[f'compendium/cn/{fn}'] = f
    # Lang
    lcn = os.path.join(ROOT, 'lang', 'cn.json')
    len_ = os.path.join(ROOT, 'lang', 'en.json')
    f = scan_lang(lcn, len_)
    if f:
        report['lang/cn.json'] = f

    # Write + print summary
    out_path = os.path.join(ROOT, 'release', 'untranslated-english-report.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    totals = defaultdict(int)
    total_all = 0
    for file, items in report.items():
        for it in items:
            totals[it['reason']] += 1
            total_all += 1
    print(f'Report written to: {out_path}')
    print(f'Total findings: {total_all}')
    for r, n in sorted(totals.items(), key=lambda x: -x[1]):
        print(f'  {r}: {n}')
    print()
    print('Per-file counts:')
    for file, items in sorted(report.items(), key=lambda x: -len(x[1])):
        print(f'  {file}: {len(items)}')

if __name__ == '__main__':
    main()
