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
  document: {baseURI:'http://localhost/', createElement:()=>({removeAttribute(){}})},
  activeSec:'차주앱', adminMode:true, siteImageManifest:{차주앱:[local]},
  cache:{차주앱:{flow:{imageManifest:[]}}}, availableSimulatorImageIds:new Map(), assetUploadDates:new Map(),
  loadSiteImageManifest:async()=>{}, assetFolderName:s=>s,
  assetApi:async()=>{calls++;return {assets:[{url:uploaded}]};}
});
for (const name of ['assetDisplayName','assetBlobPath','assetIdentity','localImageMatchKey','localizeFlowImages','getSimulatorImages','simulatorAssetSourceCandidates','applyHotspotToggleImage']) {
  vm.runInContext(source(name), context);
}
(async()=>{
  const hotspot = {toggleOnImage:uploaded, toggleOffImage:'', actionType:'toggle_toast'};
  const flow = {screens:{detail:{image:local,hotspots:[hotspot]}}};
  context.localizeFlowImages('차주앱',flow,[local]);
  assert.equal(hotspot.toggleOnImage,uploaded,'reload must retain the selected upload');
  const images = await context.getSimulatorImages();
  assert.equal(calls,1,'uploads must be fetched even when static images exist');
  assert.ok(images.includes(uploaded) && images.includes(local));
  let child;
  const element = {querySelector:()=>child,prepend:image=>{child=image;image.remove=()=>{child=undefined;};}};
  context.applyHotspotToggleImage(hotspot,element,true);
  assert.equal(child.src,uploaded,'ON must display the selected upload');
  context.applyHotspotToggleImage(hotspot,element,false);
  assert.equal(child,undefined,'OFF must restore the base screen');
  context.applyHotspotToggleImage(hotspot,element,true);
  assert.equal(child.src,uploaded,'repeated ON must retain the selected source');
  context.assetApi=async()=>{throw new Error('offline test');};
  assert.ok((await context.getSimulatorImages()).includes(uploaded),'saved uploads survive list failures');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=|type="module"/.test(match[1])) new vm.Script(match[2]);
  }
  console.log('PASS: reload, image listing, toggle ON/OFF/ON, offline fallback, inline script syntax');
})().catch(error=>{console.error(error);process.exitCode=1;});
