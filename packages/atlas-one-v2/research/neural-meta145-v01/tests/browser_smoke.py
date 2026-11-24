"""Real offline headless Chromium smoke for neural strategy observatory."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent.parent
html=(root/'output/NEURAL_META145_STRATEGY_OBSERVATORY.html').read_text()
checks=[];requests=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for viewport in ({'width':1180,'height':780},{'width':412,'height':915}):
  page=b.new_page(viewport=viewport)
  page.on('request',lambda req:requests.append(req.url))
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load',timeout=20000)
  checks.append((page.locator('.stat').count()==4,'four summary statistics'))
  checks.append((page.locator('#count').inner_text().startswith('1728 matching'),'all 1728 present'))
  checks.append((page.locator('.item').count()==48,'bounded initial DOM'))
  page.locator('#q').fill('H01.S05.N10')
  checks.append((page.locator('.item').count()==1,'exact coordinate filter'))
  page.locator('.item').first.click()
  checks.append(('NEURAL-STRATEGY' not in page.locator('#detail').inner_text() and 'H01.S05.N10' in page.locator('#detail').inner_text(),'source address detail'))
  page.locator('#q').fill('')
  page.locator('#house').select_option('H10')
  checks.append((page.locator('#count').inner_text().startswith('144 matching'),'House has 144 strategy slots'))
  page.locator('#house').select_option('')
  page.locator('#sphere').select_option('H01.S05')
  checks.append((page.locator('#count').inner_text().startswith('12 matching'),'Sphere has 12 slots'))
  page.locator('#sphere').select_option('')
  page.locator('#next').click()
  checks.append((page.locator('.item').count()==96,'pagination extends to 96'))
  if viewport['width']>500:
   # Exhaustive 144 Sphere selection check on desktop only.
   for h in range(1,13):
    for s in range(1,13):
     sphere=f'H{h:02}.S{s:02}'
     page.locator('#sphere').select_option(sphere)
     if page.locator('.item').count()!=12:raise AssertionError('sphere mismatch '+sphere)
   checks.append((True,'all 144 Sphere filters'))
   page.locator('#sphere').select_option('')
   page.screenshot(path=str(root/'output/NEURAL_META145_DESKTOP.png'),full_page=True)
  else:
   page.screenshot(path=str(root/'output/NEURAL_META145_MOBILE.png'),full_page=True)
  page.close()
 b.close()
result={'status':'PASS' if all(ok for ok,_ in checks) and not requests and not errors else 'FAIL',
        'checksRun':len(checks),'checksPassed':sum(ok for ok,_ in checks),
        'checks':[{'ok':ok,'description':desc} for ok,desc in checks],
        'actualBrowser':'headless Chromium','externalRequests':len(requests),'pageErrors':errors,
        'originalPrivateSourceReadByBrowser':False,'hostedAuthenticated':False}
(root/'output/BROWSER_RECEIPT.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
if result['status']!='PASS':raise SystemExit(1)
