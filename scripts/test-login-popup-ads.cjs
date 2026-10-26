const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function source(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0);const end=html.indexOf('\n}',start);return html.slice(start,end+2);}
const elements={phonePopupImages:{value:'first.png\nsecond.png'},phonePromoOverlay:{classList:{add(){this.active=true},remove(){this.active=false}}},phonePromoImage:{},phonePromoCount:{}};
const ctx=vm.createContext({assert,document:{getElementById:id=>elements[id]||{value:0}},elements});
vm.runInContext(`let adminMode=true,counselorPreviewMode=false,activeSec='app',currentCounselor=true;
const SECS={app:{type:'app'}},cache={app:{cur:'home',flow:{screens:{home:{}}}}};
let loginPopupState={armed:true,shown:false,images:[],index:0};
const localStorage={getItem:()=>null},LOGIN_POPUP_DISMISS_DATE_KEY='dismiss';
const localDateKey=()=>'',adImageValues=()=>[],adLinkValues=()=>[];
const phoneLayoutForScreen=scr=>scr?.phoneLayout||{};
`,ctx);
for(const name of ['popupImageValues','phoneLayoutNumber','syncPhoneLayoutDraftToScreen','showArmedLoginPopupAds','renderCurrentLoginPopupAd']){
  let src=source(name);
  if(name==='popupImageValues')src=html.slice(html.indexOf('function popupImageValues('),html.indexOf('\n',html.indexOf('function popupImageValues(')));
  vm.runInContext(src,ctx);
}
vm.runInContext(`
 syncPhoneLayoutDraftToScreen();
 assert.equal(cache.app.flow.screens.home.phoneLayout.popupAds.images.length,2);
 elements.phonePopupImages.value='second.png';syncPhoneLayoutDraftToScreen();
 assert.equal(cache.app.flow.screens.home.phoneLayout.popupAds.images.length,1);
 counselorPreviewMode=true;showArmedLoginPopupAds();
 assert.equal(elements.phonePromoImage.src,'second.png');
 assert.equal(elements.phonePromoOverlay.classList.active,true);
 assert.equal(elements.phonePromoCount.hidden,true);
 loginPopupState.index++;renderCurrentLoginPopupAd();
 assert.equal(elements.phonePromoOverlay.classList.active,false);
 counselorPreviewMode=false;elements.phonePopupImages.value='';syncPhoneLayoutDraftToScreen();
 assert.equal(cache.app.flow.screens.home.phoneLayout.popupAds,null);
 loginPopupState={armed:true,shown:false,images:[],index:0};counselorPreviewMode=true;
 showArmedLoginPopupAds();assert.equal(elements.phonePromoOverlay.classList.active,false);
`,ctx);
console.log('PASS: two ads to one, draft sync, single popup display/close, zero ads');
