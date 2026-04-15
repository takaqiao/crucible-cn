"""Batch-translate single English words leaked into CJK strings."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CJK = re.compile(r'[\u4e00-\u9fff]')

# whole-word replacements applied only to string values containing CJK
TRANS = {
    'Tier': '等级',
    'TODO': '待办',
    'WIP': '待完成',
    'feet': '英尺',
    'Feet': '英尺',
    'Hand': '只手',
    'Number': '数量',
    'Capacity': '负载',
    'Configure': '配置',
    'Group': '群组',
    'Open': '打开',
    'Standard': '标准',
    'Critical': '致命',
    'Dominated': '支配',
    'Bomb': '炸弹',
    'Glyphs': '符印',
    'Toss': '投掷',
    'Push': '推开',
    'Shoddy': '劣质',
    'occupants': '名居住者',
    'horns': '角',
    'Displace': '位移',
    'grotesque': '狰狞',
    'practitioners': '施法者',
    'Bandit': '强盗',
    'conjured': '召唤而出',
    'compendium': '合集包',
    'Compendium': '合集包',
    'ActiveEffect': '主动效果',
    'slug': '标识符',
    'Ward': '守护',
    'Blossom': '绽放',
    'Token': '令牌',
    'Fine': '精良',
    'Horrific': '骇人',
    'Wrestler': '摔角手',
    'Hellguard': '地狱守卫',
    'Inflection': '屈折',
    'Inflections': '屈折',
    'Gesture': '手势',
    'pack': '包',
    'Superior': '卓越',
    'Glyphweaver': '符印编织师',
    # 'this creature' handled separately
}

# Allowlist (proper nouns / brand) — never replace
ALLOW = {
    'Crucible', 'Foundry', 'Virtual', 'Tabletop', 'Discord', 'Patreon',
    'RPG', 'TRPG', 'VTT', 'GM', 'PC', 'NPC', 'Boss',
    'Krag', 'Alex', 'Jex', 'Zenith', 'Fizzit', 'Duurath', 'Baizas',
    'Strength', 'Dexterity', 'Toughness', 'Intellect', 'Presence', 'Wisdom',
}

def fix_string(s):
    if not isinstance(s, str) or not CJK.search(s):
        return s
    # Don't touch text inside HTML attributes (class="...", style="...")
    # We use a callback that skips matches inside tag attributes.
    # Simple approach: temporarily mask <...> tags, replace, then unmask.
    masks = []
    def mask(m):
        masks.append(m.group(0))
        return f'\x00{len(masks)-1}\x00'
    masked = re.sub(r'<[^>]+>', mask, s)
    # also mask @UUID[...]{...} and [[...]]
    masked = re.sub(r'@[A-Za-z]+\[[^\]]+\](?:\{[^}]*\})?', mask, masked)
    masked = re.sub(r'\[\[[^\]]*\]\]', mask, masked)
    # mask Compendium.X paths
    masked = re.sub(r'Compendium\.[\w\-.]+', mask, masked)
    # mask URLs
    masked = re.sub(r'https?://\S+', mask, masked)

    masked = masked.replace('this creature', '此生物')

    for en, cn in TRANS.items():
        # Use lookbehind/lookahead for Latin letters; \b doesn't work on CJK
        # adjacencies because CJK chars are also \w in Python's Unicode regex.
        masked = re.sub(r'(?<![A-Za-z])' + re.escape(en) + r'(?![A-Za-z])', cn, masked)

    # unmask
    def unmask(m):
        return masks[int(m.group(1))]
    return re.sub(r'\x00(\d+)\x00', unmask, masked)

SKIP_KEYS = {'name', 'label', 'title', 'mapping'}

def fix_obj(o, key=None):
    if isinstance(o, dict):
        return {k: fix_obj(v, k) for k, v in o.items()}
    if isinstance(o, list):
        return [fix_obj(v, key) for v in o]
    if isinstance(o, str):
        if key in SKIP_KEYS:
            return o
        return fix_string(o)
    return o

def main():
    files = []
    cn_dir = os.path.join(ROOT, 'compendium', 'cn')
    for fn in sorted(os.listdir(cn_dir)):
        if fn.endswith('.json'):
            files.append(os.path.join(cn_dir, fn))
    files.append(os.path.join(ROOT, 'lang', 'cn.json'))

    for p in files:
        with open(p, encoding='utf-8') as f: data = json.load(f)
        before = json.dumps(data, ensure_ascii=False)
        fixed = fix_obj(data)
        after = json.dumps(fixed, ensure_ascii=False)
        if before != after:
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(fixed, f, ensure_ascii=False, indent=2)
            print(f'changed: {os.path.relpath(p, ROOT)}')

if __name__ == '__main__':
    main()
