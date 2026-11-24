#!/usr/bin/env python3
import json,pathlib,os
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML_PATH=pathlib.Path(os.environ.get('ATLAS_ROADMAP_BROWSER_HTML',str(ROOT/'private/ATLAS_1728_ROADMAP_EXPLORER.html')))
HTML=HTML_PATH.read_text(encoding='utf-8')
checks=[];console=[];req=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(1280,920),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},java_script_enabled=True)
  page.on('pageerror',lambda e:console.append(str(e)))
  page.on('request',lambda r:req.append(r.url))
  page.set_content(HTML,wait_until='load',timeout=30000)
  def check(label,x):
   checks.append({'name':f'{width}px:{label}','ok':bool(x)})
   if not x:raise AssertionError(checks[-1])
  check('first-card',page.locator('.item').count()==48)
  check('all-nodes-count', '1,728 of 1,728' in page.locator('#resultCount').inner_text())
  check('original-first-node', 'H01.S01.N01' in page.locator('#detail').inner_text())
  page.locator('#search').fill('H01.S05.N10')
  check('exact-coordinate-count',page.locator('.item').count()==1)
  check('correct-physics-node','Plasma confinement' in page.locator('#detail').inner_text())
  page.locator('#search').fill('')
  page.select_option('#role','EPISTEMIC_META')
  check('all-720-meta','720 of 1,728' in page.locator('#resultCount').inner_text())
  page.select_option('#role','')
  page.select_option('#house','H12')
  check('house-144','144 of 1,728' in page.locator('#resultCount').inner_text())
  page.locator('#next').click()
  check('pagination','49–96 / 144' in page.locator('#pageInfo').inner_text())
  check('no-browser-errors',len(console)==0)
  page.close()
 browser.close()
if req:raise AssertionError({'network':req})
print(json.dumps({'checks':len(checks),'passed':sum(x['ok'] for x in checks),'pageErrors':console,'networkRequests':req,'allPassed':all(x['ok'] for x in checks)},indent=2))
RECEIPT=pathlib.Path(os.environ.get('ATLAS_ROADMAP_BROWSER_RECEIPT',str(ROOT/'outputs/BROWSER_SMOKE.json')))
RECEIPT.parent.mkdir(parents=True,exist_ok=True)
RECEIPT.write_text(json.dumps({'checks':checks,'pageErrors':console,'networkRequests':req,'allPassed':all(x['ok'] for x in checks)},indent=2)+'\n')
