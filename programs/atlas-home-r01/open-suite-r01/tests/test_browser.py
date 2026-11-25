import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class BrowserSmoke(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start()
  cls.browser=cls.p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls): cls.browser.close();cls.p.stop()
 def check_view(self,viewport):
  context=self.browser.new_context(viewport=viewport,reduced_motion='reduce')
  page=context.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:requests.append(r.url))
  page.set_content((ROOT/'web/atlas-open-suite.html').read_text(encoding='utf-8'),wait_until='load')
  self.assertEqual(page.locator('#count').inner_text(),'44')
  self.assertEqual(page.locator('.card').count(),44)
  self.assertIn('0\napps installed', page.locator('.metrics').inner_text())
  page.locator('#search').fill('video')
  self.assertGreater(page.locator('.card').count(),0)
  page.locator('#search').fill('this will never match')
  self.assertIn('No matching tools',page.locator('#grid').inner_text())
  page.locator('#reset').click()
  page.locator('#tier').select_option('PREVIEW_ONLY')
  self.assertEqual(page.locator('.card').count(),17)
  page.locator('#tier').select_option('')
  page.locator('#search').fill('LibreOffice')
  self.assertEqual(page.locator('.card').count(),1)
  page.locator('.card button').first.click()
  self.assertIn('1 item proposed',page.locator('#planStatus').inner_text())
  page.locator('.card button').nth(1).click()
  self.assertIn('LibreOffice',page.locator('#provenance').inner_text())
  self.assertIn('Source code',page.locator('#provenance').inner_text())
  page.locator('#showVpn').click()
  self.assertIn('not a free VPN provider',page.locator('#securityStatus').inner_text())
  page.locator('#showAuth').click()
  self.assertIn('No biometrics',page.locator('#securityStatus').inner_text())
  page.locator('#clearPlan').click()
  self.assertIn('Nothing is installed',page.locator('#planStatus').inner_text())
  self.assertFalse(errors,'Browser page exceptions: '+str(errors))
  self.assertFalse(requests,'Unexpected automatic network requests: '+str(requests))
  self.assertFalse(page.evaluate('document.documentElement.scrollWidth>innerWidth'))
  context.close()
 def test_desktop(self):self.check_view({'width':1280,'height':800})
 def test_mobile(self):self.check_view({'width':390,'height':844})
if __name__=='__main__':unittest.main()
