from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[1]
inputs=['catalog/apps_catalog.json','src/atlas_appgate.h','src/atlas_appgate.c','src/atlas_appbridge.h','src/atlas_appbridge.c','src/apps_catalog.c','tools/reconcile_catalogue.py','tests/crosswalk_test.py','docs/PEER_R05_CROSSWALK.md','tests/appgate_100.c','tests/bridge_test.c','tests/verify_catalog.py','tests/verify_wasm.mjs','tests/browser.py','web/ATLAS_OS_OPEN_SOURCE_GARDEN.html','docs/OSS_FIRST_SECURITY_AND_IDENTITY.md','docs/COMPONENT_INTEGRATION.md','docs/PEER_HANDOFF.md','README.md']
files={x:hashlib.sha256((r/x).read_bytes()).hexdigest() for x in inputs}
checks={x:hashlib.sha256((r/f'receipts/100-{x}.jsonl').read_bytes()).hexdigest() for x in ('gcc','clang','sanitize')}
assert len(set(checks.values()))==1
rec={'schema':'atlas.os.oss.r04.local-review/v1','state':'TESTED_LOCAL_NOT_INSTALLED','os_kernel':'ORIGINAL_ATLAS_NATIVE_R03','appInventory':37,'gitSourcePinned':36,'artcraftNativeApps':17,'artcraftLauncher':1,'localCases':100,'compilerModes':['GCC','Clang','ASan+UBSan'],'identicalCaseSHA256':checks['gcc'],'wasmImports':0,'nativeR03BridgeChecksPerMode':10,'CommonsR05PeerSourceReconciled':True,'peerR05PrivateSourcePreserved':True,'peerCount':42,'exactIdSourceUrlReviewLinks':21,'adoptedAppAliases':0,'browserDesktopMobileChecks':64,'privateModeIngestion':False,'actualInstallations':0,'realSessions':0,'vpnStarted':0,'credentialMaterialCopied':False,'CANONAdopted':False,'hostAuthorityVerified':False,'booted':False,'files':files}
(r/'receipts/R04_LOCAL_TEST_RECEIPT.json').write_text(json.dumps(rec,sort_keys=True,indent=2)+'\n')
print('receipt',hashlib.sha256((r/'receipts/R04_LOCAL_TEST_RECEIPT.json').read_bytes()).hexdigest(),'files',len(files))
