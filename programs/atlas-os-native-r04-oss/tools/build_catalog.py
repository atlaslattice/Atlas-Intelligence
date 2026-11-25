#!/usr/bin/env python3
"""Build a deterministic *candidate* app catalog from pinned, independently observed repository metadata.
No downloads, installations, or third-party code are incorporated.
"""
from pathlib import Path
import json, hashlib
R=Path(__file__).resolve().parents[1]
# fields: id, title, family, category, profile, maturity, account, repository, source revision, GitHub SPDX metadata, packaging semantics
ROWS=[
('photocraft','PhotoCraft','ArtCraft','Image editing','creative','experimental','none','storytold/photocraft','d827906d6f0d5a58f2b8bbedd507013e64bfedb5','Apache-2.0','linux_app'),
('wordcraft','WordCraft','ArtCraft','Documents','everyday','experimental','none','storytold/wordcraft','77a530b1796b7d19cfac3242502bf294751606b9','Apache-2.0','linux_app'),
('gridcraft','GridCraft','ArtCraft','Spreadsheets','everyday','experimental','none','storytold/gridcraft','3a37c2e88295a61e91942ddc0866a28bab02bf5d','Apache-2.0','linux_app'),
('deckcraft','DeckCraft','ArtCraft','Presentations','everyday','experimental','none','storytold/deckcraft','08ba5072a7586909d99bb6e14e5ca73d2b2608ee','Apache-2.0','linux_app'),
('filmcraft','FilmCraft','ArtCraft','Video','creative','experimental','none','storytold/filmcraft','7303127462ae5e943f33047c89679accff554cf3','Apache-2.0','linux_app'),
('pdfcraft','PdfCraft','ArtCraft','PDF','everyday','experimental','none','storytold/pdfcraft','6e910675c68dd5092e889065cfe8d0274c1b2742','Apache-2.0','linux_app'),
('vectorcraft','VectorCraft','ArtCraft','Vector illustration','creative','experimental','none','storytold/vectorcraft','016ead2572d7d931d15d198ed44f66867b7893c7','Apache-2.0','linux_app'),
('lightcraft','LightCraft','ArtCraft','Photo library and RAW','creative','experimental','none','storytold/lightcraft','5bdb4e7a6955fde3cb9ebda36576bbea6a0c6d7d','Apache-2.0','linux_app'),
('effectcraft','EffectCraft','ArtCraft','Motion graphics','creative','experimental','none','storytold/effectcraft','5eccc055ce77e74efa492efe3cb6ad3d2a180c6f','Apache-2.0','linux_app'),
('anicraft','AniCraft','ArtCraft','2D animation','creative','experimental','none','storytold/anicraft','7512a9bd9d5763ae577255257da6efbd45c250cf','Apache-2.0','linux_app'),
('designcraft','DesignCraft','ArtCraft','Page layout','creative','experimental','none','storytold/designcraft','127315b40ef9b71482bdd470df8a950e4bb74ec8','Apache-2.0','linux_app'),
('figcraft','FigCraft','ArtCraft','Interface design','creative','experimental','none','storytold/figcraft','39c1f94a4f9356f030de996de1ee28d8588f7ad2','Apache-2.0','linux_app'),
('texturecraft','TextureCraft','ArtCraft','3D texture painting','creative','experimental','none','storytold/texturecraft','c3b354a39a8bcc2612fa3eb86c2d75d478a3b637','Apache-2.0','linux_app'),
('materialcraft','MaterialCraft','ArtCraft','Procedural materials','creative','experimental','none','storytold/materialcraft','83e7d0112b271d5dc43bdb3785ba28b028abab13','Apache-2.0','linux_app'),
('soundcraft','SoundCraft','ArtCraft','Digital audio','creative','experimental','none','storytold/soundcraft','97e38ba3c35e22cb4953d99c93914f6d31813dc6','Apache-2.0','linux_app'),
('cadcraft','CADCraft','ArtCraft','CAD and drafting','creative','experimental','none','storytold/cadcraft','29baf193f71cb5964e92c2f16c3ef47451f4aeb6','Apache-2.0','linux_app'),
('craft-anything','Craft Anything','ArtCraft','Software exploration','labs','experimental','none','storytold/craft-anything','0a4e66ba75c81ffa9a860c2987064d1ad61ab305','Apache-2.0','linux_app'),
('craft-launcher','ArtCraft Launcher','ArtCraft','App launcher','labs','experimental','none','storytold/craft-launcher','bc765549cec168d29c2d53f7b772f8bfa5d2249e','Apache-2.0','linux_app'),
('libreoffice','LibreOffice','Community','Documents, sheets, presentations','everyday','established_candidate','none','LibreOffice/core','bbb8ea3bc3a1effcd87079572b19df9a41dfb357','GPL-3.0','linux_app'),
('krita','Krita','Community','Digital painting','creative','established_candidate','none','KDE/krita','3e220ff42e3ea78e8e2e854d6bce0f61ef7ed79a','GPL-3.0','linux_app'),
('kdenlive','Kdenlive','Community','Video','creative','established_candidate','none','KDE/kdenlive','e4675c0802adcf97b99067cde8f7e1c4cf6a7314','GPL-3.0','linux_app'),
('nextcloud-server','Nextcloud Server','Community','Cloud storage','team','established_candidate','external','nextcloud/server','d32f6dd3575c6888036d8df04e4cb4b4fac0d528','AGPL-3.0','service'),
('nextcloud-desktop','Nextcloud Desktop','Community','File sync','team','established_candidate','external','nextcloud/desktop','bad83ce9777529d133897c142e6974256572cdc0','GPL-2.0','linux_app'),
('godot','Godot Engine','Community','Game creation','games','established_candidate','none','godotengine/godot','8f2e46bca3c1cca8f3b759a0eaf67e44082b81a4','MIT','linux_app'),
('blender','Blender','Community','3D creation','creative','established_candidate','none','blender/blender','abbc010903590217db6d3318a732012d234c6108','NOASSERTION','linux_app'),
('obs','OBS Studio','Community','Recording and streaming','creative','established_candidate','optional','obsproject/obs-studio','0c790bd0151fb9f574867e025ecf57e6eedc58e2','GPL-2.0','linux_app'),
('audacity','Audacity','Community','Audio editing','creative','established_candidate','none','audacity/audacity','2806d90ac5b07ef35fad94d9e2665370bcbdbb31','NOASSERTION','linux_app'),
('keepassxc','KeePassXC','Community','Local password vault','privacy','established_candidate','none','keepassxreboot/keepassxc','cd42236540c1cfca332c0f051d981acfdacf7b4e','NOASSERTION','linux_app'),
('heroic','Heroic Games Launcher','Community','Game launcher','games','established_candidate','external','Heroic-Games-Launcher/HeroicGamesLauncher','775765ed013ddf7031eef01551ec4c4d9837e038','GPL-3.0','linux_app'),
('lutris','Lutris','Community','Game launcher','games','established_candidate','external','lutris/lutris','42b4ed58a9db22272a6eb2015e885d27f32e97e2','GPL-3.0','linux_app'),
('ublock-origin','uBlock Origin','Community','Browser content blocking','privacy','established_candidate','none','gorhill/uBlock','b8a305eec6fbfa2269b1321c58783191b24de7f0','GPL-3.0','browser_extension'),
('flatpak','Flatpak','Community','Application sandbox','infrastructure','established_candidate','none','flatpak/flatpak','cea67024cea91d2f6b8aaae1206b87bee531db17','LGPL-2.1','system_service'),
('wireguard','WireGuard Tools','Community','Opt-in VPN client','privacy','established_candidate','external','wireguard/wireguard-tools','ba8556ce45c230906041a1a04450b7b638057917','GPL-2.0','vpn_client'),
('mullvad','Mullvad VPN App','Community','Opt-in VPN client','privacy','established_candidate','external','mullvad/mullvadvpn-app','e2a89ac498e251496d72ec3142dab4681d57227d','GPL-3.0','vpn_client'),
('gnome-keyring','GNOME Keyring','Community','Credential storage','infrastructure','established_candidate','none','GNOME/gnome-keyring','8561976b6b4662330caeb16c921472a89e891ed1','GPL-2.0','system_service'),
('kdeconnect','KDE Connect','Community','Device integration','everyday','established_candidate','optional','KDE/kdeconnect-kde','27568643beb5395d2fbb81416a32b18bb5a33c13','UNKNOWN','linux_app'),
('firefox','Firefox (official build)','Community','Web browser','everyday','upstream_binary_pin_pending','optional','mozilla.org/firefox',None,'MPL-2.0','linux_app'),
]
cat=[]
for (name,title,family,category,profile,maturity,account,repo,commit,license,packaging) in ROWS:
    cat.append(dict(id=name,title=title,family=family,category=category,profile=profile,maturity=maturity,account=account,
                    upstream='https://github.com/'+repo if commit else 'https://www.mozilla.org/firefox/',source_revision=commit,
                    metadata_license=license,license_review='SOURCE_METADATA_ONLY' if license not in ('UNKNOWN','NOASSERTION') else 'NEEDS_LICENSE_REVIEW',
                    package_sha256=None,package_signature_verified=False,release_status='NOT_INSTALLED',
                    app_origin_federation_verified=False,kind=packaging,default_installed=False))
cat.sort(key=lambda a:a['id'])
meta={'schema':'atlas.os.oss.catalog/v1','status':'CANDIDATE_INVENTORY_NOT_INSTALLED','source':'independently observed GitHub repository head metadata, 2026-11-25',
      'originalAriadneSha256':'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',
      'canonR13ManifestSha256':'0670fac32fab8c4cc8f1e1abc30af26acb788b68fd4c31dbfd605f9368fd3b0a',
      'ratified':False,'defaultTelemetry':False,'automaticVpn':False,'automaticCloudLogin':False,'sourceCopyIncluded':False,
      'installedApps':0,'apps':cat}
raw=json.dumps(meta,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf8')
(R/'catalog/apps_catalog.json').write_bytes(raw+b'\n')
(R/'receipts/catalog_sha256.txt').write_text(hashlib.sha256(raw+b'\n').hexdigest()+'  catalog/apps_catalog.json\n')
# Compile-only native C, no JSON runtime parser in the OS kernel; record provenance in generated source.
lines=['/* SPDX-License-Identifier: MIT */','/* GENERATED from catalog/apps_catalog.json by tools/build_catalog.py; do not edit directly. */', '#include "atlas_appgate.h"', 'const struct aos_app_entry aos_app_catalog[] = {']
for a in cat:
    vals=[a[k] or '' for k in ['id','title','profile','family','maturity','account','metadata_license','upstream','source_revision','kind','license_review']]
    lines.append('    {'+','.join(json.dumps(v,ensure_ascii=True) for v in vals)+'},')
lines.extend(['};','const unsigned aos_app_catalog_count = (unsigned)(sizeof(aos_app_catalog)/sizeof(aos_app_catalog[0]));'])
(R/'src/apps_catalog.c').write_text('\n'.join(lines)+'\n')
(R/'receipts/catalog_build.json').write_text(json.dumps({'schema':'atlas.os.catalog.build/v1','count':len(cat),'artcraft':sum(a['family']=='ArtCraft' for a in cat),'pinned':sum(bool(a['source_revision']) for a in cat),'licenseReviewNeeded':sum(a['license_review']=='NEEDS_LICENSE_REVIEW' for a in cat),'readyForAutoInstall':0,'sha256':hashlib.sha256(raw+b'\n').hexdigest()},indent=2)+'\n')
print('atlas catalog generated',len(cat),'records','sha256',hashlib.sha256(raw+b'\n').hexdigest())
