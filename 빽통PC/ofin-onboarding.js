/* Reconstructed from the member application example images. No live registration requests. */
window.OfinOnboarding = (() => {
  const documents=['화물맨 선정산 서비스 이용 계약서','CMS 자동이체 동의서','개인(신용)정보 수집/제공/조회 동의서','KB국민카드_개인(신용)정보 필수적 동의서'];
  const banks=['KB국민','NH농협','카카오뱅크','IBK기업','신한','우리','하나','토스뱅크','iM뱅크(대구)','새마을','부산','신협','우체국','광주','수협','SBI저축은행','중국','저축은행','씨티','KDB산업','산림조합'];
  const colors=['#d5a219','#d5b30b','#e5c30f','#2784b2','#3652ba','#2b9bb9','#28998b','#387bcd'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b=(text,action,extra='')=>`<button type="button" data-flow="${action}" ${extra}>${text}</button>`;
  let context,dialog,docIndex=0,signed=false,bound=false;
  const fresh=()=>({active:true,step:0,verified:false,uploaded:false,businessNumber:'1234567890',company:'화물맨',name:'홍길동',opened:'20191210',address:'서울특별시 강남구 예시로 123',bank:'',account:'',feeDays:null,agreements:[false,false,false,false]});
  const data=()=>context.state.registration;
  function validDate(value){if(!/^\d{8}$/.test(value))return false;const y=+value.slice(0,4),m=+value.slice(4,6),d=+value.slice(6),dt=new Date(y,m-1,d);return y>=1900&&dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d&&dt<=new Date();}
  function validBusiness(){const r=data();return /^\d{10}$/.test(r.businessNumber)&&r.company.trim()&&r.name.trim()&&r.address.trim()&&validDate(r.opened);}
  function validAccount(){return /^\d{8,20}$/.test(data().account);}
  function nextLabel(){return ['시작하기','본인인증하기','사업자등록증 첨부하기','확인했어요','','다음','다음','완료','확인','확인'][data().step];}
  function canNext(){const r=data();return r.step===3?!!validBusiness():r.step===5?validAccount():r.step===6?!!r.feeDays:r.step===7?r.agreements.every(Boolean):true;}
  const phone=()=>`<div class="hero-figure" aria-hidden="true"><svg viewBox="0 0 150 160"><rect x="38" y="8" width="74" height="132" rx="15" fill="#dfe6ef" stroke="#7b8796" stroke-width="4" transform="rotate(10 75 80)"/><rect x="46" y="20" width="58" height="100" rx="7" fill="white" transform="rotate(10 75 80)"/><path d="M94 83l34 14v24c0 22-33 35-34 35-1 0-34-13-34-35V97z" fill="#72d6c1"/><path d="M79 118l10 10 20-24" stroke="white" stroke-width="7" fill="none"/></svg></div>`;
  const resultIcon=()=>`<div class="hero-figure" aria-hidden="true"><svg viewBox="0 0 150 160"><path d="M35 32h72v104H35z" fill="#f2f6fa"/><path d="M48 54h43M48 68h43M48 82h34" stroke="#dce5ed" stroke-width="3"/><path d="M67 96l53-52 10 10-53 52-17 7z" fill="#c6b572"/></svg></div>`;
  function certificate(){const r=data();return `<div class="business-paper" role="img" aria-label="사업자등록증 예시"><div class="certificate-title">사업자등록증</div><dl><dt>등록번호</dt><dd>${esc(r.businessNumber||'1234567890')}</dd><dt>상호(법인명)</dt><dd>${esc(r.company)}</dd><dt>대표자</dt><dd>${esc(r.name)}</dd><dt>개업연월일</dt><dd>${esc(r.opened)}</dd><dt>사업장 소재지</dt><dd>${esc(r.address)}</dd></dl><div class="seal">예시 세무서</div><div class="paper-note">실습용 예시 사업자등록증</div></div>`;}
  function fields(){const r=data();return `<div class="flow-fields">${[['businessNumber','사업자등록번호','10자리 숫자'],['company','상호명','화물맨'],['name','대표자명','홍길동'],['opened','개업연월일','YYYYMMDD'],['address','사업장 소재지','사업장 주소']].map(([id,label,hint])=>`<label>${label}<input data-reg="${id}" id="reg-${id}" value="${esc(r[id])}" placeholder="${hint}" ${['businessNumber','opened'].includes(id)?`inputmode="numeric" maxlength="${id==='opened'?8:10}"`:''}></label>`).join('')}</div>`;}
  function body(){const r=data();switch(r.step){
    case 0:return `<h1>차주의 선정산 서비스 이용을 위해<br>진행해 주세요</h1><p class="subtitle">본 신청을 통해 귀사의 운송을 완료한 차주가<br>정산일을 기다리지 않고 운송비를 미리 지급받을 수 있어요.<br><br>세부 조건 및 계약은 이후 단계에서 안내됩니다.</p><ul class="checklist"><li><i>●</i><div><b>기업 신용등급 B- 이상 가능</b><br><span>신용등급 변동 시 서비스 이용이 제한될 수 있습니다.</span></div></li><li><i>▣</i><div><b>약정된 지급일에 선정산금 CMS 자동 회수</b><br><span>미납 발생 시 연 20%의 연체 수수료가 부과되며, 서비스 이용이 제한됩니다.</span></div></li><li><i>✓</i><div><b>차주 승인 절차</b><br><span>차주의 선정산 이용은 귀사의 승인 후 진행됩니다.<br>신청 후 7영업일 내 미승인 시 자동 거절</span></div></li><li><i>◴</i><div><b>한도 산정</b><br><span>선정산 가능 한도는 올라핀테크 심사 기준에 따라 결정됩니다.</span></div></li></ul>`;
    case 1:return `<p class="subtitle">휴대폰 인증이 필요해요</p><h1>서비스 이용을 위해<br>최초 1회 본인인증을 진행할게요</h1>${phone()}`;
    case 2:return '<p class="subtitle">사업자 확인이 필요해요</p><h1>사업자 확인을 위해<br>사업자등록증을 첨부해 주세요.</h1><div style="min-height:220px"></div>';
    case 3:return `<h1>첨부한 사업자등록증 정보가<br>맞는지 확인해 주세요</h1>${certificate()}${b('다시 첨부','upload-again','class="small-action"')}${fields()}`;
    case 4:return `<h1>나중에 출금될 계좌를 연결할게요</h1><p class="subtitle">은행을 선택해 주세요</p><div class="bank-grid">${banks.map((name,i)=>b(`<span class="bank-mark" aria-hidden="true" style="color:${colors[i%colors.length]}">${esc(name.slice(0,2))}</span>${esc(name)}`,'bank',`data-bank="${name}" aria-pressed="${r.bank===name}"`)).join('')}</div>`;
    case 5:return `<p class="subtitle">자동이체 출금 계좌 등록</p><h1>${esc(r.bank)}<br>계좌번호를 입력해 주세요.</h1><div class="flow-fields"><label>계좌번호<input data-reg="account" id="reg-account" aria-describedby="account-help" inputmode="numeric" maxlength="20" placeholder="계좌번호 입력" value="${esc(r.account)}"></label></div>${b('예시 계좌번호 입력','sample-account','class="link"')}<p class="condition-note" id="account-help" role="status">${accountHelp()}</p>`;
    case 6:return `<h1>차주 수수료 조건을 선택해 주세요</h1><p class="subtitle">전자계약 진행 전<br>차주에게 적용될 선정산 수수료 조건을 설정합니다 (1개만 선택 가능).</p>${OfinModel.feePlans.map(plan=>`<label class="fee-option"><input type="radio" name="feeDays" value="${plan.days}" ${r.feeDays===plan.days?'checked':''}>${plan.days}일 정산<div class="fee-table"><span>수수료</span><b>${plan.rate}%</b><span>지급구간</span><span>회수일</span><span>1일~15일</span><span>${plan.first}</span><span>16일~말일</span><span>${plan.second}</span></div></label>`).join('')}<p class="condition-note">지급일 기준 약 30·45·60일 후 CMS 자동 회수됩니다.<br>조건 변경은 올라핀테크 고객센터 및 담당자 이관 접수를 통해 가능합니다.</p>`;
    case 7:return `<h1>전자계약 서명을 진행할게요</h1><p class="subtitle">각 문서를 눌러 계약서에 서명하고 동의서 3종을 확인해 주세요.<br>4개 항목을 모두 완료하면 아래 완료 버튼이 활성화됩니다.</p><p class="condition-note" role="status">확인 완료 ${r.agreements.filter(Boolean).length}/4</p><div class="contract-docs">${documents.map((name,i)=>b(`<span aria-hidden="true">▤</span>${name}<span class="tick">${r.agreements[i]?'✓':'⌄'}</span>`,'document',`data-doc="${i}" class="${r.agreements[i]?'done':''}" aria-label="${name}${r.agreements[i]?' 완료':''}"`)).join('')}</div>`;
    case 8:return `<div class="result">${resultIcon()}<h1>${esc(r.company)}님의 한도가 확인되었습니다.</h1><p class="subtitle">아래 한도 내에서 귀사의 운송을 완료한 차주 선정산 진행이 가능합니다.</p><div class="limit-card"><span class="muted">한도 평가 금액</span><b>160,000,000원</b></div></div>`;
    case 9:return `<div class="result">${resultIcon()}<h1>${esc(r.company)}님의 사용이 불가합니다.</h1><p class="subtitle">귀사의 신용도 등 확인 결과 선정산 이용이 불가합니다.</p><div class="limit-card"><span class="muted">한도 평가 금액</span><b>0원</b></div><p class="condition-note">신청 불가 상황을 확인하는 예시 화면입니다.</p></div>`;
  }}
  function render(ctx){context=ctx;dialog=document.getElementById('modal');if(!ctx.state.registration)ctx.state.registration=fresh();const r=data();
    ctx.app.innerHTML=`<header class="header"><div class="brand"><span>화물맨</span> × Ofin</div></header><main class="registration">${b('‹','back','class="back" aria-label="계약 이전 화면"')}<section class="flow-main">${body()}</section>${r.step===4?'':`<div class="flow-footer">${b(nextLabel(),'next',`class="flow-primary" id="flow-next" ${canNext()?'':'disabled'}`)}</div>`}${r.step===0?b('신청 불가 예시 보기','failure','class="failure-link"'):''}</main>`;
    if(!bound){bound=true;document.addEventListener('click',click);document.addEventListener('input',input);document.addEventListener('change',change);}
  }
  function repaint(){context.persist();render(context);window.scrollTo(0,0);}
  function show(title,content,footer=''){dialog.className='flow-dialog';dialog.innerHTML=`<div class="dialog-head"><h2>${title}</h2>${b('×','close','aria-label="계약 팝업 닫기"')}</div><div class="dialog-content">${content}</div>${footer?'<div class="dialog-footer">'+footer+'</div>':''}`;if(!dialog.open)dialog.showModal();}
  function showDocument(index){docIndex=index;signed=false;const contract=index===0;
    show(contract?'계약서 설명':'동의서 설명',`<div class="agreement-copy"><h3>${documents[index]}</h3><p>이 문서는 화면 이동과 동의·서명을 연습하기 위한 예시입니다.</p><p>회원사: ${esc(data().company)} / 대표자: ${esc(data().name)}<br>출금계좌: ${esc(data().bank)} ${esc(data().account)}<br>수수료 조건: ${data().feeDays}일 정산 · ${OfinModel.feePlan(data().feeDays).rate}%</p>${Array.from({length:5},()=>`<p>${contract?'계약서':'동의서'} 내용을 확인합니다. 본 화면의 예시 정보는 계약·출금·신용조회에 사용되지 않습니다.</p>`).join('')}</div>`,b(contract?'서명하기':'동의하기',contract?'signature':'agree'));
  }
  function signature(){signed=false;show('계약서 서명',`<p>${esc(data().name)}님의 서명을 입력해 주세요.</p><canvas id="flow-signature" width="800" height="260" aria-label="예시 서명 입력 영역"></canvas><div class="signature-tools">${b('다시 쓰기','clear-signature')}${b('예시 서명 입력','sample-signature')}</div><small>서명 연습용입니다. 실제 계약 서명은 전송되지 않습니다.</small>`,b('서명 완료','sign-complete','id="flow-sign-done" disabled'));
    const canvas=document.getElementById('flow-signature'),ctx=canvas.getContext('2d');ctx.strokeStyle='#28456e';ctx.lineWidth=4;ctx.lineCap='round';let drawing=false;
    const point=e=>{const rect=canvas.getBoundingClientRect();return [(e.clientX-rect.left)*canvas.width/rect.width,(e.clientY-rect.top)*canvas.height/rect.height];};
    canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...point(e));};
    canvas.onpointermove=e=>{if(!drawing)return;ctx.lineTo(...point(e));ctx.stroke();signed=true;document.getElementById('flow-sign-done').disabled=false;};
    canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;};
  }
  function identity(){show('본인인증',`<p>휴대폰 본인인증을 연습합니다.</p><div class="flow-fields"><label>이름<input id="flow-id-name" value="홍길동"></label><label>생년월일<input id="flow-id-birth" value="20000101" maxlength="8" inputmode="numeric"></label><label>휴대폰번호<input id="flow-id-phone" value="01000000000" maxlength="11" inputmode="numeric"></label></div><p class="condition-note">예시 정보로만 인증을 진행하며 실제 인증 요청은 하지 않습니다.</p>`,b('인증 완료','identity-complete','id="flow-id-done"'));}
  function accountHelp(){return validAccount()?"계좌번호 입력이 완료되었습니다. 다음을 눌러 수수료 조건을 선택해 주세요.":"계좌번호는 숫자 8~20자리로 입력해 주세요. 실습은 위의 예시 계좌번호 입력 버튼으로 진행할 수 있습니다.";}
  function refreshNext(){const next=document.getElementById('flow-next');if(next)next.disabled=!canNext();}
  function input(e){if(!context||!data().active)return;const field=e.target.dataset.reg;if(field){data()[field]=['businessNumber','opened','account'].includes(field)?e.target.value.replace(/\D/g,''):e.target.value;if(field==='account'){e.target.value=data().account;document.getElementById('account-help').textContent=accountHelp();}context.persist();refreshNext();}
    if(e.target.id?.startsWith('flow-id-')){const ok=document.getElementById('flow-id-name')?.value.trim()&&validDate(document.getElementById('flow-id-birth')?.value||'')&&/^01\d{9}$/.test(document.getElementById('flow-id-phone')?.value||'');document.getElementById('flow-id-done').disabled=!ok;}}
  function change(e){if(!context||!data().active)return;if(e.target.name==='feeDays'){data().feeDays=Number(e.target.value);context.persist();refreshNext();}}
  function click(e){const el=e.target.closest('[data-flow]');if(!el||el.disabled||!context||!data().active)return;const action=el.dataset.flow,r=data();
    if(action==='back'){if(r.step===0)context.onExit();else{r.step=r.step===9?0:r.step-1;repaint();}}
    if(action==='failure'){r.step=9;repaint();}
    if(action==='bank'){r.bank=el.dataset.bank;r.step=5;repaint();}
    if(action==='sample-account'){r.account='3333000100001';repaint();}
    if(action==='upload-again'){r.step=2;r.uploaded=false;repaint();}
    if(action==='document')showDocument(Number(el.dataset.doc));
    if(action==='close'){dialog.close();dialog.className='';}
    if(action==='signature')signature();
    if(action==='sample-signature'){const c=document.getElementById('flow-signature'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.font='italic 64px Malgun Gothic, sans-serif';ctx.fillStyle='#28456e';ctx.fillText(r.name,100,160);signed=true;document.getElementById('flow-sign-done').disabled=false;}
    if(action==='clear-signature'){const c=document.getElementById('flow-signature');c.getContext('2d').clearRect(0,0,c.width,c.height);signed=false;document.getElementById('flow-sign-done').disabled=true;}
    if(action==='agree'||action==='sign-complete'){if(action==='sign-complete'&&!signed)return;r.agreements[docIndex]=true;dialog.close();dialog.className='';repaint();}
    if(action==='identity-complete'){if(document.getElementById('flow-id-done').disabled)return;r.verified=true;r.step=2;dialog.close();dialog.className='';repaint();}
    if(action==='next'&&canNext()){
      if(r.step===1){identity();return;}
      if(r.step===2){r.uploaded=true;r.step=3;repaint();return;}
      if(r.step===7){r.step=8;repaint();return;}
      if(r.step===8){context.onComplete(r);return;}
      if(r.step===9){context.onExit();return;}
      r.step++;repaint();
    }
  }
  return {render,fresh};
})();
