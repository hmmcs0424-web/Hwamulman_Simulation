const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function source(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0);return html.slice(start,html.indexOf('\n}',start)+2);}
const fields={popupOverlay:{dataset:{},style:{},classList:{add(){}}},popupWrap:{style:{}},popupImg:{}};
const ctx=vm.createContext({assert,fields,document:{getElementById:id=>fields[id]},activeSec:'app',SECS:{app:{type:'app'}},cache:{app:{flow:{screens:{base:{image:'freight-info.png',type:'normal'},settings1:{image:'old-image.png',type:'popup',popupLayout:{image:'freight-info-settings1.png',previewBase:'base',mode:'positioned',top:8,left:5,width:90}}}}}},renderHotspots(){},renderPhoneScreen(screen){fields.background=screen.image;},renderPcScreen(){}});
for(const name of ['popupBackgroundScreen','showPopup','renderScreen'])vm.runInContext(source(name),ctx);
vm.runInContext(`
 renderScreen('app','settings1');
 assert.equal(fields.background,'freight-info.png');
 assert.equal(fields.popupImg.src,'freight-info-settings1.png');
 assert.notEqual(fields.background,fields.popupImg.src);
 cache.app.flow.screens.settings1.popupLayout.previewBase='__image__:other-background.png';
 renderScreen('app','settings1');
 assert.equal(fields.background,'other-background.png');
 assert.equal(fields.popupImg.src,'freight-info-settings1.png');
 delete cache.app.flow.screens.settings1.popupLayout.previewBase;
 renderScreen('app','settings1');
 assert.equal(fields.background,'freight-info-settings1.png');
`,ctx);
console.log('PASS: saved popup composition, distinct foreground/background, legacy screen reference, direct image reference, popup editor fallback');
