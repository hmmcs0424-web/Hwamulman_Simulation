/* Reusable icon assets and menus live in the existing section flow and its backups. */
(() => {
  const completed = new Set(), contexts = new Map(), toggles = new Map();
  let selectedMenu = '', editingAssetId = '', detailAssetId = '';
  const st = () => cache[activeSec];
  const screen = () => st()?.flow?.screens?.[st()?.cur];
  const uid = () => 'icon_' + crypto.randomUUID();
  const data = () => {
    const f = st()?.flow;
    if (!f) return null;
    const studio = f.iconStudio || (f.iconStudio = {assets: [], menus: []});
    // Recover labels flattened by the former single-line hotspot input bridge.
    for (const m of studio.menus) for (const b of m.buttons) {
      const a = studio.assets.find(a => a.id === b.assetId);
      const label = a?.displayName ?? a?.name;
      if (label?.includes('\n') && b.label === label.replace(/[\r\n]/g, '')) b.label = label;
    }
    return studio;
  };
  const menu = () => data()?.menus.find(m => m.id === selectedMenu);
  const key = (sec, origin, group, button) => JSON.stringify([sec, origin, group, button]);
  const style = document.createElement('style');
  style.textContent = `.icon-studio label{display:block;margin:8px 0;font-size:12px}.icon-studio input,.icon-studio select,.icon-studio textarea{max-width:100%;box-sizing:border-box}.icon-studio input[type=number]{width:70px}.icon-studio button{margin:3px}.icon-studio small{display:block;line-height:1.5;color:#64748b}.icon-studio-assets{display:flex;gap:6px;flex-wrap:wrap}.icon-studio-assets .icon-asset-choice{margin:0;max-width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;font:inherit;font-size:12px;overflow-wrap:anywhere;cursor:pointer}.icon-studio-assets .icon-asset-choice[aria-expanded=true]{background:#eff6ff;border-color:#2563eb;color:#1d4ed8}.icon-studio-assets .icon-asset-choice:focus-visible{outline:2px solid #2563eb;outline-offset:2px}.icon-studio-asset-detail{margin-top:8px}.icon-studio-assets img{width:36px;height:36px;object-fit:contain}.icon-menu-surface{position:absolute;z-index:22;overflow-x:auto;overflow-y:hidden;pointer-events:auto;touch-action:pan-x}.icon-menu-surface{scrollbar-width:none!important;-ms-overflow-style:none}.icon-menu-surface::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}.icon-menu-track{box-sizing:border-box;display:flex;align-items:flex-start;min-width:100%;height:100%;min-height:0;width:max-content}.icon-menu-move{position:absolute;right:1px;top:1px;z-index:3;width:18px;height:18px;padding:0;border-radius:4px;opacity:.65;cursor:move;touch-action:none;background:#dbeafe;color:#1d4ed8;border:0;font-size:11px}.icon-menu-surface:has(.icon-menu-move){outline:2px dashed #2563eb}.icon-menu-button{box-sizing:border-box;overflow:hidden;touch-action:none;flex-shrink:0;border:0;background:transparent;padding:3px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;font:inherit;color:#222}.icon-menu-button img{width:var(--icon-image-size);height:var(--icon-image-size);min-height:0;flex:0 0 var(--icon-image-size);object-fit:contain;pointer-events:none}.icon-menu-button span{display:block;flex-shrink:0;width:100%;min-width:0;font-size:11px;line-height:1.25;white-space:pre-wrap;overflow-wrap:anywhere;word-break:keep-all;text-align:center}.icon-menu-button.editing{outline:1px dashed #2563eb;outline-offset:-1px}.icon-studio-dialog{border:0;border-radius:12px;padding:22px;width:420px;max-width:90vw;max-height:85vh;overflow:auto}.icon-studio-dialog::backdrop{background:#0008}`;
  document.head.append(style);
  const panel = document.createElement('div');
  panel.className = 'admin-section icon-studio';
  document.getElementById('hsList').closest('.admin-section').after(panel);
  function field(label, id, value, type = 'number') {
    return `<label>${label} <input id="${id}" type="${type}" value="${esc(String(value))}" ${type==='number'?'min="0" step="1"':''}></label>`;
  }
  const usesCompletion=a=>a?.completionEnabled??!!(a?.doneImage||a?.doneName||a?.doneDisplayName||(a?.doneBackground&&a.doneBackground!=='transparent'));
  function refresh() {
    if (!st()?.flow || SECS[activeSec]?.type !== 'app') { panel.hidden = true; return; }
    panel.hidden = false;
    const d = data();
    if (!menu()) selectedMenu = d.menus[0]?.id || '';
    const editingAsset=d.assets.find(a=>a.id===editingAssetId);if(!editingAsset)editingAssetId='';
    const m = menu(), placement = screen()?.iconMenus?.find(p => p.menuId === m?.id);
    panel.innerHTML = `<div class="section-title">아이콘 · 공통 메뉴</div><small>크기를 정하고 아이콘을 추가하면 화면에 바로 배치됩니다. 메뉴 이동 손잡이를 드래그해 위치를 옮기세요. 내 이미지를 등록하고 메뉴에 추가하세요. 화면의 아이콘을 클릭하면 핫스팟을 설정합니다. 변경 후 경로 설정을 저장하세요.</small>
      <label>관리용 이름 <input id="isAssetName" placeholder="예: 즐겨찾기_미등록"></label><label>화면 표시 이름 <textarea id="isAssetLabel" rows="2" placeholder="예: 즐겨찾기"></textarea></label>
      <label>기본 배경색 <input id="isAssetBackground" type="color" value="#eeeeee"></label><label><input id="isAssetTransparent" type="checkbox" checked> 기본 배경 투명</label><label>기본 이미지 <input id="isAssetFile" type="file" accept="image/png,image/jpeg,image/webp"></label>
      <label><input id="isAssetCompletionEnabled" type="checkbox"> 완료 상태 사용 (선택)</label><fieldset id="isAssetCompletionFields" hidden disabled style="border:1px solid #ddd;border-radius:6px;padding:10px;margin:8px 0">
      <label>완료 관리용 이름 <input id="isAssetDoneName" placeholder="예: 인수증_완료"></label><label>완료 화면 표시 이름 <textarea id="isAssetDoneLabel" rows="2" placeholder="예: 인수증 완료"></textarea></label><label>완료 이미지 (선택) <input id="isDoneFile" type="file" accept="image/png,image/jpeg,image/webp"></label>
      <label>완료 배경색 <input id="isAssetDoneBackground" type="color" value="#eeeeee"></label><label><input id="isAssetDoneTransparent" type="checkbox" checked> 완료 배경 투명</label><small>기본·완료 배경색은 각각 이미지와 텍스트를 포함한 버튼 전체에 적용됩니다. 완료 이미지를 비워도 완료 후 배경색만 바꿀 수 있습니다.</small>${editingAsset?'<label><input id="isClearDone" type="checkbox"> 기존 완료 이미지 제거</label>':''}</fieldset>
      <button class="btn btn-secondary" id="isUpload">${editingAsset?'수정 내용 적용':'아이콘 등록'}</button>${editingAsset?'<button class="btn btn-secondary" id="isCancelAsset">수정 취소</button><small>이미지 파일을 선택하지 않으면 기존 이미지를 유지합니다. 수정은 이 아이콘을 사용하는 메뉴 전체에 적용됩니다.</small>':''}
      <div class="form-label" style="margin-top:12px">등록된 아이콘 (${d.assets.length}개)</div><div class="icon-studio-assets">${d.assets.map((a,i)=>`<button type="button" class="icon-asset-choice" id="isAssetDetail${i}" aria-expanded="${a.id===detailAssetId}" aria-controls="isAssetDetailPanel" title="${esc(a.name)}">${esc(a.name)}</button>`).join('')||'<small>등록된 아이콘이 없습니다.</small>'}</div>
<div id="isAssetDetailPanel" class="icon-studio-asset-detail">${d.assets.map((a,i)=>a.id===detailAssetId?`<div style="display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:1px solid #ddd;border-radius:6px"><div style="background:${esc(a.background||'transparent')};padding:4px;text-align:center"><img src="${esc(a.image)}" alt=""><small>${esc(a.displayName??a.name)}</small></div><div style="flex:1;min-width:0;overflow-wrap:anywhere"><b>${esc(a.name)}</b><small>기본 표시: ${esc(a.displayName??a.name)}<br>${usesCompletion(a)?`완료 관리: ${esc(a.doneName||'미지정')} · 완료 표시: ${esc(a.doneDisplayName||'등록 완료')}`:'완료 상태 사용 안 함'}<br>사용 중 ${assetUsers(a.id).length}개 버튼</small><button class="btn btn-secondary btn-sm" id="isEditAsset${i}">수정</button><button class="btn btn-secondary btn-sm" id="isDeleteAsset${i}">삭제</button></div></div>`:'').join('')}</div>
      <label>공통 메뉴 <select id="isMenu"><option value="">메뉴 선택</option>${d.menus.map(g=>`<option value="${esc(g.id)}" ${g.id===selectedMenu?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label>
      <button class="btn btn-secondary" id="isCreate">새 메뉴 묶음</button>
      ${m ? `${field('메뉴 이름','isMenuName',m.name,'text')}<small>이 메뉴를 사용하는 화면 ${Object.values(st().flow.screens).filter(s=>s.iconMenus?.some(p=>p.menuId===m.id)).length}개에 버튼·크기 변경이 함께 적용됩니다.</small>
      ${field('버튼 너비(px)','isW',m.width)}${field('버튼 높이(px)','isH',m.height)}${field('아이콘 사이 간격(px)','isGap',m.gap??10)}${field('메뉴 글자 크기(px)','isFontSize',m.fontSize??11)}${field('아이콘 이미지 크기(px)','isImageSize',m.imageSize??Math.max(1,Math.min(m.width-6,m.height-36.5)))}<small>이미지 크기는 모든 아이콘에 동일하게 적용됩니다. 표시 이름에서 Enter를 누르면 줄바꿈됩니다. 글자가 잘리면 버튼 높이를 늘려 주세요.</small><label><input id="isBold" type="checkbox" ${m.bold?'checked':''}> 메뉴명 굵게 (볼드)</label>
      <label>추가할 아이콘 <select id="isAsset">${d.assets.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></label>
      <button class="btn btn-secondary" id="isAdd">메뉴에 아이콘 추가</button>
      <div>${m.buttons.map((b,i)=>`<div><span>${esc(d.assets.find(a=>a.id===b.assetId)?.name||'아이콘')} · ${esc(b.label||'')}</span><button data-up="${i}" ${i===0?'disabled':''}>↑</button><button data-down="${i}" ${i===m.buttons.length-1?'disabled':''}>↓</button><button data-remove="${i}">삭제</button></div>`).join('')}</div>
      <hr><small>현재 화면의 메뉴 위치(화면 이미지 기준 %). 기존 가로 스크롤 영역을 선택하면 같은 위치에 배치합니다.</small>
      <select id="isRegion"><option value="">직접 위치 입력</option>${(screen()?.scrollRegions||[]).map((r,i)=>r.direction==='horizontal'?`<option value="${i}">가로 영역 ${i+1}</option>`:'').join('')}</select>
      ${field('왼쪽(%)','isLeft',placement?.left??0)}${field('위(%)','isTop',placement?.top??70)}${field('너비(%)','isPW',placement?.width??100)}${field('높이(%)','isPH',placement?.height??12)}
      <label>메뉴 배경 <input id="isBG" type="color" value="${esc(placement?.background||'#ffffff')}"></label>
      <button class="btn btn-primary" id="isApply">현재 화면에 적용 / 갱신</button>${placement?'<button id="isDetach">현재 화면에서 제거</button>':''}` : ''}
      <button class="btn btn-secondary" id="isReset">연습 완료 상태 초기화</button><button class="btn btn-primary" id="isSave">경로 설정 저장</button><div id="isStatus" role="status"></div>`;
    const on = (id, fn) => { const e=document.getElementById(id); if(e)e.onclick=fn; };
    on('isUpload', upload);
    const completionCheck=document.getElementById('isAssetCompletionEnabled'),completionFields=document.getElementById('isAssetCompletionFields');
    completionCheck.checked=usesCompletion(editingAsset);
    completionCheck.onchange=()=>{completionFields.hidden=!completionCheck.checked;completionFields.disabled=!completionCheck.checked;};
    completionCheck.onchange();
    if(editingAsset){
      document.getElementById('isAssetName').value=editingAsset.name;
      document.getElementById('isAssetLabel').value=editingAsset.displayName??editingAsset.name;
      document.getElementById('isAssetBackground').value=editingAsset.background&&editingAsset.background!=='transparent'?editingAsset.background:'#eeeeee';
      document.getElementById('isAssetTransparent').checked=!editingAsset.background||editingAsset.background==='transparent';
      document.getElementById('isAssetDoneName').value=editingAsset.doneName||'';
      document.getElementById('isAssetDoneLabel').value=editingAsset.doneDisplayName||'';
      const doneBackground=editingAsset.doneBackground||editingAsset.background||'transparent';
      document.getElementById('isAssetDoneBackground').value=doneBackground==='transparent'?'#eeeeee':doneBackground;
      document.getElementById('isAssetDoneTransparent').checked=doneBackground==='transparent';
    }
    on('isCancelAsset',()=>{editingAssetId='';refresh();});
    d.assets.forEach((a,i)=>{
      on('isAssetDetail'+i,()=>{detailAssetId=detailAssetId===a.id?'':a.id;refresh();document.getElementById('isAssetDetail'+i)?.focus();});
      on('isEditAsset'+i,()=>{editingAssetId=a.id;refresh();document.getElementById('isAssetName').focus();});
      on('isDeleteAsset'+i,()=>{
        const users=assetUsers(a.id);if(users.length)return alert('사용 중인 아이콘입니다. 먼저 아래 메뉴 버튼의 기본·토글·완료 아이콘 연결을 변경하거나 버튼을 삭제해 주세요.\n'+users.join('\n'));
        if(!confirm('「'+a.name+'」 아이콘을 삭제할까요?'))return;
        d.assets=d.assets.filter(v=>v.id!==a.id);if(editingAssetId===a.id)editingAssetId='';refresh();render();
      });
    });
    document.getElementById('isMenu').onchange=e=>{selectedMenu=e.target.value;refresh();};
    on('isCreate',()=>{const name=prompt('메뉴 묶음 이름');if(!name?.trim())return;const g={id:uid(),name:name.trim(),width:72,height:76,gap:10,buttons:[]};d.menus.push(g);selectedMenu=g.id;refresh();});
    on('isReset',()=>{completed.clear();contexts.clear();toggles.clear();render();});
    on('isSave',()=>saveSimulatorFlow(activeSec));
    if(!m)return;
    ['isMenuName','isW','isH','isGap'].forEach((id,i)=>document.getElementById(id)[i?'oninput':'onchange']=e=>{if(i&&(!e.target.value.trim()||!Number.isFinite(Number(e.target.value))))return;m[['name','width','height','gap'][i]]=i?Math.max(i===3?0:16,Math.min(500,Number(e.target.value)||0)):e.target.value;ensurePlacement();const p=screen()?.iconMenus?.find(p=>p.menuId===m.id);if(p&&i===2){p.height=Math.min(100-p.top,Math.max(1,m.height/Math.max(1,document.getElementById('imageWrapper').getBoundingClientRect().height)*100));document.getElementById('isPH').value=p.height;}render();});
    document.getElementById('isImageSize').oninput=e=>{const value=Number(e.target.value);if(!e.target.value.trim()||!Number.isFinite(value)||value<1)return;m.imageSize=Math.max(1,Math.min(500,value));render();};
    document.getElementById('isFontSize').oninput=e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value<1)return;m.fontSize=Math.max(8,Math.min(40,value));render();};
    document.getElementById('isBold').onchange=e=>{m.bold=e.target.checked;render();};
    on('isAdd',()=>{const a=d.assets.find(a=>a.id===document.getElementById('isAsset').value);if(!a)return alert('먼저 이미지를 등록하세요.');m.buttons.push({id:uid(),assetId:a.id,label:a.displayName??a.name,actionType:'navigate',goto:'',rememberOrigin:true});ensurePlacement();refresh();render();});
    ['up','down','remove'].forEach(op=>panel.querySelectorAll(`[data-${op}]`).forEach(e=>e.onclick=()=>{const i=Number(e.dataset[op]);if(op==='remove')m.buttons.splice(i,1);else{const j=i+(op==='up'?-1:1);[m.buttons[i],m.buttons[j]]=[m.buttons[j],m.buttons[i]];}refresh();render();}));
    document.getElementById('isRegion').onchange=e=>{const r=screen().scrollRegions?.[Number(e.target.value)];if(e.target.value===''||!r)return;[['isLeft','left'],['isTop','top'],['isPW','width'],['isPH','height']].forEach(([id,k])=>document.getElementById(id).value=r[k]);};
    on('isApply',()=>{const values=['isLeft','isTop','isPW','isPH'].map(id=>Number(document.getElementById(id).value));const [left,top,width,height]=values;if(values.some(v=>!Number.isFinite(v))||left<0||top<0||width<=0||height<=0||left+width>100||top+height>100)return alert('위치와 크기를 0~100% 범위 안으로 설정하세요.');const region=document.getElementById('isRegion').value;const p={menuId:m.id,left,top,width,height,background:document.getElementById('isBG').value,...(region!==''?{replacesRegion:Number(region)}:placement?.replacesRegion!==undefined?{replacesRegion:placement.replacesRegion}:{})};const s=screen();s.iconMenus=(s.iconMenus||[]).filter(p=>p.menuId!==m.id);s.iconMenus.push(p);renderPhoneScrollRegions(s);refresh();render();});
    ['isLeft','isTop','isPW','isPH','isBG'].forEach(id=>document.getElementById(id).onchange=()=>document.getElementById('isApply').click());
    on('isDetach',()=>{screen().iconMenus=screen().iconMenus.filter(p=>p.menuId!==m.id);renderPhoneScrollRegions(screen());refresh();render();});
  }
  async function readImage(file) {
    if(!file)return '';
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('PNG/JPG/WebP 이미지(10MB 이하)를 선택하세요.');
    const url=URL.createObjectURL(file);
    try{const img=await loadImageElement(url),ratio=Math.min(1,192/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
  }
  function assetUsers(id){
    return data().menus.flatMap(m=>m.buttons.filter(b=>[b.assetId,b.offAssetId,b.onAssetId,b.doneAssetId].includes(id)).map(b=>m.name+' → '+b.label));
  }
  async function upload(){
    const name=document.getElementById('isAssetName').value.trim(),file=document.getElementById('isAssetFile').files[0],done=document.getElementById('isDoneFile').files[0];
    const section=activeSec,flow=st().flow,existing=data().assets.find(a=>a.id===editingAssetId),button=document.getElementById('isUpload');
    if(!name||(!existing&&!file))return alert('관리용 이름과 기본 이미지를 선택하세요.');
    const completionEnabled=document.getElementById('isAssetCompletionEnabled').checked;
    const displayName=document.getElementById('isAssetLabel').value.trim()||name;
    const background=document.getElementById('isAssetTransparent').checked?'transparent':document.getElementById('isAssetBackground').value;
    const doneBackground=document.getElementById('isAssetDoneTransparent').checked?'transparent':document.getElementById('isAssetDoneBackground').value;
    const doneName=document.getElementById('isAssetDoneName').value.trim();
    const doneDisplayName=document.getElementById('isAssetDoneLabel').value.trim();
    const clearDone=existing&&document.getElementById('isClearDone').checked;
    button.disabled=true;
    try{
      const asset={id:existing?.id||uid(),name,displayName,completionEnabled,doneName:completionEnabled?doneName:existing?.doneName||'',doneDisplayName:completionEnabled?doneDisplayName:existing?.doneDisplayName||'',background,doneBackground:completionEnabled?doneBackground:existing?.doneBackground||'transparent',image:file?await readImage(file):existing.image,doneImage:!completionEnabled?existing?.doneImage||'':done?await readImage(done):clearDone?'':existing?.doneImage||''};
      const assets=existing?flow.iconStudio.assets.map(a=>a.id===existing.id?asset:a):[...flow.iconStudio.assets,asset];
      const candidate={...flow,iconStudio:{...flow.iconStudio,assets}};
      if(new TextEncoder().encode(JSON.stringify(candidate)).length>800000)throw Error('이미지 저장 용량이 부족합니다. 더 작은 이미지로 등록해 주세요.');
      if(existing){const previous=existing.displayName??existing.name;flow.iconStudio.menus.forEach(m=>m.buttons.forEach(b=>{if(b.assetId===existing.id&&b.label===previous)b.label=displayName;}));}
      flow.iconStudio.assets=assets;
      if(activeSec===section){editingAssetId='';refresh();render();document.getElementById('isStatus').textContent='아이콘 변경 사항이 아직 저장되지 않았습니다. 경로 설정 저장을 눌러 주세요.';}
    }catch(e){alert(e.message);}finally{button.disabled=false;}
  }
  async function edit(b){
    cancelDraw();
    pendingScrollRegionIndex=-1;
    pendingHs={top:0,left:0,width:100,height:100};
    window.iconHotspotEditor={button:b,refresh:()=>{refresh();render();}};
    document.getElementById('hsModalTitle').textContent='아이콘 핫스팟 설정';
    document.getElementById('hsScrollRegionHint').style.display='none';
    document.getElementById('hsLabelInput').value = '';
    document.getElementById('hsPreserveScroll').checked = false;
    document.getElementById('hsActionType').value='navigate';
    document.getElementById('hsLinkUrl').value='';
    ['hsToastMessage','hsToastOnMessage','hsToastOffMessage'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('hsToastDuration').value='3000';
    document.getElementById('hsToastPosition').value='bottom';
    document.getElementById('hsToastConfirm').checked=true;
    document.getElementById('hsTextColorText').value='';
    document.getElementById('hsTextColorGroup').value='글자색';
    document.getElementById('hsTextColorInitial').value='#2563eb';
    document.getElementById('hsTextColorMinSize').value='10';
    document.getElementById('hsTextColorSize').value='18';
    document.getElementById('hsTextColorMaxSize').value='24';
    document.getElementById('hsTextColorWeight').value='700';
    document.getElementById('hsTextColorAlign').value='left';
    document.getElementById('hsTextColorBackground').value='#ffffff';
    document.getElementById('hsTextColorMask').checked=true;
    document.getElementById('hsColorPickerGroup').value='글자색';
    document.getElementById('hsFontSizeSliderGroup').value='글자색';
    document.getElementById('hsFontSizeValueGroup').value='글자색';
    document.getElementById('hsStateGroup').value='';
    document.getElementById('hsStateGroupSelect').innerHTML='<option value="">먼저 그룹 토글을 등록해 주세요</option>';
    document.getElementById('hsGroupInitialOn').checked=false;
    document.getElementById('hsCompletionKey').value='';
    document.getElementById('hsRadioGroup').value='';
    document.getElementById('hsRadioValue').value='';
    document.getElementById('hsRadioInitial').checked=false;

    const values={hsLabelInput:'label',hsActionType:'actionType',hsLinkUrl:'linkUrl',hsCompletionKey:'completionKey',hsToastMessage:'toastMessage',hsToastOnMessage:'toastOnMessage',hsToastOffMessage:'toastOffMessage',hsToastDuration:'toastDuration',hsToastPosition:'toastPosition',hsStateGroup:'stateGroup',hsRadioGroup:'radioGroup',hsRadioValue:'radioValue'};
    for(const [id,prop] of Object.entries(values))if(b[prop]!==undefined)document.getElementById(id).value=b[prop];
    document.getElementById('hsPreserveScroll').checked=!!b.preserveScroll;
    document.getElementById('hsToastConfirm').checked=b.toastConfirm!==false;
    document.getElementById('iconRememberOrigin').checked=!!b.rememberOrigin;
    document.getElementById('iconOriginRow').hidden=false;
    const section=activeSec;
    const screens=Object.entries(st().flow.screens);
    document.getElementById('hsGoto').value=b.goto||HOTSPOT_GO_BACK;
    document.getElementById('hsTargetSearch').value='';
    renderHsTargetList(screens,[],true);
    updateHsActionFields();
    showIconFields(b);
    openModal('hsModal');
    const images=await getSimulatorImages(section);
    if(window.iconHotspotEditor?.button!==b||activeSec!==section)return;
    renderHsTargetList(screens,images,false);
    // Keep saved screen targets available even when image discovery filters aliases.
    const target=b.goto||HOTSPOT_GO_BACK;
    document.getElementById('hsGoto').value=target;
    updateHsTargetPreview(target);
    populateHsToggleImages(images);
    for(const [id,prop] of [['hsToggleOffImage','toggleOffImage'],['hsToggleOnImage','toggleOnImage']])if(b[prop])document.getElementById(id).value=b[prop];
    updateHsActionFields();
  }
  function showIconFields(b){
    const options=(value,empty)=>`<option value="">${empty}</option>`+data().assets.map(a=>`<option value="${esc(a.id)}" ${a.id===value?'selected':''}>${esc(a.name)}</option>`).join('');
    iconFields.hidden=false;
    iconFields.innerHTML=`<small>「아이콘 만들기」로 등록한 아이콘을 선택합니다. 목록은 관리용 이름으로 표시됩니다. 토글은 기본·선택 아이콘을, 화면 복귀는 완료 아이콘을 지정하세요. 아래 이미지 파일 선택은 기존 설정 호환용입니다.</small>
      <label>화면 표시 이름 <textarea id="iconDisplayLabel" rows="2">${esc(b.label||'')}</textarea></label>
      <label><input id="iconHideText" type="checkbox" ${b.hideText?'checked':''}> 텍스트 숨기기 (이미지만 표시)</label><small>기본·완료·토글 상태의 글자를 모두 숨깁니다. 표시 이름은 유지됩니다.</small>
      <label>기본 상태 아이콘 <select id="iconOffAsset">${options(b.offAssetId||b.assetId,'현재 기본 아이콘')}</select></label>
      <label>토글 선택 상태 아이콘 <select id="iconOnAsset">${options(b.onAssetId,'기존 선택 상태 이미지 사용')}</select></label>
      <label>등록·발급 완료 아이콘 <select id="iconDoneAsset">${options(b.doneAssetId,'기존 완료 이미지 사용')}</select></label>
      <label>이 메뉴의 완료 표시 이름 (비우면 등록한 완료 이름 사용) <textarea id="iconDoneLabel" rows="2">${esc(b.doneLabel??'')}</textarea></label>
      <label><input id="iconDoneBackgroundEnabled" type="checkbox" ${b.doneBackground?'checked':''}> 이 메뉴에서만 완료 배경색 덮어쓰기</label><small>체크하지 않으면 아이콘 등록에서 지정한 완료 배경색을 사용합니다.</small>
      <label>완료 후 배경색 <input id="iconDoneBackground" type="color" value="${esc(b.doneBackground||'#eeeeee')}"></label>
      <label><input id="iconDisableAfterDone" type="checkbox" ${b.disableAfterDone?'checked':''}> 완료 후 클릭 비활성화</label><small>메인으로 돌아가면 완료·비활성화 상태가 초기화됩니다.</small>`;
  }
  const iconFields=document.createElement('div');iconFields.id='iconStateFields';iconFields.hidden=true;
  document.getElementById('hsActionType').closest('.form-row').after(iconFields);
  const originalConfirm=confirmHs;
  confirmHs=function(...args){
    const b=window.iconHotspotEditor?.button;
    if(!b)return originalConfirm(...args);
    const off=document.getElementById('iconOffAsset').value,on=document.getElementById('iconOnAsset').value,done=document.getElementById('iconDoneAsset').value;
    for(const [id,assetId] of [['hsToggleOffImage',off],['hsToggleOnImage',on]]){
      const a=data().assets.find(a=>a.id===assetId);if(!a)continue;
      const select=document.getElementById(id),option=document.createElement('option');option.value=a.image;option.textContent=a.name;select.append(option);select.value=a.image;
    }
    const label=document.getElementById('iconDoneLabel').value;
    const hideText=document.getElementById('iconHideText').checked;
    const disableAfterDone=document.getElementById('iconDisableAfterDone').checked;
    const doneBackground=document.getElementById('iconDoneBackgroundEnabled').checked?document.getElementById('iconDoneBackground').value:'';
    originalConfirm(...args);
    if(window.iconHotspotEditor?.button===b)return;
    Object.assign(b,{offAssetId:off,onAssetId:on,doneAssetId:done,hideText,disableAfterDone,doneBackground});if(label.trim())b.doneLabel=label.trim();else delete b.doneLabel;if(off)b.assetId=off;
    refresh();render();
  };
  function ensurePlacement(){
    const m=menu(),s=screen();if(!m||!s)return;
    s.iconMenus ||= [];
    if(!s.iconMenus.some(p=>p.menuId===m.id)){
      const parent=document.getElementById('imageWrapper'),viewport=document.getElementById('phoneScrollViewport');
      const bounds=parent.getBoundingClientRect(),view=viewport.getBoundingClientRect();
      const height=Math.min(30,Math.max(3,m.height/Math.max(1,bounds.height)*100));
      const top=Math.max(0,Math.min(100-height,(view.top-bounds.top+view.height/2)/Math.max(1,bounds.height)*100));
      s.iconMenus.push({menuId:m.id,left:0,top,width:100,height,background:'#ffffff'});
    }
  }
  function render(){
    document.querySelectorAll('.icon-menu-surface').forEach(e=>e.remove());
    const s=screen();if(!s||SECS[activeSec]?.type!=='app')return;
    const parent=document.getElementById('hotspotLayer')?.parentElement;if(!parent)return;
    for(const p of s.iconMenus||[]){const m=data().menus.find(m=>m.id===p.menuId);if(!m)continue;const rect=mapPhoneOverlayRect(p),surface=document.createElement('div');surface.className='icon-menu-surface';surface.style.cssText=`left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%;background:${p.background||'#fff'}`;
      const editing=adminMode&&!counselorPreviewMode;
      if(editing){const handle=document.createElement('button');handle.type='button';handle.className='icon-menu-move';handle.textContent='✥';handle.title='드래그하여 메뉴 이동';handle.setAttribute('aria-label','메뉴 위치 이동');surface.append(handle);let drag=null;handle.onpointerdown=e=>{const bounds=parent.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:p.left,top:p.top,bounds};handle.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();};handle.onpointermove=e=>{if(!drag)return;p.left=Math.max(0,Math.min(100-p.width,drag.left+(e.clientX-drag.x)/drag.bounds.width*100));p.top=Math.max(0,Math.min(100-p.height,drag.top+(e.clientY-drag.y)/drag.bounds.height*100));const r=mapPhoneOverlayRect(p);surface.style.left=r.left+'%';surface.style.top=r.top+'%';e.stopPropagation();};const finish=()=>{if(!drag)return;drag=null;selectedMenu=m.id;refresh();};handle.onpointerup=finish;handle.onpointercancel=finish;}
      const track=document.createElement('div');track.className='icon-menu-track';track.style.gap=m.gap+'px';const imageSize=m.imageSize??Math.max(1,Math.min(m.width-6,m.height-36.5));track.style.cssText=`--icon-image-size:${Math.max(1,Math.min(m.width-6,imageSize))}px`;surface.append(track);
      for(const b of m.buttons){const a=data().assets.find(a=>a.id===b.assetId);if(!a)continue;const done=a.completionEnabled!==false&&completed.has(key(activeSec,st().cur,m.id,b.id)),el=document.createElement('button');el.type='button';el.className='icon-menu-button'+(adminMode&&!counselorPreviewMode?' editing':'');el.style.width=m.width+'px';el.style.height='100%';el.title=b.label;const img=document.createElement('img');img.src=(done&&a.doneImage)||a.image;img.alt=b.label;img.draggable=false;el.append(img);const label=document.createElement('span');if(b.hideText)label.style.display='none';label.style.fontSize=(m.fontSize??11)+'px';label.style.fontWeight=m.bold?'700':'400';label.textContent=done?(b.doneLabel??(a.doneDisplayName||'등록 완료')):b.label;el.append(label);const doneAsset=data().assets.find(a=>a.id===b.doneAssetId);if(done&&doneAsset)img.src=doneAsset.image;el.style.background=done?(b.doneBackground||a.doneBackground||doneAsset?.background||a.background||'transparent'):(a.background||'transparent');const disabled=done&&!!b.disableAfterDone;el.disabled=disabled&&!editing;el.setAttribute('aria-disabled',String(el.disabled));el.style.cursor=disabled&&!editing?'default':'pointer';const stateKey=key(activeSec,st().cur,m.id,b.id);if(['toggle','toggle_toast'].includes(b.actionType)){const on=toggles.get(stateKey)===true;const selected=data().assets.find(a=>a.id===(on?b.onAssetId:b.offAssetId));img.src=selected?.image||(on?b.toggleOnImage:b.toggleOffImage)||a.image;el.style.background=selected?.background||a.background||'transparent';label.textContent=on?(b.doneLabel||selected?.displayName||a.doneDisplayName||b.label):(b.label||selected?.displayName||a.displayName);el.title=label.textContent;img.alt=label.textContent;}
        let start=null,startY=0,dragged=false,scroll=0,verticalScroll=0;el.onpointerdown=e=>{start=e.clientX;startY=e.clientY;verticalScroll=document.getElementById('phoneScrollViewport').scrollTop;scroll=surface.scrollLeft;dragged=false;el.setPointerCapture(e.pointerId);e.stopPropagation();};el.onpointermove=e=>{if(start===null)return;const delta=e.clientX-start,dy=e.clientY-startY;if(Math.max(Math.abs(delta),Math.abs(dy))>6)dragged=true;if(dragged){if(Math.abs(dy)>Math.abs(delta))document.getElementById('phoneScrollViewport').scrollTop=verticalScroll-dy;else surface.scrollLeft=scroll-delta;}};el.onpointerup=()=>{start=null;};el.onpointercancel=()=>{start=null;dragged=true;};
        el.onclick=e=>{e.stopPropagation();if(dragged)return;if(adminMode&&!counselorPreviewMode){selectedMenu=m.id;edit(b);return;}if(disabled)return;if(b.actionType==='navigate'&&b.goto!==HOTSPOT_GO_BACK&&!st().flow.screens[b.goto])return showSimulatorToast('아직 이동 화면이 설정되지 않았습니다.');if(b.rememberOrigin&&b.actionType==='navigate'&&b.goto!==HOTSPOT_GO_BACK){contexts.set(activeSec,{origin:st().cur,menu:m.id,button:b.id,history:st().hist.length});}if(['toggle','toggle_toast'].includes(b.actionType)){const on=!toggles.get(stateKey);toggles.set(stateKey,on);const selected=data().assets.find(a=>a.id===(on?b.onAssetId:b.offAssetId));img.src=selected?.image||(on?b.toggleOnImage:b.toggleOffImage)||a.image;el.style.background=selected?.background||a.background||'transparent';label.textContent=on?(b.doneLabel||selected?.displayName||a.doneDisplayName||b.label):(b.label||selected?.displayName||a.displayName);el.title=label.textContent;img.alt=label.textContent;if(b.actionType==='toggle_toast')showSimulatorToast(on?b.toastOnMessage:b.toastOffMessage,{duration:b.toastDuration,position:b.toastPosition,confirm:b.toastConfirm});return;}handleHotspotAction(b,el);};track.append(el);
      }parent.append(surface);
    }
  }
  const oldAction=handleHotspotAction;
  handleHotspotAction=function(h,e){
    if(h.actionType==='origin_return'||h.actionType==='origin_complete'){
      const c=contexts.get(activeSec);
      if(!c||!st().flow.screens[c.origin]){showSimulatorToast('기억된 출발 화면이 없습니다. 출발 화면 기억을 설정한 영역에서 먼저 시작해 주세요.');return;}
      if(h.actionType==='origin_complete'&&c.menu&&c.button)completed.add(key(activeSec,c.origin,c.menu,c.button));
      if(c.parent)contexts.set(activeSec,c.parent);else contexts.delete(activeSec);
      goTo(c.origin);st().hist=st().hist.slice(0,c.history);renderBreadcrumb();return;
    }
    // Keep an enclosing icon flow when opening a shared bank-change flow.
    if(!h.assetId&&h.rememberOrigin&&['navigate','navigate_toast'].includes(h.actionType)&&h.goto!==HOTSPOT_GO_BACK&&h.goto!==st().cur&&st().flow.screens[h.goto]){
      contexts.set(activeSec,{origin:st().cur,history:st().hist.length,parent:contexts.get(activeSec)});
    }
    return oldAction(h,e);
  };
  const originalRender=renderScreen;
  renderScreen=function(...args){const result=originalRender(...args);refresh();render();return result;};
  const oldRegions=renderPhoneScrollRegions;
  renderPhoneScrollRegions=function(s){oldRegions(s);(s?.iconMenus||[]).forEach(p=>{if(p.replacesRegion!==undefined){const el=document.querySelector(`.phone-scroll-region[data-scroll-region-index="${p.replacesRegion}"]`);if(el)el.style.display='none';}});render();};
  const oldList=renderHsList;renderHsList=function(...args){const r=oldList(...args);refresh();render();return r;};
  const oldHome=goHome;goHome=function(...args){completed.clear();contexts.clear();toggles.clear();return oldHome(...args);};
  const oldBack=goBack;goBack=function(...args){const result=oldBack(...args),c=contexts.get(activeSec);if(st()?.cur===st()?.flow?.start){completed.clear();contexts.clear();toggles.clear();render();}if(c&&st()?.cur===c.origin){if(c.parent)contexts.set(activeSec,c.parent);else contexts.delete(activeSec);}return result;};
  const oldGo=goTo;goTo=function(id,...args){if(id===st()?.flow?.start){completed.clear();contexts.delete(activeSec);toggles.clear();}return oldGo(id,...args);};
  const option=document.createElement('option');option.value='origin_complete';option.textContent='등록 완료 후 원래 화면으로 복귀';document.getElementById('hsActionType').append(option);
  const returnOption=document.createElement('option');returnOption.value='origin_return';returnOption.textContent='기억한 출발 화면으로 복귀';document.getElementById('hsActionType').append(returnOption);
  const row=document.createElement('label');row.id='iconOriginRow';row.hidden=true;row.innerHTML='<input type="checkbox" id="iconRememberOrigin"> 출발 화면과 아이콘 기억 (공통 등록 화면 열기)';
  document.getElementById('hsActionType').closest('.form-row').after(row);
  const oldClose=closeModal;closeModal=function(id,...args){if(id==='hsModal'){window.iconHotspotEditor=null;row.hidden=true;iconFields.hidden=true;}return oldClose(id,...args);};
  refresh();render();
})();
