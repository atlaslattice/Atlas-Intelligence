"""Atlas Open Suite v1: bounded SOURCE-ONLY catalog and simulated identity/installer plan.

Never downloads, executes, authenticates to a real provider, modifies a system,
or stores passwords/tokens. Real IAM, TPM, signatures and current host rights are HOLD.
"""
import json
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

ARIADNE_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
CATALOG_PATH = Path(__file__).resolve().parents[1] / 'data' / 'catalog.json'
ID_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')

class CatalogError(ValueError):
    pass

class AtlasCatalog:
    def __init__(self, filename=CATALOG_PATH):
        raw=json.loads(Path(filename).read_text(encoding='utf-8'))
        if raw.get('schema')!='atlas.os.open-suite.catalog/v1' or raw.get('canonical_ariadne_sha256')!=ARIADNE_SHA:
            raise CatalogError('SOURCE_EDITION_HOLD')
        self.items={}
        for a in raw['items']:
            id_=a.get('id','')
            if not isinstance(id_,str) or not ID_RE.fullmatch(id_) or id_ in self.items:
                raise CatalogError('DUPLICATE_OR_INVALID_APP_ID')
            if a.get('slot') not in {'CORE_CANDIDATE','OPTIONAL_CANDIDATE','PREVIEW_ONLY','INFRASTRUCTURE'}:
                raise CatalogError('UNKNOWN_MATURITY_GATE')
            if a.get('install_status') != 'NOT_INSTALLED' or a.get('can_install') is not False or a.get('can_authenticate') is not False:
                raise CatalogError('PREMATURE_PROMOTION')
            if a['provenance'].get('source_verified_for_live_install') is not False or a['provenance'].get('pinned_commit') is not None:
                raise CatalogError('UNSUPPORTED_SOURCE_PROOF')
            if not a.get('repo','').startswith('https://') or not a.get('origin','').startswith('https://'):
                raise CatalogError('NONHTTPS_SOURCE')
            self.items[id_] = a
    def get(self, app_id):
        if not isinstance(app_id,str) or not ID_RE.fullmatch(app_id):
            raise CatalogError('INVALID_APP_ID')
        if app_id not in self.items:
            raise CatalogError('UNKNOWN_APP')
        return self.items[app_id]
    def browse(self, category=None, profile=None):
        return tuple(x for x in self.items.values() if (category is None or x['category']==category) and (profile is None or x['profile']==profile))

@dataclass
class Enrollment:
    app_id: str
    protocol: str
    issuer: str
    principal: str
    tenant: str
    scope: tuple[str,...]
    epoch: int

@dataclass
class OfflineBrokerFixture:
    """Describes expected decisions, NOT an authenticated OS account or real SSO."""
    catalog: AtlasCatalog
    epoch: int = 1
    current_principal: Optional[str] = None
    current_tenant: Optional[str] = None
    unlocked: bool = False
    enrollment: dict[str, Enrollment] = field(default_factory=dict)

    def unlock_fixture(self, principal, tenant, locally_asserted_user_presence):
        if not locally_asserted_user_presence or not isinstance(principal,str) or not principal or not isinstance(tenant,str) or not tenant:
            return self.hold('REAL_DEVICE_AUTH_NOT_VERIFIED')
        self.epoch += 1
        self.current_principal=principal; self.current_tenant=tenant
        self.unlocked=True; self.enrollment.clear()
        return {'status':'LOCAL_UNLOCK_SIMULATED','epoch':self.epoch,'host_auth':False,'biometric_proof':False,'tokens_created':0}

    def lock(self):
        self.epoch += 1
        self.unlocked=False; self.enrollment.clear()
        self.current_principal=None; self.current_tenant=None
        return {'status':'LOCAL_CREDENTIAL_CONTEXT_CLEARED','epoch':self.epoch,'tokens_revoked_on_host':False}

    @staticmethod
    def hold(reason):
        return {'status':'HOLD','reason':reason,'host_auth':False,'authenticated_external_service':False,'credentials_exported':False,'authority_effect':'NONE'}

    def enroll_oidc_fixture(self, app_id, issuer, scope, opt_in, principal=None, tenant=None):
        try: app=self.catalog.get(app_id)
        except CatalogError: return self.hold('UNKNOWN_APP')
        if not self.unlocked:return self.hold('LOCAL_LOCKED')
        if app['auth']!='oidc_candidate':return self.hold('OIDC_SUPPORT_NOT_DECLARED')
        if not opt_in:return self.hold('NO_USER_CONSENT')
        if not isinstance(issuer,str) or not issuer.startswith('https://') or '@' in issuer or '?' in issuer or '#' in issuer:return self.hold('ISSUER_NOT_PINNED')
        if principal!=self.current_principal or tenant!=self.current_tenant:return self.hold('CROSS_PRINCIPAL_OR_TENANT')
        if not isinstance(scope, (tuple,list)) or not scope or not all(isinstance(x,str) and re.fullmatch('[a-z_]{1,32}',x) for x in scope):return self.hold('UNTRUSTED_SCOPE')
        self.enrollment[app_id]=Enrollment(app_id,'OIDC_PENDING_PROVIDER',issuer,principal,tenant,tuple(scope),self.epoch)
        return {'status':'OIDC_ENROLLMENT_PLAN_ONLY','provider_verified':False,'user_authorized':True,'tokens_created':0}

    def launch_plan(self, app_id, requested_scope=(), principal=None, tenant=None):
        try: app=self.catalog.get(app_id)
        except CatalogError: return self.hold('UNKNOWN_APP')
        if not self.unlocked:return self.hold('LOCAL_LOCKED')
        if principal!=self.current_principal or tenant!=self.current_tenant:return self.hold('CROSS_PRINCIPAL_OR_TENANT')
        if not isinstance(requested_scope,(list,tuple)) or any(not isinstance(x,str) for x in requested_scope):return self.hold('INVALID_SCOPE')
        if app['auth']=='local':
            return {'status':'LOCAL_LAUNCH_PLAN_ONLY','app':app_id,'requires_external_login':False,'app_launched':False,'host_auth':False}
        if app['auth']=='oidc_candidate':
            en=self.enrollment.get(app_id)
            if not en or en.epoch!=self.epoch:return self.hold('OIDC_PROVIDER_ENROLLMENT_REQUIRED')
            if not set(requested_scope).issubset(en.scope):return self.hold('SCOPE_NOT_ENROLLED')
            return {'status':'OIDC_HANDOFF_PLAN_ONLY','app':app_id,'issuer_claim':en.issuer,'authenticated_external_service':False,'tokens_created':0}
        if app['auth']=='passkey_per_site':
            return {'status':'PER_SITE_PASSKEY_PROMPT_REQUIRED','app':app_id,'auth_bypass':False,'external_login_complete':False}
        if app['auth']=='oidc_provider':return self.hold('IDENTITY_SERVER_IS_NOT_AN_APP_SESSION')
        return self.hold('PROVIDER_AUTH_FLOW_NOT_INTEGRATED')

def assess_install_fixture(app, *, owner_consent=False, license_and_notices=False, source_pinned=False,
                           artifact_verified=False, platform_supported=False, sandbox_reviewed=False,
                           server_configured=False, backup_ready=False, current_account_authorized=False, preview_opt_in=False,
                           private_data_requested=False, request_kind='INSTALL_PLAN'):
    """Everything is an INERT review; booleans must come from future independent host attestation.
    Never claims installation, even when fully true. Real installer not implemented.
    """
    out={'schema':'atlas.open-suite.install-plan/v1','app_id':app['id'],'installation_performed':False,
         'network_requests':0,'privileges_granted':False,'user_accounts_created':0,'host_verified':False}
    checks=[('VALID_REQUEST',request_kind=='INSTALL_PLAN'),('PRIVATE_MODE_EXCLUDED',private_data_requested is False),
      ('CURRENT_ACCOUNT',current_account_authorized is True),('USER_CONSENT',owner_consent is True),
      ('EXPERIMENTAL_PREVIEW_CONSENT',app['slot']!='PREVIEW_ONLY' or preview_opt_in is True),
      ('LICENSE_AND_TRADEMARKS',license_and_notices is True),('SOURCE_PIN',source_pinned is True),
      ('SIGNED_ARTIFACT',artifact_verified is True),('PLATFORM_COMPAT',platform_supported is True),
      ('SANDBOX_REVIEW',sandbox_reviewed is True),('SERVER_CONFIG',not app['requires_server'] or server_configured is True),
      ('SERVER_BACKUP',not app['requires_server'] or backup_ready is True)]
    first=next((name for name,passed in checks if not passed),None)
    out.update(status='HOLD_'+first if first else 'PLAN_READY_NO_EXECUTION',failed_check=first)
    return out

def vpn_plan(*, owner_opt_in, trusted_endpoint_pinned, provider_selected, kill_switch_reviewed):
    if not owner_opt_in: status='HOLD_VPN_NOT_CONSENTED'
    elif not trusted_endpoint_pinned or not provider_selected: status='HOLD_NO_VPN_ENDPOINT'
    elif not kill_switch_reviewed: status='HOLD_KILLSWITCH_POLICY'
    else: status='VPN_CONFIGURATION_PLAN_ONLY'
    return {'status':status,'network_changed':False,'traffic_tunneled':False,'vpn_service_included':False,'leak_protection_tested':False}
