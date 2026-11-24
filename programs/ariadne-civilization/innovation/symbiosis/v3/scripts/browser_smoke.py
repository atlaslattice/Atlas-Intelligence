#!/usr/bin/env python3
"""Offline browser acceptance for purely fictional Lantern Ferry (no external calls)."""
import json,pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL=(ROOT/'play/lantern_ferry_of_eons.html').resolve().as_uri()
results=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,viewport in [('desktop',{'width':1280,'height':720}),('mobile',{'width':390,'height':844})]:
  page=browser.new_page(viewport=viewport)
  failed=[];requests=[];page.on('pageerror',lambda e:failed.append(str(e)))
  page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http://','https://')) else None)
  page.set_content((ROOT/'play/lantern_ferry_of_eons.html').read_text(),wait_until='domcontentloaded')
  def check(title,passed):
   results.append({'viewport':name,'check':title,'pass':bool(passed)})
  check('title correct','Lantern Ferry of Eons' in page.title())
  check('12 original-numbered Houses selectable',page.locator('#house option').count()==12)
  check('20 playable lenses',page.locator('#lens option').count()==20)
  check('fictional year upper bound',page.locator('#year').get_attribute('max')=='1728')
  check('fictional year lower bound',page.locator('#year').get_attribute('min')=='1')
  check('starts at year 1',page.locator('#yearText').inner_text()=='1')
  page.locator('#house').select_option('12');page.locator('#lens').select_option('19');page.locator('#year').evaluate("el => {el.value='1728';el.dispatchEvent(new Event('input',{bubbles:true}));}")
  check('year 1728 rendered',page.locator('#yearText').inner_text()=='1728')
  check('House 12 renders', 'House 12' in page.locator('#story').inner_text())
  check('user-selected lens renders','Unknown Dividend' in page.locator('#doorTitle').inner_text())
  page.get_by_role('button',name='Sail to another invented shore').click()
  check('ferry generates next year',page.locator('#yearText').inner_text()!='1728')
  check('no network request',len(requests)==0)
  check('no browser exceptions',len(failed)==0)
  check('no horizontal viewport overflow',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
  if name=='desktop':page.screenshot(path=str(ROOT/'play/lantern_ferry_preview.png'))
  page.close()
 browser.close()
report={'schema':'atlas.ariadne.play.browser-smoke/v1','checks':len(results),'passed':sum(x['pass'] for x in results),'failed':[x for x in results if not x['pass']],'offlineOnly':True,'results':results}
(ROOT/'reports/play_browser_smoke.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['checks','passed','failed','offlineOnly']},indent=2))
if report['failed']:raise SystemExit(1)
