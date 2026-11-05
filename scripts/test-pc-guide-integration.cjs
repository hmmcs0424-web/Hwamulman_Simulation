const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname,'..');
const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
const start = index.indexOf('let pcGuideDirty =');
const end = index.indexOf('let pendingGuideLeaveDialog',start);
if(start<0||end<0) throw Error('PC editor source not found');
const fixture = path.join(os.tmpdir(),'hmm-pc-integration-'+Date.now()+'.html');
const contentUrl = pathToFileURL(path.join(root,'빽통PC/content.html')).href;
const storeUrl = pathToFileURL(path.join(root,'vendor/pc-guide-store.js')).href;
const js = index.slice(start,end);
const unloadStart = index.indexOf("window.addEventListener('beforeunload', e => {");
const unloadEnd = index.indexOf('});',unloadStart)+3;
const unload = index.slice(unloadStart,unloadEnd);
fs.writeFileSync(fixture,`<!doctype html><meta charset="utf-8"><pre id="result">RUNNING</pre>
<div id="guideDocToolbar"><button id="gtbSave" onclick="savePcGuideContent()"></button></div>
<div id="guideEditHint"></div><div id="guideDirtyDot"></div><div id="pcGuideSaveStatus"></div>
<button id="guideEditToggle"></button><button id="guideUndoButton"></button><button id="guideRedoButton"></button>
<button id="guideLayoutToggle"></button><select id="guideIconTarget"><option>excel</option></select>
<input id="guideIconX"><input id="guideIconY"><iframe id="pcGuideFrame"></iframe>
<script>
const activeSec='빽통PC',activePage='simulator',adminMode=true,counselorPreviewMode=false;
const SECS={'빽통PC':{contentUrl:${JSON.stringify(contentUrl)}}};
const firebaseReady=true,firestoreDb={},firebaseAuth={currentUser:{uid:'admin'}};
let cloud,callback,backupHtml='',alerts=[];
const firebaseFns={doc:()=>({}),serverTimestamp:()=>null,
onSnapshot(ref,opts,cb){callback=cb;queueMicrotask(()=>cb({data:()=>cloud,metadata:{fromCache:false,hasPendingWrites:false}}));return ()=>{};},
runTransaction:async(db,action)=>action({get:async()=>({data:()=>cloud}),set(ref,value){
  function validate(value){if(Array.isArray(value))return value.forEach(validate);
    if(value&&typeof value==='object'){if(Object.getPrototypeOf(value)!==Object.prototype)throw Error('Firestore rejected cross-frame Object');Object.values(value).forEach(validate);}}
  validate(value);cloud=value;
}})};
window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async value=>{backupHtml=value;},close:async()=>{}})});
window.alert=message=>alerts.push(message);
const nativeFetch=window.fetch;window.fetch=async()=>({ok:true,text:async()=>'<html><head></head><body><div id="reg"></div></body></html>'});
function showSimToast(){}
function shouldProtectFlowLeave(){return false;}
${js}
${unload}
</script><script src="${storeUrl}"></script>
<script>
const checks=[];function check(value,text){if(!value)throw Error(text);checks.push(text);}
function waitFrame(){return new Promise(resolve=>_guideFrame().addEventListener('load',resolve,{once:true}));}
async function reload(){const loaded=waitFrame();_guideFrame().src=${JSON.stringify(contentUrl)}+'?test='+Date.now();await loaded;
  await new Promise(resolve=>setTimeout(resolve,100));}
function type(label,text){const w=_guideWin(),doc=w.document;const el=doc.querySelector(label);const r=doc.createRange();
 r.selectNodeContents(el);w.getSelection().removeAllRanges();w.getSelection().addRange(r);
 doc.body.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,inputType:'insertText',data:text}));
 el.textContent=text;doc.body.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));}
(async()=>{
 _guideFrame().onload=async()=>{await pcGuideStore.prepareFrame(_guideFrame());guideResetHistory();setGuideDirty(false);syncGuideToolbar();pcGuideStore.connect();};
 await reload();await new Promise(resolve=>setTimeout(resolve,100));
 check(!!_guideWin().guideEdits,'PC loader initialized');
 type('#nav a','텍스트 웹저장 확인');check(pcGuideDirty,'real input handlers mark document dirty');
 const unsaved=new Event('beforeunload',{cancelable:true});window.dispatchEvent(unsaved);
 check(unsaved.defaultPrevented,'unsaved text triggers the real refresh warning');
 check(_guideWin().guideEdits.export().edits.length>0,'real input handlers captured edit');
 const result=await savePcGuideContent();
 check(result,'real editor data accepted by Firestore validation: '+alerts.join(' / '));
 check(!pcGuideDirty,'successful website save clears dirty flag');
 check(document.getElementById('gtbSave').disabled,'save button disabled after success');
 const savedEvent=new Event('beforeunload',{cancelable:true});window.dispatchEvent(savedEvent);
 check(!savedEvent.defaultPrevented,'successful website save removes the real refresh warning');
 check(backupHtml.includes('텍스트 웹저장 확인'),'PC backup matches website edit');
 await reload();await new Promise(resolve=>setTimeout(resolve,100));
 check(_guideDoc().querySelector('#nav a').textContent==='텍스트 웹저장 확인','saved text survives a fresh iframe and cloud read');
 check(!pcGuideDirty,'cloud restore does not mark document dirty');
 guideHistoryChange(()=>setGuideDirty(true));
 check(!pcGuideDirty,'layout notifications without DOM changes do not trigger unsaved warning');
 _guideDoc().querySelector('input').dispatchEvent(new (_guideWin().InputEvent)('input',{bubbles:true}));
 check(!pcGuideDirty,'simulation field input does not trigger unsaved editor warning');
 const w=_guideWin(),doc=_guideDoc(),el=doc.querySelector('#nav a');
 const previousCloud=JSON.stringify(cloud.data);
 const range=doc.createRange();range.selectNodeContents(el);w.getSelection().removeAllRanges();w.getSelection().addRange(range);guideRememberSelection();
 for(const [key,dark,light] of [['blue','rgb(30, 64, 175)','rgb(219, 234, 254)'],['yellow','rgb(133, 77, 14)','rgb(254, 249, 195)'],['red','rgb(153, 27, 27)','rgb(254, 226, 226)'],['green','rgb(22, 101, 52)','rgb(220, 252, 231)'],['purple','rgb(107, 33, 168)','rgb(243, 232, 255)'],['orange','rgb(154, 52, 18)','rgb(255, 237, 213)']]){
   guideSetColorMode('color');guideWrapSelection('hl-'+key);
   check(w.getComputedStyle([...el.querySelectorAll('span')].at(-1)).color===dark,key+' palette applies dark text');
   guideSetColorMode('backgroundColor');guideWrapSelection('hl-'+key);
   const selected=w.getSelection().getRangeAt(0).commonAncestorContainer;
   check(w.getComputedStyle(selected).backgroundColor===light,key+' palette applies light background');
   check(w.getComputedStyle([...el.querySelectorAll('span')].at(-1)).color===dark,key+' highlight preserves text color');
   guideUndo();guideUndo();range.selectNodeContents(el);w.getSelection().removeAllRanges();w.getSelection().addRange(range);guideRememberSelection();
 }
 range.selectNodeContents(el);w.getSelection().removeAllRanges();w.getSelection().addRange(range);guideRememberSelection();
 guideTextStyle('color','#ff0000');
 check(pcGuideDirty,'actual toolbar formatting is tracked');
 doc.body.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));
 doc.body.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,inputType:'insertCompositionText',data:'한글'}));
 doc.querySelector('#nav a span').textContent='한글 수정 저장';
 doc.body.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'한글'}));
 doc.body.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true,data:'한글'}));
 check(JSON.stringify(cloud.data)===previousCloud,'new edits do not mutate the previous saved document');
 check(await savePcGuideContent(),'formatted Korean composition can be saved: '+alerts.join(' / '));
 await reload();await new Promise(resolve=>setTimeout(resolve,100));
 check(_guideDoc().querySelector('#nav a').textContent==='한글 수정 저장','Korean composition survives fresh load');
 check(_guideDoc().querySelector('#nav a span').style.color==='rgb(255, 0, 0)','toolbar color survives fresh load');
 const mark=performance.now();_guideWin().guideEdits.capture();
 check(performance.now()-mark<700,'editor capture avoids long UI blocking');
 document.getElementById('result').textContent='PASS\\n'+checks.join('\\n');
})().catch(error=>{document.getElementById('result').textContent='FAIL '+error.stack;});
</script>`);
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const run = spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--allow-file-access-from-files',
 '--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'hmm-pc-integration-')),'--virtual-time-budget=12000','--dump-dom',pathToFileURL(fixture).href],
 {encoding:'utf8',timeout:25000,maxBuffer:4*1024*1024});
const report = run.stdout?.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1];
console.log(report || run.error?.message || run.stderr);
if(!report?.startsWith('PASS'))process.exitCode=1;
