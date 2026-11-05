"""Snapshot the ten emblems currently referenced by the official KBO homepage."""
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
import json

mapping={'lg':('2022','LG'),'doosan':('2025','OB'),'kt':('2022','KT'),'ssg':('2024','SK'),'nc':('2022','NC'),'kia':('2022','HT'),'lotte':('2022','LT'),'samsung':('2022','SS'),'hanwha':('2025','HH'),'kiwoom':('2022','WO')}
root=Path('public/teams');root.mkdir(exist_ok=True)
def fetch(entry):
    team,(year,code)=entry
    url=f'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/KBOHome/resources/images/emblem/regular/{year}/{code}.png'
    data=urlopen(url,timeout=25).read()
    if not data.startswith(b'\x89PNG'):raise ValueError(f'{team}: not a PNG')
    (root/f'{team}.png').write_bytes(data)
    return {'team':team,'url':url,'bytes':len(data)}
with ThreadPoolExecutor(max_workers=5) as pool: results=list(pool.map(fetch,mapping.items()))
(root/'sources.json').write_text(json.dumps({'source':'https://www.koreabaseball.com/','retrieved':'2026-11-05','rights':'Club emblems belong to their respective owners. No license grant is implied.','images':results},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Validated {len(results)} PNG emblems')
