const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');

class Element {
  constructor() { this.style = {}; this.dataset = {}; this.children = []; this.value = ''; this.files = []; this.classList = {remove(){},add(){}}; }
  append(...nodes) { nodes.forEach(n=>{n.parentElement=this;this.children.push(n);}); }
  after() {}
  closest() { return this; }
  querySelectorAll() { return []; }
  remove() { if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this); }
  focus() {}
  setPointerCapture() {}
  setAttribute() {}
  getBoundingClientRect() { return {left:0,top:0,width:360,height:1200}; }
}
const ids = new Map();
const wrapper = new Element();
const document = {
  head:new Element(),body:new Element(),createElement:()=>new Element(),
  getElementById(id){if(!ids.has(id))ids.set(id,new Element());return ids.get(id);},
  querySelector(){return null;},
  querySelectorAll(selector){return selector==='.icon-menu-surface'?wrapper.children.filter(e=>e.className==='icon-menu-surface'):[];}
};
ids.set('imageWrapper',wrapper);
document.getElementById('hotspotLayer').parentElement=wrapper;
const asset={id:'a',name:'receipt',image:'normal.png',doneImage:'done.png'};
const button={id:'b',assetId:'a',label:'receipt',actionType:'navigate',goto:'r1',rememberOrigin:true};
const placement={menuId:'m',left:0,top:70,width:100,height:12};
const flow={start:'home',screens:{home:{},type1:{iconMenus:[{...placement}]},type2:{iconMenus:[{...placement}]},r1:{},r2:{},r3:{}},iconStudio:{assets:[asset],menus:[{id:'m',name:'menu',width:70,height:70,gap:10,buttons:[button]}]}};
const state={flow,cur:'type1',hist:[]};
const alerts=[];
let opened='';
const c={document,window:{},cache:{app:state},activeSec:'app',SECS:{app:{type:'app'}},adminMode:false,counselorPreviewMode:false,esc:String,crypto:require('crypto').webcrypto,TextEncoder,Map,Set,console,
  HOTSPOT_GO_BACK:'__back__',pendingHs:null,pendingScrollRegionIndex:-1,
  confirm(){return true;},prompt(){},alert:x=>alerts.push(x),mapPhoneOverlayRect:x=>x,saveSimulatorFlow(){},renderBreadcrumb(){},showSimulatorToast:x=>alerts.push(x),renderScreen(){},renderHsList(){},renderPhoneScrollRegions(){},
  goBack(){state.cur=state.hist.pop();c.renderScreen();},goHome(){state.cur='home';},
  goTo(id){state.hist.push(state.cur);state.cur=id;c.renderScreen();},
  handleHotspotAction(h){if(h.goto)c.goTo(h.goto);},cancelDraw(){c.pendingHs=null;c.closeModal('hsModal');},
  closeModal(){},openModal(id){opened=id;},renderHsTargetList(){},updateHsActionFields(){},updateHsTargetPreview(){},populateHsToggleImages(){},getSimulatorImages:async()=>[],
  assetIdentity:x=>x,assetDisplayName:x=>x,renderList(){},detectUnreg(){},normalizeSimulatorLink:x=>x
};
vm.createContext(c);
const html=fs.readFileSync('index.html','utf8');
const begin=html.indexOf('function confirmHs() {'),end=html.indexOf('// ═',begin);
vm.runInContext(html.slice(begin,end),c);
vm.runInContext(fs.readFileSync('vendor/icon-menu-studio.js','utf8'),c);
const surface=()=>wrapper.children.at(-1);
const track=()=>surface().children.find(e=>e.className==='icon-menu-track');
const currentButton=()=>track().children[0];
const click=()=>currentButton().onclick({stopPropagation(){}});

(async()=>{
  click();c.goTo('r2');c.goTo('r3');c.handleHotspotAction({actionType:'origin_complete'});
  assert.equal(state.cur,'type1');assert.equal(currentButton().children[1].textContent,'등록 완료');assert.equal(state.hist.length,0);
  c.goTo('type2');assert.equal(currentButton().children[1].textContent,'receipt');
  click();c.goTo('r2');c.goTo('r3');c.handleHotspotAction({actionType:'origin_complete'});
  assert.equal(state.cur,'type2');assert.equal(currentButton().children[0].src,'done.png');
  c.goHome();c.goTo('type1');assert.equal(currentButton().children[1].textContent,'receipt');
  c.adminMode=true;c.renderScreen();
  const handle=surface().children[0],p=flow.screens.type1.iconMenus[0];
  handle.onpointerdown({clientX:0,clientY:0,pointerId:1,preventDefault(){},stopPropagation(){}});
  handle.onpointermove({clientX:0,clientY:-120,stopPropagation(){}});handle.onpointerup();
  assert.equal(p.top,60);assert.equal(surface().parentElement,wrapper);
  document.getElementById('isFontSize').oninput({target:{value:'16'}});
  document.getElementById('isBold').onchange({target:{checked:true}});
  assert.equal(currentButton().children[1].style.fontSize,'16px');
  assert.equal(currentButton().children[1].style.fontWeight,'700');
  assert.equal(surface().style.maxHeight,undefined);
  assert.equal(currentButton().style.height,'100%');
  document.getElementById('isH').oninput({target:{value:'120'}});
  assert.equal(flow.iconStudio.menus[0].height,120);
  assert.equal(flow.screens.type1.iconMenus[0].height,10);
  assert.equal(document.getElementById('isPH').value,10);
  document.getElementById('isGap').oninput({target:{value:'24'}});
  assert.equal(track().style.gap,'24px');
  document.getElementById('isGap').oninput({target:{value:'0'}});
  assert.equal(track().style.gap,'0px');
  assert.equal(surface().children[0].textContent,'✥');
  click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(opened,'hsModal');assert.equal(c.window.iconHotspotEditor.button,button);assert.equal(document.getElementById('hsGoto').value,'r1');

  document.getElementById('hsGoto').value=c.HOTSPOT_GO_BACK;
  document.getElementById('hsActionType').value='navigate';
  document.getElementById('iconRememberOrigin').checked=false;
  c.confirmHs();
  assert.equal(button.goto,c.HOTSPOT_GO_BACK);assert.equal(button.id,'b');assert.equal(button.rememberOrigin,false);
  assert.equal(flow.screens.type1.hotspots,undefined);assert.equal(c.window.iconHotspotEditor,null);
  c.renderScreen();
  document.getElementById('isAsset').value='a';
  flow.screens.type1.iconMenus=[];
  document.getElementById('isAdd').onclick();
  assert.equal(flow.screens.type1.iconMenus.length,1);
  assert.equal(surface().parentElement,wrapper);
  c.adminMode=false;
  const onAsset={id:'favorite-on',name:'favorite_selected',displayName:'즐겨찾기',image:'favorite-on.png'};
  flow.iconStudio.assets.push(onAsset);
  Object.assign(button,{label:'즐겨찾기',actionType:'toggle_toast',offAssetId:'a',onAssetId:onAsset.id,toastOnMessage:'selected',toastOffMessage:'removed'});
  c.renderScreen();click();
  assert.equal(state.cur,'type1');assert.equal(currentButton().children[0].src,'favorite-on.png');
  assert.equal(currentButton().children[1].textContent,'즐겨찾기');assert.equal(alerts.pop(),'selected');
  c.goTo('type2');assert.equal(currentButton().children[0].src,'normal.png');
  c.goTo('type1');assert.equal(currentButton().children[0].src,'favorite-on.png');
  click();assert.equal(currentButton().children[0].src,'normal.png');assert.equal(alerts.pop(),'removed');
  Object.assign(button,{actionType:'navigate',goto:'r1',rememberOrigin:true,doneAssetId:onAsset.id,doneLabel:'발급 중',disableAfterDone:true,doneBackground:'#eeeeee'});
  click();c.goTo('r2');c.handleHotspotAction({actionType:'origin_complete'});
  assert.equal(state.cur,'type1');assert.equal(currentButton().children[0].src,'favorite-on.png');assert.equal(currentButton().children[1].textContent,'발급 중');assert.equal(currentButton().style.background,'#eeeeee');assert.equal(currentButton().disabled,true);click();assert.equal(state.cur,'type1');
  c.goTo('type2');assert.equal(currentButton().disabled,false);c.goTo('type1');assert.equal(currentButton().disabled,true);
  c.goTo('home');c.goTo('type1');assert.equal(currentButton().disabled,false);assert.equal(currentButton().children[1].textContent,'즐겨찾기');
  c.adminMode=true;c.renderScreen();click();await new Promise(resolve=>setImmediate(resolve));
  document.getElementById('iconOffAsset').value='a';document.getElementById('iconOnAsset').value='favorite-on';document.getElementById('iconDoneAsset').value='favorite-on';
  document.getElementById('iconDisableAfterDone').checked=true;document.getElementById('iconDoneBackgroundEnabled').checked=true;document.getElementById('iconDoneBackground').value='#dddddd';
  document.getElementById('iconDisplayLabel').value='즐겨찾기';document.getElementById('iconDoneLabel').value='완료';
  document.getElementById('hsActionType').value='toggle_toast';document.getElementById('hsToastOnMessage').value='selected';document.getElementById('hsToastOffMessage').value='removed';
  c.confirmHs();assert.equal(button.onAssetId,'favorite-on');assert.equal(button.toggleOnImage,'favorite-on.png');assert.equal(button.label,'즐겨찾기');assert.equal(button.doneLabel,'완료');assert.equal(button.disableAfterDone,true);assert.equal(button.doneBackground,'#dddddd');
  document.getElementById('isDeleteAsset0').onclick();
  assert.equal(flow.iconStudio.assets.length,2);assert.match(alerts.pop(),/사용 중/);
  document.getElementById('isEditAsset0').onclick();
  assert.equal(document.getElementById('isAssetName').value,'receipt');
  document.getElementById('isAssetName').value='receipt-renamed';document.getElementById('isAssetLabel').value='new display';
  document.getElementById('isAssetTransparent').checked=false;document.getElementById('isAssetBackground').value='#cccccc';
  document.getElementById('isAssetCompletionEnabled').checked=true;document.getElementById('isAssetCompletionEnabled').onchange();assert.equal(document.getElementById('isAssetCompletionFields').hidden,false);
  document.getElementById('isAssetDoneName').value='receipt_done';document.getElementById('isAssetDoneLabel').value='인수증 완료';
  document.getElementById('isAssetDoneTransparent').checked=false;document.getElementById('isAssetDoneBackground').value='#eeeeee';
  await document.getElementById('isUpload').onclick();
  assert.equal(flow.iconStudio.assets[0].id,'a');assert.equal(flow.iconStudio.assets[0].name,'receipt-renamed');assert.equal(flow.iconStudio.assets[0].image,'normal.png');assert.equal(flow.iconStudio.assets[0].background,'#cccccc');
  assert.equal(button.label,'즐겨찾기'); // A customized menu label stays unchanged.
  flow.iconStudio.assets.push({id:'unused',name:'unused',image:'unused.png'});c.renderScreen();
  document.getElementById('isDeleteAsset2').onclick();assert.equal(flow.iconStudio.assets.length,2);
  assert.equal(flow.iconStudio.assets[0].doneBackground,'#eeeeee');assert.equal(flow.iconStudio.assets[0].doneName,'receipt_done');assert.equal(flow.iconStudio.assets[0].doneDisplayName,'인수증 완료');
  document.getElementById('isEditAsset0').onclick();
  assert.equal(document.getElementById('isAssetDoneBackground').value,'#eeeeee');assert.equal(document.getElementById('isAssetDoneTransparent').checked,false);
  assert.equal(document.getElementById('isAssetDoneName').value,'receipt_done');assert.equal(document.getElementById('isAssetDoneLabel').value,'인수증 완료');
  document.getElementById('isCancelAsset').onclick();
  Object.assign(button,{actionType:'navigate',goto:'r1',rememberOrigin:true,doneAssetId:'',doneBackground:'',doneLabel:undefined});
  flow.iconStudio.assets[0].doneImage='';c.adminMode=false;c.goTo('home');c.goTo('type1');
  assert.equal(currentButton().style.background,'#cccccc');click();c.handleHotspotAction({actionType:'origin_complete'});
  assert.equal(currentButton().children[1].textContent,'인수증 완료');
  assert.equal(currentButton().style.background,'#eeeeee');assert.equal(currentButton().children[0].src,'normal.png');assert.equal(currentButton().disabled,true);
  c.goTo('home');c.goTo('type1');assert.equal(currentButton().style.background,'#cccccc');assert.equal(currentButton().disabled,false);
  flow.iconStudio.assets[0].doneBackground='transparent';click();c.handleHotspotAction({actionType:'origin_complete'});assert.equal(currentButton().style.background,'transparent');
  c.adminMode=true;c.renderScreen();document.getElementById('isEditAsset0').onclick();
  assert.equal(document.getElementById('isAssetCompletionEnabled').checked,true);
  document.getElementById('isAssetCompletionEnabled').checked=false;document.getElementById('isAssetCompletionEnabled').onchange();
  assert.equal(document.getElementById('isAssetCompletionFields').hidden,true);assert.equal(document.getElementById('isAssetCompletionFields').disabled,true);
  await document.getElementById('isUpload').onclick();assert.equal(flow.iconStudio.assets[0].completionEnabled,false);
  c.adminMode=false;c.goTo('home');c.goTo('type1');click();c.handleHotspotAction({actionType:'origin_complete'});
  assert.equal(currentButton().children[1].textContent,button.label);assert.equal(currentButton().disabled,false);assert.equal(currentButton().style.background,'#cccccc');
  assert.equal(alerts.length,0);
  console.log('PASS: shared receipt routing, per-screen completion, reset, menu drag, shared hotspot modal, back target save, no duplicate hotspots, automatic placement in scrolling image');
})().catch(error=>{console.error(error);process.exitCode=1;});
