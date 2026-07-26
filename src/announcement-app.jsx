import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const RECENT_KEY = 'hmm-announcement-recent-searches';
const DEFAULT_CATEGORIES = ['전체', '중요', '회원관리', '배차', '정산', '환불', '시스템', '이벤트'];
let root;
let rootElement;

function toText(value) {
  return String(value || '').toLocaleLowerCase('ko-KR');
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function highlight(text, query) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return text;
  const re = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  return String(text || '').split(re).map((part, index) =>
    words.some(word => part.toLocaleLowerCase('ko-KR') === word.toLocaleLowerCase('ko-KR'))
      ? <mark key={index}>{part}</mark> : <React.Fragment key={index}>{part}</React.Fragment>,
  );
}
function snippetFor(content, query) {
  const plain = String(content || '').replace(/!\[[^\]]*\]\([^)]+\)/g, '🖼 이미지')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#>*_`[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = query.trim().split(/\s+/).filter(Boolean);
  const found = words.map(word => plain.toLocaleLowerCase('ko-KR').indexOf(word.toLocaleLowerCase('ko-KR'))).filter(i => i >= 0);
  const start = found.length ? Math.max(0, Math.min(...found) - 45) : 0;
  return `${start ? '…' : ''}${plain.slice(start, start + 150)}${plain.length > start + 150 ? '…' : ''}`;
}
function dateLabel(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value.toDate) return value.toDate().toISOString().slice(0, 10);
  return '';
}

function SearchModal({ open, onClose, posts, onSelect }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  });
  const results = useMemo(() => {
    const words = query.trim().toLocaleLowerCase('ko-KR').split(/\s+/).filter(Boolean);
    if (!words.length) return posts.filter(post => post.isPinned).slice(0, 6);
    return posts.map(post => {
      const title = toText(post.title);
      const body = toText(post.content);
      const tags = toText((post.tags || []).join(' '));
      const score = words.reduce((sum, word) =>
        sum + (title.includes(word) ? 5 : 0) + (body.includes(word) ? 2 : 0) + (tags.includes(word) ? 3 : 0), 0);
      return { post, score };
    }).filter(item => item.score).sort((a, b) => b.score - a.score).slice(0, 12).map(item => item.post);
  }, [posts, query]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => setActive(0), [query]);
  if (!open) return null;
  const choose = post => {
    const next = query.trim() ? [query.trim(), ...recent.filter(item => item !== query.trim())].slice(0, 3) : recent;
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    onSelect(post.id);
    onClose();
  };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
    if (event.key === 'Escape') onClose();
  };
  return <div className="an-command-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="an-command" role="dialog" aria-label="공지 검색">
      <div className="an-command-input">
        <span>⌕</span>
        <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown}
          placeholder="공지 검색…" aria-label="공지 검색어" />
        <kbd>ESC</kbd>
      </div>
      {!query && recent.length > 0 && <div className="an-recent">
        <span>최근 검색</span>
        {recent.map(item => <button key={item} onClick={() => setQuery(item)}>↻ {item}</button>)}
      </div>}
      <div className="an-command-results">
        <div className="an-command-label">{query ? `검색 결과 ${results.length}건` : '중요 공지'}</div>
        {results.map((post, index) => <button key={post.id} className={index === active ? 'active' : ''} onMouseEnter={() => setActive(index)} onClick={() => choose(post)}>
          <span className="an-result-icon">📄</span>
          <span className="an-result-copy">
            <strong>{highlight(post.title, query)}</strong>
            <small>{highlight(snippetFor(post.content, query), query)}</small>
          </span>
          <span className="an-category-badge">{post.category || '일반'}</span>
        </button>)}
        {!results.length && <div className="an-no-results">일치하는 공지가 없습니다.</div>}
      </div>
      <footer><span>↑↓ 이동</span><span>↵ 열기</span><span>ESC 닫기</span></footer>
    </section>
  </div>;
}

function Editor({ post, categories, onClose }) {
  const [form, setForm] = useState(() => ({
    id: post?.id || '',
    createdAt: post?.createdAt || '',
    title: post?.title || '',
    content: post?.content || '',
    category: post?.category || categories.find(item => item !== '전체' && item !== '중요') || '일반',
    tags: (post?.tags || []).join(', '),
    link: post?.link || '',
    isPinned: !!post?.isPinned,
    images: post?.images || [],
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const contentRef = useRef(null);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const addImage = async file => {
    if (!file?.type?.startsWith('image/')) return;
    setUploading(true);
    try {
      const url = await window.announcementBridge.uploadImage(file);
      update('images', [...form.images, url]);
      const markdown = `\n![${file.name || '공지 이미지'}](${url})\n`;
      update('content', form.content + markdown);
    } catch (error) { alert(`이미지를 올리지 못했습니다: ${error.message || error}`); }
    finally { setUploading(false); }
  };
  const onPaste = event => {
    const file = [...event.clipboardData.items].find(item => item.type.startsWith('image/'))?.getAsFile();
    if (file) { event.preventDefault(); addImage(file); }
  };
  const previewHtml = useMemo(
    () => ({ __html: DOMPurify.sanitize(marked.parse(form.content || '*작성한 내용과 이미지가 여기에 표시됩니다.*')) }),
    [form.content],
  );
  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return alert('제목과 본문을 입력해 주세요.');
    setSaving(true);
    try {
      await window.announcementBridge.save({
        ...form,
        tags: form.tags.split(',').map(item => item.trim()).filter(Boolean),
      });
      onClose();
    } catch (error) { alert(`저장하지 못했습니다: ${error.message || error}`); }
    finally { setSaving(false); }
  };
  return <div className="an-editor-backdrop">
    <section className="an-editor">
      <header><h2>{post ? '공지 수정' : '새 공지'}</h2><button onClick={onClose}>×</button></header>
      <div className="an-editor-grid">
        <label><span>제목</span><input value={form.title} onChange={event => update('title', event.target.value)} placeholder="제목 없음" /></label>
        <label><span>카테고리</span><select value={form.category} onChange={event => update('category', event.target.value)}>
          {categories.filter(item => item !== '전체' && item !== '중요').map(item => <option key={item}>{item}</option>)}
        </select></label>
        <label><span>태그</span><input value={form.tags} onChange={event => update('tags', event.target.value)} placeholder="쉼표로 구분: 긴급, 앱, 회원" /></label>
        <label><span>KMS 가이드</span><input type="url" value={form.link} onChange={event => update('link', event.target.value)} placeholder="KMS 가이드 URL을 입력하세요" /></label>
      </div>
      <label className="an-pin-check"><input type="checkbox" checked={form.isPinned} onChange={event => update('isPinned', event.target.checked)} /> 중요 공지로 고정</label>
      <div className="an-editor-toolbar"><strong>본문 · Markdown</strong><span>굵게 **텍스트** · 목록 - 항목 · 링크 [이름](URL)</span>
        <label className="an-image-button">＋ 이미지<input type="file" accept="image/*" hidden onChange={event => addImage(event.target.files[0])} /></label>
      </div>
      <div className="an-compose">
        <div className="an-compose-pane">
          <div className="an-pane-label">편집</div>
          <textarea ref={contentRef} value={form.content} onChange={event => update('content', event.target.value)} onPaste={onPaste}
            placeholder="내용을 입력하세요. 캡처한 이미지는 Ctrl+V로 바로 붙여넣을 수 있습니다." />
        </div>
        <div className="an-compose-pane an-preview-pane">
          <div className="an-pane-label">미리보기</div>
          <div className="an-live-preview an-markdown" dangerouslySetInnerHTML={previewHtml} />
        </div>
      </div>
      <footer><span>{uploading ? '이미지 업로드 중…' : '이미지를 복사한 뒤 본문에서 Ctrl+V'}</span>
        <div><button className="secondary" onClick={onClose}>취소</button><button className="primary" disabled={saving || uploading} onClick={save}>{saving ? '저장 중…' : '저장'}</button></div>
      </footer>
    </section>
  </div>;
}

function CategoryManager({ categories, onClose, onSaved }) {
  const [items, setItems] = useState(categories.filter(item => item !== '전체' && item !== '중요'));
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const add = () => {
    const name = value.trim();
    if (!name || items.includes(name)) return;
    setItems(current => [...current, name]);
    setValue('');
  };
  const move = (index, offset) => setItems(current => {
    const next = [...current];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    return next;
  });
  const save = async () => {
    if (!items.length) return alert('카테고리를 하나 이상 등록해 주세요.');
    setSaving(true);
    try {
      await window.announcementBridge.saveCategories(items);
      onSaved(items);
    } catch (error) { alert(`카테고리를 저장하지 못했습니다: ${error.message || error}`); }
    finally { setSaving(false); }
  };
  return <div className="an-editor-backdrop"><section className="an-category-editor">
    <header><h2>카테고리 관리</h2><button onClick={onClose}>×</button></header>
    <p>공지 분류를 추가하거나 삭제할 수 있습니다. 저장 즉시 왼쪽 사이드바에 반영됩니다.</p>
    <div className="an-category-add"><input value={value} onChange={event => setValue(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} placeholder="새 카테고리 이름" />
      <button onClick={add}>추가</button></div>
    <div className="an-category-items">{items.map((item, index) => <div key={item}>
      <span>▤ {item}</span>
      <div><button disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
        <button disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button>
        <button className="danger" onClick={() => setItems(current => current.filter(value => value !== item))}>삭제</button></div>
    </div>)}</div>
    <footer><button onClick={onClose}>취소</button><button className="primary" disabled={saving} onClick={save}>{saving ? '저장 중…' : '변경사항 저장'}</button></footer>
  </section></div>;
}

function Workspace() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [category, setCategory] = useState('전체');
  const [searchOpen, setSearchOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('hmm-announcement-theme') === 'dark');
  const [isAdmin, setIsAdmin] = useState(() => !!window.announcementBridge?.isAdmin());
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => window.announcementBridge.subscribe(setPosts), []);
  useEffect(() => window.announcementBridge.subscribeCategories(values => setCategories(['전체', '중요', ...values])), []);
  useEffect(() => {
    const update = () => setIsAdmin(!!window.announcementBridge.isAdmin());
    window.addEventListener('announcement-admin-change', update);
    return () => window.removeEventListener('announcement-admin-change', update);
  }, []);
  useEffect(() => {
    const key = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const filtered = posts.filter(post => category === '전체' || (category === '중요' ? post.isPinned : post.category === category))
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || dateLabel(b.createdAt).localeCompare(dateLabel(a.createdAt)));
  const selectedId = location.pathname.startsWith('/announcement/') ? decodeURIComponent(location.pathname.split('/').pop()) : '';
  const selected = posts.find(post => post.id === selectedId);
  const theme = dark ? 'dark' : 'light';
  const renderMarkdown = content => ({ __html: DOMPurify.sanitize(marked.parse(content || '')) });
  const remove = async post => {
    if (confirm('이 공지를 삭제할까요?')) { await window.announcementBridge.remove(post.id); navigate('/'); }
  };
  return <div className="announcement-app" data-theme={theme}>
    <div className="an-topbar">
      <button className="an-search-trigger" onClick={() => setSearchOpen(true)}><span>⌕</span><span>공지 검색</span><kbd>Ctrl K</kbd></button>
      <div className="an-top-actions">
        <button title="다크모드" onClick={() => { setDark(!dark); localStorage.setItem('hmm-announcement-theme', !dark ? 'dark' : 'light'); }}>{dark ? '☀' : '◐'}</button>
        {isAdmin && <button className="an-new-button" onClick={() => setEditor({ mode: 'new' })}>＋ 새 공지</button>}
      </div>
    </div>
    <div className="an-layout">
      <aside className="an-sidebar">
        <div className="an-sidebar-title">공지사항</div>
        <nav>{categories.map(item => <button key={item} className={category === item && !selected ? 'active' : ''} onClick={() => { setCategory(item); navigate('/'); }}>
          <span>{item === '전체' ? '▤' : item === '중요' ? '★' : '›'}</span>{item}
        </button>)}</nav>
        {isAdmin && <button className="an-manage-categories" onClick={() => setCategoryEditor(true)}>⚙ 카테고리 편집</button>}
      </aside>
      <main className="an-main">
        {selected ? <article className="an-document">
          <button className="an-back" onClick={() => navigate('/')}>← {selected.category || '공지사항'}</button>
          <div className="an-document-meta"><span className="an-category-badge">{selected.category || '일반'}</span>
            {selected.isPinned && <span className="an-priority">중요</span>}<time>{dateLabel(selected.createdAt)}</time></div>
          <h1>{selected.title}</h1>
          <div className="an-tags">{(selected.tags || []).map(tag => <span key={tag}>#{tag}</span>)}</div>
          <div className="an-markdown" dangerouslySetInnerHTML={renderMarkdown(selected.content)} />
          {selected.link && <a className="an-link-card" href={selected.link} target="_blank" rel="noopener">↗ KMS 가이드 열기<span>{selected.link}</span></a>}
          {isAdmin && <div className="an-admin-actions"><button onClick={() => setEditor({ mode: 'edit', post: selected })}>수정</button><button onClick={() => remove(selected)}>삭제</button></div>}
        </article> : <section className="an-index">
          <header><p>TEAM KNOWLEDGE</p><h1>{category}</h1><span>업무 변경사항과 중요한 안내를 빠르게 찾아보세요.</span></header>
          <div className="an-card-list">{filtered.map(post => <button key={post.id} className="an-page-row" onClick={() => navigate(`/announcement/${encodeURIComponent(post.id)}`)}>
            <span className="an-page-icon">{post.isPinned ? '★' : '▤'}</span>
            <span className="an-page-copy"><strong>{post.title}</strong><small>{snippetFor(post.content, '')}</small>
              <span className="an-row-tags"><b>{post.category || '일반'}</b>{(post.tags || []).slice(0, 3).map(tag => <i key={tag}>#{tag}</i>)}</span></span>
            <time>{dateLabel(post.createdAt)}</time>
          </button>)}
          {!filtered.length && <div className="an-empty">이 카테고리에 등록된 공지가 없습니다.</div>}</div>
        </section>}
      </main>
    </div>
    <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} posts={posts} onSelect={id => navigate(`/announcement/${encodeURIComponent(id)}`)} />
    {editor && <Editor post={editor.post} categories={categories} onClose={() => setEditor(null)} />}
    {categoryEditor && <CategoryManager categories={categories} onClose={() => setCategoryEditor(false)}
      onSaved={values => { setCategories(['전체', '중요', ...values]); setCategoryEditor(false); }} />}
  </div>;
}

export function mountAnnouncementApp(element) {
  if (!element) return;
  if (!root || rootElement !== element) {
    rootElement = element;
    root = createRoot(element);
  }
  root.render(<MemoryRouter><Routes><Route path="*" element={<Workspace />} /></Routes></MemoryRouter>);
}

window.mountAnnouncementApp = mountAnnouncementApp;
if (document.getElementById('announcementReactRoot')) mountAnnouncementApp(document.getElementById('announcementReactRoot'));
