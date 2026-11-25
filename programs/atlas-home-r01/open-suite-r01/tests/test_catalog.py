import json
import tempfile
from pathlib import Path
import unittest
from src.catalog_service import AtlasCatalog, CatalogError, OfflineBrokerFixture, assess_install_fixture, vpn_plan, CATALOG_PATH
class TestCatalog(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.c=AtlasCatalog()
 def test_catalog_profile_counts(self):
  self.assertEqual(len(self.c.items),44)
  self.assertEqual(len(self.c.browse(profile='preview')),17)
  self.assertTrue(all(x['slot']=='PREVIEW_ONLY' for x in self.c.browse(profile='preview')))
  self.assertTrue(all(x['install_status']=='NOT_INSTALLED' for x in self.c.items.values()))
 def test_every_source_and_provenance(self):
  for x in self.c.items.values():
   self.assertTrue(x['origin'].startswith('https://'));self.assertTrue(x['repo'].startswith('https://'))
   self.assertFalse(x['can_install']);self.assertIsNone(x['provenance']['pinned_commit'])
   self.assertIn('PENDING',x['license_status'])
 def test_project_ids_reject_bad_input(self):
  for i in ('../etc/shadow','unknown_app','<script>','',None,3):
   with self.assertRaises(CatalogError): self.c.get(i)
  with self.assertRaises(CatalogError):self.c.get('valid-no-such-app')
 def test_duplicate_metadata_cannot_promote(self):
  base=json.loads(CATALOG_PATH.read_text())
  for mutate in (lambda b:b['items'].append(dict(b['items'][0])),lambda b:b['items'][0].update(can_install=True),lambda b:b['items'][0]['provenance'].update(pinned_commit='abc')):
   clone=json.loads(json.dumps(base));mutate(clone)
   with tempfile.TemporaryDirectory() as d:
    path=Path(d)/'x.json';path.write_text(json.dumps(clone))
    with self.assertRaises(CatalogError):AtlasCatalog(path)
 def test_server_never_auto_installs_even_every_fixture_true(self):
  c=self.c.get('nextcloud')
  inputs=dict(owner_consent=True,license_and_notices=True,source_pinned=True,artifact_verified=True,platform_supported=True,sandbox_reviewed=True,server_configured=True,backup_ready=True,current_account_authorized=True)
  r=assess_install_fixture(c,**inputs)
  self.assertEqual(r['status'],'PLAN_READY_NO_EXECUTION');self.assertFalse(r['installation_performed'])
  for key in inputs:
   bad=dict(inputs);bad[key]=False
   self.assertTrue(assess_install_fixture(c,**bad)['status'].startswith('HOLD_'),key)
  self.assertEqual(assess_install_fixture(c,private_data_requested=True,**inputs)['status'],'HOLD_PRIVATE_MODE_EXCLUDED')
 def test_alpha_preview_requires_separate_opt_in(self):
  a=self.c.get('artcraft-photocraft')
  facts=dict(owner_consent=True,license_and_notices=True,source_pinned=True,artifact_verified=True,platform_supported=True,sandbox_reviewed=True,current_account_authorized=True)
  self.assertEqual(assess_install_fixture(a,**facts)['status'],'HOLD_EXPERIMENTAL_PREVIEW_CONSENT')
  self.assertEqual(assess_install_fixture(a,preview_opt_in=True,**facts)['status'],'PLAN_READY_NO_EXECUTION')
 def test_all_apps_default_hold(self):
  for app in self.c.items.values():
   self.assertEqual(assess_install_fixture(app)['status'],'HOLD_CURRENT_ACCOUNT')
 def test_vpn_no_endpoint_and_no_implicit_cost(self):
  self.assertEqual(vpn_plan(owner_opt_in=True,provider_selected=False,trusted_endpoint_pinned=False,kill_switch_reviewed=True)['status'],'HOLD_NO_VPN_ENDPOINT')
  self.assertFalse(vpn_plan(owner_opt_in=True,provider_selected=True,trusted_endpoint_pinned=True,kill_switch_reviewed=True)['traffic_tunneled'])
class TestIdentity(unittest.TestCase):
 def setUp(self):self.c=AtlasCatalog();self.b=OfflineBrokerFixture(self.c)
 def test_requires_unlock_and_no_real_auth(self):
  self.assertEqual(self.b.launch_plan('libreoffice')['reason'],'LOCAL_LOCKED')
  x=self.b.unlock_fixture('owner','home',True)
  self.assertEqual(x['status'],'LOCAL_UNLOCK_SIMULATED');self.assertFalse(x['host_auth'])
  x=self.b.launch_plan('libreoffice',principal='owner',tenant='home')
  self.assertEqual(x['status'],'LOCAL_LAUNCH_PLAN_ONLY');self.assertFalse(x['app_launched'])
 def test_no_universal_sso(self):
  self.b.unlock_fixture('u','t',True)
  self.assertEqual(self.b.launch_plan('nextcloud',principal='u',tenant='t')['reason'],'OIDC_PROVIDER_ENROLLMENT_REQUIRED')
  self.assertEqual(self.b.launch_plan('librewolf',principal='u',tenant='t')['status'],'PER_SITE_PASSKEY_PROMPT_REQUIRED')
  self.assertEqual(self.b.launch_plan('authelia',principal='u',tenant='t')['reason'],'IDENTITY_SERVER_IS_NOT_AN_APP_SESSION')
 def test_oidc_enroll_requires_real_support_and_scopes(self):
  self.b.unlock_fixture('u','t',True)
  self.assertEqual(self.b.enroll_oidc_fixture('nextcloud','https://id.test',['files'],False,'u','t')['reason'],'NO_USER_CONSENT')
  self.assertEqual(self.b.enroll_oidc_fixture('nextcloud','https://id.test',['files'],True,'u','t')['status'],'OIDC_ENROLLMENT_PLAN_ONLY')
  self.assertEqual(self.b.launch_plan('nextcloud',['files'],principal='u',tenant='t')['status'],'OIDC_HANDOFF_PLAN_ONLY')
  self.assertEqual(self.b.launch_plan('nextcloud',['admin'],principal='u',tenant='t')['reason'],'SCOPE_NOT_ENROLLED')
  self.assertEqual(self.b.launch_plan('nextcloud',['files'],principal='v',tenant='t')['reason'],'CROSS_PRINCIPAL_OR_TENANT')
 def test_lock_ends_local_plan(self):
  self.b.unlock_fixture('u','t',True)
  self.b.enroll_oidc_fixture('nextcloud','https://id.test',['files'],True,'u','t')
  self.b.lock()
  self.assertEqual(self.b.launch_plan('nextcloud',['files'],'u','t')['reason'],'LOCAL_LOCKED')
  self.assertFalse(self.b.enrollment)
 def test_malformed_identity(self):
  self.assertEqual(self.b.unlock_fixture('u','t',False)['reason'],'REAL_DEVICE_AUTH_NOT_VERIFIED')
  self.b.unlock_fixture('u','t',True)
  for issuer in ('javascript:evil()','https://bad@other','https://x?redirect=evil'):
   self.assertEqual(self.b.enroll_oidc_fixture('nextcloud',issuer,['files'],True,'u','t')['reason'],'ISSUER_NOT_PINNED')
 def test_purpose_does_not_expand_to_private_modes(self):
  self.b.unlock_fixture('u','t',True)
  self.assertEqual(self.b.enroll_oidc_fixture('immich','https://id.test',['photo'],True,'u','t')['status'],'OIDC_ENROLLMENT_PLAN_ONLY')
  self.assertEqual(self.b.launch_plan('immich',['Palace'],principal='u',tenant='t')['reason'],'SCOPE_NOT_ENROLLED')
if __name__=='__main__':unittest.main()
