(() => {
  const M=OfinModel,F=OfinFiles,KEY='hmm-ofin-practice-v1',app=document.getElementById('app'),modal=document.getElementById('modal');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>Number(n||0).toLocaleString('ko-KR')+'원',day=s=>String(s||'').slice(0,10).replaceAll('-','.');
  let state=M.seed(),tab='wait',detail=null,profile=false,selected=new Set(),confirmIds=[],decision='',consented=false,authStage=0,authBusiness='',authBirthday='',onboarding=false;
  const filters={approved:true,rejected:true,from:'',to:'',status:'all'};
  try{const data=JSON.parse(localStorage.getItem(KEY));if(data?.schema===1&&Array.isArray(data.items)&&data.items.every(x=>typeof x.id==='string'&&Number.isFinite(x.amount)))state=data;}catch{}
  if(state.contractComplete===undefined)state.contractComplete=true;
  if(state.business.name==='교육용 화물')state.business.name='화물맨/홍길동';
  if(!state.contractComplete&&!state.registration)state.registration=OfinOnboarding.fresh();
  // Persist practice results, but never restore the previous login or screen.
  state.loggedIn=false;
  if(state.registration)state.registration.active=false;
  onboarding=false;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('연습 상태를 보관하지 못했습니다. 현재 화면에서는 계속 연습할 수 있습니다.');}}
  const button=(text,action,extra='')=>`<button type="button" data-action="${action}" ${extra}>${text}</button>`;
  const brand=()=>'<div class="brand"><span>화물맨</span> × Ofin</div>';
  const footer=()=>'<footer class="footer"><b>Ofin</b>(주)올라핀테크 · 교육용 예시 화면<br>고객센터 070-7174-3650 / 평일 10:00 ~ 17:00 (점심시간 11:30 ~ 13:00)<br>© 2025 allra fintech Corp. All Rights Reserved.</footer>';
  function toast(text){const el=document.getElementById('toast');el.textContent=text;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3500);}
  function render(){
    document.getElementById('practice').textContent=state.loggedIn||onboarding?'로그인 화면 보기':'로그인된 화면 보기';
    if(onboarding){OfinOnboarding.render({app,state,persist,onExit:exitContract,onComplete:completeContract});return;}
    if(!state.loggedIn){renderLogin();return;}
    const s=M.summary(state);
    app.innerHTML=`<header class="header">${brand()}${button(esc(state.business.name)+' ▾','profile',`aria-expanded="${profile}" aria-label="사업자 정보 열기"`)}</header>
      ${profile?`<aside class="profile" aria-label="사업자 정보"><b>${esc(state.business.name)}</b><dl><dt>사업자등록번호</dt><dd>${esc(state.business.number)}</dd><dt>대표자명</dt><dd>${esc(state.business.representative)}</dd><dt>휴대폰번호</dt><dd>${esc(state.business.phone)}</dd></dl>${button('로그아웃','logout')}</aside>`:''}
      <main class="body">${detail?detailHtml(state.items.find(x=>x.id===detail)):`<nav class="tabs" role="tablist">${button('승인대기','wait',`role="tab" aria-selected="${tab==='wait'}"`)}${button('처리내역','history',`role="tab" aria-selected="${tab==='history'}"`)}</nav>${tab==='wait'?waitHtml(s):historyHtml(s)}`}</main>${footer()}`;
  }
  function openContract(fresh=false){modal.close();modal.className='';if(fresh||!state.registration)state.registration=OfinOnboarding.fresh();state.registration.active=true;state.loggedIn=true;onboarding=true;profile=false;detail=null;persist();render();}
  function exitContract(){state.registration.active=false;onboarding=false;state.loggedIn=!!state.contractComplete;persist();render();}
  function completeContract(r){
    state.contractComplete=true;state.loggedIn=true;r.active=false;onboarding=false;
    state.availableLimit=160000000;state.feeDays=r.feeDays;state.feeRate=M.feePlan(r.feeDays).rate;
    state.business={...state.business,name:r.company+'/'+r.name,representative:r.name,number:r.businessNumber.replace(/(\d{3})(\d{2})(\d{5})/,'$1-$2-$3')};
    state.items=state.items.map(x=>x.status==='pending'?{...x,settlement:M.exampleSettlementDate(x.applied,r.feeDays)}:x);
    tab='wait';detail=null;persist();render();toast('계약 실습을 완료했습니다. 승인대기 내역을 확인해 주세요.');
  }
  function renderLogin(){
    app.innerHTML=`<header class="header">${brand()}</header><main class="login"><h1>운송 정보 확인을 위해<br>사업자등록번호와<br>대표자 생년월일을<br>입력해주세요</h1>
      <label>사업자등록번호<input id="business" inputmode="numeric" maxlength="10" placeholder="사업자등록번호 10자리" value="${esc(authBusiness)}" ${authStage?'readonly':''}></label>
      <label>대표자 생년월일<input id="birthday" inputmode="numeric" maxlength="8" placeholder="YYYYMMDD" value="${esc(authBirthday)}" ${authStage?'readonly':''}></label>
      ${authStage?'<div class="warn">교육용 인증번호는 <b>123456</b>입니다.</div><label>인증번호<input id="otp" inputmode="numeric" maxlength="6" placeholder="인증번호 6자리"></label>':''}
      ${button(authStage?'로그인':'인증번호 받기',authStage?'verify':'send-code','class="submit" disabled')}
      <small>로그인·인증은 교육용으로만 진행됩니다. 임의의 예시 정보를 입력하세요.</small></main>`;
  }
  function validLogin(){const y=Number(authBirthday.slice(0,4)),m=Number(authBirthday.slice(4,6)),d=Number(authBirthday.slice(6));const date=new Date(y,m-1,d);return /^\d{10}$/.test(authBusiness)&&/^\d{8}$/.test(authBirthday)&&y>=1900&&date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d&&date<=new Date();}
  function waitHtml(s){const items=state.items.filter(x=>x.status==='pending');return `<section class="pending-summary"><div>대기 건수<b>${s.pendingCount}건</b></div><div>대기 금액<b>${money(s.pendingAmount)}</b></div></section>`+
    (!items.length?empty('승인 대기건이 없어요'):`<div class="selection"><label><input type="checkbox" data-select="all" aria-label="전체 선택" ${selected.size===items.length?'checked':''}>전체선택(${selected.size}/${items.length})</label>${button('선택거절','reject-selected',`class="reject" ${selected.size?'':'disabled'}`)}${button('선택승인','approve-selected',`class="approve" ${selected.size?'':'disabled'}`)}</div><div class="cards">${items.map(x=>`<article class="item"><div class="item-head"><label><input type="checkbox" data-select="${x.id}" aria-label="${esc(x.name)} ${x.id} 선택" ${selected.has(x.id)?'checked':''}><small>${day(x.applied)} 신청 / ${day(x.settlement)} 정산예정</small></label>${button('상세보기','detail',`class="link" data-id="${x.id}" aria-label="${x.id} 상세보기"`)}</div><p>${esc(x.name)}님　${esc(x.car)}</p><div class="money">${money(x.amount)}</div><div class="route"><b>상차</b><span>${day(x.upDate).slice(5)} 00:00 ${esc(x.up)}</span><b>하차</b><span>${day(x.downDate).slice(5)} 00:00 ${esc(x.down)}</span></div><div class="actions">${button('거절','reject',`class="reject" data-id="${x.id}"`)}${button('승인','approve',`class="approve" data-id="${x.id}"`)}</div></article>`).join('')}</div>`);}
  function empty(text){return `<div class="empty"><div class="symbol" aria-hidden="true">▤</div><p>${text}</p></div>`;}
  function historyHtml(s){const items=M.filter(state,filters),approved=state.items.filter(x=>x.status==='approved');const statuses=[['all','전체'],['scheduled','정산예정'],['settled','정산완료'],['overdue','미납'],['returned','지급반려']];
    return `<section class="info-grid"><div>남은 한도<b>${money(state.availableLimit)}</b></div><div>${new Date().getMonth()+1}월 처리 건수<b>${s.monthCount}건</b></div><div>${new Date().getMonth()+1}월 처리 금액<b>${money(s.monthAmount)}</b></div><div>내 수수료 조건<b style="font-size:15px">${state.feeDays||60}일 정산(납부) · ${state.feeRate||'2.4'}%</b></div></section><h2>내역</h2>
      <section class="filters"><span>처리상태</span><label><input type="checkbox" data-filter="approved" ${filters.approved?'checked':''}>승인</label><label><input type="checkbox" data-filter="rejected" ${filters.rejected?'checked':''}>거절</label><div class="dates"><label for="from">정산 (예정)일</label><input type="date" id="from" aria-label="정산 예정일 시작" value="${filters.from}"><span>~</span><input type="date" id="to" aria-label="정산 예정일 종료" value="${filters.to}"></div>${button('날짜 초기화','clear-dates','class="link"')}${button('⇩ 엑셀 다운로드','excel',items.length?'':'disabled')}</section>
      ${filters.approved&&!filters.rejected?`<div class="chips">${statuses.map(([key,label])=>button(label+' '+(key==='all'?approved.length:approved.filter(x=>x.settlementStatus===key).length),'status',`data-status="${key}" class="${filters.status===key?'on':''}"`)).join('')}</div>`:''}
      <div class="cards">${items.length?items.map(x=>`<article class="item"><div class="item-head"><b class="${x.status==='rejected'?'rejected-label':''}">${x.status==='rejected'?'거절':day(x.settlement)+' <span class="badge">정산예정</span>'}</b>${button('상세보기','detail',`class="link" data-id="${x.id}" aria-label="${x.id} 상세보기"`)}</div><small>${day(x.processedAt)} ${new Date(x.processedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})} 처리</small><div class="item-head"><p>${esc(x.name)}님　${esc(x.car)}</p><b>${money(x.amount)}</b></div></article>`).join(''):empty('처리내역이 없어요')}</div>
      <section class="contracts"><h2>계약서 다운로드</h2><small>PDF 파일로 다운받을 수 있어요</small>${documents(['안심결제 서비스 이용 계약서','CMS 자동이체 동의서'],false)}</section>`;
  }
  function documents(names,preview=true){return names.map(name=>`<div class="document-row"><span aria-hidden="true">▤</span>${button(esc(name),preview?'preview':'pdf',`class="doc-name" data-doc="${esc(name)}"`)}${preview?button('▧','preview',`class="icon" data-doc="${name}" aria-label="${name} 미리보기"`):''}${button('⇩','pdf',`class="icon" data-doc="${name}" aria-label="${name} 다운로드"`)}</div>`).join('');}
  function table(rows){return `<dl class="table">${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;}
  function detailHtml(x){if(!x)return empty('내역을 찾을 수 없어요');const pending=x.status==='pending';return `${button('‹','back','class="back" aria-label="뒤로가기"')}${!pending?`<p class="muted">처리일시 ${day(x.processedAt)}</p>`:''}
    <section class="section"><h2>운송 정보</h2>${table([['운송번호',esc(x.orderNumber)],['상차 정보',day(x.upDate)+' 00:00\n'+esc(x.up)],['하차 정보',day(x.downDate)+' 00:00\n'+esc(x.down)],['화물 정보',esc(x.cargo)]])}</section>
    <section class="section"><h2>금액 정보</h2>${table([['정산<br>예정 금액',`<div class="amount-line"><b>${money(x.amount)}</b></div>${!pending?`<div class="amount-parts"><p><span>운송료 (VAT포함)</span><span>${money(x.fare)}</span></p><p><span>산재보험료</span><span>-${money(x.insurance)}</span></p></div>`:''}`],['정산(납부)<br>예정일',day(x.settlement)+(pending?'':`　<span class="badge">${x.status==='approved'?'승인완료':'거절'}</span>`) ]])}</section>
    <section class="section"><h2>차주 정보</h2>${table([['차주명',esc(x.name)],['차량 정보',esc(x.car)]])}</section><section class="contracts"><h2>첨부서류</h2><small>이미지로 미리 보거나 PDF 파일로 다운받을 수 있어요</small>${documents(['인수증','세금계산서'])}</section>
    ${pending?`<div class="detail-actions">${button('거절','reject',`class="reject" data-id="${x.id}"`)}${button('승인','approve',`class="approve" data-id="${x.id}"`)}</div>`:''}`;}
  function show(html){modal.className='';modal.innerHTML=html;if(!modal.open)modal.showModal();}
  function confirm(ids,type){confirmIds=ids;decision=type;consented=false;confirmHtml();}
  function confirmHtml(){const approve=decision==='approved',items=state.items.filter(x=>confirmIds.includes(x.id));
    show(`<h2>${approve?'승인':'거절'} 처리</h2><p>${items.length}개의 신청건을 ${approve?'승인':'거절'}하시겠어요?<br>${approve?'승인':'거절'}할 총 신청금액 : <b>${money(items.reduce((s,x)=>s+x.amount,0))}</b></p>
      ${approve?`<div class="checkline"><label><input type="checkbox" id="consent" ${consented?'checked':''}>개인(신용)정보 필수적 동의_KB국민카드 (필수)</label>${button('›','terms','aria-label="동의 전문 보기"')}</div>`:'<small>실습용 거절 확인창입니다. 거절 후 처리내역에서 확인하세요.</small>'}
      <div class="actions">${button('취소','cancel')}${button(approve?'승인':'거절','confirm',`id="confirm-button" class="${approve?'approve':'reject'}" ${approve&&!consented?'disabled':''}`)}</div>`);}
  function download(bytes,type,name){const url=URL.createObjectURL(new Blob([bytes],{type})),a=Object.assign(document.createElement('a'),{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast(name+' 다운로드를 요청했습니다.');}
  function preview(name){const x=state.items.find(x=>x.id===detail);show(`<div class="item-head"><h2>${esc(name)}</h2>${button('닫기 ×','cancel','aria-label="미리보기 닫기"')}</div><div class="paper"><h2>${esc(name)}</h2><div class="watermark">교육용 예시</div>${x?`<table><tr><td>운송번호</td><td>${esc(x.orderNumber)}</td></tr><tr><td>상차 / 하차</td><td>${esc(x.up)}<br>${esc(x.down)}</td></tr><tr><td>차주 / 차량</td><td>${esc(x.name)} / ${esc(x.car)}</td></tr><tr><td>금액</td><td>${money(x.amount)}</td></tr></table>`:''}<p class="muted">실제 인수증·세금계산서·계약서를 대신하지 않는 연습용 서류입니다.</p></div>`);}
  function pdf(name){const x=state.items.find(x=>x.id===detail);download(F.pdf(['OFIN / HWAMULMAN TRAINING SAMPLE','NOT A VALID RECEIPT, INVOICE OR CONTRACT',name==='인수증'?'Delivery receipt':name==='세금계산서'?'Tax invoice':name.startsWith('CMS')?'CMS debit consent sample':'Safe payment service agreement sample',...(x?['Order: '+x.orderNumber,'Amount: KRW '+x.amount,'VAT-inclusive freight: KRW '+x.fare,'Industrial accident insurance: KRW '+x.insurance,'Settlement date: '+x.settlement]:[])]),'application/pdf',name+'_교육용.pdf');}
  function excel(){const rows=[['교육용 예시 · 실제 처리내역 아님'],['운송번호','처리상태','처리일시','정산예정일','차주명','차량번호','정산예정금액','운송료(VAT포함)','산재보험료','상차지','하차지'],...M.filter(state,filters).map(x=>[x.orderNumber,x.status==='approved'?'승인':'거절',x.processedAt,x.settlement,x.name,x.car,x.amount,x.fare,x.insurance,x.up,x.down])];download(F.xlsx(rows),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','오핀_처리내역_교육용.xlsx');}
  async function action(name,el){const id=el.dataset.id;
    if(name==='profile'){profile=!profile;render();}
    if(name==='logout'){showLogin();}
    if(name==='wait'||name==='history'){tab=name;detail=null;selected.clear();render();}
    if(name==='detail'){detail=id;profile=false;render();window.scrollTo(0,0);}
    if(name==='back'){detail=null;render();}
    if(name==='approve'||name==='reject')confirm([id],name==='approve'?'approved':'rejected');
    if(name==='approve-selected'||name==='reject-selected')confirm([...selected],name==='approve-selected'?'approved':'rejected');
    if(name==='cancel')modal.close();
    if(name==='terms')show('<h2>개인(신용)정보 필수적 동의_KB국민카드 (필수)</h2><p>필수 동의 체크와 전문 열기를 연습하는 교육용 예시입니다. 실제 동의·신용조회·개인정보 전송은 진행되지 않습니다.</p>'+button('승인 화면으로','terms-back'));
    if(name==='terms-back')confirmHtml();
    if(name==='confirm'){if(decision==='approved'&&!consented)return;try{state=M.decide(state,confirmIds,decision);persist();modal.close();detail=null;selected.clear();render();toast((decision==='approved'?'승인':'거절')+' 처리가 완료되었습니다.');}catch(e){toast(e.message);}}
    if(name==='preview')preview(el.dataset.doc);
    if(name==='pdf')pdf(el.dataset.doc);
    if(name==='excel')excel();
    if(name==='status'){filters.status=el.dataset.status;render();}
    if(name==='clear-dates'){filters.from=filters.to='';render();}
    if(name==='send-code'&&validLogin()){authStage=1;render();toast('교육용 인증번호 123456을 입력하세요.');}
    if(name==='verify'){if(document.getElementById('otp').value!=='123456'){toast('교육용 인증번호는 123456입니다.');return;}state.loggedIn=true;tab='wait';detail=null;if(!state.contractComplete){openContract();return;}persist();render();}
  }
  document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el&&!el.disabled)action(el.dataset.action,el);});
  document.addEventListener('change',e=>{const el=e.target;
    if(el.dataset.select){if(el.dataset.select==='all')selected=el.checked?new Set(state.items.filter(x=>x.status==='pending').map(x=>x.id)):new Set();else el.checked?selected.add(el.dataset.select):selected.delete(el.dataset.select);render();}
    if(el.dataset.filter){filters[el.dataset.filter]=el.checked;filters.status='all';render();}
    if(el.id==='consent'){consented=el.checked;document.getElementById('confirm-button').disabled=!consented;}
    if(el.id==='from'||el.id==='to'){filters[el.id]=el.value;if(filters.from&&filters.to&&filters.from>filters.to){if(el.id==='from')filters.to=filters.from;else filters.from=filters.to;}render();}
  });
  document.addEventListener('input',e=>{if(e.target.id==='business')authBusiness=e.target.value.replace(/\D/g,'');if(e.target.id==='birthday')authBirthday=e.target.value.replace(/\D/g,'');const b=app.querySelector('.submit');if(b)b.disabled=authStage?!/^\d{6}$/.test(document.getElementById('otp').value):!validLogin();});
  function showLogin(){modal.close();modal.className='';if(state.registration)state.registration.active=false;state.loggedIn=false;onboarding=false;authStage=0;authBusiness='';authBirthday='';profile=false;detail=null;persist();render();}
  document.getElementById('practice').onclick=()=>{if(state.loggedIn||onboarding){showLogin();return;}modal.close();if(state.registration)state.registration.active=false;state.loggedIn=true;onboarding=false;tab='wait';detail=null;profile=false;selected.clear();persist();render();};
  document.getElementById('firstContract').onclick=()=>openContract(true);
  document.getElementById('reset').onclick=()=>show('<h2>예시 초기화</h2><p>승인·거절한 연습 결과를 지우고 승인대기 2건으로 되돌릴까요?</p><div class="actions">'+button('취소','cancel')+button('초기화','reset-confirm')+'</div>');
  document.addEventListener('click',e=>{if(e.target.closest('[data-action="reset-confirm"]')){if(state.registration)state.registration.active=false;state=M.seed();state.loggedIn=true;state.contractComplete=true;onboarding=false;tab='wait';detail=null;profile=false;selected.clear();Object.assign(filters,{approved:true,rejected:true,from:'',to:'',status:'all'});persist();modal.close();render();toast('승인대기 2건으로 초기화했습니다.');}});
  modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
  render();
})();
