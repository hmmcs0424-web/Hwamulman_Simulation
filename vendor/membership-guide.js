(() => {
  'use strict';

  let root = null;
  let steps = [];
  let currentId = '시작';
  let history = [];
  let fee = '0';
  let mode = 'guide';
  let editingId = '';
  let dirty = false;
  let imageScale = 1;
  let unsubscribe = null;

  const themes = {
    blue: ['#2563eb', '#eff6ff'], emerald: ['#059669', '#ecfdf5'],
    orange: ['#ea580c', '#fff7ed'], rose: ['#e11d48', '#fff1f2'],
    purple: ['#7c3aed', '#f5f3ff'], indigo: ['#4f46e5', '#eef2ff'],
    cyan: ['#0891b2', '#ecfeff'], teal: ['#0f766e', '#f0fdfa'],
    amber: ['#d97706', '#fffbeb'], slate: ['#475569', '#f8fafc']
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const byId = id => steps.find(step => step.id === id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const attr = esc;
  const current = () => byId(currentId) || byId('시작') || steps[0];
  const isAdmin = () => !!window.membershipGuideBridge?.isAdmin?.();

  function cleanHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '').replace(/{{fee}}/g, esc(fee));
    template.content.querySelectorAll('script,iframe,object,embed').forEach(node => node.remove());
    template.content.querySelectorAll('*').forEach(node => {
      [...node.attributes].forEach(attribute => {
        if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
        if ((attribute.name === 'href' || attribute.name === 'src') &&
            /^\s*javascript:/i.test(attribute.value)) node.removeAttribute(attribute.name);
      });
      if (node.tagName === 'A' && node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    return template.innerHTML;
  }

  function reachableIds() {
    const found = new Set();
    const queue = ['시작'];
    while (queue.length) {
      const id = queue.shift();
      if (found.has(id) || !byId(id)) continue;
      found.add(id);
      (byId(id).options || []).forEach(option => option.next && queue.push(option.next));
    }
    return found;
  }

  function brokenLinks() {
    const ids = new Set(steps.map(step => step.id));
    const broken = [];
    steps.forEach(step => (step.options || []).forEach(option => {
      if (option.next && !ids.has(option.next)) broken.push(`${step.title} → ${option.next}`);
    }));
    return broken;
  }

  function navigate(option) {
    if (!option?.next || !byId(option.next)) return;
    history.push(currentId);
    if (option.fee) fee = option.fee;
    currentId = option.next;
    render();
    root?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function goBack() {
    currentId = history.pop() || '시작';
    render();
  }

  function goHome() {
    currentId = '시작';
    history = [];
    fee = '0';
    render();
  }

  function renderGuide() {
    const step = current();
    if (!step) return '<div class="sg-empty">일시정지/복구/탈퇴 가이드 데이터가 없습니다.</div>';
    const color = themes[step.theme] || themes.blue;
    const crumbs = [...history, step.id].map(id => byId(id)).filter(Boolean);
    const attachments = (step.attachments || []).map(item => {
      const url = attr(item.url);
      if (item.type?.includes('image') || item.isBase64 && /^data:image/.test(item.url || '')) {
        return `<button type="button" class="sg-attachment" data-guide-image="${url}">▧ ${esc(item.name)}</button>`;
      }
      return `<a class="sg-attachment" href="${url}" target="_blank" rel="noopener">⇩ ${esc(item.name)}</a>`;
    }).join('');
    const options = (step.options || []).map((option, index) => `
      <button type="button" class="sg-option" data-option="${index}" style="--step-color:${color[0]}">
        <span class="sg-option-icon">›</span>
        <strong>${esc(option.label)}</strong>
        <span class="sg-chevron">→</span>
      </button>`).join('');

    return `
      <section class="sg-guide">
        <header class="sg-step-header" style="--step-color:${color[0]};--step-soft:${color[1]}">
          <div>
            <nav class="sg-crumbs">${crumbs.map((item, index) =>
              `<button type="button" data-crumb="${index}">${esc(item.title || item.id)}</button>`
            ).join('<span>›</span>')}</nav>
            <h2>${esc(step.title || step.id)}</h2>
          </div>
          <div class="sg-header-actions">
            ${isAdmin() ? '<button type="button" data-action="edit">⚙ 단계 관리</button>' : ''}
            <button type="button" data-action="home">⌂ 처음으로</button>
          </div>
        </header>
        <div class="sg-step-body">
          ${history.length ? '<button type="button" class="sg-back" data-action="back">← 이전 단계</button>' : ''}
          <article class="sg-script-card" style="--step-color:${color[0]}">
            <strong class="sg-script-label">확인 및 안내</strong>
            <div class="sg-richtext">${cleanHtml(step.script)}</div>
            ${attachments ? `<div class="sg-attachments">${attachments}</div>` : ''}
          </article>
          <div class="sg-options">${options || '<div class="sg-end">안내가 끝났습니다. 처음으로 돌아가 다른 업무를 확인할 수 있습니다.</div>'}</div>
        </div>
      </section>`;
  }

  function optionEditor(step) {
    return (step.options || []).map((option, index) => `
      <div class="sg-option-edit" data-option-row="${index}">
        <span class="sg-drag">↕</span>
        <input data-option-label="${index}" value="${attr(option.label)}" aria-label="버튼 이름">
        <select data-option-next="${index}" aria-label="다음 단계">
          ${steps.map(target => `<option value="${attr(target.id)}" ${target.id === option.next ? 'selected' : ''}>${esc(target.title || target.id)}</option>`).join('')}
        </select>
        <button type="button" data-delete-option="${index}" title="버튼 삭제">×</button>
      </div>`).join('');
  }

  function renderEditor() {
    const step = byId(editingId) || steps[0];
    if (!step) return '<div class="sg-empty">편집할 단계가 없습니다.</div>';
    editingId = step.id;
    const reachable = reachableIds();
    const broken = brokenLinks();
    return `
      <section class="sg-editor">
        <header class="sg-editor-top">
          <div><p>MEMBERSHIP GUIDE</p><h2>일시정지/복구/탈퇴 단계 관리</h2></div>
          <div>
            <button type="button" data-action="cancel-edit">상담 화면</button>
            <button type="button" class="primary" data-action="save">${dirty ? '변경사항 저장' : 'Firebase에 저장'}</button>
          </div>
        </header>
        <div class="sg-editor-alerts">
          <span>전체 ${steps.length}단계</span>
          <span class="${steps.length - reachable.size ? 'warn' : ''}">미연결 ${steps.length - reachable.size}단계</span>
          <span class="${broken.length ? 'danger' : ''}">깨진 연결 ${broken.length}개</span>
        </div>
        <div class="sg-editor-layout">
          <aside class="sg-step-list">
            <div class="sg-list-tools">
              <input id="sgStepSearch" placeholder="단계 검색" aria-label="단계 검색">
              <button type="button" data-action="add-step">＋</button>
            </div>
            <div id="sgStepItems">
              ${steps.map(item => `<button type="button" class="${item.id === step.id ? 'active' : ''} ${!reachable.has(item.id) ? 'orphan' : ''}" data-edit-step="${attr(item.id)}">
                <i style="background:${(themes[item.theme] || themes.blue)[0]}"></i>
                <span><strong>${esc(item.title || '제목 없음')}</strong><small>${esc(item.id)}</small></span>
                ${!reachable.has(item.id) ? '<em>미연결</em>' : ''}
              </button>`).join('')}
            </div>
          </aside>
          <main class="sg-edit-panel">
            <div class="sg-edit-heading">
              <code>${esc(step.id)}</code>
              <button type="button" class="danger-text" data-action="delete-step" ${step.id === '시작' ? 'disabled' : ''}>단계 삭제</button>
            </div>
            <div class="sg-form-grid">
              <label>단계 제목<input data-field="title" value="${attr(step.title)}"></label>
              <label>테마 색상<select data-field="theme">${Object.keys(themes).map(name =>
                `<option value="${name}" ${name === step.theme ? 'selected' : ''}>${name}</option>`
              ).join('')}</select></label>
            </div>
            <label class="sg-field">상담 내용 <small>기존 HTML 서식을 그대로 사용할 수 있습니다.</small>
              <textarea data-field="script">${esc(step.script)}</textarea>
            </label>
            <section class="sg-preview">
              <header>미리보기</header>
              <div class="sg-richtext">${cleanHtml(step.script)}</div>
            </section>
            <section class="sg-connections">
              <header><strong>선택 버튼과 다음 단계</strong><button type="button" data-action="add-option">＋ 버튼 추가</button></header>
              <div>${optionEditor(step) || '<p class="sg-muted">등록된 선택 버튼이 없습니다.</p>'}</div>
            </section>
            <details class="sg-advanced">
              <summary>첨부파일 및 고급 데이터 확인</summary>
              <textarea data-field="attachments" aria-label="첨부파일 JSON">${esc(JSON.stringify(step.attachments || [], null, 2))}</textarea>
            </details>
          </main>
        </div>
      </section>`;
  }

  function render() {
    if (!root) return;
    root.innerHTML = mode === 'edit' && isAdmin() ? renderEditor() : renderGuide();
  }

  function updateStep(mutator) {
    const index = steps.findIndex(step => step.id === editingId);
    if (index < 0) return;
    const updated = clone(steps[index]);
    mutator(updated);
    steps[index] = updated;
    dirty = true;
  }

  async function save() {
    const broken = brokenLinks();
    if (broken.length) {
      alert(`저장하기 전에 깨진 연결을 수정해 주세요.\n\n${broken.slice(0, 6).join('\n')}`);
      return;
    }
    const button = root.querySelector('[data-action="save"]');
    if (button) { button.disabled = true; button.textContent = '저장 중…'; }
    try {
      await window.membershipGuideBridge.save(clone(steps));
      dirty = false;
      alert('일시정지/복구/탈퇴 가이드를 저장했습니다.');
      render();
    } catch (error) {
      alert(`저장하지 못했습니다: ${error.message || error}`);
      render();
    }
  }

  function handleClick(event) {
    const optionButton = event.target.closest('[data-option]');
    if (optionButton) return navigate(current().options[Number(optionButton.dataset.option)]);
    const crumb = event.target.closest('[data-crumb]');
    if (crumb) {
      const index = Number(crumb.dataset.crumb);
      const path = [...history, currentId];
      currentId = path[index];
      history = path.slice(0, index);
      return render();
    }
    const image = event.target.closest('[data-guide-image],[data-popup-image]');
    if (image) {
      event.preventDefault();
      return openImage(image.dataset.guideImage || image.dataset.popupImage);
    }
    const editStep = event.target.closest('[data-edit-step]');
    if (editStep) { editingId = editStep.dataset.editStep; return render(); }
    const deleteOption = event.target.closest('[data-delete-option]');
    if (deleteOption) {
      updateStep(step => step.options.splice(Number(deleteOption.dataset.deleteOption), 1));
      return render();
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'home') return goHome();
    if (action === 'back') return goBack();
    if (action === 'edit') { mode = 'edit'; editingId = currentId; return render(); }
    if (action === 'cancel-edit') { mode = 'guide'; currentId = editingId || currentId; return render(); }
    if (action === 'save') return save();
    if (action === 'add-option') {
      updateStep(step => (step.options ||= []).push({ label: '새 선택 버튼', next: '시작', icon: 'chevronRight' }));
      return render();
    }
    if (action === 'add-step') {
      const id = `S_${Date.now()}`;
      steps.push({ id, title: '새 단계', theme: 'blue', type: 'menu', script: '<p>안내 내용을 입력해 주세요.</p>', attachments: [], options: [] });
      editingId = id;
      dirty = true;
      return render();
    }
    if (action === 'delete-step') {
      if (editingId === '시작') return;
      const incoming = steps.filter(step => (step.options || []).some(option => option.next === editingId));
      if (incoming.length) return alert(`이 단계로 연결된 항목이 ${incoming.length}개 있습니다. 연결을 먼저 변경해 주세요.`);
      if (!confirm(`“${byId(editingId)?.title}” 단계를 삭제할까요?`)) return;
      steps = steps.filter(step => step.id !== editingId);
      editingId = steps[0]?.id || '';
      dirty = true;
      return render();
    }
  }

  function handleInput(event) {
    if (event.target.id === 'sgStepSearch') {
      const query = event.target.value.trim().toLocaleLowerCase();
      root.querySelectorAll('[data-edit-step]').forEach(button => {
        button.hidden = !button.textContent.toLocaleLowerCase().includes(query);
      });
      return;
    }
    if (event.target.dataset.field) {
      const field = event.target.dataset.field;
      try {
        updateStep(step => {
          step[field] = field === 'attachments' ? JSON.parse(event.target.value || '[]') : event.target.value;
        });
        if (field === 'script') root.querySelector('.sg-preview .sg-richtext').innerHTML = cleanHtml(event.target.value);
      } catch (error) {
        if (field !== 'attachments') throw error;
      }
      return;
    }
    if (event.target.dataset.optionLabel != null) {
      updateStep(step => step.options[Number(event.target.dataset.optionLabel)].label = event.target.value);
    }
  }

  function handleChange(event) {
    if (event.target.dataset.optionNext != null) {
      updateStep(step => step.options[Number(event.target.dataset.optionNext)].next = event.target.value);
    }
  }

  function openImage(url) {
    if (!url) return;
    imageScale = 1;
    const overlay = document.createElement('div');
    overlay.className = 'sg-image-overlay';
    overlay.innerHTML = `<div class="sg-image-tools"><button data-zoom="-">−</button><span>100%</span><button data-zoom="+">＋</button><button data-close>×</button></div><div class="sg-image-stage"><img src="${attr(url)}" alt="가이드 이미지"></div>`;
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-close]')) return overlay.remove();
      const zoom = event.target.closest('[data-zoom]')?.dataset.zoom;
      if (!zoom) return;
      imageScale = Math.max(.5, Math.min(3, imageScale + (zoom === '+' ? .25 : -.25)));
      overlay.querySelector('img').style.transform = `scale(${imageScale})`;
      overlay.querySelector('span').textContent = `${Math.round(imageScale * 100)}%`;
    });
    document.body.appendChild(overlay);
  }

  async function mount(element) {
    root = element;
    mode = 'guide';
    root.className = 'signup-guide-root';
    root.addEventListener('click', handleClick);
    root.addEventListener('input', handleInput);
    root.addEventListener('change', handleChange);
    root.innerHTML = '<div class="sg-loading">일시정지/복구/탈퇴 가이드를 불러오는 중입니다…</div>';
    try {
      const response = await fetch('/membership-guide-data.json?v=1');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      steps = await response.json();
      if (!byId('S_1768732283280')) {
        steps.push({
          id: 'S_1768732283280',
          title: '일반 회원 복구',
          theme: 'emerald',
          type: 'menu',
          script: '<p><b>기존 가이드 데이터에 이 단계의 안내 내용이 비어 있습니다.</b></p><p>관리자 모드의 단계 관리에서 실제 상담 안내 내용을 입력해 주세요.</p>',
          attachments: [],
          options: []
        });
      }
      currentId = byId('시작') ? '시작' : steps[0]?.id;
      editingId = currentId;
      render();
    } catch (error) {
      root.innerHTML = `<div class="sg-empty">기본 가이드를 불러오지 못했습니다.<br>${esc(error.message)}</div>`;
    }
    unsubscribe?.();
    unsubscribe = window.membershipGuideBridge?.subscribe?.(remoteSteps => {
      if (!Array.isArray(remoteSteps) || !remoteSteps.length || dirty) return;
      steps = clone(remoteSteps);
      if (!byId(currentId)) currentId = '시작';
      if (!byId(editingId)) editingId = currentId;
      render();
    });
  }

  window.mountMembershipGuide = mount;
})();
