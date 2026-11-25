from playwright.sync_api import sync_playwright
from pathlib import Path
r=Path(__file__).resolve().parents[1]
page_html=(r/'web/ATLAS_OS_OPEN_SOURCE_GARDEN.html').read_text()
checks=0
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for width,height in [(1366,850),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height})
  errs=[];reqs=[]
  page.on('pageerror',lambda e:errs.append(str(e)))
  page.on('request',lambda req:reqs.append(req.url))
  page.set_content(page_html,wait_until='load');checks+=1
  assert page.locator('#statTotal').inner_text().startswith('37 upstream');checks+=1
  assert page.locator('#statPinned').inner_text().startswith('36 source');checks+=1
  assert page.locator('#appList button').count()==37;checks+=1
  assert page.locator('#dialog').get_attribute('class')=='dialog';checks+=1
  page.get_by_role('button',name='Experimental ArtCraft').click();checks+=1
  assert page.locator('#appList button').count()==18;checks+=1
  page.get_by_role('button',name='Inspect WordCraft').click();checks+=1
  assert 'EARLY-STAGE' in page.locator('#readiness').inner_text();checks+=1
  page.get_by_role('button',name='Preview install plan').click();checks+=1
  assert 'not executed' in page.locator('#dialog').inner_text();checks+=1
  page.get_by_role('button',name='Everything').click();checks+=1
  page.locator('#search').fill('VPN');checks+=1
  assert page.locator('#appList button').count()==2;checks+=1
  page.get_by_role('button',name='Inspect Mullvad VPN App').click();checks+=1
  page.get_by_role('button',name='Privacy controls').click();checks+=1
  assert 'always opt-in' in page.locator('#dialog').inner_text();checks+=1
  page.locator('#search').fill('');checks+=1
  page.get_by_role('button',name='Inspect Nextcloud Desktop').click();checks+=1
  page.get_by_role('button',name='Identity boundary').click();checks+=1
  assert 'cannot silently log in' in page.locator('#dialog').inner_text();checks+=1
  page.get_by_role('button',name='Inspect LibreOffice').click();checks+=1
  page.get_by_role('button',name='Identity boundary').click();checks+=1
  assert 'without an external service login' in page.locator('#dialog').inner_text();checks+=1
  page.get_by_role('button',name='Inspect Firefox (official build)').click();checks+=1
  assert 'Not pinned' in page.locator('#commit').inner_text();checks+=1
  page.locator('#search').fill('NO_SUCH_APP');checks+=1
  assert '0 of 37' in page.locator('#resultStatus').inner_text();checks+=1
  assert page.locator('#appList button').count()==0;checks+=1
  assert not errs, errs;checks+=1
  assert not reqs, reqs;checks+=1
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),width;checks+=1
  page.close()
 browser.close()
print('ATLAS_OPEN_SOURCE_GARDEN_BROWSER_PASS checks='+str(checks)+' desktop/mobile requests=0 errors=0')
