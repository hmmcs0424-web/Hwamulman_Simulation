(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OfinFiles=factory();})(typeof window==='undefined'?globalThis:window,()=>{
  const enc=new TextEncoder();
  const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function xlsx(rows){
    const files={
      '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="교육용 처리내역" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml':'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>{let k=j+1,c='';while(k){c=String.fromCharCode(65+(k-1)%26)+c;k=Math.floor((k-1)/26);}const ref=c+(i+1);return typeof v==='number'?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;}).join('')+'</row>').join('')+'</sheetData></worksheet>'
    };
    function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
    const parts=[],central=[];let offset=0;
    function header(size,values){const b=new Uint8Array(size),v=new DataView(b.buffer);for(const [at,value,width] of values)width===4?v.setUint32(at,value,true):v.setUint16(at,value,true);return b;}
    for(const [name,text] of Object.entries(files)){
      const n=enc.encode(name),data=enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+text),sum=crc(data);
      const h=header(30,[[0,0x04034b50,4],[4,20,2],[14,sum,4],[18,data.length,4],[22,data.length,4],[26,n.length,2]]);
      parts.push(h,n,data);central.push(header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[16,sum,4],[20,data.length,4],[24,data.length,4],[28,n.length,2],[42,offset,4]]),n);offset+=h.length+n.length+data.length;
    }
    const size=central.reduce((s,p)=>s+p.length,0),count=Object.keys(files).length;
    const end=header(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,size,4],[16,offset,4]]);
    return concat([...parts,...central,end]);
  }
  function concat(parts){const all=new Uint8Array(parts.reduce((s,b)=>s+b.length,0));let n=0;for(const b of parts){all.set(b,n);n+=b.length;}return all;}
  function pdf(lines){
    const escape=s=>String(s).replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,c=>'\\'+c);
    const stream='BT /F1 12 Tf 50 790 Td '+lines.map((line,i)=>(i?'0 -25 Td ':'')+'('+escape(line)+') Tj').join('\n')+' ET';
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
    let text='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(text.length);text+=`${i+1} 0 obj\n${o}\nendobj\n`;});const at=text.length;
    text+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${at}\n%%EOF`;return enc.encode(text);
  }
  return {xlsx,pdf};
});
