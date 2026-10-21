const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function source(name) {
  const start = html.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  return html.slice(start, html.indexOf('\n}', start) + 2);
}
const context = vm.createContext({assert});
vm.runInContext(source('simulatorFlowForSave'), context);
vm.runInContext(`
  const original={start:'detail',screens:{detail:{image:'detail.png',optional:undefined,
    hotspots:[{label:'등록',completedImage:undefined,enabled:false,offset:0}],
    phoneLayout:{adCarousel:null,items:[undefined,{image:undefined,label:''}]}}}};
  const cleaned=simulatorFlowForSave(original);
  assert.equal(Object.hasOwn(cleaned.screens.detail,'optional'),false);
  assert.equal(Object.hasOwn(cleaned.screens.detail.hotspots[0],'completedImage'),false);
  assert.equal(cleaned.screens.detail.hotspots[0].enabled,false);
  assert.equal(cleaned.screens.detail.hotspots[0].offset,0);
  assert.equal(cleaned.screens.detail.phoneLayout.adCarousel,null);
  assert.equal(cleaned.screens.detail.phoneLayout.items[0],null);
  assert.equal(cleaned.screens.detail.phoneLayout.items[1].label,'');
  assert.equal(Object.hasOwn(original.screens.detail,'optional'),true);
  const special=new Date();assert.equal(simulatorFlowForSave(special),special);
  let saved=false,remembered=false;
  const adminMode=true,firebaseReady=true,activeSec='차주앱';
  const cache={'차주앱':{flow:original,flowSource:'firestore'}};
  const status={textContent:''};
  const document={getElementById:()=>status};
  const firestoreDb={};
  const firebaseAuth={currentUser:{uid:'admin'}};
  const alert=message=>{throw Error(message)};
  const rememberFlowSaved=()=>{remembered=true};
  const firebaseFns={doc:()=>({}),getDoc:async()=>({data:()=>({flow:{screens:{detail:{}}}})}),
    serverTimestamp:()=> 'timestamp',setDoc:async(ref,payload)=>{
      assert.equal(Object.hasOwn(payload.flow.screens.detail,'optional'),false);
      assert.equal(payload.updatedBy,'admin');saved=true;
    }};
`, context);
vm.runInContext(source('simulatorDocId'), context);
vm.runInContext(source('saveSimulatorFlow'), context);
(async()=>{
  await vm.runInContext(`(async()=>{assert.equal(await saveSimulatorFlow(),true);assert.ok(saved&&remembered);})()`,context);
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
    if(!/\bsrc=|type="module"/.test(match[1]))new vm.Script(match[2]);
  }
  console.log('PASS: nested optional fields, arrays, original data preservation, simulator save, inline syntax');
})().catch(error=>{console.error(error);process.exitCode=1;});
