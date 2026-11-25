from pathlib import Path
import json
root=Path(__file__).resolve().parent
items=[]
def put(id,name,category,slot,origin,repo,license_claim='UNVERIFIED',maturity='established',auth='local',needs_server=False,notes='',source='PROJECT_OFFICIAL',formats=None,cloud_cost=False):
    assert slot in ('CORE_CANDIDATE','OPTIONAL_CANDIDATE','PREVIEW_ONLY','INFRASTRUCTURE')
    items.append(dict(id=id,name=name,category=category,slot=slot,origin=origin,repo=repo,license_claim=license_claim,license_status='PENDING_EXACT_LICENSE_AND_ASSET_REVIEW',maturity=maturity,auth=auth,requires_server=needs_server,cloud_cost_possible=cloud_cost,notes=notes,source_class=source,formats=formats or [],provenance=dict(source_type='PROJECT_DECLARED',pinned_commit=None,source_verified_for_live_install=False,notice_reviewed=False,artwork_rights_reviewed=False,upstream_consent_not_assumed=True),install_status='NOT_INSTALLED',review_status='SOURCE_DISCOVERY_ONLY'))
# Craft apps: list, profile from official https://getartcraft.com/apps; each remains preview-only.
crafts=[
 ('photocraft','PhotoCraft','Photos','early_alpha','image layers/PSD export testing'),
 ('vectorcraft','VectorCraft','Design','in_development','vector import/export regression'),
 ('filmcraft','FilmCraft','Video','in_development','large project/timeline and render regression'),
 ('lightcraft','LightCraft','Photos','in_development','raw edits and non-destructive catalogue'),
 ('pdfcraft','PdfCraft','Office','early_alpha','forms/signatures and PDF fidelity'),
 ('effectcraft','EffectCraft','Video','in_development','node and composition parity'),
 ('anicraft','AniCraft','Design','early_alpha','animation import/export'),
 ('designcraft','DesignCraft','Design','in_development','print and publishing formats'),
 ('figcraft','FigCraft','Design','early_alpha','design handoff compatibility'),
 ('texturecraft','TextureCraft','Design','in_development','textures and color management'),
 ('materialcraft','MaterialCraft','Design','in_development','material graph portability'),
 ('soundcraft','SoundCraft','Audio','in_development','audio import/plugins/latency'),
 ('wordcraft','WordCraft','Office','in_development','DOCX fidelity and track changes'),
 ('deckcraft','DeckCraft','Office','in_development','PPTX fidelity, fonts, animations'),
 ('cadcraft','CADCraft','Engineering','in_development','DWG/DXF validation'),
 ('gridcraft','GridCraft','Office','in_development','XLSX formulas, named ranges, macros'),
 ('craft-anything','Craft Anything','Developer','early_alpha','generated apps are untrusted without code review')]
for slug,name,cat,maturity,notes in crafts:
    put('artcraft-'+slug,name,cat,'PREVIEW_ONLY','https://getartcraft.com/apps/'+slug,'https://github.com/storytold/'+slug,'LICENSE_CLAIMED_PERMISSIVE_REVIEW_PER_PROJECT',maturity,'local',False,notes,'ARTCRAFT_OFFICIAL_2026_11_25')
# established/reference apps; candidates, no claim of exact app package version or license review
oss=[
 ('libreoffice','LibreOffice','Office','https://www.libreoffice.org/','https://github.com/LibreOffice/core','MPL-2.0','CORE_CANDIDATE','local',False,'DOCX/XLSX/PPTX fidelity and fonts differ across documents',['ODT','ODS','ODP','DOCX','XLSX','PPTX']),
 ('nextcloud','Nextcloud Files','Files','https://nextcloud.com/','https://github.com/nextcloud/server','AGPL-3.0-or-later','OPTIONAL_CANDIDATE','oidc_candidate',True,'Needs an owner-managed or chosen hosted server and backups; not free cloud storage',['WebDAV']),
 ('immich','Immich','Photos','https://immich.app/','https://github.com/immich-app/immich','AGPL-3.0','OPTIONAL_CANDIDATE','oidc_candidate',True,'Photo backup requires server capacity and independent database AND asset backups',['HEIC','JPEG','RAW']),
 ('gimp','GIMP','Photos','https://www.gimp.org/','https://gitlab.gnome.org/GNOME/gimp','GPL-3.0-or-later','CORE_CANDIDATE','local',False,'Photo editor; PSD fidelity must be benchmarked',['XCF','PSD']),
 ('krita','Krita','Design','https://krita.org/','https://invent.kde.org/graphics/krita','GPL-3.0-only','OPTIONAL_CANDIDATE','local',False,'Digital painting, not a photo asset library',['KRA','PSD']),
 ('inkscape','Inkscape','Design','https://inkscape.org/','https://gitlab.com/inkscape/inkscape','GPL-2.0-or-later','OPTIONAL_CANDIDATE','local',False,'SVG first, verify Illustrator import/export',['SVG']),
 ('darktable','darktable','Photos','https://www.darktable.org/','https://github.com/darktable-org/darktable','GPL-3.0-or-later','OPTIONAL_CANDIDATE','local',False,'Raw photo edits with export/backup requirements',['RAW']),
 ('blender','Blender','Video','https://www.blender.org/','https://projects.blender.org/blender/blender','GPL-2.0-or-later','OPTIONAL_CANDIDATE','local',False,'3D, animation, rendering and VFX; hardware-dependent',['BLEND']),
 ('kdenlive','Kdenlive','Video','https://kdenlive.org/','https://invent.kde.org/multimedia/kdenlive','GPL-3.0-or-later','CORE_CANDIDATE','local',False,'Nonlinear editor; GPU/render support varies',['MLT']),
 ('obs','OBS Studio','Video','https://obsproject.com/','https://github.com/obsproject/obs-studio','GPL-2.0-or-later','CORE_CANDIDATE','local',False,'Recording and streaming; local permissions for screen/mic/camera',['MKV','MP4']),
 ('audacity','Audacity','Audio','https://www.audacityteam.org/','https://github.com/audacity/audacity','GPL-3.0-or-later','CORE_CANDIDATE','local',False,'Waveform editor, plugin and effects behavior vary',['WAV','FLAC']),
 ('ardour','Ardour','Audio','https://ardour.org/','https://github.com/Ardour/ardour','GPL-2.0-or-later','OPTIONAL_CANDIDATE','local',False,'Professional multitrack DAW, platform-specific distribution caveats',['WAV']),
 ('penpot','Penpot','Design','https://penpot.app/','https://github.com/penpot/penpot','MPL-2.0','OPTIONAL_CANDIDATE','oidc_candidate',True,'Team interface design, remote service or self-hosting required',['SVG']),
 ('joplin','Joplin','Office','https://joplinapp.org/','https://github.com/laurent22/joplin','MIT','OPTIONAL_CANDIDATE','local',False,'Local notes, optional sync choice',['MD']),
 ('librewolf','LibreWolf','Browser','https://librewolf.net/','https://codeberg.org/librewolf/source','MPL-2.0-with-third-party','CORE_CANDIDATE','passkey_per_site',False,'Includes uBlock Origin; update via verified package manager; strict mode may break sites',['HTML']),
 ('keepassxc','KeePassXC','Identity','https://keepassxc.org/','https://github.com/keepassxreboot/keepassxc','GPL-2.0-or-later','CORE_CANDIDATE','local',False,'Offline credential vault and TOTP; no universal login bypass',['KDBX']),
 ('authelia','Authelia','Identity','https://www.authelia.com/','https://github.com/authelia/authelia','Apache-2.0','INFRASTRUCTURE','oidc_provider',True,'SSO only for OIDC-capable applications enrolled with this provider'),
 ('wireguard','WireGuard','Security','https://www.wireguard.com/','https://git.zx2c4.com/wireguard-tools/','GPL-2.0','INFRASTRUCTURE','local',False,'VPN protocol/client: a reachable endpoint/provider is separately required',[],True),
 ('syncthing','Syncthing','Files','https://syncthing.net/','https://github.com/syncthing/syncthing','MPL-2.0','OPTIONAL_CANDIDATE','local',False,'Peer file sync; snapshots/backup and device approvals separately needed'),
 ('flatpak','Flatpak','Platform','https://flatpak.org/','https://github.com/flatpak/flatpak','LGPL-2.1-or-later','INFRASTRUCTURE','local',False,'Compatibility-era sandboxed installer; require verified publisher and pinned artifact'),
 ('godot','Godot Engine','Games','https://godotengine.org/','https://github.com/godotengine/godot','MIT','OPTIONAL_CANDIDATE','local',False,'Open-source game creation; external assets carry separate licenses'),
 ('luanti','Luanti','Games','https://www.luanti.org/','https://github.com/luanti-org/luanti','LGPL-2.1','OPTIONAL_CANDIDATE','local',False,'Open-source voxel gaming and mods; mod supply chain separate'),
 ('supertuxkart','SuperTuxKart','Games','https://supertuxkart.net/','https://github.com/supertuxkart/stk-code','GPL-3.0-or-later','OPTIONAL_CANDIDATE','local',False,'Open-source kart racing; separate game assets licenses'),
 ('openttd','OpenTTD','Games','https://www.openttd.org/','https://github.com/OpenTTD/OpenTTD','GPL-2.0','OPTIONAL_CANDIDATE','local',False,'Transport simulation; game assets and packs must be checked'),
 ('vlc','VLC','Media','https://www.videolan.org/vlc/','https://code.videolan.org/videolan/vlc','GPL-2.0-or-later','CORE_CANDIDATE','local',False,'Codec licensing and patent claims vary by jurisdiction'),
 ('freecad','FreeCAD','Engineering','https://www.freecad.org/','https://github.com/FreeCAD/FreeCAD','LGPL-2.0-or-later','OPTIONAL_CANDIDATE','local',False,'Parametric CAD; proprietary import fidelity varies'),
 ('kdeconnect','KDE Connect','Platform','https://kdeconnect.kde.org/','https://invent.kde.org/network/kdeconnect-kde','GPL-2.0-or-later','OPTIONAL_CANDIDATE','local',False,'User-approved device pairing and scoped remote actions')]
for id,name,cat,url,repo,lic,slot,auth,server,note,*rest in oss:
    put(id,name,cat,slot,url,repo,lic,'established',auth,server,note,formats=rest[0] if rest else [])
assert len(items)==len(set(x['id'] for x in items))
for x in items:
    x['profile']='core' if x['slot']=='CORE_CANDIDATE' else 'optional' if x['slot']=='OPTIONAL_CANDIDATE' else 'preview' if x['slot']=='PREVIEW_ONLY' else 'infrastructure'
    x['can_install']=False; x['can_authenticate']=False
    x['migration_status']='NO_SOURCE_FORMAT_ROUNDTRIP_PERFORMED'
    x['id_namespace']='atlas.apps/v1'
json.dump({'schema':'atlas.os.open-suite.catalog/v1','edition':'2026-11-25-source-review','note':'Local source discovery; NO live install, packages, rights, or actual authentication. Claimed licenses are provisional until exact source/artifact/asset review.','canonical_ariadne_sha256':'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6','items':items},open(root/'data/catalog.json','w'),indent=2,ensure_ascii=False)
print('apps:',len(items),'artcraft:',len(crafts))
