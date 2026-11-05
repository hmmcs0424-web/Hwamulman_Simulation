/* 채널톡 화면 연습용. 외부 채팅 서비스와 연결하지 않습니다. */
(() => {
  const launcher = document.querySelector('#ct .ch');
  if (!launcher) return;
  document.getElementById('btchat')?.remove();
  const panel = document.createElement('section');
  panel.id = 'btchat';
  panel.hidden = true;
  panel.contentEditable = 'false';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '화물맨 채널톡');
  panel.setAttribute('aria-modal', 'false');
  document.body.appendChild(panel);
  launcher.setAttribute('aria-controls', panel.id);
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-label', '채널톡 연결');
  document.body.classList.remove('btchat-open');

  const state = {page:'home', messages:[], draft:'', name:'교육용 회원', phone:'010-0000-0000', translation:true, sound:true, sms:false, email:false, startedAt:new Date(), attachments:[], emojiOpen:false, moreOpen:false, profileReturn:'settings'};
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const logo = (small = false) => `<span class="btc-logo${small ? ' small' : ''}" role="img" aria-label="화물맨 로고"></span>`;
  const plane = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4l20-2-9 20-3-9z" fill="currentColor"/><path d="M10 13l12-11" stroke="#0756c5" stroke-width="1.5"/></svg>';
  const icons = {
    home:'<path class="btc-home-icon" d="M4 10l8-7 8 7v11H4z"/><path class="btc-home-door" d="M10 21v-8h4v8"/>',
    conversations:'<path d="M20 17l1 4-5-1a9 9 0 1 1 4-3z"/><circle cx="8" cy="11" r=".5"/><circle cx="12" cy="11" r=".5"/><circle cx="16" cy="11" r=".5"/>',
    settings:'<path d="M10 3h4l.6 3 2 .9 2.7-1.1 2 3.4-2.1 2.1v2.4l2.1 2.1-2 3.4-2.7-1.1-2 .9-.6 3h-4l-.6-3-2-.9-2.7 1.1-2-3.4 2.1-2.1v-2.4L2.7 9.2l2-3.4 2.7 1.1 2-.9z"/><circle cx="12" cy="12" r="3.5"/>'
  };
  const action = (text, page, cls = 'btc-primary') => `<button type="button" class="${cls}" data-chat-page="${page}">${text}</button>`;
  function nav() {
    return '<nav class="btc-nav" aria-label="채널톡 메뉴" role="tablist">' + [['home','홈'],['conversations','대화'],['settings','설정']].map(([key,title]) => `<button type="button" role="tab" aria-selected="${state.page === key}" data-chat-page="${key}"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>${title}</button>`).join('') + '</nav>';
  }
  const powered = '<div class="btc-powered"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="18" height="18" rx="7" fill="currentColor"/><path d="M13 7a4 4 0 1 0 0 6" fill="none" stroke="white" stroke-width="2"/></svg>채널톡 이용중</div>';
  function home() {
    return `<header class="btc-header">${logo()}<h2>화물맨</h2></header><div class="btc-scroll"><div class="btc-card"><div class="btc-greeting">${logo(true)}<div><div class="btc-name">화물맨</div><p>방문해주셔서 감사합니다 :)<br>무엇을 도와드릴까요?</p></div></div>${action('문의하기 '+plane,'chat')}</div><button type="button" class="btc-contact" data-chat-page="phone"><span>다른 방법으로 문의</span><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2c-1 0-4 3-4 5 0 7 7 14 14 14 2 0 5-3 5-4l-5-4-3 3c-3-1-5-3-6-6l3-3z"/></svg></span></button>${powered}</div>${nav()}`;
  }
  const title = text => `<header class="btc-page-title">${text}</header>`;
  function conversations() {
    const last = state.messages.at(-1);
    return title('대화') + `<div class="btc-scroll">${last ? `<button type="button" class="btc-thread" data-chat-page="chat">${logo(true)}<div><strong>화물맨</strong><p>${escape(last.text || last.name || '')}</p></div></button>` : '<div class="btc-empty">진행 중인 대화가 없습니다.</div>'}<div class="btc-new">${action('새 문의하기 '+plane,'chat')}</div></div>${nav()}`;
  }
  const timeLabel = date => new Date(date).toLocaleTimeString('ko-KR', {hour:'numeric',minute:'2-digit',hour12:true});
  const mark = date => `<div class="btc-agent-mark">${logo(true)}<span>화물맨, ${escape(timeLabel(date))}</span></div>`;
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4m-7 7 7-7 7 7"/></svg>';
  const clip = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 15 7-7a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9a2 2 0 0 1 3 3L7 16"/></svg>';
  const smile = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M8 14q4 5 8 0m-8-5h.1m7.9 0h.1"/></svg>';
  function contactCheck() {
    return `<section class="btc-contact-check"><p>연락처를 확인해주세요. 오프라인 상태가 되면 문자(알림톡) 및 이메일로 답변 알림을 보내드려요.</p><p>(수집된 개인정보는 상담 답변 알림 목적으로만 이용되고, 삭제 요청을 주시기 전까지 보유됩니다. 제출하지 않으시면 상담 답변 알림을 받을 수 없어요.)</p><div class="btc-contact-info-card"><dl><dt>이름</dt><dd>${escape(state.name)}</dd><dt>휴대폰 번호</dt><dd>${escape(state.phone)}</dd></dl><button type="button" data-chat-page="profile" data-chat-profile-source="chat">✎ 정보 수정하기</button></div>${mark(state.messages[0].at)}</section>`;
  }
  function messageMarkup(message) {
    const body = message.kind === 'image' ? `<img src="${escape(message.url)}" alt="${escape(message.name)}"><span>${escape(message.name)}</span>` : escape(message.text || message.name);
    return `<div class="btc-own-row"><div class="btc-message mine">${body}</div><time>${escape(timeLabel(message.at))}</time></div>`;
  }
  function chat() {
    return `<header class="btc-chat-header"><button type="button" data-chat-page="home" aria-label="홈으로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>${logo(true)}<div class="btc-small-brand">화물맨<span class="btc-subtitle">빠르게 답변 받으실 수 있어요</span></div>${state.messages.length ? '<button type="button" class="btc-more" data-chat-action="more" aria-label="더보기">⋮</button>' : ''}</header><div class="btc-scroll" id="btc-message-list" role="log" aria-label="문의 메시지"><div class="btc-notice"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 7h5l8-4v14l-8-4H2zm3 6h3v5H5z" fill="currentColor"/></svg>국내 최고의 화물정보 플랫폼</div><div class="btc-message">방문해주셔서 감사합니다 :)<br>무엇을 도와드릴까요?</div>${mark(state.startedAt)}${state.messages.map((message,index) => messageMarkup(message) + (index === 0 ? contactCheck() : '')).join('')}</div><form class="btc-composer" id="btc-composer" aria-description="교육용 입력창입니다. 실제 상담사에게 전송되지 않습니다.">${state.attachments.length ? `<div class="btc-attachments">${state.attachments.map((file,index)=>`<span>${escape(file.name)} <button type="button" data-chat-remove-file="${index}" aria-label="첨부 취소">×</button></span>`).join('')}</div>` : ''}<textarea aria-label="메시지" placeholder="메시지를 입력해주세요." maxlength="2000" rows="1">${escape(state.draft)}</textarea><div class="btc-input-actions"><button type="button" class="btc-attach-button" data-chat-action="attach" aria-label="파일 첨부" ${state.draft.trim() ? 'hidden' : ''}>${clip}</button><button type="button" data-chat-action="emoji" aria-label="이모지 선택">${smile}</button><button type="submit" class="btc-send" aria-label="교육용 메시지 보내기" ${!state.draft.trim() && !state.attachments.length ? 'disabled' : ''}>${arrow}</button></div><input id="btc-file-input" type="file" multiple hidden>${state.emojiOpen ? '<div class="btc-emoji-picker" role="group" aria-label="이모지 선택">'+['😊','🙂','👍','🙏','❤️','🚚','✅','📦'].map(emoji=>`<button type="button" data-chat-emoji="${emoji}">${emoji}</button>`).join('')+'</div>' : ''}</form>${state.moreOpen ? '<div class="btc-bottom-sheet"><button type="button" class="btc-sheet-shade" data-chat-action="close-more" aria-label="더보기 닫기"></button><section><header>더보기<button type="button" data-chat-action="close-more" aria-label="더보기 닫기">×</button></header><button type="button" data-chat-action="leave">상담 나가기</button></section></div>' : ''}`;
  }
  function toggle(key, text) {
    return `<label class="btc-setting-row"><span>${text}</span><input class="btc-switch" type="checkbox" data-chat-setting="${key}" aria-label="${text}" ${state[key] ? 'checked' : ''}></label>`;
  }
  function settings() {
    return title('설정') + `<div class="btc-scroll"><div class="btc-profile"><span class="btc-avatar">👽</span><strong>${escape(state.name)}</strong><p>${escape(state.phone)}</p>${action('✎ 정보 수정하기','profile','btc-secondary')}</div><h3 class="btc-section-label">상담 환경</h3><label class="btc-setting-row"><span>◎　언어</span><select aria-label="상담 언어"><option>한국어</option></select></label>${toggle('translation','메시지 번역 표시')}${toggle('sound','알림음')}<h3 class="btc-section-label">광고 수신 설정</h3>${toggle('sms','문자 수신거부')}${toggle('email','이메일 수신거부')}<p class="btc-demo-note">교육용 설정은 이 화면 안에서만 적용됩니다.</p></div>${nav()}`;
  }
  function phone() {
    return title('<button type="button" data-chat-page="home" aria-label="홈으로 돌아가기">‹</button>다른 방법으로 문의') + `<div class="btc-scroll"><div class="btc-phone-view">화물맨 고객센터<strong>1800-1234</strong><p class="btc-demo-note">교육용 화면에서는 전화가 연결되지 않습니다.</p>${action('돌아가기','home')}</div></div>`;
  }
  function profile() {
    return title(`<button type="button" data-chat-page="${state.profileReturn}" aria-label="이전 화면으로 돌아가기">‹</button>정보 수정하기`) + `<div class="btc-scroll"><form id="btc-profile-form" class="btc-profile-form"><label>이름<input name="name" value="${escape(state.name)}" maxlength="30" required></label><label>연락처<input name="phone" value="${escape(state.phone)}" maxlength="20"></label><p class="btc-demo-note">교육용 예시 정보로 연습해 주세요.</p><button type="submit" class="btc-primary">저장</button></form></div>`;
  }
  function render() {
    panel.dataset.page = state.page;
    panel.innerHTML = ({home, conversations, chat, settings, phone, profile}[state.page] || home)();
    if (state.page === 'chat') {
      const list = panel.querySelector('#btc-message-list');
      list.scrollTop = list.scrollHeight;
    }
  }
  function position() {
    const anchor = launcher.getBoundingClientRect();
    const availableWidth = Math.max(0, window.innerWidth - (document.body.classList.contains('hp-open') ? 340 : 0));
    const width = Math.min(430, Math.max(0, availableWidth - 32));
    const height = Math.min(730, Math.max(0, window.innerHeight - 128));
    panel.style.width = width + 'px'; panel.style.height = height + 'px';
    panel.style.left = Math.max(16, Math.min(anchor.right - width, availableWidth - width - 16)) + 'px';
    panel.style.top = Math.max(12, Math.min(anchor.top - height - 10, window.innerHeight - height - 12)) + 'px';
    panel.style.right = panel.style.bottom = 'auto';
  }
  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? '채널톡 닫기' : '채널톡 연결');
    document.body.classList.toggle('btchat-open', open);
    if (open) { position(); render(); }
    else launcher.focus();
  }
  window.toggleBacktongChat = () => {
    if (document.body.classList.contains('guide-layout-editing')) return;
    setOpen(panel.hidden);
  };
  function updateComposer() {
    const input = panel.querySelector('textarea'); if (!input) return;
    input.style.height = 'auto'; input.style.height = Math.min(140, Math.max(32,input.scrollHeight)) + 'px';
    panel.querySelector('.btc-send').disabled = !state.draft.trim() && !state.attachments.length;
    panel.querySelector('.btc-attach-button').hidden = !!state.draft.trim();
  }
  panel.addEventListener('click', event => {
    const control = event.target.closest('[data-chat-action],[data-chat-emoji],[data-chat-remove-file]');
    if (control) {
      const kind = control.dataset.chatAction;
      if (kind === 'attach') { panel.querySelector('#btc-file-input').click(); return; }
      if (kind === 'emoji') state.emojiOpen = !state.emojiOpen;
      if (kind === 'more') state.moreOpen = true;
      if (kind === 'close-more') state.moreOpen = false;
      if (kind === 'leave') { releaseFiles(); state.messages=[]; state.attachments=[]; state.draft=''; state.moreOpen=false; state.page='home'; state.startedAt=new Date(); }
      if (control.dataset.chatEmoji) { state.draft += control.dataset.chatEmoji; state.emojiOpen = false; }
      if (control.dataset.chatRemoveFile !== undefined) {
        const [file] = state.attachments.splice(Number(control.dataset.chatRemoveFile),1); if(file?.url) URL.revokeObjectURL(file.url);
      }
      render(); updateComposer(); return;
    }
    const target = event.target.closest('[data-chat-page]');
    if (!target) return;
    if (target.dataset.chatPage === 'profile') state.profileReturn = target.dataset.chatProfileSource === 'chat' ? 'chat' : 'settings';
    state.page = target.dataset.chatPage; state.emojiOpen=false; state.moreOpen=false; render();
  });
  panel.addEventListener('input', event => { if (event.target.matches('textarea')) { state.draft = event.target.value; updateComposer(); } });
  panel.addEventListener('change', event => {
    if (event.target.id === 'btc-file-input') {
      for (const file of Array.from(event.target.files || [])) state.attachments.push({kind:file.type.startsWith('image/') ? 'image' : 'file',name:file.name,url:file.type.startsWith('image/') ? URL.createObjectURL(file) : ''});
      render(); return;
    }
    const key = event.target.dataset.chatSetting;
    if (key && Object.hasOwn(state,key)) state[key] = event.target.checked;
  });
  function releaseFiles() {
    [...state.messages,...state.attachments].forEach(file => {if(file.url) URL.revokeObjectURL(file.url)});
  }
  panel.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.id === 'btc-composer') {
      const text = state.draft.trim(); if (!text && !state.attachments.length) return;
      if (text) state.messages.push({kind:'text',text,at:new Date()});
      state.attachments.forEach(file => state.messages.push({...file,at:new Date()}));
      state.attachments=[]; state.draft = ''; state.emojiOpen=false; render();
      panel.querySelector('textarea').focus();
    } else if (event.target.id === 'btc-profile-form') {
      const data = new FormData(event.target);
      state.name = String(data.get('name')).trim() || '교육용 회원';
      state.phone = String(data.get('phone')).trim(); state.page = state.profileReturn; render();
    }
  });
  panel.addEventListener('keydown', event => {
    if (event.target.matches('textarea') && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault(); panel.querySelector('#btc-composer').requestSubmit();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); setOpen(false); }
  });
  window.addEventListener('beforeunload',releaseFiles);
  window.addEventListener('resize', () => { if (!panel.hidden) position(); });
  window.addEventListener('backtong-help-change', () => { if (!panel.hidden) position(); });
})();
