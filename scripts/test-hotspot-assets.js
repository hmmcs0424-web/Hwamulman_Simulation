const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
function source(name) {
  const start = html.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  const end = html.indexOf('\n}', start) + 2;
  return html.slice(start, end);
}
const uploaded = 'https://example.public.blob.vercel-storage.com/차주앱/관심화물.png';
const local = '차주앱/차주앱이미지/관심화물.png';
let calls = 0;
const context = vm.createContext({
  URL, console, location: {href:'http://localhost/', origin:'http://localhost'},
  LEGACY_ASSET_PATH_MAP:{'차주앱/관심화물.png':local},
  LEGACY_ASSET_REVERSE_MAP:{[local]:'차주앱/관심화물.png'},
  document: {baseURI:'http://localhost/', createElement:()=>({removeAttribute(){}})},
  activeSec:'차주앱', adminMode:true, siteImageManifest:{차주앱:[local]},
  cache:{차주앱:{flow:{imageManifest:[]}}}, availableSimulatorImageIds:new Map(), assetUploadDates:new Map(),
  loadSiteImageManifest:async()=>{}, assetFolderName:s=>s,
  assetApi:async()=>{calls++;return {assets:[{url:uploaded}]};}
});
for (const name of ['assetDisplayName','assetBlobPath','assetIdentity','localImageMatchKey','localizeLegacyAssetString','localizeFlowImages','getSimulatorImages','simulatorAssetSourceCandidates','applyHotspotToggleImage']) {
  vm.runInContext(source(name), context);
}
(async()=>{
  const hotspot = {toggleOnImage:uploaded, toggleOffImage:'', actionType:'toggle_toast'};
  const flow = {screens:{detail:{image:local,hotspots:[hotspot]}}};
  context.localizeFlowImages('차주앱',flow,[local]);
  assert.equal(hotspot.toggleOnImage,local,'legacy Blob source must resolve to the GitHub image');
  const images = await context.getSimulatorImages();
  assert.equal(calls,0,'GitHub image listing must not call Vercel Blob');
  assert.deepEqual([...images],[local]);
  let child;
  const element = {querySelector:()=>child,prepend:image=>{child=image;image.remove=()=>{child=undefined;};}};
  context.applyHotspotToggleImage(hotspot,element,true);
  assert.equal(child.src,new URL(local,context.location.href).href,'ON must display the migrated GitHub image');
  context.applyHotspotToggleImage(hotspot,element,false);
  assert.equal(child,undefined,'OFF must restore the base screen');
  context.applyHotspotToggleImage(hotspot,element,true);
  assert.equal(child.src,new URL(local,context.location.href).href,'repeated ON must retain the selected source');
  context.assetApi=async()=>{throw new Error('offline test');};
  assert.ok((await context.getSimulatorImages()).includes(local),'GitHub images remain available without Blob');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=|type="module"/.test(match[1])) new vm.Script(match[2]);
  }
  console.log('PASS: legacy migration, GitHub image listing, toggle ON/OFF/ON, no Blob calls, inline script syntax');
})().catch(error=>{console.error(error);process.exitCode=1;});
