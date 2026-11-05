/* Shared Firestore persistence, bounded versions, and an independent PC backup. */
window.pcGuideStore = (() => {
  const documentId = 'backtongPcEdits';
  let unsubscribe, revision = 0, latest = null, loaded = false, busy = false, draft = null;
  const status = message => { document.getElementById('pcGuideSaveStatus').textContent = message; };
  const ref = () => firebaseFns.doc(firestoreDb,'simulatorFlows',documentId);
  const clone = value => JSON.parse(JSON.stringify(value));
  function setBusy(value) {
    busy = value;
    document.getElementById('gtbSave').disabled = value || !pcGuideDirty;
    document.getElementById('gtbSave').textContent = value ? '저장 중…' : '💾 저장';
  }
  function connect() {
    unsubscribe?.(); loaded = false;
    if (!firebaseReady) { status('서버 연결 준비 중'); return; }
    status('저장 내용 불러오는 중…');
    unsubscribe = firebaseFns.onSnapshot(ref(), {includeMetadataChanges:true}, snapshot => {
      // An offline cache is useful for viewing, but never treated as a confirmed server revision.
      if (snapshot.metadata.hasPendingWrites) return;
      const value = snapshot.data() || {revision:0,data:_guideWin()?.guideEdits?.export(),versions:[]};
      if (!snapshot.metadata.fromCache) loaded = true;
      if (draft) {
        _guideWin()?.guideEdits?.load(draft); draft = null;
        latest = value; revision = value.revision || 0;
        setGuideDirty(true); status('이전 저장본을 불러왔습니다. 저장하면 사이트에 반영됩니다.'); return;
      }
      if (pcGuideDirty || pcGuideTransaction || busy) {
        if (value.revision !== revision) status('다른 저장본이 있습니다. 현재 수정을 PC 백업한 뒤 다시 불러와 주세요.');
        return;
      }
      if (latest && value.revision !== revision) {
        latest = value; revision = value.revision || 0;
        loadPcGuide(); return;
      }
      latest = value; revision = value.revision || 0;
      if (value.data) _guideWin()?.guideEdits?.load(value.data);
      status(snapshot.metadata.fromCache ? '오프라인 저장본 표시 중 · 서버 확인 필요' : '사이트 저장본 불러옴');
    }, error => { loaded = false; status('서버 연결 실패 · ' + error.message); });
  }
  // Request the picker during the click gesture, before any network awaits.
  function pickFile() {
    if (pcGuideFileHandle || !window.showSaveFilePicker) return Promise.resolve(pcGuideFileHandle);
    return window.showSaveFilePicker({suggestedName:'빽통PC_편집백업.html',
      types:[{description:'빽통 PC 편집 백업',accept:{'text/html':['.html']}}]})
      .then(handle => (pcGuideFileHandle = handle), error => ({error}));
  }
  async function writeBackup(data, picker) {
    const selected = await picker;
    if (selected?.error) throw selected.error;
    const response = await fetch(SECS['빽통PC'].contentUrl + '?backup=' + Date.now(),{cache:'no-store'});
    if (!response.ok) throw Error('백업 원본을 불러오지 못했습니다.');
    let html = await response.text();
    const base = new URL(SECS['빽통PC'].contentUrl,location.href).href;
    const encoded = JSON.stringify(data).replace(/</g,'\\u003c');
    html = html.replace(/<head>/i,'<head><base href="' + base.replace(/&/g,'&amp;').replace(/"/g,'&quot;') + '">');
    html = html.replace(/<script src="guide-edits.js"><\/script>/, () =>
      '<script id="guide-edits-data" type="application/json">' + encoded + '</script>\n<script src="guide-edits.js"></script>');
    if (!html.includes('id="guide-edits-data"')) throw Error('백업 모듈이 없는 이전 화면입니다. 새로고침해 주세요.');
    if (selected) {
      const stream = await selected.createWritable(); await stream.write(html); await stream.close();
      return 'PC 파일 저장 완료';
    }
    const url = URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    const a = Object.assign(document.createElement('a'),{href:url,download:'빽통PC_편집백업.html'});
    a.click(); setTimeout(() => URL.revokeObjectURL(url),10000);
    return 'PC 백업 다운로드 요청됨';
  }
  async function backup() {
    if (!_guideWin()?.guideEdits) return false;
    const picker = pickFile(); guideHistoryEnd();
    const data = _guideWin().guideEdits.export();
    try { status(await writeBackup(data,picker)); return true; }
    catch(e) { status(e.name === 'AbortError' ? 'PC 백업 취소됨' : 'PC 백업 실패 · ' + e.message); return false; }
  }
  function boundedVersions(current) {
    const versions = current?.data ? [{revision:current.revision || 0,at:current.savedAt || '',
      by:current.updatedBy || '',data:current.data},...(current.versions || [])].slice(0,10) : [];
    return versions;
  }
  async function save() {
    if (busy) return false;
    if (!adminMode || counselorPreviewMode || !firebaseReady || !firebaseAuth.currentUser) {
      alert('관리자 로그인이 필요합니다.'); return false;
    }
    if (!loaded) { alert('서버 저장본을 확인하지 못했습니다. 연결 후 다시 시도해 주세요.'); return false; }
    const picker = pickFile(); guideHistoryEnd();
    const data = _guideWin()?.guideEdits?.export(); if (!data) return false;
    const savedEditorRevision = pcGuideRevision, expected = revision;
    setBusy(true); status('사이트 저장 중…');
    let websiteSaved = false, serverError = '';
    try {
      if (new Blob([JSON.stringify(data)]).size > 600000) throw Error('편집 데이터가 큽니다. PC 백업 후 관리자에게 문의해 주세요.');
      const saved = await firebaseFns.runTransaction(firestoreDb,async transaction => {
        const snapshot = await transaction.get(ref());
        const current = snapshot.data() || {};
        if ((current.revision || 0) !== expected) throw Error('다른 관리자가 먼저 저장했습니다. PC 백업 후 새로고침해서 확인해 주세요.');
        const value = {revision:expected+1,data,versions:boundedVersions(current),savedAt:new Date().toISOString(),
          updatedAt:firebaseFns.serverTimestamp(),updatedBy:firebaseAuth.currentUser.email || firebaseAuth.currentUser.uid};
        // Keep below Firestore's document limit, including Korean UTF-8 text and metadata.
        while (new Blob([JSON.stringify(value)]).size > 850000 && value.versions.length) value.versions.pop();
        transaction.set(ref(),value); return value;
      });
      latest = saved; revision = saved.revision; websiteSaved = true;
      pcGuideSavedRevision = savedEditorRevision;
      if (pcGuideRevision === savedEditorRevision) setGuideDirty(false);
    } catch(e) { serverError = e.message; }
    let pcResult;
    try { pcResult = await writeBackup(data,picker); }
    catch(e) { pcResult = e.name === 'AbortError' ? 'PC 백업 취소됨' : 'PC 백업 실패: ' + e.message; }
    finally { setBusy(false); }
    status((websiteSaved ? '✓ 사이트 저장 완료 · ' : '사이트 저장 실패 · ') + pcResult);
    if (!websiteSaved) alert('사이트 저장 실패: ' + serverError + '\n' + pcResult + '\n수정 내용은 현재 화면에 유지됩니다.');
    return websiteSaved && !pcGuideDirty;
  }
  async function restore() {
    if (!adminMode || counselorPreviewMode || busy || !loaded) return;
    if (pcGuideDirty && !confirm('저장하지 않은 수정이 있습니다. 이전 저장본으로 교체할까요? PC 백업을 먼저 권장합니다.')) return;
    try {
      const snapshot = await firebaseFns.getDocFromServer(ref());
      const value = snapshot.data(); const versions = value?.versions || [];
      if (!versions.length) { alert('이전 저장본이 없습니다. 두 번째 사이트 저장부터 보관됩니다.'); return; }
      const dialog = document.createElement('dialog');
      const title = document.createElement('h3'); title.textContent = '이전 저장본 복원'; dialog.append(title);
      const list = document.createElement('select'); list.style.cssText='display:block;max-width:70vw;margin:16px 0';
      versions.forEach((version,i) => { const option = document.createElement('option'); option.value = i;
        option.textContent = `저장본 ${version.revision} · ${version.at ? new Date(version.at).toLocaleString('ko-KR') : '이전 저장'} · ${version.by}`; list.append(option); });
      dialog.append(list);
      const restoreButton = document.createElement('button'); restoreButton.textContent = '불러오기';
      restoreButton.onclick = () => { draft = clone(versions[Number(list.value)].data); latest=value; revision=value.revision;
        setGuideDirty(false); dialog.close(); loadPcGuide(); };
      const close = document.createElement('button'); close.textContent='취소'; close.onclick=()=>dialog.close();
      dialog.append(restoreButton,close); dialog.onclose=()=>dialog.remove(); document.body.append(dialog); dialog.showModal();
    } catch(e) { status('이전 저장본 조회 실패 · ' + e.message); }
  }
  window.addEventListener('online',() => { if (_guideWin()?.guideEdits && !loaded) connect(); });
  return {connect,save,backup,restore,get busy(){return busy;}};
})();
