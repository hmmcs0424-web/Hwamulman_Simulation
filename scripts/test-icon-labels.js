const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const studio = fs.readFileSync(path.join(__dirname, '../vendor/icon-menu-studio.js'), 'utf8');
const start = html.indexOf('function confirmHs() {');
const source = html.slice(start, html.indexOf('\n}', start) + 2);
const fields = new Map();
const input = id => {
  if (!fields.has(id)) fields.set(id, {value: '', checked: false});
  return fields.get(id);
};
// Model the browser's newline sanitization for a single-line text input.
let singleLine = '';
Object.defineProperty(input('hsLabelInput'), 'value', {
  get: () => singleLine,
  set: value => { singleLine = value.replace(/[\r\n]/g, ''); }
});
const screen = {hotspots: []};
const context = vm.createContext({
  document: {getElementById: input}, window: {},
  cache: {app: {cur: 'home', flow: {screens: {home: screen}}}}, activeSec: 'app',
  pendingHs: {}, pendingScrollRegionIndex: -1, HOTSPOT_GO_BACK: '__back__',
  closeModal() {}, cancelDraw() {}, renderHotspots() {}, renderHsList() {},
  SECS: {app: {type: 'app'}}, alert: message => { throw Error(message); }
});
vm.runInContext(source, context);
input('hsActionType').value = 'toast';
input('hsToastMessage').value = 'Saved';
const label = '인수증\n등록';
input('iconDisplayLabel').value = label;
input('hsLabelInput').value = label;
assert.equal(input('hsLabelInput').value, '인수증등록');
const button = {id: 'receipt', label: 'old'};
context.window.iconHotspotEditor = {button, refresh() {}};
context.confirmHs();
assert.equal(button.label, label, 'saving icon actions must preserve Enter');
assert.equal(JSON.parse(JSON.stringify(button)).label, label, 'persistence must retain Enter');
context.pendingHs = {};
input('iconDisplayLabel').value = '수정\r\n완료';
context.window.iconHotspotEditor = {button, refresh() {}};
context.confirmHs();
assert.equal(button.label, '수정\r\n완료', 'repeated edits must retain CRLF');
context.pendingHs = {};
input('hsLabelInput').value = 'ordinary hotspot';
context.confirmHs();
assert.equal(screen.hotspots[0].label, 'ordinary hotspot');

const assets = [{id: 'a', displayName: label}];
const buttons = [{assetId: 'a', label: '인수증등록'}, {assetId: 'a', label: 'Custom'}];
const flow = {iconStudio: {assets, menus: [{buttons}]}};
const dataStart = studio.indexOf('  const data = () => {');
const dataEnd = studio.indexOf('\n  };', dataStart) + 5;
const migration = vm.createContext({st: () => ({flow})});
vm.runInContext(studio.slice(dataStart, dataEnd) + '\ndata();', migration);
assert.equal(buttons[0].label, label, 'flattened legacy labels must recover from the asset');
assert.equal(buttons[1].label, 'Custom', 'custom menu names must remain intact');
new vm.Script(studio);
console.log('PASS: multiline icon saves, repeated edits, JSON persistence, ordinary hotspots, legacy recovery');
