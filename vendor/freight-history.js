(() => {
  'use strict';
  function region(address) {
    const parts = address.trim().split(/\s+/);
    const city = parts.find(part => /^[가-힣]+[시군]$/.test(part) && !/(광역시|특별시|특별자치시)$/.test(part));
    if (city) return city.slice(0, -1);
    const metro = parts[0]?.match(/^(서울|부산|대구|인천|광주|대전|울산|세종)(?:특별자치시|특별시|광역시|시)?$/);
    return metro ? metro[1] : '';
  }
  function parse(raw) {
    const values = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([^:：]+)\s*[:：]\s*(.*?)\s*$/);
      if (match) values[match[1].replace(/\s/g, '')] = match[2];
    }
    return {
      date: values['화물등록일시']?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '',
      origin: region(values['상차지'] || ''), destination: region(values['하차지'] || ''),
      fare: (values['기사운임'] || '').replace(/[,\s원]/g, ''),
      vehicle: values['차주차량번호'] || '', invoice: values['운송장번호'] || ''
    };
  }
  function parseMany(raw) {
    const blocks = []; let lines = [], hasInvoice = false;
    for (const line of raw.split(/\r?\n/)) {
      const invoice = /^\s*운송장\s*번호\s*[:：]/.test(line);
      const boundary = /^\s*-{3,}\s*$/.test(line) || /^\s*\[\d{4}-\d{2}-\d{2}[^\]]*\]\s*$/.test(line);
      if ((boundary || (invoice && hasInvoice)) && lines.some(l => /[:：]/.test(l))) {
        blocks.push(lines.join('\n')); lines = []; hasInvoice = false;
      }
      if (!boundary) lines.push(line);
      if (invoice) hasInvoice = true;
    }
    if (lines.some(l => /[:：]/.test(l))) blocks.push(lines.join('\n'));
    return blocks.map(parse);
  }
  function formatMany(records) {
    const lines = records.map(record => format(record, record.payment));
    return lines.length && lines.every(Boolean) ? lines.map(line => line + '\n차주 인입 : 운임 미수').join('\n\n') : '';
  }
  const fields = [['date','화물 등록일','date'],['origin','상차 지역','text'],['destination','하차 지역','text'],['fare','기사운임 (원)','text'],['vehicle','차량번호','text'],['invoice','운송장번호','text']];
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  }
  function format(values, payment) {
    if (!validDate(values.date) || !/^[0-9]+$/.test(values.fare) || !Number.isSafeInteger(Number(values.fare)) || Number(values.fare) <= 0 || !/^\d+$/.test(values.invoice) || !values.origin || !values.destination || !values.vehicle || !['인','선불','착불'].includes(payment)) return '';
    return `${values.date.slice(5).replace('-', '.')}일 ${values.origin}-${values.destination} / ${payment} ${Number(values.fare) / 10000}만 / ${values.vehicle} / ${values.invoice}`;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { region, parse, parseMany, format, formatMany };
  if (typeof window === 'undefined') return;
  window.mountFreightHistory = root => {
    root.innerHTML = `<section class="fh-app">
      <div class="fh-grid"><section class="fh-card"><h2><span>1</span> 조회 내용 입력</h2><p>여러 운송장의 조회 내용을 한 번에 붙여넣으세요. 운송장별로 자동 구분합니다.</p>
      <label for="fh-source" class="fh-label">조회 원문</label><textarea id="fh-source" class="fh-source" placeholder="조회한 운송장 정보를 여기에 붙여넣으세요.

[2026-09-04 08:06:09]
운송장번호 : 20260901111111
협력사명 : (주)지영물류
화물명 : 가공철근
화물수신번호 : 01012345678
고객전화번호 : 01056785678
상차지 : 경기 여주시 강천면 적금리
하차지 : 경기 부천시 소사구 괴안동
기사운임 : 330000
주선료 : 경기 부천시 소사구 괴안동
차주 아이디: 400000
차주명 : 오로라
차주 차량번호: 경기00자0000
차주핸드폰 : 01000000000
화물등록일시: 2026-09-04 08:03:27
상담 유형 :
인입 큐 : [DEV] Queue" spellcheck="false"></textarea>
      <small>입력 내용은 저장되지 않으며, 메뉴를 다시 열거나 새로고침하면 비워집니다.</small></section>
      <section class="fh-card"><h2><span>2</span> 내용 확인 및 운임 선택</h2><p>추출된 내용을 확인하고, 누락되거나 잘못된 값은 수정하세요.</p>
      <p id="fh-count" role="status"></p><div id="fh-records"></div></section></div>
      <section class="fh-result"><h2><span>3</span> 자동 작성 결과</h2><label class="fh-label" for="fh-output">복사할 민원 이력</label><p>자동 작성된 이력 아래에 상담 내용이나 추가 메모를 자유롭게 작성하세요. 작성란의 전체 내용이 복사됩니다.</p><textarea id="fh-output" placeholder="필수 항목을 입력하고 운임 구분을 선택하세요.&#10;&#10;이력이 생성되면 이곳에 상담 내용을 추가로 작성할 수 있습니다."></textarea><div class="fh-actions"><button type="button" id="fh-copy" disabled>전체 내용 복사</button><button type="button" id="fh-reset" class="fh-secondary">초기화</button><span id="fh-status" role="status" aria-live="polite"></span></div></section>
      </section>`;
    const find = id => root.querySelector(`#fh-${id}`);
    let attempted = false, revision = 0, generated = '', valid = false;
    let records = [{...parse(''), payment:''}];
    const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function renderRecords() {
      find('records').innerHTML = records.map((record,index) => '<section class="fh-record" data-index="'+index+'"><h3>'+(index+1)+'번 운송장</h3><div class="fh-fields">'+fields.map(([key,label,type]) => '<label class="fh-label" for="fh-'+index+'-'+key+'">'+label+'<input id="fh-'+index+'-'+key+'" data-field="'+key+'" type="'+type+'" value="'+esc(record[key])+'" '+(['fare','invoice'].includes(key)?'inputmode="numeric"':'')+' autocomplete="off" required><small class="fh-error" id="fh-error-'+index+'-'+key+'"></small></label>').join('')+'</div><fieldset class="fh-payment"><legend>'+(index+1)+'번 운임 구분 <small>필수 선택</small></legend><p class="fh-payment-prompt">운임을 선택하세요.</p>'+[['인','인수증'],['선불','선불'],['착불','착불']].map(([value,label]) => '<label><input type="radio" name="fh-payment-'+index+'" data-payment="true" value="'+value+'" '+(record.payment===value?'checked':'')+'><span>'+label+'</span></label>').join('')+'</fieldset></section>').join('');
    }
    function update() {
      revision++;
      records.forEach((record,index) => {
        fields.forEach(([key,label]) => {
          let error = !record[key] ? label+': 입력 내용을 확인해 주세요.' : '';
          if (key==='date' && record[key] && !validDate(record[key])) error='올바른 날짜를 입력해 주세요.';
          if (key==='fare' && record[key] && (!/^\d+$/.test(record[key]) || !Number.isSafeInteger(Number(record[key])) || Number(record[key])<=0)) error='0보다 큰 원 단위 정수를 입력해 주세요.';
          if (key==='invoice' && record[key] && !/^\d+$/.test(record[key])) error='운송장번호는 숫자로 입력해 주세요.';
          find('error-'+index+'-'+key).textContent=attempted?error:'';
          find(index+'-'+key).setAttribute('aria-invalid',String(attempted && !!error));
          find(index+'-'+key).setAttribute('aria-describedby','fh-error-'+index+'-'+key);
        });
        root.querySelector('[data-index="'+index+'"] .fh-payment').classList.toggle('is-selected',!!record.payment);
      });
      const complete=records.filter(record=>format(record,record.payment)).length;
      find('count').textContent='총 '+records.length+'건 · 작성 준비 완료 '+complete+'건';
      const next=formatMany(records), output=find('output');
      valid=!!next;
      let needsReview=false;
      if (!output.value || output.value===generated || output.value===generated+'\n') output.value=next?next+'\n':'';
      else if (generated && output.value.includes(generated) && next) output.value=output.value.replace(generated,next);
      else if (!generated && next) output.value=next+'\n\n'+output.value;
      else if (next && next!==generated) needsReview=true;
      if(next) generated=next;
      find('copy').disabled=!valid || !output.value.trim();
      find('status').textContent=needsReview?'입력 정보가 변경되었습니다. 직접 수정한 이력 내용을 확인해 주세요.':(attempted && !valid?'모든 운송장의 필수 항목과 운임 구분을 확인해 주세요.':'');
    }
    find('source').addEventListener('input',()=>{
      const parsed=parseMany(find('source').value);
      records=(parsed.length?parsed:[parse('')]).map(record=>({...record,payment:''}));
      attempted=!!find('source').value.trim();renderRecords();update();
    });
    find('records').addEventListener('input',event=>{
      const input=event.target, card=input.closest('[data-index]');
      if(!card) return;
      const record=records[Number(card.dataset.index)];
      if(input.dataset.field) record[input.dataset.field]=input.dataset.field==='fare'?input.value.replace(/[,\s원]/g,''):input.value.trim();
      else if(input.dataset.payment) record.payment=input.value;
      else return;
      attempted=true;update();
      if(input.dataset.payment && valid){const output=find('output');output.focus();output.setSelectionRange(output.value.length,output.value.length);}
    });
    find('output').addEventListener('input',()=>{revision++;find('copy').disabled=!valid || !find('output').value.trim();find('status').textContent='';});
    find('reset').addEventListener('click',()=>{
      find('source').value='';find('output').value='';records=[{...parse(''),payment:''}];
      attempted=false;generated='';renderRecords();update();find('source').focus();
    });
    renderRecords();update();
    find('copy').addEventListener('click',async()=>{
      const output = find('output'), text = output.value, version = revision;
      if (!text) return;
      try {
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(text);
        } catch {
          if (version !== revision || !root.isConnected) return;
          output.focus();output.select();
          if (!document.execCommand('copy')) throw new Error('Copy failed');
        }
        if (version === revision) find('status').textContent='이력이 복사되었습니다.';
      } catch { find('status').textContent='자동 복사가 차단되었습니다. 결과를 선택해 Ctrl+C로 복사하세요.'; }
    });
  };
})();
