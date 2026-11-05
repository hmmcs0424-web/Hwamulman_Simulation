/* 화면별 교육 주의사항. 설정은 content.html 안의 JSON으로 저장됩니다. */
(() => {
  const data = document.getElementById('guide-warning-data');
  if (!data) return;
  document.getElementById('guide-warning-layer')?.remove();
  document.getElementById('guide-warning-editor')?.remove();
  const layer = document.createElement('aside');
  layer.id = 'guide-warning-layer'; layer.contentEditable = 'false';
  layer.setAttribute('aria-label','화면 주의사항');
  const editor = document.createElement('div');
  editor.id = 'guide-warning-editor'; editor.hidden = true; editor.contentEditable = 'false';
  editor.setAttribute('role','dialog'); editor.setAttribute('aria-modal','true');
  editor.setAttribute('aria-label','주의사항 팝업 관리');
  document.body.append(layer,editor);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const isEditing = () => document.body.contentEditable === 'true';
  const context = () => window.guideWarningContext();
  const read = () => {
    try { const parsed = JSON.parse(data.textContent); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  };
  const valid = item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.text === 'string' && Array.isArray(item.screens);
  const colors = ['yellow','red','blue'], positions = ['right','center','left'];
  let currentKey = '', signature = '', editingId = null, previousFocus = null;
  const dismissed = new Set();
  const screenName = key => context().screens.find(row => row[0] === key)?.[1] || key;
  function renderWarnings() {
    const items = read().filter(item => valid(item) && item.enabled !== false && item.screens.includes(currentKey) && !dismissed.has(item.id));
    layer.innerHTML = positions.map(position => `<div class="gwp-group" data-position="${position}">${items.filter(item => (positions.includes(item.position) ? item.position : 'right') === position).map(item => `<section class="gwp-card" data-color="${colors.includes(item.color) ? item.color : 'yellow'}"><header><strong>⚠ ${esc(item.title)}</strong><button type="button" data-dismiss-warning="${esc(item.id)}" aria-label="주의사항 닫기">×</button></header><div class="gwp-text">${esc(item.text)}</div></section>`).join('')}</div>`).join('');
  }
  function sync() {
    const key = context().key, nextSignature = data.textContent;
    const screenChanged = key !== currentKey;
    if (!screenChanged && signature === nextSignature) return;
    if (screenChanged) dismissed.clear();
    else if (signature !== nextSignature) dismissed.clear();
    currentKey = key; signature = nextSignature; renderWarnings();
    if (!editor.hidden) renderList();
  }
  function persist(items) {
    if (!isEditing()) return;
    const write = () => { data.textContent = JSON.stringify(items, null, 2).replace(/</g,'\\u003c'); };
    if (parent !== window && typeof parent.guideHistoryChange === 'function') parent.guideHistoryChange(write);
    else write();
    if (parent !== window && typeof parent.setGuideDirty === 'function') parent.setGuideDirty(true);
    sync();
  }
  function renderList() {
    const list = editor.querySelector('.gwe-items'); if (!list) return;
    const items = read().filter(valid);
    list.innerHTML = items.length ? items.map(item => `<article class="gwe-list-item"><strong>${esc(item.title)}</strong><small>${item.screens.map(screenName).map(esc).join('<br>')}${item.enabled === false ? '<br>표시 꺼짐' : ''}</small><button type="button" data-edit-warning="${esc(item.id)}">수정</button> <button type="button" class="gwe-danger" data-delete-warning="${esc(item.id)}">삭제</button></article>`).join('') : '<p class="gwe-help">등록된 주의사항이 없습니다.</p>';
  }
  function renderForm(item = null) {
    editingId = item?.id || null;
    const selected = item?.screens || [context().key];
    editor.querySelector('.gwe-form-host').innerHTML = `<form class="gwe-form" id="gwe-form"><label class="gwe-field">제목<input name="title" value="${esc(item?.title || '주의사항')}" maxlength="100" required></label><label class="gwe-field">내용<textarea name="text" maxlength="5000" placeholder="상담사가 확인해야 할 주의사항을 입력하세요." required>${esc(item?.text || '')}</textarea></label><fieldset><legend>표시할 화면 · 여러 개 선택 가능</legend><div class="gwe-screens">${context().screens.map(([key,name]) => `<label><input type="checkbox" name="screens" value="${esc(key)}" ${selected.includes(key) ? 'checked' : ''}>${esc(name)}${context().key === key ? ' (현재 화면)' : ''}</label>`).join('')}</div></fieldset><div class="gwe-pair"><label class="gwe-field">박스 위치<select name="position">${[['right','오른쪽 위'],['center','가운데 위'],['left','왼쪽 아래']].map(([value,title]) => `<option value="${value}" ${item?.position === value ? 'selected' : ''}>${title}</option>`).join('')}</select></label><label class="gwe-field">색상<select name="color">${[['yellow','노랑 · 주의'],['red','빨강 · 중요'],['blue','파랑 · 안내']].map(([value,title]) => `<option value="${value}" ${item?.color === value ? 'selected' : ''}>${title}</option>`).join('')}</select></label></div><label><input type="checkbox" name="enabled" ${item?.enabled !== false ? 'checked' : ''}> 지정한 화면에서 표시</label><p class="gwe-help">화면에 들어갈 때 자동으로 표시됩니다. 닫은 박스는 다른 화면으로 이동했다 돌아오면 다시 표시됩니다.</p><div class="gwe-preview" hidden></div><p class="gwe-error" role="status"></p><div class="gwe-actions"><button type="button" data-preview-warning>미리보기</button><button type="submit" class="gwe-primary">${item ? '수정 적용' : '등록'}</button></div><p class="gwe-help">적용 후 상단 편집 도구의 ‘저장’을 눌러야 파일에 보관됩니다.</p></form>`;
  }
  function closeEditor() {
    editor.hidden = true;
    previousFocus?.focus?.();
  }
  window.openGuideWarningEditor = () => {
    if (!isEditing()) return;
    previousFocus = document.activeElement;
    editor.hidden = false;
    editor.innerHTML = '<section class="gwe-window"><header class="gwe-header"><h2>⚠ 주의사항 팝업 관리</h2><button type="button" data-close-warning-editor aria-label="주의사항 설정 닫기">닫기 ×</button></header><div class="gwe-body"><aside class="gwe-list"><button type="button" data-new-warning>+ 새 주의사항</button><div class="gwe-items"></div></aside><div class="gwe-form-host"></div></div></section>';
    renderList(); renderForm();
    editor.querySelector('[name=title]').focus();
  };
  layer.addEventListener('click', event => {
    const button = event.target.closest('[data-dismiss-warning]');
    if (button) { dismissed.add(button.dataset.dismissWarning); renderWarnings(); }
  });
  editor.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-close-warning-editor')) closeEditor();
    if (button.hasAttribute('data-new-warning')) renderForm();
    if (button.dataset.editWarning) renderForm(read().find(item => item.id === button.dataset.editWarning));
    if (button.dataset.deleteWarning) {
      persist(read().filter(item => item.id !== button.dataset.deleteWarning));
      if (editingId === button.dataset.deleteWarning) renderForm();
    }
    if (button.hasAttribute('data-preview-warning')) {
      const form = editor.querySelector('form'), preview = form.querySelector('.gwe-preview');
      preview.hidden = false;
      preview.textContent = '⚠ '+form.elements.title.value+'\n\n'+form.elements.text.value;
    }
  });
  editor.addEventListener('submit', event => {
    event.preventDefault(); if (!isEditing()) return;
    const form = event.target, fields = new FormData(form);
    const screens = fields.getAll('screens').filter(key => context().screens.some(row => row[0] === key));
    const title = String(fields.get('title') || '').trim(), text = String(fields.get('text') || '').trim();
    const error = form.querySelector('.gwe-error');
    error.style.color = '#b91c1c';
    if (!title || !text || !screens.length) { error.textContent = '제목·내용과 표시할 화면을 확인해 주세요.'; return; }
    const item = {id:editingId || 'warning-'+crypto.randomUUID(),title,text,screens,position:fields.get('position'),color:fields.get('color'),enabled:fields.has('enabled')};
    const items = read(), index = items.findIndex(row => row.id === item.id);
    if (index < 0) items.push(item); else items[index] = item;
    persist(items); renderForm(item);
    editor.querySelector('.gwe-error').style.color = '#15803d';
    editor.querySelector('.gwe-error').textContent = '적용했습니다. 편집 도구의 저장을 눌러 주세요.';
  });
  editor.addEventListener('keydown', event => {
    if (/^F\d+$/.test(event.key)) { event.preventDefault(); event.stopPropagation(); return; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeEditor(); }
    if (event.key === 'Tab') {
      const fields = [...editor.querySelectorAll('button,input,textarea,select')].filter(el => !el.disabled);
      const first = fields[0], last = fields.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  // 화면 키와 설정 JSON이 달라질 때만 다시 그립니다. 되돌리기도 이 경로로 반영됩니다.
  setInterval(() => {
    if (!editor.hidden && !isEditing()) closeEditor();
    sync();
  }, 250);
  sync();
})();
