import React, { useEffect, useMemo, useState } from 'react';
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
const dateLabel = value => {
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  if (value?.seconds) return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  return '';
};

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

function BatchEditor({ group, categories, onClose }) {
  const [form, setForm] = useState(() => ({
    id: group?.id || '',
    title: group?.title || '',
    category: group?.category || '회원관리',
    kmsUrl: group?.kmsUrl || '',
    isPublished: group?.isPublished !== false,
    items: (group?.items?.length ? group.items : [emptyItem()]).map(item => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
      synonyms: Array.isArray(item.synonyms) ? item.synonyms.join(', ') : item.synonyms || '',
    })),
  }));
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const updateItem = (index, field, value) => setForm(current => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));
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
      kmsUrl: parsed.meta.kmsUrl || current.kmsUrl,
      items: parsed.items,
    }));
    setBulkMessage(`${parsed.items.length}개 FAQ로 나눴습니다. 아래 입력칸에서 내용을 확인하고 저장해 주세요.`);
    setBulkOpen(false);
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
        kmsUrl: form.kmsUrl.trim(),
        isPublished: form.isPublished,
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
        <label className="wide"><span>KMS 가이드 주소</span><input value={form.kmsUrl} onChange={event => setForm({ ...form, kmsUrl: event.target.value })} placeholder="https://faq.logishm.com/..." /></label>
        <label className="wide faq-publish-check"><input type="checkbox" checked={form.isPublished} onChange={event => setForm({ ...form, isPublished: event.target.checked })} /><span>저장 후 바로 게시</span></label>
      </div>
      <section className="faq-bulk-import">
        <button className="faq-bulk-toggle" onClick={() => setBulkOpen(!bulkOpen)}>▣ 텍스트 한꺼번에 붙여넣기 <span>{bulkOpen ? '접기' : '열기'}</span></button>
        {bulkOpen && <div className="faq-bulk-box">
          <p>아래 형식의 텍스트를 붙여넣으면 질문별 입력칸으로 자동 분리됩니다.</p>
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
          <textarea value={bulkText} onChange={event => { setBulkText(event.target.value); setBulkMessage(''); }} placeholder="여기에 만들어진 FAQ 전체 텍스트를 붙여넣으세요." />
          <button className="faq-parse-button" onClick={importBulk}>FAQ 자동 나누기</button>
        </div>}
        {bulkMessage && <p className="faq-bulk-message">{bulkMessage}</p>}
      </section>
      <div className="faq-editor-heading"><strong>질문 {form.items.length}개</strong><span>질문과 한 줄 답변은 필수입니다.</span></div>
      <div className="faq-item-editors">
        {form.items.map((item, index) => <article key={item.id}>
          <div className="faq-item-number"><b>FAQ {index + 1}</b>{form.items.length > 1 && <button onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}>삭제</button>}</div>
          <label><span>질문</span><input value={item.question} onChange={event => updateItem(index, 'question', event.target.value)} placeholder="상담사가 실제로 검색할 질문" /></label>
          <label><span>한 줄 답변</span><textarea value={item.shortAnswer} onChange={event => updateItem(index, 'shortAnswer', event.target.value)} placeholder="가장 먼저 전달할 결론" /></label>
          <label><span>상세 안내</span><textarea className="detail" value={item.content} onChange={event => updateItem(index, 'content', event.target.value)} placeholder="처리 순서, 확인 사항, 주의 사항 등을 Markdown으로 입력" /></label>
          <div className="faq-two-fields">
            <label><span>태그</span><input value={item.tags} onChange={event => updateItem(index, 'tags', event.target.value)} placeholder="복구, 정지, 미결제" /></label>
            <label><span>유사 검색어</span><input value={item.synonyms} onChange={event => updateItem(index, 'synonyms', event.target.value)} placeholder="해지, 재가입, 회원삭제" /></label>
          </div>
        </article>)}
      </div>
      <button className="faq-add-item" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>＋ 질문 추가</button>
      <footer><span>한 번 저장하면 위 FAQ가 하나의 가이드 묶음으로 관리됩니다.</span><div><button onClick={onClose}>취소</button><button className="primary" disabled={saving} onClick={save}>{saving ? '저장 중…' : `${form.items.length}개 FAQ 저장`}</button></div></footer>
    </section>
  </div>;
}

function CategoryManager({ categories, onClose }) {
  const [items, setItems] = useState(categories);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const add = () => {
    const next = value.trim();
    if (!next || items.includes(next)) return;
    setItems([...items, next]);
    setValue('');
  };
  const save = async () => {
    setSaving(true);
    try { await window.faqBridge.saveCategories(items); onClose(); }
    catch (error) { alert(`카테고리를 저장하지 못했습니다. ${error.message || error}`); }
    finally { setSaving(false); }
  };
  return <div className="faq-modal-backdrop"><section className="faq-category-editor">
    <header><div><small>FAQ 분류 관리</small><h2>카테고리 편집</h2></div><button onClick={onClose}>×</button></header>
    <div className="faq-category-add"><input value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => event.key === 'Enter' && add()} placeholder="새 카테고리" /><button onClick={add}>추가</button></div>
    <div className="faq-category-list">{items.map((item, index) => <div key={item}><span>{item}</span><div>
      <button disabled={!index} onClick={() => setItems(current => current.map((value, itemIndex) => itemIndex === index - 1 ? item : itemIndex === index ? current[index - 1] : value))}>↑</button>
      <button disabled={index === items.length - 1} onClick={() => setItems(current => current.map((value, itemIndex) => itemIndex === index + 1 ? item : itemIndex === index ? current[index + 1] : value))}>↓</button>
      <button className="danger" onClick={() => setItems(items.filter(value => value !== item))}>삭제</button>
    </div></div>)}</div>
    <footer><button onClick={onClose}>취소</button><button className="primary" disabled={saving || !items.length} onClick={save}>{saving ? '저장 중…' : '저장'}</button></footer>
  </section></div>;
}

function FaqDetail({ group, isAdmin, onBack, onEdit, onDelete, onPublish }) {
  const [openItems, setOpenItems] = useState(new Set(group.items?.[0]?.id ? [group.items[0].id] : []));
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
  return <article className="faq-document">
    <button className="faq-back" onClick={onBack}>← FAQ 목록</button>
    <div className="faq-breadcrumb">{group.category || '일반'} &gt; {group.title}</div>
    <div className="faq-document-title"><div><h1>{group.title}</h1><p>한 가이드에 포함된 FAQ {group.items?.length || 0}개</p></div>
      <span className={group.isPublished === false ? 'hidden' : ''}>{group.isPublished === false ? '숨김' : '게시 중'}</span></div>
    <nav className="faq-question-index">
      {(group.items || []).map((item, index) => <button key={item.id} onClick={() => {
        setOpenItems(current => new Set(current).add(item.id));
        document.getElementById(`faq-answer-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}><b>{index + 1}</b>{item.question}</button>)}
    </nav>
    <div className="faq-detail-items">
      {(group.items || []).map((item, index) => {
        const opened = openItems.has(item.id);
        return <section id={`faq-answer-${item.id}`} key={item.id} className="faq-detail-card">
          <button className="faq-detail-question" onClick={() => toggle(item.id)}><span>Q{index + 1}</span><strong>{item.question}</strong><i>{opened ? '−' : '+'}</i></button>
          {opened && <div className="faq-detail-answer">
            <div className="faq-core-answer"><small>핵심답변</small><strong>{item.shortAnswer}</strong></div>
            <div className="faq-guide-copy"><span>안내 및 처리기준</span><button onClick={() => copy(item)}>복사</button></div>
            <div className="faq-markdown" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(item.content || item.shortAnswer || '')) }} />
            {!!item.tags?.length && <div className="faq-tags">{item.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
          </div>}
        </section>;
      })}
    </div>
    {group.kmsUrl && <a className="faq-kms-link" href={group.kmsUrl} target="_blank" rel="noopener">관련 KMS 보기 ↗</a>}
    {isAdmin && <div className="faq-document-admin">
      <button onClick={onPublish}>{group.isPublished === false ? '게시하기' : '숨기기'}</button>
      <button onClick={onEdit}>수정</button><button className="danger" onClick={onDelete}>삭제</button>
    </div>}
  </article>;
}

function FaqApp() {
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [category, setCategory] = useState('전체');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editor, setEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(!!window.faqBridge.isAdmin());

  useEffect(() => window.faqBridge.subscribe(setGroups), []);
  useEffect(() => window.faqBridge.subscribeCategories(setCategories), []);
  useEffect(() => {
    const update = () => setIsAdmin(!!window.faqBridge.isAdmin());
    window.addEventListener('announcement-admin-change', update);
    return () => window.removeEventListener('announcement-admin-change', update);
  }, []);

  const availableGroups = groups.filter(group => isAdmin || group.isPublished !== false);
  const words = text(query).trim().split(/\s+/).filter(Boolean);
  const visibleGroups = availableGroups.filter(group => {
    if (category !== '전체' && group.category !== category) return false;
    if (!words.length) return true;
    const haystack = text([group.title, group.category, ...(group.items || []).flatMap(item => [item.question, item.shortAnswer, item.content, ...(item.tags || []), ...(item.synonyms || [])])].join(' '));
    return words.every(word => haystack.includes(word));
  });
  const selected = availableGroups.find(group => group.id === selectedId);
  const remove = async group => {
    if (!confirm(`“${group.title}” 게시글과 FAQ ${group.items?.length || 0}개를 삭제할까요?`)) return;
    try { await window.faqBridge.removeGroup(group.id); setSelectedId(''); }
    catch (error) { alert(`삭제하지 못했습니다. ${error.message || error}`); }
  };
  const togglePublish = async group => {
    try { await window.faqBridge.saveGroup({ ...group, isPublished: group.isPublished === false }); }
    catch (error) { alert(`게시 상태를 변경하지 못했습니다. ${error.message || error}`); }
  };

  return <div className="faq-app">
    <div className="faq-toolbar">
      <div className="faq-search"><span>⌕</span><input value={query} onChange={event => { setQuery(event.target.value); setSelectedId(''); }} placeholder="FAQ 통합 검색" />{query && <button onClick={() => setQuery('')}>×</button>}</div>
      {isAdmin && <button className="faq-new" onClick={() => setEditor({})}>＋ 새 FAQ 게시글</button>}
    </div>
    <div className="faq-layout">
      <aside className="faq-sidebar">
        <strong>FAQ</strong>
        <nav><button className={category === '전체' && !selected ? 'active' : ''} onClick={() => { setCategory('전체'); setSelectedId(''); }}>▤ 전체</button>
          {categories.map(item => <button key={item} className={category === item && !selected ? 'active' : ''} onClick={() => { setCategory(item); setSelectedId(''); }}>› {item}</button>)}</nav>
        {isAdmin && <button className="faq-manage-categories" onClick={() => setCategoryEditor(true)}>⚙ 카테고리 편집</button>}
      </aside>
      <main className="faq-content">
        {selected ? <FaqDetail group={selected} isAdmin={isAdmin} onBack={() => setSelectedId('')} onEdit={() => setEditor(selected)}
          onDelete={() => remove(selected)} onPublish={() => togglePublish(selected)} /> : <section className="faq-index">
          <header><p>QUICK ANSWERS</p><h1>{category}</h1><span>상담 중 필요한 답을 게시글과 질문 단위로 빠르게 찾아보세요.</span></header>
          <div className="faq-list-summary"><b>{query ? `검색 결과 ${visibleGroups.length}건` : `FAQ 게시글 ${visibleGroups.length}건`}</b><span>게시글 하나에 여러 FAQ가 포함됩니다.</span></div>
          <div className="faq-post-list">{visibleGroups.map(group => <button key={group.id} className="faq-post-row" onClick={() => setSelectedId(group.id)}>
            <span className="faq-post-category">{group.category || '일반'}</span>
            <span className="faq-post-copy"><strong>{highlight(group.title, query)}</strong><small>{highlight(group.items?.[0]?.shortAnswer || group.items?.[0]?.question || '', query)}</small>
              <span><b>FAQ {group.items?.length || 0}개</b>{group.isPublished === false && <i>숨김</i>}</span></span>
            <time>{dateLabel(group.updatedAt)}</time>
          </button>)}
          {!visibleGroups.length && <div className="faq-empty">{query ? '일치하는 FAQ 게시글이 없습니다.' : '등록된 FAQ 게시글이 없습니다.'}</div>}</div>
        </section>}
      </main>
    </div>
    {editor && <BatchEditor group={editor.id ? editor : null} categories={categories} onClose={() => setEditor(null)} />}
    {categoryEditor && <CategoryManager categories={categories} onClose={() => setCategoryEditor(false)} />}
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
