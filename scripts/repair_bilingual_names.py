"""⚠ 只读报告工具，**不写盘**。原本它是直接改 `compendium/cn` 的，已改掉，原因如下。

它做的事：遍历 CN 包里每一个带 `name` 的节点，跟 EN 侧同路径对照，
按「双语并列 `中文 英文`」的形状判断这个名字坏没坏，并给出一个重建建议。

为什么不再让它写盘（空跑实测，只读）
------------------------------------
判据 (`is_broken`) 与重建 (`rebuild`) 都是**纯形状**的 —— 只看当前字符串里有没有
拉丁字母、有没有空格、结不结尾于英文名，完全不看这个名字**是什么**。结果：

* 本仓 3 条建议里 1 条丢字：
  `试玩测试 1 - 英勇之戒 Playtest 1 - The Ring of Valor`
  -> `试玩测试 Playtest 1 - The Ring of Valor`（中文侧「1 - 英勇之戒」整段没了）。
* 把同一判据指向 ember_cn：**649 条建议里 403 条重建后比原来短**，即丢字。
  典型 `补丁 0.4.7 Patch 0.4.7` -> `补丁 Patch 0.4.7`（版本号被吃掉，同型 20 余条）；
  另有 6 条把英文名拼了第二遍，如 `V'玛尔 V'Mar` -> `V'玛尔 V'Mar V'Mar`
  （中文名以拉丁字母 V 开头，`first_cjk_chunk` 第一个字符就停）。
* 把 `rebuild` 换成「保留整段中文头」之后，剩下的 34 条建议**依然全错**：
  它们只是「中文没有以英文名结尾」，如 `1. 洞悉加值 Insight Bonus` 对英文
  `1. Insight Bonus`，建议是把整串英文再拼一遍。
  也就是说 **652 条建议（本仓 3 + ember 侧 649）里真阳性为 0**。

所以它现在只报不改。真要落地的改动一律走
`3-常用脚本/qa/apply_translations.py`（英文源漂移 / 无中文 / 标记破损三道闸），
这也是 PROJECT.md 的硬规矩：**任何情况下都不要直接改 `compendium/cn`**。
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
                # 只记录不改写：本脚本是只读报告，见文件头。
                fixed.append((cn['name'], rebuild(cn['name'], en['name'])))
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
            print(f'== {fn}: {len(fixed)} suspicious')
            for o, n in fixed[:20]:
                flag = '   <== 建议值比原值短，会丢字' if len(n) < len(o) else ''
                print(f'  {o!r}\n    建议 {n!r}{flag}')
            if len(fixed) > 20:
                print(f'  ... +{len(fixed)-20}')
            total += len(fixed)
    print(f'\nTotal: {total} suspicious name(s).')
    print('本脚本不写盘。判据是纯形状的，误报率极高（见文件头的实测数据）——')
    print('逐条人看之后，要落地的走 3-常用脚本/qa/apply_translations.py。')

if __name__ == '__main__':
    main()
