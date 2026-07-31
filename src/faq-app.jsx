import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const emptyItem = () => ({
  id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  question: '',
  shortAnswer: '',
  content: '',
  tags: '',
  synonyms: '',
});

const text = value => String(value || '').toLocaleLowerCase('ko-KR');
const splitWords = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
const DEFAULT_CATEGORIES = ['회원관리', '신규가입', '정지·복구', '정보변경', '배차', '정산', '앱 사용법', '기타'];
const CATEGORY_PALETTE = [
  '#7F1D1D', '#9A3412', '#92400E', '#3F6212', '#166534',
  '#065F46', '#115E59', '#155E75', '#1E40AF', '#3730A3',
  '#5B21B6', '#6B21A8', '#86198F', '#9D174D', '#881337',
  '#334155', '#3F3F46', '#1F2937', '#4C1D95', '#0F4C5C',
];
const categoryColor = (category, colors) => {
  if (colors?.[category]) return colors[category];
  let seed = 0;
  for (const char of String(category || '')) seed = (seed + char.charCodeAt(0)) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[seed];
};
const authorLabel = (group, adminProfile) => {
  const raw = String(group?.authorName || '').trim();
  if (raw && raw !== '관리자' && !raw.includes('@')) return raw;
  const updatedByName = String(group?.updatedByName || '').trim();
  if (updatedByName && updatedByName !== '관리자' && !updatedByName.includes('@')) return updatedByName;
  if (adminProfile?.name && (!group?.authorId || adminProfile.uid === group.authorId)) return adminProfile.name;
  return '관리자';
};
const RECENT_KEY = 'hmm-announcement-recent-searches';
const dateLabel = value => {
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  if (value?.seconds) return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  return '';
};
const dateTimeLabel = value => {
  const date = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR');
};
const renderFaqMarkdown = value => DOMPurify.sanitize(
  marked.parse(String(value || '').replace(/~~/g, '\\~\\~')),
  { ADD_ATTR: ['style', 'color', 'size'] },
);
const timestamp = value => {
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  if (value?.seconds) return value.seconds * 1000 + Number(value.nanoseconds || 0) / 1e6;
  const parsed = new Date(value || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};
const dateTimeInputValue = value => {
  const time = timestamp(value);
  if (!time) return '';
  const date = new Date(time);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const isFaqVisible = (group, now = Date.now()) =>
  group?.isPublished !== false && (!timestamp(group?.hideAt) || timestamp(group.hideAt) > now);

function parseBulkFaq(source) {
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
  const meta = {};
  const items = [];
  let current = null;
  let field = '';
  const pushCurrent = () => {
    if (!current?.question?.trim()) return;
    items.push({
      ...emptyItem(),
      question: current.question.trim(),
      shortAnswer: current.shortAnswer.trim(),
      content: current.content.trim(),
      tags: current.tags.trim(),
      synonyms: current.synonyms.trim(),
    });
  };
  lines.forEach(rawLine => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!current) {
      const groupMeta = trimmed.match(/^(?:묶음\s*제목|가이드\s*제목)\s*[:：]\s*(.+)$/i);
      const categoryMeta = trimmed.match(/^카테고리\s*[:：]\s*(.+)$/i);
      const kmsMeta = trimmed.match(/^(?:KMS|KMS\s*주소|KMS\s*가이드)\s*[:：]\s*(.+)$/i);
      if (groupMeta) { meta.title = groupMeta[1].trim(); return; }
      if (categoryMeta) { meta.category = categoryMeta[1].trim(); return; }
      if (kmsMeta) { meta.kmsUrl = kmsMeta[1].trim(); return; }
    }
    if (trimmed === '---') {
      pushCurrent();
      current = null;
      field = '';
      return;
    }
    const question = trimmed.match(/^(?:#{1,3}\s*)?(?:\d+[.)]\s*)?(?:Q\s*\d*|질문\s*\d*)\s*[.:：]\s*(.+)$/i);
    const answer = trimmed.match(/^(?:A\s*\d*|답변|한\s*줄\s*답변)\s*[.:：]\s*(.*)$/i);
    const detail = trimmed.match(/^(?:상세|상세\s*안내|내용)\s*[:：]\s*(.*)$/i);
    const tags = trimmed.match(/^태그\s*[:：]\s*(.*)$/i);
    const synonyms = trimmed.match(/^(?:유사어|유사\s*검색어|검색어)\s*[:：]\s*(.*)$/i);
    if (question) {
      pushCurrent();
      current = { question: question[1], shortAnswer: '', content: '', tags: '', synonyms: '' };
      field = 'question';
      return;
    }
    if (!current) return;
    if (answer) { field = 'shortAnswer'; current.shortAnswer = answer[1]; return; }
    if (detail) { field = 'content'; current.content = detail[1]; return; }
    if (tags) { field = 'tags'; current.tags = tags[1]; return; }
    if (synonyms) { field = 'synonyms'; current.synonyms = synonyms[1]; return; }
    if (trimmed && ['question', 'shortAnswer', 'content'].includes(field)) {
      current[field] = `${current[field]}${current[field] ? '\n' : ''}${line}`.trim();
    }
  });
  pushCurrent();
  return { meta, items };
}

function highlight(value, query) {
  const source = String(value || '');
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return source;
  const escaped = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return source.split(new RegExp(`(${escaped})`, 'gi')).map((part, index) =>
    new RegExp(`^(?:${escaped})$`, 'i').test(part) ? <mark key={index}>{part}</mark> : part);
}

function searchSnippet(content, query) {
  const plain = String(content || '').replace(/!\[[^\]]*\]\([^)]+\)/g, ' 이미지 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#>*_`[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim();
  const word = query.trim().split(/\s+/).find(Boolean);
  const found = word ? plain.toLocaleLowerCase('ko-KR').indexOf(word.toLocaleLowerCase('ko-KR')) : -1;
  const start = found >= 0 ? Math.max(0, found - 45) : 0;
  return `${start ? '…' : ''}${plain.slice(start, start + 150)}${plain.length > start + 150 ? '…' : ''}`;
}

function UnifiedSearchModal({ open, onClose, posts, guides, onSelect }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  });
  const results = useMemo(() => {
    const pool = [
      ...posts.map(post => ({ ...post, kind: 'announcement' })),
      ...guides.map(guide => ({ ...guide, kind: 'guide', isPinned: false })),
    ];
    const words = text(query).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return pool.filter(item => item.isPinned).slice(0, 6);
    return pool.map(item => {
      const title = text(item.title);
      const content = text(item.content);
      const tags = text((item.tags || []).join(' '));
      const score = words.reduce((sum, word) => sum + (title.includes(word) ? 5 : 0) + (content.includes(word) ? 2 : 0) + (tags.includes(word) ? 3 : 0), 0);
      return { item, score };
    }).filter(result => result.score).sort((a, b) => b.score - a.score).slice(0, 12).map(result => result.item);
  }, [posts, guides, query]);
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  useEffect(() => setActive(0), [query]);
  if (!open) return null;
  const choose = item => {
    const next = query.trim() ? [query.trim(), ...recent.filter(value => value !== query.trim())].slice(0, 3) : recent;
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    onClose();
    requestAnimationFrame(() => onSelect(item));
  };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(index + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
    if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
  };
  return <div className="an-command-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="an-command" role="dialog" aria-label="통합 검색">
      <div className="an-command-input"><span>⌕</span>
        <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="공지·FAQ 통합 검색…" aria-label="공지 및 FAQ 검색어" />
        <button className="an-escape-button" type="button" onClick={onClose} aria-label="검색 닫기">ESC</button>
      </div>
      {!query && recent.length > 0 && <div className="an-recent"><span>최근 검색</span>{recent.map(item => <button key={item} onClick={() => setQuery(item)}>↗ {item}</button>)}</div>}
      <div className="an-command-results">
        <div className="an-command-label">{query ? `검색 결과 ${results.length}건` : '중요 공지'}</div>
        {results.map((item, index) => <button key={`${item.kind}-${item.id}`} className={index === active ? 'active' : ''} onMouseEnter={() => setActive(index)} onClick={() => choose(item)}>
          <span className="an-result-icon">{item.category === 'FAQ' ? '❓' : item.kind === 'guide' ? '📘' : '📄'}</span>
          <span className="an-result-copy"><strong>{highlight(item.title, query)}</strong><small>{highlight(searchSnippet(item.content, query), query)}</small></span>
          <span className={`an-category-badge ${item.kind === 'guide' ? 'guide' : ''}`}>{item.category === 'FAQ' ? 'FAQ' : item.kind === 'guide' ? '가이드' : item.category || '공지'}</span>
        </button>)}
        {!results.length && <div className="an-no-results">일치하는 공지 또는 FAQ가 없습니다.</div>}
      </div>
      <footer><span>↑↓ 이동</span><span>↵ 열기</span><span>ESC 닫기</span></footer>
    </section>
  </div>;
}

function BatchEditor({ group, categories, onClose }) {
  const initialKmsLinks = Array.isArray(group?.kmsLinks) && group.kmsLinks.length
    ? group.kmsLinks : group?.kmsUrl ? [{ name: 'KMS 가이드 열기', url: group.kmsUrl }] : [];
  const [form, setForm] = useState(() => ({
    id: group?.id || '',
    title: group?.title || '',
    category: group?.category || '회원관리',
    kmsLinks: Array.from({ length: 3 }, (_, index) => ({
      name: initialKmsLinks[index]?.name || '',
      url: initialKmsLinks[index]?.url || '',
    })),
    isPublished: group?.isPublished !== false,
    hideAt: dateTimeInputValue(group?.hideAt),
    items: (group?.items?.length ? group.items : [emptyItem()]).map(item => ({
      ...item,
      content: item.content ? renderFaqMarkdown(item.content) : '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
      synonyms: Array.isArray(item.synonyms) ? item.synonyms.join(', ') : item.synonyms || '',
    })),
  }));
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(!group);
  const [bulkText, setBulkText] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [showItems, setShowItems] = useState(!!group);
  const detailRefs = useRef([]);
  const updateItem = (index, field, value) => setForm(current => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));
  const formatDetail = (index, command, value = null) => {
    const editor = detailRefs.current[index];
    editor?.focus();
    document.execCommand(command, false, value);
    updateItem(index, 'content', editor?.innerHTML || '');
  };
  const importBulk = () => {
    const parsed = parseBulkFaq(bulkText);
    if (!parsed.items.length) {
      setBulkMessage('분리할 FAQ를 찾지 못했습니다. 각 질문을 “Q:” 또는 “질문:”으로 시작해 주세요.');
      return;
    }
    const hasWrittenItems = form.items.some(item => item.question.trim() || item.shortAnswer.trim());
    if (hasWrittenItems && !confirm(`현재 입력된 FAQ를 붙여넣은 ${parsed.items.length}개 FAQ로 교체할까요?`)) return;
    setForm(current => ({
      ...current,
      title: parsed.meta.title || current.title,
      category: parsed.meta.category && categories.includes(parsed.meta.category) ? parsed.meta.category : current.category,
      kmsLinks: parsed.meta.kmsUrl
        ? current.kmsLinks.map((link, index) => index === 0 ? { name: link.name || 'KMS 가이드 열기', url: parsed.meta.kmsUrl } : link)
        : current.kmsLinks,
      items: parsed.items.map(item => ({ ...item, content: renderFaqMarkdown(item.content) })),
    }));
    setBulkMessage(`${parsed.items.length}개 FAQ로 나눴습니다. 아래 입력칸에서 내용을 확인하고 저장해 주세요.`);
    setBulkOpen(false);
    setShowItems(false);
  };
  const save = async () => {
    const validItems = form.items.filter(item => item.question.trim() && item.shortAnswer.trim());
    if (!form.title.trim()) return alert('FAQ 묶음 제목을 입력해 주세요.');
    if (!validItems.length) return alert('질문과 한 줄 답변을 입력한 FAQ가 1개 이상 필요합니다.');
    setSaving(true);
    try {
      await window.faqBridge.saveGroup({
        id: form.id,
        title: form.title.trim(),
        category: form.category.trim() || '일반',
        kmsLinks: form.kmsLinks.map(link => ({ name: link.name.trim(), url: link.url.trim() })).filter(link => link.url),
        isPublished: form.isPublished,
        hideAt: form.hideAt ? new Date(form.hideAt).toISOString() : '',
        items: validItems.map(item => ({
          ...item,
          question: item.question.trim(),
          shortAnswer: item.shortAnswer.trim(),
          content: item.content.trim(),
          tags: splitWords(item.tags),
          synonyms: splitWords(item.synonyms),
        })),
      });
      onClose();
    } catch (error) {
      alert(`FAQ를 저장하지 못했습니다. ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };
  return <div className="faq-modal-backdrop">
    <section className="faq-editor" role="dialog" aria-label="FAQ 묶음 작성">
      <header><div><small>KMS 가이드 단위 관리</small><h2>{group ? 'FAQ 묶음 수정' : 'FAQ 여러 개 등록'}</h2></div><button onClick={onClose}>×</button></header>
      <div className="faq-group-fields">
        <label><span>묶음 제목</span><input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="예: 회원 정지·복구 가이드" /></label>
        <label><span>카테고리</span><select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
        <div className="wide faq-kms-fields"><span>KMS 가이드 · 최대 3개</span>{form.kmsLinks.map((link, index) =>
          <div key={index}><input value={link.name} maxLength="30" placeholder={`버튼 이름 ${index + 1}`}
            onChange={event => setForm({ ...form, kmsLinks: form.kmsLinks.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} />
          <input value={link.url} type="url" placeholder={`KMS URL ${index + 1}`}
            onChange={event => setForm({ ...form, kmsLinks: form.kmsLinks.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) })} /></div>)}</div>
        <div className="wide faq-publish-settings">
          <label className="faq-publish-check"><input type="checkbox" checked={form.isPublished} onChange={event => setForm({ ...form, isPublished: event.target.checked })} /><span>저장 후 바로 게시</span></label>
          <label className="faq-hide-date"><span>예약 숨김 일시</span><input type="datetime-local" value={form.hideAt}
            onChange={event => setForm({ ...form, hideAt: event.target.value })} min={dateTimeInputValue(Date.now())} /></label>
          {form.hideAt && <button type="button" className="faq-clear-hide-date" onClick={() => setForm({ ...form, hideAt: '' })}>예약 해제</button>}
        </div>
      </div>
      <section className={`faq-bulk-import ${bulkOpen ? 'open' : ''}`}>
        <button className="faq-bulk-toggle" onClick={() => setBulkOpen(!bulkOpen)}>▣ FAQ 전체 텍스트 붙여넣기 <span>{bulkOpen ? '접기' : '열기'}</span></button>
        {bulkOpen && <div className="faq-bulk-box">
          <p>개수와 관계없이 FAQ 전체 텍스트를 한 번만 붙여넣으세요. 모든 질문을 자동으로 나눠 하나의 묶음 게시글로 만듭니다.</p>
          <pre>{`묶음 제목: 회원 정지·복구 가이드
카테고리: 회원관리
KMS: https://faq.logishm.com/...

Q: 정지 회원은 어떻게 복구하나요?
A: 정지 사유를 확인한 뒤 사유별 복구 절차를 진행합니다.
상세: 회원 조회 → 정지 사유 확인 → 필요 서류 확인
태그: 정지, 복구, 회원
유사어: 재가입, 정지해제
---
Q: 미결제 회원도 복구할 수 있나요?
A: 입금 여부를 먼저 확인해야 합니다.`}</pre>
          <textarea autoFocus={!group} value={bulkText} onChange={event => { setBulkText(event.target.value); setBulkMessage(''); }} placeholder="여기에 개수와 관계없이 FAQ 전체 텍스트를 한 번에 붙여넣으세요." />
          <button className="faq-parse-button" onClick={importBulk}>붙여넣은 내용으로 FAQ 일괄 생성</button>
        </div>}
        {bulkMessage && <p className="faq-bulk-message">{bulkMessage}</p>}
      </section>
      <div className="faq-editor-heading"><strong>{form.items.some(item => item.question.trim()) ? `분리된 FAQ ${form.items.filter(item => item.question.trim()).length}개` : '아직 분리된 FAQ가 없습니다.'}</strong>
        <button className="faq-detail-toggle" onClick={() => setShowItems(!showItems)}>{showItems ? '세부 입력 접기' : '세부 내용 확인·수정'}</button></div>
      {!showItems && form.items.some(item => item.question.trim()) && <div className="faq-parse-preview">{form.items.filter(item => item.question.trim()).map((item, index) =>
        <div key={item.id}><b>{index + 1}</b><span>{item.question}</span><small>{item.shortAnswer}</small></div>)}</div>}
      {showItems && <div className="faq-item-editors">
        {form.items.map((item, index) => <article key={item.id}>
          <div className="faq-item-number"><b>FAQ {index + 1}</b>{form.items.length > 1 && <button onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}>삭제</button>}</div>
          <label><span>질문</span><input value={item.question} onChange={event => updateItem(index, 'question', event.target.value)} placeholder="상담사가 실제로 검색할 질문" /></label>
          <label><span>한 줄 답변</span><textarea value={item.shortAnswer} onChange={event => updateItem(index, 'shortAnswer', event.target.value)} placeholder="가장 먼저 전달할 결론" /></label>
          <label><span>상세 안내</span>
            <div className="faq-format-toolbar">
              <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => formatDetail(index, 'bold')}>B</button>
              <select defaultValue="" onChange={event => { if (event.target.value) formatDetail(index, 'fontSize', event.target.value); event.target.value = ''; }}>
                <option value="">글자 크기</option><option value="2">작게</option><option value="3">보통</option><option value="5">크게</option><option value="6">아주 크게</option>
              </select>
              <div className="faq-color-tool">색상<input type="color" defaultValue="#d32f2f" onChange={event => formatDetail(index, 'foreColor', event.target.value)} /></div>
              <small>텍스트 선택 후 적용</small>
            </div>
            <div ref={element => {
              detailRefs.current[index] = element;
              if (element && element.dataset.faqItemId !== item.id) {
                element.innerHTML = item.content;
                element.dataset.faqItemId = item.id;
              }
            }} className="detail faq-rich-editor" contentEditable suppressContentEditableWarning
              onInput={event => updateItem(index, 'content', event.currentTarget.innerHTML)}
              data-placeholder="처리 순서, 확인 사항, 주의 사항 등을 입력하세요." /></label>
          <div className="faq-two-fields">
            <label><span>태그</span><input value={item.tags} onChange={event => updateItem(index, 'tags', event.target.value)} placeholder="복구, 정지, 미결제" /></label>
            <label><span>유사 검색어</span><input value={item.synonyms} onChange={event => updateItem(index, 'synonyms', event.target.value)} placeholder="해지, 재가입, 회원삭제" /></label>
          </div>
        </article>)}
      </div>}
      {showItems && <button className="faq-add-item" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>＋ 질문 직접 추가</button>}
      <footer><span>한 번 저장하면 위 FAQ가 하나의 가이드 묶음으로 관리됩니다.</span><div><button onClick={onClose}>취소</button><button className="primary" disabled={saving} onClick={save}>{saving ? '저장 중…' : `${form.items.length}개 FAQ 저장`}</button></div></footer>
    </section>
  </div>;
}

function CategoryManager({ categories, colors, onClose, onSaved }) {
  const [items, setItems] = useState(categories);
  const [categoryColors, setCategoryColors] = useState(colors);
  const [selected, setSelected] = useState(items[0] || '');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const add = () => {
    const next = value.trim();
    if (!next || items.includes(next)) return;
    setItems([...items, next]);
    setCategoryColors(current => ({ ...current, [next]: categoryColor(next, current) }));
    setSelected(next);
    setValue('');
  };
  const save = async () => {
    setSaving(true);
    try { await window.faqBridge.saveCategories(items, categoryColors); onSaved(items, categoryColors); }
    catch (error) { alert(`카테고리를 저장하지 못했습니다. ${error.message || error}`); }
    finally { setSaving(false); }
  };
  return <div className="faq-modal-backdrop"><section className="faq-category-editor">
    <header><div><small>FAQ 분류 관리</small><h2>카테고리 편집</h2></div><button onClick={onClose}>×</button></header>
    <div className="faq-category-add"><input value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => event.key === 'Enter' && add()} placeholder="새 카테고리" /><button onClick={add}>추가</button></div>
    <div className="faq-category-list">{items.map((item, index) => <div key={item} className={selected === item ? 'selected' : ''} onClick={() => setSelected(item)}>
      <span><i style={{ backgroundColor: categoryColor(item, categoryColors) }} />{item}</span><div>
      <button disabled={!index} onClick={() => setItems(current => current.map((value, itemIndex) => itemIndex === index - 1 ? item : itemIndex === index ? current[index - 1] : value))}>↑</button>
      <button disabled={index === items.length - 1} onClick={() => setItems(current => current.map((value, itemIndex) => itemIndex === index + 1 ? item : itemIndex === index ? current[index + 1] : value))}>↓</button>
      <button className="danger" onClick={() => setItems(items.filter(value => value !== item))}>삭제</button>
    </div></div>)}</div>
    {!!selected && <div className="faq-color-editor">
      <strong>{selected} 색상</strong>
      <div className="faq-color-palette">{CATEGORY_PALETTE.map(color => <button key={color} type="button"
        className={categoryColor(selected, categoryColors) === color ? 'active' : ''} style={{ backgroundColor: color }}
        aria-label={color} onClick={() => setCategoryColors(current => ({ ...current, [selected]: color }))} />)}</div>
      <div className="faq-color-preview">
        <div className="light"><small>라이트 모드</small><span style={{ backgroundColor: categoryColor(selected, categoryColors) }}>{selected}</span></div>
        <div className="dark"><small>다크 모드</small><span style={{ backgroundColor: categoryColor(selected, categoryColors) }}>{selected}</span></div>
      </div>
    </div>}
    <footer><button onClick={onClose}>취소</button><button className="primary" disabled={saving || !items.length} onClick={save}>{saving ? '저장 중…' : '저장'}</button></footer>
  </section></div>;
}

function FaqDetail({ group, initialOpenItemId, isAdmin, adminProfile, onBack, onEdit, onDelete, onPublish, onScheduleHide }) {
  const kmsLinks = Array.isArray(group.kmsLinks) && group.kmsLinks.length
    ? group.kmsLinks : group.kmsUrl ? [{ name: 'KMS 가이드 열기', url: group.kmsUrl }] : [];
  const [openItems, setOpenItems] = useState(new Set(
    initialOpenItemId ? [initialOpenItemId] : group.items?.[0]?.id ? [group.items[0].id] : []
  ));
  const [scheduledHideAt, setScheduledHideAt] = useState(dateTimeInputValue(group.hideAt));
  const [savingSchedule, setSavingSchedule] = useState(false);
  useEffect(() => setScheduledHideAt(dateTimeInputValue(group.hideAt)), [group.hideAt]);
  useEffect(() => {
    if (!initialOpenItemId) return;
    setOpenItems(current => new Set(current).add(initialOpenItemId));
    const timer = setTimeout(() => {
      document.getElementById(`faq-answer-${initialOpenItemId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => clearTimeout(timer);
  }, [initialOpenItemId]);
  const toggle = id => setOpenItems(current => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const copy = async item => {
    const copyText = [item.shortAnswer, item.content].filter(Boolean).join('\n\n');
    await navigator.clipboard.writeText(copyText);
    alert('답변을 복사했습니다.');
  };
  const saveSchedule = async () => {
    if (!scheduledHideAt) return alert('숨길 날짜와 시간을 선택해 주세요.');
    if (new Date(scheduledHideAt).getTime() <= Date.now()) return alert('현재보다 이후 날짜와 시간을 선택해 주세요.');
    setSavingSchedule(true);
    try { await onScheduleHide(new Date(scheduledHideAt).toISOString()); }
    catch (error) { alert(`예약 숨김 일시를 저장하지 못했습니다. ${error.message || error}`); }
    finally { setSavingSchedule(false); }
  };
  const clearSchedule = async () => {
    setSavingSchedule(true);
    try { await onScheduleHide(''); setScheduledHideAt(''); }
    catch (error) { alert(`예약 숨김을 해제하지 못했습니다. ${error.message || error}`); }
    finally { setSavingSchedule(false); }
  };
  return <article className="faq-document">
    <button className="faq-back" onClick={onBack}>← FAQ 목록</button>
    <div className="faq-breadcrumb">{group.category || '일반'} &gt; {group.title}</div>
    <div className="faq-document-title"><div><h1>{group.title}</h1><p>한 가이드에 포함된 FAQ {group.items?.length || 0}개 · 작성자 {authorLabel(group, adminProfile)}</p></div>
      <span className={!isFaqVisible(group) ? 'hidden' : ''}>{group.isPublished === false ? '숨김' : timestamp(group.hideAt) <= Date.now() && timestamp(group.hideAt) ? '예약 만료' : group.hideAt ? `${dateTimeLabel(group.hideAt)} 숨김 예정` : '게시 중'}</span></div>
    <div className="faq-detail-items">
      {(group.items || []).map((item, index) => {
        const opened = openItems.has(item.id);
        return <section id={`faq-answer-${item.id}`} key={item.id} className="faq-detail-card">
          <button className="faq-detail-question" onClick={() => toggle(item.id)}><span>Q{index + 1}</span><strong>{item.question}</strong><i>{opened ? '−' : '+'}</i></button>
          {opened && <div className="faq-detail-answer">
            <div className="faq-core-answer"><small>핵심답변</small><strong>{item.shortAnswer}</strong></div>
            <div className="faq-guide-copy"><span>안내 및 처리기준</span><button onClick={() => copy(item)}>복사</button></div>
            <div className="faq-markdown" dangerouslySetInnerHTML={{ __html: renderFaqMarkdown(item.content || item.shortAnswer || '') }} />
            {!!item.tags?.length && <div className="faq-tags">{item.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
          </div>}
        </section>;
      })}
    </div>
    {!!kmsLinks.length && <div className="faq-kms-links">{kmsLinks.map((link, index) =>
      <a className="faq-kms-link" key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener">
        {link.name || 'KMS 가이드 열기'}</a>)}</div>}
    {isAdmin && !!group.history?.length && <details className="faq-history"><summary>수정 이력 {group.history.length}건</summary>
      {[...group.history].reverse().map((entry, index) => <div key={`${entry.editedAt}-${index}`}>
        <strong>{entry.editedByName || '관리자'}</strong><time>{dateTimeLabel(entry.editedAt)}</time>
        <span>{entry.previous?.title || '이전 게시글'}</span></div>)}</details>}
    {isAdmin && <div className="faq-document-admin">
      <div className="faq-detail-schedule">
        <label><span>예약 숨김 일시</span><input type="datetime-local" value={scheduledHideAt}
          onChange={event => setScheduledHideAt(event.target.value)} min={dateTimeInputValue(Date.now())} /></label>
        <button disabled={savingSchedule} onClick={saveSchedule}>{savingSchedule ? '저장 중' : '예약 숨기기'}</button>
        {!!group.hideAt && <button disabled={savingSchedule} onClick={clearSchedule}>예약 해제</button>}
      </div>
      <button onClick={onPublish}>{isFaqVisible(group) ? '숨기기' : '게시하기'}</button>
      <button onClick={onEdit}>수정</button><button className="danger" onClick={onDelete}>삭제</button>
    </div>}
  </article>;
}

function FaqApp() {
  const [groups, setGroups] = useState([]);
  const [searchPosts, setSearchPosts] = useState([]);
  const [searchGuides, setSearchGuides] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [categoryColors, setCategoryColors] = useState({});
  const [category, setCategory] = useState('전체');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [editor, setEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(!!window.faqBridge.isAdmin());
  const [dark, setDark] = useState(() => localStorage.getItem('hmm-faq-theme') === 'dark');
  const [now, setNow] = useState(Date.now());
  const adminProfile = window.faqBridge.getAdmin?.();

  useEffect(() => window.faqBridge.subscribe(setGroups), []);
  useEffect(() => window.announcementBridge.subscribe(setSearchPosts), []);
  useEffect(() => window.announcementBridge.subscribeGuides(setSearchGuides), []);
  useEffect(() => window.faqBridge.subscribeCategories(settings => {
    setCategories(settings.categories);
    setCategoryColors(settings.colors || {});
  }), []);
  useEffect(() => {
    const update = () => setIsAdmin(!!window.faqBridge.isAdmin());
    window.addEventListener('announcement-admin-change', update);
    return () => window.removeEventListener('announcement-admin-change', update);
  }, []);
  useEffect(() => {
    const key = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const openFaq = event => {
      const { groupId = '', itemId = '' } = event.detail || {};
      if (!groupId) return;
      setSelectedId(groupId);
      setSelectedItemId(itemId);
    };
    window.addEventListener('faq-open', openFaq);
    return () => window.removeEventListener('faq-open', openFaq);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.getElementById('guidePage')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [selectedId]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const availableGroups = groups.filter(group => isAdmin || isFaqVisible(group, now));
  const words = text(query).trim().split(/\s+/).filter(Boolean);
  const visibleGroups = availableGroups.filter(group => {
    if (category !== '전체' && group.category !== category) return false;
    if (!words.length) return true;
    const haystack = text([group.title, group.category, ...(group.items || []).flatMap(item => [item.question, item.shortAnswer, item.content, ...(item.tags || []), ...(item.synonyms || [])])].join(' '));
    return words.every(word => haystack.includes(word));
  }).sort((a, b) => timestamp(b.createdAt || b.updatedAt) - timestamp(a.createdAt || a.updatedAt));
  const selected = availableGroups.find(group => group.id === selectedId);
  const remove = async group => {
    if (!confirm(`“${group.title}” 게시글과 FAQ ${group.items?.length || 0}개를 삭제할까요?`)) return;
    try { await window.faqBridge.removeGroup(group.id); setSelectedId(''); }
    catch (error) { alert(`삭제하지 못했습니다. ${error.message || error}`); }
  };
  const togglePublish = async group => {
    try { await window.faqBridge.saveGroup({ ...group, isPublished: !isFaqVisible(group, now), hideAt: '' }); }
    catch (error) { alert(`게시 상태를 변경하지 못했습니다. ${error.message || error}`); }
  };
  const scheduleHide = group => async hideAt => {
    await window.faqBridge.saveGroup({ ...group, isPublished: true, hideAt });
  };

  return <div className="faq-app" data-theme={dark ? 'dark' : 'light'}>
    <div className="faq-toolbar">
      <button className="an-search-trigger faq-search-trigger" onClick={() => setSearchOpen(true)}><span>⌕</span><span>통합 검색</span><kbd>Ctrl K</kbd></button>
      <div className="faq-toolbar-actions">
        <button className="faq-theme-toggle" title={dark ? '라이트모드' : '다크모드'} onClick={() => {
          setDark(!dark);
          localStorage.setItem('hmm-faq-theme', !dark ? 'dark' : 'light');
        }}>{dark ? '☀' : '◐'}</button>
        {isAdmin && <button className="faq-new" onClick={() => setEditor({})}>＋ 새 FAQ 게시글</button>}
      </div>
    </div>
    <div className="faq-layout">
      <aside className="faq-sidebar">
        <strong>FAQ</strong>
        <nav><button className={category === '전체' && !selected ? 'active' : ''} onClick={() => { setCategory('전체'); setSelectedId(''); }}>▤ 전체</button>
          {categories.map(item => <button key={item} className={category === item && !selected ? 'active' : ''} onClick={() => { setCategory(item); setSelectedId(''); }}>› {item}</button>)}</nav>
        {isAdmin && <button className="faq-manage-categories" onClick={() => setCategoryEditor(true)}>⚙ 카테고리 편집</button>}
      </aside>
      <main className="faq-content">
        {selected ? <FaqDetail group={selected} initialOpenItemId={selectedItemId} isAdmin={isAdmin} adminProfile={adminProfile} onBack={() => { setSelectedId(''); setSelectedItemId(''); }} onEdit={() => setEditor(selected)}
          onDelete={() => remove(selected)} onPublish={() => togglePublish(selected)} onScheduleHide={scheduleHide(selected)} /> : <section className="faq-index">
          <header><p>QUICK ANSWERS</p><h1>{category}</h1><span>상담 중 필요한 답을 게시글과 질문 단위로 빠르게 찾아보세요.</span></header>
          <div className="faq-list-summary"><b>{query ? `검색 결과 ${visibleGroups.length}건` : `FAQ 게시글 ${visibleGroups.length}건`}</b><span>게시글 하나에 여러 FAQ가 포함됩니다.</span></div>
          <div className="faq-post-list">{visibleGroups.map(group => <button key={group.id} className="faq-post-row" onClick={() => setSelectedId(group.id)}>
            <span className="faq-post-category" style={{ backgroundColor: categoryColor(group.category || '일반', categoryColors), color: '#fff' }}>{group.category || '일반'}</span>
            <span className="faq-post-copy"><strong>{highlight(group.title, query)}</strong><small>{highlight(group.items?.[0]?.shortAnswer || group.items?.[0]?.question || '', query)}</small>
              <span><b>FAQ {group.items?.length || 0}개</b>{!isFaqVisible(group, now) && <i>숨김</i>}{isFaqVisible(group, now) && group.hideAt && <i>예약 {dateTimeLabel(group.hideAt)}</i>}</span></span>
            <time>{dateLabel(group.updatedAt)}</time>
          </button>)}
          {!visibleGroups.length && <div className="faq-empty">{query ? '일치하는 FAQ 게시글이 없습니다.' : '등록된 FAQ 게시글이 없습니다.'}</div>}</div>
        </section>}
      </main>
    </div>
    {editor && <BatchEditor group={editor.id ? editor : null} categories={categories} onClose={() => setEditor(null)} />}
    {categoryEditor && <CategoryManager categories={categories} colors={categoryColors} onClose={() => setCategoryEditor(false)}
      onSaved={(values, colors) => { setCategories(values); setCategoryColors(colors); setCategoryEditor(false); }} />}
    <UnifiedSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} posts={searchPosts} guides={searchGuides} onSelect={item => {
      if (item.category === 'FAQ' && String(item.id).startsWith('faq:')) {
        const [, groupId, itemId] = String(item.id).split(':');
        setSelectedId(groupId);
        setSelectedItemId(itemId || '');
      } else if (item.kind === 'announcement') window.announcementBridge.openAnnouncement(item.id);
      else window.announcementBridge.openGuide(item.id);
    }} />
  </div>;
}

let root;
let rootElement;
export function mountFaqApp(element) {
  if (!element) return;
  if (!root || rootElement !== element) {
    rootElement = element;
    root = createRoot(element);
  }
  root.render(<FaqApp />);
}

window.mountFaqApp = mountFaqApp;
