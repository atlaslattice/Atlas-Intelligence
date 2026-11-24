"""Offline Chromium checks; no hosted UI or backend attestations."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
out=Path(sys.argv[1]);html=(out/'atlas_one_civilization_observatory.html').resolve();reports={}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-background-networking','--disable-extensions','--disable-features=NetworkService'])
 for label,viewport in [('desktop',{'width':1440,'height':1000}),('mobile',{'width':412,'height':915})]:
  page=browser.new_page(viewport=viewport,device_scale_factor=1)
  errors=[];external=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.on('request',lambda req:external.append(req.url) if not req.url.startswith(('file:','data:')) else None)
  page.set_content(html.read_text('utf8'),wait_until='domcontentloaded');page.wait_for_function('Boolean(window.__atlasVizQA)',timeout=30000)
  summary=page.evaluate('window.__atlasVizQA.getSummary()');assert summary['houses']==12 and summary['spheres']==144 and summary['nodes']==1728,summary
  checks=0
  for h in range(1,13):
   page.locator('#houses button').nth(h-1).click();checks+=1
   assert page.locator('#spheres button').count()==12
   assert page.locator('#results').locator('button').count()==12
   for s in range(1,13):
    page.locator('#spheres button').nth(s-1).click();checks+=1
    assert page.evaluate('window.__atlasVizQA.state.sphere')==f'H{h:02d}.S{s:02d}'
    assert page.locator('#results').locator('button').count()==12
  page.locator('#withinSphere').uncheck();page.locator('#search').fill('');assert page.locator('#results').locator('button').count()==48
  assert '1728' in page.locator('#resultsCount').inner_text().replace(',','')
  page.locator('#next').click();assert page.evaluate('window.__atlasVizQA.state.page')==1;checks+=1
  page.locator('#search').fill('H08.S01.N10')
  # Coordinate search narrows the source list by prefix, not semantic same-as.
  assert page.locator('#results').locator('button').count()==1
  page.locator('#results').locator('button').first.click();assert page.locator('#nodeName').inner_text()=='Instrument design'
  assert page.locator('#glyphQ').inner_text()=='KG8Q:07533cf7a6b6:tiri.sala.turu'
  assert page.locator('#gf7').inner_text()=='GF7.B08.M01.C10';checks+=4
  packet=page.evaluate('window.__atlasVizQA.getSummary().preview')
  assert packet['status']=='PREPARED_NOT_POSTED' and packet['workPosted']==False and packet['rightsVerified']==False;checks+=1
  page.locator('#storyTab').click();assert page.evaluate('window.__atlasVizQA.getSummary().preview.status')=='HOLD'
  page.locator('#optin').check();assert page.evaluate('window.__atlasVizQA.getSummary().preview.status')=='FICTIONAL_PROMPT_NOT_CANON';checks+=2
  assert not errors and not external,(errors,external)
  page.screenshot(path=str(out/f'qa_{label}.png'),full_page=True)
  reports[label]={'viewport':viewport,'checks':checks,'jsErrors':errors,'externalRequests':external,'sourceCounts':summary,
                  'previewIsWorkOnly':packet['status']=='PREPARED_NOT_POSTED'}
  page.close()
 browser.close()
(out/'browser_qa.json').write_text(json.dumps({'status':'PASS_LOCAL_CHROMIUM_ONLY','platforms':reports,'siteDeployed':False},indent=2)+'\n')
print(json.dumps({'result':'PASS','checks':{k:v['checks'] for k,v in reports.items()}},indent=2))
