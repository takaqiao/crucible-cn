"""⛔ 已废弃 —— 发布只走 .github/workflows/release.yml。

这条旧路径与真正的发布产物已经完全对不上，跑它只会产出装不上的包：
  * 输出名 `release/crucible-cn-<ver>.zip`，而 module.json 的 download 指向 `module.zip`；
  * 每个成员多一层 `crucible-cn/` 前缀，Foundry 解出来的目录结构是错的；
  * 只收 `*.json`，于是 `lang/en.json` 与 `lang/lang_keep_english.json` 会被打进去
    （workflow 明确排除这两个），而 module.json 声明的 `styles/crucible-cn.css`
    与 `babele-mappings.js` 反而收不进来。
留着文件是为了让搜到它的人看见这段说明，而不是让它还能跑。
"""
raise SystemExit(
    'build_zip.py 已废弃：发布走 .github/workflows/release.yml（推 tag 触发）。'
    '本脚本产出的包文件名/目录层级/内容清单都与 module.json 不符。')

import zipfile, os, sys, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = json.load(open(os.path.join(ROOT,'module.json'),encoding='utf-8'))['version']
out = os.path.join(ROOT,'release',f'crucible-cn-{ver}.zip')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for base in ['module.json','babele-register.js']:
        z.write(os.path.join(ROOT,base), f'crucible-cn/{base}')
    for sub in ['lang','compendium/cn']:
        for dp,_,fs in os.walk(os.path.join(ROOT,sub)):
            for fn in fs:
                if fn.endswith('.json'):
                    full = os.path.join(dp,fn)
                    rel = os.path.relpath(full,ROOT).replace(os.sep,'/')
                    z.write(full, f'crucible-cn/{rel}')
print('built',out,os.path.getsize(out))
