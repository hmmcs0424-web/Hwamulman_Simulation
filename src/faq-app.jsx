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

function highlight(value, query) {
  const source = String(value || '');
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return source;
  const escaped = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return source.split(new RegExp(`(${escaped})`, 'gi')).map((part, index) =>
    new RegExp(`^(?:${escaped})$`, 'i').test(part) ? <mark key={index}>{part}</mark> : part);
}

function BatchEditor({ group, onClose }) {
  const [form, setForm] = useState(() => ({
    id: group?.id || '',
    title: group?.title || '',
    category: group?.category || '회원관리',
    kmsUrl: group?.kmsUrl || '',
    items: (group?.items?.length ? group.items : [emptyItem()]).map(item => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
      synonyms: Array.isArray(item.synonyms) ? item.synonyms.join(', ') : item.synonyms || '',
    })),
  }));
  const [saving, setSaving] = useState(false);
  const updateItem = (index, field, value) => setForm(current => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));
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
        <label><span>카테고리</span><input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="예: 회원관리" /></label>
        <label className="wide"><span>KMS 가이드 주소</span><input value={form.kmsUrl} onChange={event => setForm({ ...form, kmsUrl: event.target.value })} placeholder="https://faq.logishm.com/..." /></label>
      </div>
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

function FaqApp() {
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState(new Set());
  const [openItems, setOpenItems] = useState(new Set());
  const [editor, setEditor] = useState(null);
  const [isAdmin, setIsAdmin] = useState(!!window.faqBridge.isAdmin());

  useEffect(() => window.faqBridge.subscribe(setGroups), []);
  useEffect(() => {
    const update = () => setIsAdmin(!!window.faqBridge.isAdmin());
    window.addEventListener('announcement-admin-change', update);
    return () => window.removeEventListener('announcement-admin-change', update);
  }, []);

  const matches = useMemo(() => {
    const words = text(query).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const result = new Map();
    groups.forEach(group => {
      const items = (group.items || []).filter(item => {
        const haystack = text([group.title, group.category, item.question, item.shortAnswer, item.content, ...(item.tags || []), ...(item.synonyms || [])].join(' '));
        return words.every(word => haystack.includes(word));
      });
      if (items.length) result.set(group.id, items);
    });
    return result;
  }, [groups, query]);

  const visibleGroups = matches ? groups.filter(group => matches.has(group.id)) : groups;
  const toggle = (setter, values, id) => setter(current => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const remove = async group => {
    if (!confirm(`“${group.title}” 묶음과 포함된 FAQ ${group.items?.length || 0}개를 삭제할까요?`)) return;
    try { await window.faqBridge.removeGroup(group.id); } catch (error) { alert(`삭제하지 못했습니다. ${error.message || error}`); }
  };

  return <div className="faq-app">
    <div className="faq-toolbar">
      <div className="faq-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="질문, 답변, 태그, 유사어 검색" />{query && <button onClick={() => setQuery('')}>×</button>}</div>
      {isAdmin && <button className="faq-new" onClick={() => setEditor({})}>＋ FAQ 여러 개 등록</button>}
    </div>
    <main className="faq-main">
      <header><p>QUICK ANSWERS</p><h1>FAQ</h1><span>상담 중 필요한 답을 질문 단위로 빠르게 찾아보세요.</span></header>
      <div className="faq-summary"><b>{query ? `검색 결과 ${[...matches.values()].flat().length}개` : `가이드 묶음 ${groups.length}개`}</b><span>각 묶음은 하나의 KMS 전문 가이드와 연결됩니다.</span></div>
      <div className="faq-groups">
        {visibleGroups.map(group => {
          const items = matches?.get(group.id) || group.items || [];
          const expanded = !!matches || openGroups.has(group.id);
          return <section className="faq-group" key={group.id}>
            <button className="faq-group-head" onClick={() => toggle(setOpenGroups, openGroups, group.id)}>
              <span className="faq-chevron">{expanded ? '⌄' : '›'}</span>
              <span><small>{group.category || '일반'}</small><strong>{highlight(group.title, query)}</strong><em>FAQ {group.items?.length || 0}개</em></span>
            </button>
            {isAdmin && <div className="faq-group-admin"><button onClick={() => setEditor(group)}>수정</button><button onClick={() => remove(group)}>삭제</button></div>}
            {expanded && <div className="faq-items">
              {items.map(item => {
                const itemOpen = openItems.has(item.id);
                return <article key={item.id}>
                  <button onClick={() => toggle(setOpenItems, openItems, item.id)}>
                    <span>Q</span><strong>{highlight(item.question, query)}</strong><i>{itemOpen ? '−' : '+'}</i>
                  </button>
                  <p>{highlight(item.shortAnswer, query)}</p>
                  {itemOpen && <div className="faq-answer">
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(item.content || item.shortAnswer || '')) }} />
                    {!!item.tags?.length && <div className="faq-tags">{item.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
                    {group.kmsUrl && <a href={group.kmsUrl} target="_blank" rel="noopener">KMS 원문 가이드 보기 ↗</a>}
                  </div>}
                </article>;
              })}
            </div>}
          </section>;
        })}
        {!visibleGroups.length && <div className="faq-empty">{query ? '일치하는 FAQ가 없습니다. 다른 단어로 검색해 보세요.' : '등록된 FAQ가 없습니다.'}</div>}
      </div>
    </main>
    {editor && <BatchEditor group={editor.id ? editor : null} onClose={() => setEditor(null)} />}
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
