"""Fetch team emblems from the KBSA's public 2026 team directory.

No player photographs are downloaded. Missing emblems use an in-app name badge.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen
import json
import re

BASE='https://www.korea-baseball.com'
ROOT=Path('public/schools')
ROOT.mkdir(exist_ok=True)

def get(url):
    with urlopen(Request(url,headers={'User-Agent':'DiamondRoad-school-emblem-catalog/1.0'}),timeout=25) as response:
        return response.read()

class Teams(HTMLParser):
    def __init__(self):
        super().__init__();self.active=False;self.dd=False;self.parts=[];self.fields=[];self.href='';self.rows=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='dl' and attrs.get('class')=='items':self.active=True;self.fields=[];self.href=''
        if self.active and tag=='dd':self.dd=True;self.parts=[]
        if self.active and tag=='a' and 'team_player?club_idx=' in attrs.get('href',''):self.href=attrs['href']
    def handle_data(self,text):
        if self.active and self.dd:self.parts.append(text)
    def handle_endtag(self,tag):
        if self.active and tag=='dd':self.fields.append(''.join(self.parts).strip());self.dd=False
        if self.active and tag=='dl':
            self.active=False
            if self.href and len(self.fields)>=5:self.rows.append((self.href,self.fields))

def university_directory():
    first=get(f'{BASE}/info/team/team_list?kind_cd=41&season=2026&sido_cd=00').decode('utf-8')
    pages=max([1]+[int(p) for p in re.findall(r'team_list\?page=(\d+)&kind_cd=41',first)])
    rows=[]
    for page in range(1,pages+1):
        html=first if page==1 else get(f'{BASE}/info/team/team_list?page={page}&kind_cd=41&season=2026&sido_cd=00').decode('utf-8')
        parser=Teams();parser.feed(html)
        for href,fields in parser.rows:
            club=re.search(r'club_idx=(\d+)',href).group(1)
            rows.append({'id':f'university-{club}','name':fields[2],'region':fields[4],'type':'UNIVERSITY','detail':urljoin(f'{BASE}/info/team/',href)})
    rows=list({row['id']:row for row in rows}.values())
    if not rows:raise RuntimeError('No university teams found; refusing to replace catalog')
    Path('src/data/universities.json').write_text(json.dumps({'source':f'{BASE}/info/team/team_list?kind_cd=41&season=2026','season':2026,'checkedAt':str(date.today()),'teams':[{k:v for k,v in row.items() if k!='detail'} for row in rows]},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return rows

schools=json.loads(Path('src/data/schools.json').read_text(encoding='utf-8'))['teams']
rows=[{**school,'detail':f"{BASE}/info/team/team_player?club_idx={school['id'].split('-')[1]}&season=2026&kind_cd=31&sports_club=F"} for school in schools]+university_directory()

def fetch(row):
    try:
        html=get(row['detail']).decode('utf-8')
        match=re.search(r'<div[^>]*class=["\'][^"\']*\bemblem\b[^"\']*["\'][^>]*>\s*<img[^>]*src=["\']([^"\']+)',html,re.I)
        if not match:return {**row,'status':'missing'}
        url=urljoin(BASE,unescape(match.group(1)))
        if '/symbol/' not in url and '/filesymbol/' not in url:return {**row,'status':'placeholder','imageSource':url}
        blob=get(url)
        digest=sha256(blob).hexdigest()
        if digest=='a4b7f960a6bc349cbb91e86737ca5f15671e63581a3cd5e5702eca46cd9e061d':
            (ROOT/f"{row['id']}.jpg").unlink(missing_ok=True)
            return {**row,'status':'placeholder','imageSource':url}
        ext='png' if blob.startswith(b'\x89PNG') else 'jpg' if blob.startswith(b'\xff\xd8') else 'gif' if blob.startswith(b'GIF8') else 'bmp' if blob.startswith(b'BM') else None
        if not ext:raise ValueError('Unknown image format')
        filename=f"{row['id']}.{ext}";(ROOT/filename).write_bytes(blob)
        return {**row,'status':'downloaded','imageSource':url,'file':filename,'sha256':digest,'bytes':len(blob)}
    except Exception as error:return {**row,'status':'error','error':str(error)}

with ThreadPoolExecutor(max_workers=5) as pool:results=list(pool.map(fetch,rows))
manifest={'source':f'{BASE}/info/team/team_list','retrieved':str(date.today()),'rights':'Team emblems belong to their respective owners. Source access does not imply a license grant.','teams':results}
(ROOT/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
marks={row['id']:{'file':row['file'],'name':row['name']} for row in results if row['status']=='downloaded'}
Path('src/data/school-marks.json').write_text(json.dumps(marks,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'total':len(rows),'universities':len(rows)-len(schools),'downloaded':len(marks),'missing':len(rows)-len(marks),'errors':[r['name'] for r in results if r['status']=='error']},ensure_ascii=True))
