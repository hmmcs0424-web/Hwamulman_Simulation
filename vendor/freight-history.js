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
      <div class="fh-fields">${fields.map(([key,label,type]) => `<label class="fh-label" for="fh-${key}">${label}<input id="fh-${key}" data-field="${key}" type="${type}" ${['fare','invoice'].includes(key)?'inputmode="numeric"':''} autocomplete="off" required><small class="fh-error" id="fh-error-${key}"></small></label>`).join('')}</div>
      <fieldset class="fh-payment"><legend>운임 구분 <small>필수 선택</small></legend><p class="fh-payment-prompt">운임을 선택하세요.</p>${[['인','인수증'],['선불','선불'],['착불','착불']].map(([value,label])=>`<label><input type="radio" name="fh-payment" value="${value}"><span>${label}</span></label>`).join('')}</fieldset></section></div>
      <section class="fh-result"><h2><span>3</span> 자동 작성 결과</h2><label class="fh-label" for="fh-output">복사할 민원 이력</label><p>자동 작성된 이력 아래에 상담 내용이나 추가 메모를 자유롭게 작성하세요. 작성란의 전체 내용이 복사됩니다.</p><textarea id="fh-output" placeholder="필수 항목을 입력하고 운임 구분을 선택하세요.&#10;&#10;이력이 생성되면 이곳에 상담 내용을 추가로 작성할 수 있습니다."></textarea><div class="fh-actions"><button type="button" id="fh-copy" disabled>전체 내용 복사</button><button type="button" id="fh-reset" class="fh-secondary">초기화</button><span id="fh-status" role="status" aria-live="polite"></span></div></section>
      </section>`;
    const find = id => root.querySelector(`#fh-${id}`);
    let attempted = false, revision = 0, generated = '', valid = false;
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
      const next = format(values, root.querySelector('input[name="fh-payment"]:checked')?.value);
      const output = find('output');
      valid = !!next;
      let needsReview = false;
      if (!output.value || output.value === generated || output.value === generated + '\n') output.value = next ? next + '\n' : '';
      else if (generated && output.value.includes(generated) && next) output.value = output.value.replace(generated, next);
      else if (!generated && next) output.value = next + '\n\n' + output.value;
      else if (next && next !== generated) needsReview = true;
      if (next) generated = next;
      find('copy').disabled = !valid || !output.value.trim();
      find('status').textContent = needsReview ? '입력 정보가 변경되었습니다. 직접 수정한 이력 내용을 확인해 주세요.' : '';
      root.querySelector('.fh-payment').classList.toggle('is-selected', !!root.querySelector('input[name="fh-payment"]:checked'));
    }
    find('source').addEventListener('input', () => {
      const values = parse(find('source').value);
      fields.forEach(([key])=>{find(key).value = values[key];});
      root.querySelectorAll('input[name="fh-payment"]').forEach(input=>{input.checked=false;});
      attempted = !!find('source').value.trim();
      update();
    });
    root.querySelectorAll('[data-field], input[name="fh-payment"]').forEach(input=>input.addEventListener('input',()=>{
      attempted=true;
      update();
      if (input.name === 'fh-payment' && valid) {
        const output = find('output');
        output.focus();
        output.setSelectionRange(output.value.length, output.value.length);
      }
    }));
    find('output').addEventListener('input', () => {
      revision++;
      find('copy').disabled = !valid || !find('output').value.trim();
      find('status').textContent = '';
    });
    find('reset').addEventListener('click',()=>{
      root.querySelectorAll('textarea, [data-field]').forEach(input=>{input.value='';});
      root.querySelectorAll('input[name="fh-payment"]').forEach(input=>{input.checked=false;});
      attempted=false;generated='';update();find('source').focus();
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
