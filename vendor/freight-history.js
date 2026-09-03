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
  const fields = [['date','화물 등록일','date'],['origin','상차 지역','text'],['destination','하차 지역','text'],['fare','기사운임 (원)','text'],['vehicle','차량번호','text'],['invoice','운송장번호','text']];
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  }
  function format(values, payment) {
    if (!validDate(values.date) || !/^[0-9]+$/.test(values.fare) || !Number.isSafeInteger(Number(values.fare)) || Number(values.fare) <= 0 || !/^\d+$/.test(values.invoice) || !values.origin || !values.destination || !values.vehicle || !['인','선불','착불'].includes(payment)) return '';
    return `${values.date.slice(5).replace('-', '.')}일 ${values.origin}-${values.destination} / ${payment} ${Number(values.fare) / 10000}만 / ${values.vehicle} / ${values.invoice}`;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { region, parse, format };
  if (typeof window === 'undefined') return;
  window.mountFreightHistory = root => {
    root.innerHTML = `<section class="fh-app">
      <div class="fh-grid"><section class="fh-card"><h2><span>1</span> 조회 내용 입력</h2><p>조회 내용을 통째로 붙여넣으세요. 필요한 항목만 자동으로 추출합니다.</p>
      <label for="fh-source" class="fh-label">조회 원문</label><textarea id="fh-source" class="fh-source" placeholder="조회한 운송장 정보를 여기에 붙여넣으세요." spellcheck="false"></textarea>
      <small>입력 내용은 저장되지 않으며, 메뉴를 다시 열거나 새로고침하면 비워집니다.</small></section>
      <section class="fh-card"><h2><span>2</span> 내용 확인 및 운임 선택</h2><p>추출된 내용을 확인하고, 누락되거나 잘못된 값은 수정하세요.</p>
      <div class="fh-fields">${fields.map(([key,label,type]) => `<label class="fh-label" for="fh-${key}">${label}<input id="fh-${key}" data-field="${key}" type="${type}" ${['fare','invoice'].includes(key)?'inputmode="numeric"':''} autocomplete="off" required><small class="fh-error" id="fh-error-${key}"></small></label>`).join('')}</div>
      <fieldset class="fh-payment"><legend>운임 구분 <small>필수 선택</small></legend>${[['인','인수증'],['선불','선불'],['착불','착불']].map(([value,label])=>`<label><input type="radio" name="fh-payment" value="${value}"><span>${label}</span></label>`).join('')}</fieldset></section></div>
      <section class="fh-result"><h2><span>3</span> 자동 작성 결과</h2><label class="fh-label" for="fh-output">복사할 민원 이력</label><textarea id="fh-output" readonly placeholder="필수 항목을 입력하고 운임 구분을 선택하세요."></textarea><div class="fh-actions"><button type="button" id="fh-copy" disabled>이력 복사</button><button type="button" id="fh-reset" class="fh-secondary">초기화</button><span id="fh-status" role="status" aria-live="polite"></span></div></section>
      </section>`;
    const find = id => root.querySelector(`#fh-${id}`);
    let attempted = false, revision = 0;
    function update() {
      revision++;
      const values = Object.fromEntries(fields.map(([key])=>[key,find(key).value.trim()]));
      values.fare = values.fare.replace(/[,\s원]/g, '');
      fields.forEach(([key,label]) => {
        let error = !values[key] ? `${label}: 입력 내용을 확인해 주세요.` : '';
        if (key === 'date' && values[key] && !validDate(values[key])) error = '올바른 날짜를 입력해 주세요.';
        if (key === 'fare' && values[key] && (!/^\d+$/.test(values[key]) || !Number.isSafeInteger(Number(values[key])) || Number(values[key]) <= 0)) error = '0보다 큰 원 단위 정수를 입력해 주세요.';
        if (key === 'invoice' && values[key] && !/^\d+$/.test(values[key])) error = '운송장번호는 숫자로 입력해 주세요.';
        find(`error-${key}`).textContent = attempted ? error : '';
        find(key).setAttribute('aria-invalid', String(attempted && !!error));
        find(key).setAttribute('aria-describedby', `fh-error-${key}`);
      });
      find('output').value = format(values, root.querySelector('input[name="fh-payment"]:checked')?.value);
      find('copy').disabled = !find('output').value;
      find('status').textContent = '';
    }
    find('source').addEventListener('input', () => {
      const values = parse(find('source').value);
      fields.forEach(([key])=>{find(key).value = values[key];});
      root.querySelectorAll('input[name="fh-payment"]').forEach(input=>{input.checked=false;});
      attempted = !!find('source').value.trim();
      update();
    });
    root.querySelectorAll('[data-field], input[name="fh-payment"]').forEach(input=>input.addEventListener('input',()=>{attempted=true;update();}));
    find('reset').addEventListener('click',()=>{
      root.querySelectorAll('textarea, [data-field]').forEach(input=>{input.value='';});
      root.querySelectorAll('input[name="fh-payment"]').forEach(input=>{input.checked=false;});
      attempted=false;update();find('source').focus();
    });
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
