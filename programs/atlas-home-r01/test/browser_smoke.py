from pathlib import Path
import json
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
file_url=(base/'web/atlas-home.html').as_uri()
html=(base/'web/atlas-home.html').read_text().replace('<script src="home-controller.js" defer></script>','')
script=(base/'web/home-controller.js').read_text()
receipt={'schema':'atlas.home.browser.smoke.v1','source':file_url,'assertions':[],'networkRequests':[],'consoleErrors':[],'tested':False,'fileNavigation':'NOT_TESTED_FILE_URL_ADMIN_BLOCKED'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
 for name,viewport in [('desktop',{'width':1280,'height':900}),('mobile',{'width':390,'height':844})]:
  ctx=browser.new_context(viewport=viewport,device_scale_factor=1)
  page=ctx.new_page()
  page.on('request',lambda r: receipt['networkRequests'].append(r.url) if r.url.startswith(('http://','https://')) else None)
  page.on('pageerror',lambda e:receipt['consoleErrors'].append(str(e)))
  page.set_content(html,wait_until='load')
  page.add_script_tag(content=script)
  page.locator('#house-select').wait_for()
  assert 'Welcome' in page.locator('#welcome-title').inner_text();receipt['assertions'].append(name+': welcome rendered')
  assert page.locator('#work-grid .door').count()==12;receipt['assertions'].append(name+': 12 existing Work ports')
  assert page.locator('#sphere-grid button').count()==144;receipt['assertions'].append(name+': 144 sphere coordinates')
  assert page.locator('#spheres button').count()==12 and page.locator('#nodes button').count()==12;receipt['assertions'].append(name+': 12+12 controls')
  page.locator('#house-select').select_option('7')
  page.locator('#spheres button').nth(8).click()
  page.locator('#nodes button').nth(11).click()
  assert page.locator('#selected-address').inner_text()=='H07.S09.N12';receipt['assertions'].append(name+': canonical coordinate navigation')
  assert 'EPISTEMIC METHOD' in page.locator('#kind').inner_text();receipt['assertions'].append(name+': source-based METHOD role')
  page.locator('#private-buttons button').filter(has_text='The Nook').click()
  assert 'cannot open, export or read' in page.locator('#private-view').inner_text();receipt['assertions'].append(name+': private door not read')
  page.locator('#work-grid .door').first.click()
  assert 'existing host not connected' in page.locator('#toast').inner_text();receipt['assertions'].append(name+': Work host unbound status')
  page.locator('#leave').click()
  assert page.locator('#selected-address').inner_text()=='H01.S01.N01';receipt['assertions'].append(name+': leave clears visit')
  page.screenshot(path=str(base/'evidence'/f'home-{name}.png'),full_page=True)
  ctx.close()
 browser.close()
assert not receipt['networkRequests'],receipt['networkRequests']
assert not receipt['consoleErrors'],receipt['consoleErrors']
receipt['tested']=True
(base/'evidence'/'browser-receipt.json').write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k not in ('source',)},indent=2))
