(() => {
  'use strict';

  const CHECK_KEY = 'hmm-signup-checklist-checked-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);

  const defaults = {
    title: '신규가입 안내 체크리스트',
    sections: [
      {id:'identity', title:'본인 및 연락처 확인', items:[
        {id:'member-name', label:'회원 성함 확인', script:'안녕하세요. 화물맨 회원가입 담당자입니다. 회원님 성함이 맞으실까요?'},
        {id:'birth-date', label:'생년월일 확인', script:'본인 확인을 위해 생년월일을 말씀해 주세요.'},
        {id:'phone-number', label:'이용할 휴대전화 번호 확인', script:'업무에 사용하실 휴대전화 번호를 확인하겠습니다.'},
        {id:'existing-member', label:'기존 가입 또는 번호 변경 여부 확인', script:'기존에 가입하셨거나 휴대전화 번호를 변경하신 이력이 있으실까요?'}
      ]},
      {id:'vehicle', title:'차량 정보 확인', items:[
        {id:'vehicle-number', label:'차량번호 확인', script:'등록할 차량번호가 맞는지 확인하겠습니다.'},
        {id:'vehicle-ton', label:'등록 톤수 확인', script:'차량등록증에 기재된 톤수를 확인하겠습니다.'},
        {id:'vehicle-type', label:'차종 확인', script:'카고, 윙바디, 냉장·냉동 등 차량 종류를 말씀해 주세요.'},
        {id:'vehicle-axis', label:'축 여부 및 차량 길이 확인', script:'차량에 축이 있는지와 차량 길이를 확인하겠습니다.'},
        {id:'pallet', label:'팔레트 적재 가능 수량 확인', script:'1100 규격 팔레트를 몇 개까지 적재할 수 있으실까요?'},
        {id:'general-cargo', label:'일반화물 적재 가능 여부 확인', script:'일반화물도 적재 가능하신지 확인하겠습니다.'}
      ]},
      {id:'access', title:'조회 권한 및 이용 안내', items:[
        {id:'region', label:'조회 가능 지역 안내', script:'조회 가능 지역과 운행 지역 설정을 안내해 드리겠습니다.'},
        {id:'ton-range', label:'조회 가능 톤수 안내', script:'회원님의 차량 기준으로 조회 가능한 톤수를 안내해 드리겠습니다.'},
        {id:'overload', label:'과적 주의 안내', script:'배차 전 차량 적재 능력과 과적 여부를 반드시 확인해 주세요.'},
        {id:'device', label:'사용 휴대전화 기종 확인', script:'현재 사용 중인 휴대전화 기종을 확인하겠습니다.'},
        {id:'device-limit', label:'아이디 설치 제한 안내', script:'화물맨 앱은 등록된 기기에서 이용되므로 기기 변경 시 고객센터로 문의해 주세요.'}
      ]},
      {id:'fee', title:'요금제 및 이벤트 안내', items:[
        {id:'fee-plan', label:'가입 요금제 확인', script:'회원님께 적용되는 요금제와 월 이용료를 안내해 드리겠습니다.'},
        {id:'tax', label:'부가세 포함 금액 안내', script:'안내드린 정보이용료는 부가세 포함 금액입니다.'},
        {id:'event', label:'무료 이용 이벤트 안내', script:'적용 가능한 무료 이용 기간과 종료일을 안내해 드리겠습니다.'},
        {id:'after-event', label:'무료 기간 종료 후 요금 안내', script:'무료 이용 종료 후 적용되는 월 이용료를 안내해 드리겠습니다.'},
        {id:'withdraw-date', label:'첫 자동출금 예정일 안내', script:'첫 자동출금 예정일과 이후 정기 결제일을 안내해 드리겠습니다.'},
        {id:'follow-up', label:'무료 기간 종료 전 상담 안내', script:'무료 기간이 끝나기 전에 담당 상담원이 다시 안내드릴 예정입니다.'}
      ]},
      {id:'driver', title:'동행 기사 권한 안내', items:[
        {id:'owner-driver', label:'차주와 기사 관계 확인', script:'등록할 기사님이 차량 소유주의 기사 회원이 맞는지 확인하겠습니다.'},
        {id:'decision', label:'주요 정보 결정권자 안내', script:'계약과 주요 정보 변경은 등록된 차주 회원의 확인이 필요합니다.'},
        {id:'change-confirm', label:'정보 변경 시 차주 확인 필요 안내', script:'중요 정보 변경 시 차주 회원과 확인 통화가 진행될 수 있습니다.'}
      ]},
      {id:'finish', title:'문자·스티커 및 완료 안내', items:[
        {id:'usage-sms', label:'사용방법 안내 문자 발송', script:'앱 사용방법 안내 문자를 보내드리겠습니다.'},
        {id:'account-sms', label:'아이디·비밀번호 문자 발송', script:'로그인 아이디와 초기 비밀번호를 문자로 보내드리겠습니다.'},
        {id:'address', label:'스티커 배송 주소 확인', script:'스티커를 받으실 배송 주소를 확인하겠습니다.'},
        {id:'sticker', label:'스티커 부착 및 사진 전송 안내', script:'스티커 수령 후 차량에 부착하고 안내된 번호로 사진을 보내주세요.'},
        {id:'app-info', label:'앱 등록 정보 확인 안내', script:'앱의 내 정보에서 차량과 회원 정보가 맞는지 확인해 주세요.'},
        {id:'available', label:'이용 가능 시점 안내', script:'가입 완료 문자를 받으신 후 바로 이용하실 수 있습니다.'},
        {id:'closing', label:'마무리 인사', script:'안내드린 내용 중 궁금하신 사항은 없으실까요? 감사합니다.'}
      ]}
    ]
  };

  let root = null;
  let data = clone(defaults);
  let draft = null;
  let editing = false;
  let unsubscribe = null;
  let checked = loadChecked();

  function loadChecked() {
    try { return new Set(JSON.parse(sessionStorage.getItem(CHECK_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function saveChecked() {
    sessionStorage.setItem(CHECK_KEY, JSON.stringify([...checked]));
  }
  function allItems(source=data) {
    return source.sections.flatMap(section => section.items || []);
  }
  function progress() {
    const items = allItems();
    const done = items.filter(item => checked.has(item.id)).length;
    return {done, total:items.length, rate:items.length ? Math.round(done / items.length * 100) : 0};
  }

  function renderGuide() {
    const state = progress();
    return `<section class="sc-wrap">
      <header class="sc-hero">
        <div><p>NEW MEMBER CHECKLIST</p><h2>${esc(data.title)}</h2><span>안내가 끝난 항목을 체크하며 상담을 진행하세요.</span></div>
        <div class="sc-actions">
          ${window.signupChecklistBridge?.isAdmin?.() ? '<button type="button" data-action="edit">⚙ 체크리스트 관리</button>' : ''}
          <button type="button" data-action="reset">↻ 체크 초기화</button>
        </div>
      </header>
      <div class="sc-progress"><div><strong>${state.done}</strong> / ${state.total} 완료</div><span><i style="width:${state.rate}%"></i></span><b>${state.rate}%</b></div>
      <main class="sc-guide">
        <div class="sc-head"><strong>체크 항목</strong><strong>상담 안내 문구</strong></div>
        ${data.sections.map((section, sectionIndex) => `
          <section class="sc-section">
            <h3><span>${sectionIndex + 1}</span>${esc(section.title)}</h3>
            ${(section.items || []).map(item => `<label class="sc-row ${checked.has(item.id) ? 'checked' : ''}">
              <span class="sc-check"><input type="checkbox" data-check="${esc(item.id)}" ${checked.has(item.id) ? 'checked' : ''}><strong>${esc(item.label)}</strong></span>
              <span class="sc-script">${esc(item.script)}</span>
            </label>`).join('')}
          </section>`).join('')}
      </main>
    </section>`;
  }

  const moveButtons = (type, sectionIndex, itemIndex) =>
    `<button type="button" data-move="${type}:up:${sectionIndex}:${itemIndex ?? ''}" title="위로">↑</button>
     <button type="button" data-move="${type}:down:${sectionIndex}:${itemIndex ?? ''}" title="아래로">↓</button>`;

  function renderEditor() {
    return `<section class="sc-wrap sc-admin">
      <header class="sc-admin-top">
        <div><p>CHECKLIST EDITOR</p><h2>상담 체크리스트 관리</h2></div>
        <div><button type="button" data-action="cancel">취소</button><button class="primary" type="button" data-action="save">Firebase에 저장</button></div>
      </header>
      <label class="sc-title-field">체크리스트 제목<input data-title value="${esc(draft.title)}"></label>
      <div class="sc-admin-sections">
        ${draft.sections.map((section, sectionIndex) => `<section class="sc-admin-section">
          <header>
            <input data-section-title="${sectionIndex}" value="${esc(section.title)}" aria-label="구역 제목">
            <div>${moveButtons('section', sectionIndex)}<button type="button" class="danger" data-delete-section="${sectionIndex}">구역 삭제</button></div>
          </header>
          <div class="sc-admin-items">
            ${(section.items || []).map((item, itemIndex) => `<div class="sc-admin-item">
              <div class="sc-item-order">${moveButtons('item', sectionIndex, itemIndex)}</div>
              <label>체크 항목<input data-item-label="${sectionIndex}:${itemIndex}" value="${esc(item.label)}"></label>
              <label>상담 안내 문구<textarea data-item-script="${sectionIndex}:${itemIndex}">${esc(item.script)}</textarea></label>
              <button type="button" class="danger" data-delete-item="${sectionIndex}:${itemIndex}">삭제</button>
            </div>`).join('')}
          </div>
          <button type="button" class="sc-add-item" data-add-item="${sectionIndex}">＋ 체크 항목 추가</button>
        </section>`).join('')}
      </div>
      <button type="button" class="sc-add-section" data-action="add-section">＋ 새 구역 추가</button>
    </section>`;
  }

  function render() {
    if(!root) return;
    root.innerHTML = editing ? renderEditor() : renderGuide();
  }
  function swap(list, index, direction) {
    const target = direction === 'up' ? index - 1 : index + 1;
    if(target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
  }
  function pair(value) { return value.split(':').map(Number); }

  function onClick(event) {
    const button = event.target.closest('button');
    if(!button) return;
    const action = button.dataset.action;
    if(action === 'edit') { draft = clone(data); editing = true; render(); return; }
    if(action === 'cancel') { editing = false; draft = null; render(); return; }
    if(action === 'reset') {
      if(confirm('현재 체크된 항목을 모두 초기화할까요?')) { checked.clear(); saveChecked(); render(); }
      return;
    }
    if(action === 'add-section') {
      draft.sections.push({id:uid('section'), title:'새 구역', items:[]}); render(); return;
    }
    if(action === 'save') { save(button); return; }
    if(button.dataset.addItem !== undefined) {
      draft.sections[Number(button.dataset.addItem)].items.push({id:uid('item'), label:'새 체크 항목', script:'상담 안내 문구를 입력하세요.'});
      render(); return;
    }
    if(button.dataset.deleteSection !== undefined) {
      if(confirm('이 구역과 포함된 항목을 삭제할까요?')) { draft.sections.splice(Number(button.dataset.deleteSection), 1); render(); }
      return;
    }
    if(button.dataset.deleteItem !== undefined) {
      const [s, i] = pair(button.dataset.deleteItem);
      draft.sections[s].items.splice(i, 1); render(); return;
    }
    if(button.dataset.move) {
      const [type, direction, sectionText, itemText] = button.dataset.move.split(':');
      const sectionIndex = Number(sectionText);
      if(type === 'section') swap(draft.sections, sectionIndex, direction);
      else swap(draft.sections[sectionIndex].items, Number(itemText), direction);
      render();
    }
  }

  function onInput(event) {
    if(!editing || !draft) return;
    if(event.target.matches('[data-title]')) draft.title = event.target.value;
    if(event.target.dataset.sectionTitle !== undefined) draft.sections[Number(event.target.dataset.sectionTitle)].title = event.target.value;
    if(event.target.dataset.itemLabel) {
      const [s, i] = pair(event.target.dataset.itemLabel); draft.sections[s].items[i].label = event.target.value;
    }
    if(event.target.dataset.itemScript) {
      const [s, i] = pair(event.target.dataset.itemScript); draft.sections[s].items[i].script = event.target.value;
    }
  }

  function onChange(event) {
    if(!event.target.matches('[data-check]')) return;
    event.target.checked ? checked.add(event.target.dataset.check) : checked.delete(event.target.dataset.check);
    saveChecked();
    render();
  }

  async function save(button) {
    if(!draft.sections.length) { alert('구역을 하나 이상 추가해 주세요.'); return; }
    if(draft.sections.some(section => !section.title.trim() || !(section.items || []).length)) {
      alert('각 구역에 제목과 체크 항목을 하나 이상 입력해 주세요.'); return;
    }
    button.disabled = true; button.textContent = '저장 중…';
    try {
      await window.signupChecklistBridge.save(clone(draft));
      data = clone(draft); editing = false; draft = null; render();
      alert('상담 체크리스트를 저장했습니다.');
    } catch(error) {
      button.disabled = false; button.textContent = 'Firebase에 저장';
      alert('저장하지 못했습니다: ' + (error.message || error));
    }
  }

  window.mountSignupChecklist = element => {
    if(root && root !== element) unsubscribe?.();
    root = element;
    root.onclick = onClick;
    root.oninput = onInput;
    root.onchange = onChange;
    unsubscribe = window.signupChecklistBridge?.subscribe?.(remote => {
      data = clone(remote);
      if(!editing) render();
    }) || null;
    render();
  };
})();
