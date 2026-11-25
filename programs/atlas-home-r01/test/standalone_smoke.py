from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'web/atlas-home-standalone.html').read_text()
assert '<script src=' not in html
err=[];external=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1024,'height':768})
 page=ctx.new_page();page.on('pageerror',lambda x:err.append(str(x)));page.on('request',lambda x:external.append(x.url) if x.url.startswith(('http://','https://')) else None)
 page.set_content(html)
 assert page.locator('#work-grid .door').count()==12
 assert page.locator('#sphere-grid button').count()==144
 page.locator('#house-select').select_option('12')
 page.locator('#spheres button').nth(11).click();page.locator('#nodes button').nth(11).click()
 assert page.locator('#selected-address').inner_text()=='H12.S12.N12'
 assert not external and not err,(external,err)
 ctx.close();b.close()
out={'schema':'atlas.home.standalone-browser.v1','status':'PASS','source':'HTML_INJECTED_IN_BROWSER_NOT_FILE_URL','testCases':4,'externalNetworkRequests':len(external),'scriptErrors':len(err),'fileUrlNavigation':'ADMIN_BLOCKED'}
(root/'evidence'/'standalone-smoke.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
