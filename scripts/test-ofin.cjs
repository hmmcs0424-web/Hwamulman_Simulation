const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const M=require('../빽통PC/ofin-model'),F=require('../빽통PC/ofin-files');
const now=new Date('2026-11-05T12:00:00+09:00');
let s=M.seed(now);assert.equal(M.summary(s,now).pendingCount,2);assert.equal(M.summary(s,now).pendingAmount,854570);
s=M.decide(s,['05'],'rejected',now);s=M.decide(s,['03'],'approved',now);
assert.equal(M.summary(s,now).pendingCount,0);assert.equal(M.summary(s,now).monthCount,3);assert.equal(M.summary(s,now).monthAmount,1194210);
assert.equal(M.filter(s,{approved:true,rejected:false}).length,1);
assert.equal(M.filter(s,{from:'2026-11-05',to:'2026-11-05'}).length,0);
assert.equal(M.filter(s,{from:'2027-01-07',to:'2027-01-07',approved:true,rejected:false}).length,1);
assert.throws(()=>M.decide(s,['03'],'rejected',now));
assert.throws(()=>M.decide(s,['missing'],'approved',now));
const original=M.seed(now);assert.throws(()=>M.decide(original,['05','missing'],'approved',now));assert.equal(original.items[0].status,'pending');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'ofin-file-test-'));
const workbook=path.join(folder,'sample.xlsx'),pdf=path.join(folder,'sample.pdf');
fs.writeFileSync(workbook,F.xlsx([['교육용','금액','문자'],['홍길동',339640,'=NOT_A_FORMULA & <test>']]));
fs.writeFileSync(pdf,F.pdf(['TRAINING SAMPLE','Amount: KRW 339640','Order (1) \\ sample']));
const python=String.raw`import sys,zipfile,xml.etree.ElementTree as E
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 for name in z.namelist(): E.fromstring(z.read(name))
 sheet=z.read('xl/worksheets/sheet1.xml').decode()
 assert '홍길동' in sheet and '=NOT_A_FORMULA &amp; &lt;test&gt;' in sheet and '<f>' not in sheet
b=open(sys.argv[2],'rb').read()
assert b.startswith(b'%PDF-1.4') and b.endswith(b'%%EOF')
at=int(b.split(b'startxref\n')[1].splitlines()[0]);assert b[at:at+4]==b'xref'
print('PASS: genuine XLSX ZIP/XML, Unicode cells, formula-safe text, PDF cross-reference')`;
const run=require('node:child_process').spawnSync('python',['-c',python,workbook,pdf],{encoding:'utf8'});
if(run.status!==0)throw Error(run.stderr||run.error?.message);console.log(run.stdout.trim());
console.log('PASS: approve/reject, pending totals, monthly totals including rejects, settlement date filters, duplicate prevention, atomic bulk decisions');
