const {spawnSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url');
const chrome=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const result=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--allow-file-access-from-files',
 '--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'hmm-ofin-test-')),'--virtual-time-budget=15000','--dump-dom',pathToFileURL(path.join(__dirname,'test-ofin-browser.html')).href],
 {encoding:'utf8',timeout:25000,maxBuffer:4*1024*1024});
const report=result.stdout?.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1];console.log(report||result.error?.message||result.stderr);if(!report?.startsWith('PASS'))process.exitCode=1;
