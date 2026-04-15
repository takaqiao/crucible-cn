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
