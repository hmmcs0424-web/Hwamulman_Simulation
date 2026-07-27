import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const RECENT_KEY = 'hmm-announcement-recent-searches';
const DEFAULT_CATEGORIES = ['전체', '중요', '회원관리', '배차', '정산', '환불', '시스템', '이벤트'];
const CATEGORY_PALETTE = [
  '#7F1D1D', '#9A3412', '#92400E', '#3F6212', '#166534',
  '#065F46', '#115E59', '#155E75', '#1E40AF', '#3730A3',
  '#5B21B6', '#6B21A8', '#86198F', '#9D174D', '#881337',
  '#334155', '#3F3F46', '#1F2937', '#4C1D95', '#0F4C5C',
];
let root;
let rootElement;

function categoryColor(category, colors) {
  if (colors?.[category]) return colors[category];
  let seed = 0;
  for (const char of String(category || '')) seed = (seed + char.charCodeAt(0)) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[seed];
}

function authorLabel(post, adminProfile) {
  const raw = String(post?.authorName || post?.author || '').trim();
  if (raw && raw !== '관리자' && !raw.includes('@')) return raw;
  const updatedByName = String(post?.updatedByName || '').trim();
  if (updatedByName && updatedByName !== '관리자' && !updatedByName.includes('@')) return updatedByName;
  if (adminProfile?.name && (!post?.authorId || adminProfile.uid === post.authorId)) return adminProfile.name;
  return '관리자';
}

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
function commentDateLabel(value) {
  if (!value) return '방금 전';
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function SearchModal({ open, onClose, posts, guides, onSelect }) {
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
    const words = query.trim().toLocaleLowerCase('ko-KR').split(/\s+/).filter(Boolean);
    if (!words.length) return pool.filter(item => item.isPinned).slice(0, 6);
    return pool.map(post => {
      const title = toText(post.title);
      const body = toText(post.content);
      const tags = toText((post.tags || []).join(' '));
      const score = words.reduce((sum, word) =>
        sum + (title.includes(word) ? 5 : 0) + (body.includes(word) ? 2 : 0) + (tags.includes(word) ? 3 : 0), 0);
      return { post, score };
    }).filter(item => item.score).sort((a, b) => b.score - a.score).slice(0, 12).map(item => item.post);
  }, [posts, guides, query]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
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
    const next = query.trim() ? [query.trim(), ...recent.filter(item => item !== query.trim())].slice(0, 3) : recent;
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    onSelect(item);
    onClose();
  };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
    if (event.key === 'Escape') onClose();
  };
  return <div className="an-command-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="an-command" role="dialog" aria-label="통합 검색">
      <div className="an-command-input">
        <span>⌕</span>
        <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown}
          placeholder="공지·FAQ 통합 검색…" aria-label="공지 및 FAQ 검색어" />
        <button className="an-escape-button" type="button" onClick={onClose} aria-label="검색 닫기">ESC</button>
      </div>
      {!query && recent.length > 0 && <div className="an-recent">
        <span>최근 검색</span>
        {recent.map(item => <button key={item} onClick={() => setQuery(item)}>↻ {item}</button>)}
      </div>}
      <div className="an-command-results">
        <div className="an-command-label">{query ? `검색 결과 ${results.length}건` : '중요 공지'}</div>
        {results.map((post, index) => <button key={`${post.kind}-${post.id}`} className={index === active ? 'active' : ''} onMouseEnter={() => setActive(index)} onClick={() => choose(post)}>
          <span className="an-result-icon">{post.category === 'FAQ' ? '❓' : post.kind === 'guide' ? '📘' : '📄'}</span>
          <span className="an-result-copy">
            <strong>{highlight(post.title, query)}</strong>
            <small>{highlight(snippetFor(post.content, query), query)}</small>
          </span>
          <span className={`an-category-badge ${post.kind === 'guide' ? 'guide' : ''}`}>{post.category === 'FAQ' ? 'FAQ' : post.kind === 'guide' ? '가이드' : post.category || '공지'}</span>
        </button>)}
        {!results.length && <div className="an-no-results">일치하는 공지나 가이드가 없습니다.</div>}
      </div>
      <footer><span>↑↓ 이동</span><span>↵ 열기</span><span>ESC 닫기</span></footer>
    </section>
  </div>;
}

function Editor({ post, categories, onClose }) {
  const initialLinks = Array.isArray(post?.links) && post.links.length
    ? post.links : post?.link ? [{ name: 'KMS 가이드 열기', url: post.link }] : [];
  const [form, setForm] = useState(() => ({
    id: post?.id || '',
    createdAt: post?.createdAt || '',
    title: post?.title || '',
    content: post?.content || '',
    category: post?.category || categories.find(item => item !== '전체' && item !== '중요') || '일반',
    tags: (post?.tags || []).join(', '),
    links: Array.from({ length: 3 }, (_, index) => ({
      name: initialLinks[index]?.name || '',
      url: initialLinks[index]?.url || '',
    })),
    isPinned: !!post?.isPinned,
    images: post?.images || [],
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const contentRef = useRef(null);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const updateLink = (index, key, value) => setForm(current => ({
    ...current,
    links: current.links.map((link, linkIndex) => linkIndex === index ? { ...link, [key]: value } : link),
  }));
  const formatSelection = (before, after = before) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end) || '텍스트';
    const next = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`;
    update('content', next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };
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
        links: form.links.map(link => ({ name: link.name.trim(), url: link.url.trim() })).filter(link => link.url),
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
        <div className="an-kms-fields"><span>KMS 가이드 · 최대 3개</span>{form.links.map((link, index) =>
          <div key={index}><input value={link.name} onChange={event => updateLink(index, 'name', event.target.value)}
            placeholder={`버튼 이름 ${index + 1}`} maxLength="30" />
          <input type="url" value={link.url} onChange={event => updateLink(index, 'url', event.target.value)}
            placeholder={`KMS URL ${index + 1}`} /></div>)}</div>
      </div>
      <label className="an-pin-check"><input type="checkbox" checked={form.isPinned} onChange={event => update('isPinned', event.target.checked)} /> 중요 공지로 고정</label>
      <div className="an-editor-toolbar"><strong>본문 서식</strong><div className="an-format-tools">
        <button type="button" onClick={() => formatSelection('**')}>B</button>
        <select defaultValue="" onChange={event => { if (event.target.value) formatSelection(`<span style="font-size:${event.target.value}">`, '</span>'); event.target.value = ''; }}>
          <option value="">글자 크기</option><option value="13px">작게</option><option value="16px">보통</option><option value="20px">크게</option><option value="24px">아주 크게</option>
        </select>
        <label className="an-color-tool">색상<input type="color" defaultValue="#d32f2f" onChange={event => formatSelection(`<span style="color:${event.target.value}">`, '</span>')} /></label>
      </div><span>텍스트를 먼저 선택한 뒤 서식을 적용하세요.</span>
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

function CategoryManager({ categories, colors, onClose, onSaved }) {
  const [items, setItems] = useState(categories.filter(item => item !== '전체' && item !== '중요'));
  const [categoryColors, setCategoryColors] = useState(colors);
  const [selected, setSelected] = useState(items[0] || '');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const add = () => {
    const name = value.trim();
    if (!name || items.includes(name)) return;
    setItems(current => [...current, name]);
    setCategoryColors(current => ({ ...current, [name]: categoryColor(name, current) }));
    setSelected(name);
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
      await window.announcementBridge.saveCategories(items, categoryColors);
      onSaved(items, categoryColors);
    } catch (error) { alert(`카테고리를 저장하지 못했습니다: ${error.message || error}`); }
    finally { setSaving(false); }
  };
  return <div className="an-editor-backdrop"><section className="an-category-editor">
    <header><h2>카테고리 관리</h2><button onClick={onClose}>×</button></header>
    <p>공지 분류와 표시 색상을 설정할 수 있습니다. 라이트·다크 모드에서 모두 흰색 글자로 표시됩니다.</p>
    <div className="an-category-add"><input value={value} onChange={event => setValue(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} placeholder="새 카테고리 이름" />
      <button onClick={add}>추가</button></div>
    <div className="an-category-items">{items.map((item, index) => <div key={item}
      className={selected === item ? 'selected' : ''} onClick={() => setSelected(item)}>
      <span><i style={{ backgroundColor: categoryColor(item, categoryColors) }} />{item}</span>
      <div><button disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
        <button disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button>
        <button className="danger" onClick={() => setItems(current => current.filter(value => value !== item))}>삭제</button></div>
    </div>)}</div>
    {!!selected && <div className="an-color-editor">
      <strong>{selected} 색상</strong>
      <div className="an-color-palette">{CATEGORY_PALETTE.map(color => <button key={color} type="button"
        className={categoryColor(selected, categoryColors) === color ? 'active' : ''}
        style={{ backgroundColor: color }} aria-label={color}
        onClick={() => setCategoryColors(current => ({ ...current, [selected]: color }))} />)}</div>
      <div className="an-color-preview">
        <div className="light"><small>라이트 모드</small><span style={{ backgroundColor: categoryColor(selected, categoryColors) }}>{selected}</span></div>
        <div className="dark"><small>다크 모드</small><span style={{ backgroundColor: categoryColor(selected, categoryColors) }}>{selected}</span></div>
      </div>
    </div>}
    <footer><button onClick={onClose}>취소</button><button className="primary" disabled={saving} onClick={save}>{saving ? '저장 중…' : '변경사항 저장'}</button></footer>
  </section></div>;
}

function Comments({ announcementId, isAdmin }) {
  const [comments, setComments] = useState([]);
  const [identity, setIdentity] = useState(() => window.announcementBridge.getCounselor() || window.announcementBridge.getAdmin());
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => window.announcementBridge.subscribeComments(announcementId, setComments), [announcementId]);
  useEffect(() => {
    const update = () => setIdentity(window.announcementBridge.getCounselor() || window.announcementBridge.getAdmin());
    window.addEventListener('counselor-session-change', update);
    window.addEventListener('announcement-admin-change', update);
    return () => {
      window.removeEventListener('counselor-session-change', update);
      window.removeEventListener('announcement-admin-change', update);
    };
  }, []);
  const submit = async event => {
    event.preventDefault();
    const nextAuthor = String(identity?.name || '').trim();
    const nextContent = content.trim();
    if (!nextAuthor || !nextContent) return alert('댓글 내용을 입력해 주세요.');
    setSaving(true);
    try {
      await window.announcementBridge.addComment(announcementId, { author: nextAuthor, content: nextContent });
      setContent('');
    } catch (error) { alert(`댓글을 등록하지 못했습니다: ${error.message || error}`); }
    finally { setSaving(false); }
  };
  const remove = async comment => {
    if (!confirm('이 댓글을 삭제할까요?')) return;
    try { await window.announcementBridge.removeComment(announcementId, comment.id); }
    catch (error) { alert(`댓글을 삭제하지 못했습니다: ${error.message || error}`); }
  };
  return <section className="an-comments">
    <header><h2>댓글 <span>{comments.length}</span></h2></header>
    {!!identity && <form className="an-comment-form" onSubmit={submit}>
      <div className="an-comment-author">작성자 <strong>{identity.name}</strong></div>
      <textarea aria-label="댓글 내용" maxLength="500" value={content} onChange={event => setContent(event.target.value)}
        placeholder="댓글을 입력해 주세요." />
      <footer><span>{content.length}/500</span><button type="submit" disabled={saving}>{saving ? '등록 중…' : '댓글 등록'}</button></footer>
    </form>}
    <div className="an-comment-list">{comments.map(comment => <article className="an-comment" key={comment.id}>
      <div><strong>{comment.author}</strong><time>{commentDateLabel(comment.createdAt)}</time>
        {isAdmin && <button type="button" onClick={() => remove(comment)}>삭제</button>}</div>
      <p>{comment.content}</p>
    </article>)}
    {!comments.length && <p className="an-comment-empty">첫 댓글을 남겨보세요.</p>}</div>
  </section>;
}

function Acknowledgement({ post }) {
  const [counselor, setCounselor] = useState(() => window.announcementBridge.getCounselor());
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const update = () => setCounselor(window.announcementBridge.getCounselor());
    window.addEventListener('counselor-session-change', update);
    return () => window.removeEventListener('counselor-session-change', update);
  }, []);
  useEffect(() => {
    setReceipt(null);
    if (!counselor?.employeeNo) return undefined;
    return window.announcementBridge.subscribeReceipt(post.id, counselor.employeeNo, setReceipt);
  }, [post.id, counselor?.employeeNo]);
  if (!counselor) return null;
  const confirmed = Number(receipt?.announcementVersion || 0) === Number(post.version || 1);
  const acknowledge = async () => {
    setSaving(true);
    try {
      await window.announcementBridge.acknowledge(post);
    } catch (error) {
      alert(`확인 처리하지 못했습니다: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };
  return <section className={`an-acknowledgement ${confirmed ? 'confirmed' : ''}`}>
    <div><strong>{confirmed ? '확인 및 숙지 완료' : '공지 내용을 확인해 주세요'}</strong>
      <span>{confirmed ? `${counselor.name}님의 확인이 기록되었습니다.` : '내용을 모두 읽은 뒤 버튼을 눌러 주세요.'}</span></div>
    <button type="button" disabled={confirmed || saving} onClick={acknowledge}>
      {confirmed ? '✓ 확인 및 숙지 완료' : saving ? '처리 중…' : '확인 및 숙지'}
    </button>
  </section>;
}

function ReceiptSummary({ post, onClose }) {
  const [data, setData] = useState({ employees: [], receipts: [] });
  const [tab, setTab] = useState('confirmed');
  useEffect(() => window.announcementBridge.subscribeReceiptSummary(post.id, setData), [post.id]);
  const currentVersion = Number(post.version || 1);
  const receiptMap = new Map(data.receipts.map(item => [String(item.employeeNo || item.id), item]));
  const confirmed = data.employees.filter(employee =>
    Number(receiptMap.get(String(employee.employeeNo || employee.id))?.announcementVersion || 0) === currentVersion);
  const unconfirmed = data.employees.filter(employee =>
    Number(receiptMap.get(String(employee.employeeNo || employee.id))?.announcementVersion || 0) !== currentVersion);
  const rows = tab === 'confirmed' ? confirmed : unconfirmed;
  return <div className="an-editor-backdrop">
    <section className="an-receipt-dialog">
      <header><div><h2>✓ 수신 확인자 명단</h2><p>{post.title}</p></div><button onClick={onClose}>×</button></header>
      <div className="an-receipt-tabs">
        <button className={tab === 'confirmed' ? 'active' : ''} onClick={() => setTab('confirmed')}>확인 완료 ({confirmed.length})</button>
        <button className={tab === 'unconfirmed' ? 'active' : ''} onClick={() => setTab('unconfirmed')}>미확인 ({unconfirmed.length})</button>
      </div>
      <div className="an-receipt-table">
        <div className="head"><span>이름</span><span>사번</span><span>{tab === 'confirmed' ? '확인 일시' : '상태'}</span></div>
        {rows.map(employee => {
          const employeeNo = String(employee.employeeNo || employee.id);
          const receipt = receiptMap.get(employeeNo);
          return <div key={employeeNo}><strong>{employee.name || '-'}</strong><span>{employeeNo}</span>
            <span>{tab === 'confirmed' ? commentDateLabel(receipt?.confirmedAt) : '미확인'}</span></div>;
        })}
        {!rows.length && <p>표시할 사용자가 없습니다.</p>}
      </div>
    </section>
  </div>;
}

function Workspace() {
  const [posts, setPosts] = useState([]);
  const [guides, setGuides] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [categoryColors, setCategoryColors] = useState({});
  const [category, setCategory] = useState('전체');
  const [searchOpen, setSearchOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(false);
  const [receiptPost, setReceiptPost] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem('hmm-announcement-theme') === 'dark');
  const [isAdmin, setIsAdmin] = useState(() => !!window.announcementBridge?.isAdmin());
  const [adminProfile, setAdminProfile] = useState(() => window.announcementBridge?.getAdmin());
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => window.announcementBridge.subscribe(setPosts), []);
  useEffect(() => window.announcementBridge.subscribeGuides(setGuides), []);
  useEffect(() => window.announcementBridge.subscribeCategories(settings => {
    setCategories(['전체', '중요', ...settings.categories]);
    setCategoryColors(settings.colors || {});
  }), []);
  useEffect(() => {
    const update = () => {
      setIsAdmin(!!window.announcementBridge.isAdmin());
      setAdminProfile(window.announcementBridge.getAdmin());
    };
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
  useEffect(() => {
    const openAnnouncement = event => navigate(`/announcement/${encodeURIComponent(event.detail?.id || '')}`);
    window.addEventListener('announcement-open', openAnnouncement);
    return () => window.removeEventListener('announcement-open', openAnnouncement);
  }, [navigate]);
  const filtered = posts.filter(post => category === '전체' || (category === '중요' ? post.isPinned : post.category === category))
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || dateLabel(b.createdAt).localeCompare(dateLabel(a.createdAt)));
  const selectedId = location.pathname.startsWith('/announcement/') ? decodeURIComponent(location.pathname.split('/').pop()) : '';
  const selected = posts.find(post => post.id === selectedId);
  const selectedLinks = selected ? (Array.isArray(selected.links) && selected.links.length
    ? selected.links : selected.link ? [{ name: 'KMS 가이드 열기', url: selected.link }] : []) : [];
  const theme = dark ? 'dark' : 'light';
  const renderMarkdown = content => ({ __html: DOMPurify.sanitize(marked.parse(content || '')) });
  const remove = async post => {
    if (confirm('이 공지를 삭제할까요?')) { await window.announcementBridge.remove(post.id); navigate('/'); }
  };
  return <div className="announcement-app" data-theme={theme}>
    <div className="an-topbar">
      <button className="an-search-trigger" onClick={() => setSearchOpen(true)}><span>⌕</span><span>통합 검색</span><kbd>Ctrl K</kbd></button>
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
          <div className="an-document-meta"><span className="an-category-badge" style={{ backgroundColor: categoryColor(selected.category || '일반', categoryColors), color: '#fff' }}>{selected.category || '일반'}</span>
            {selected.isPinned && <span className="an-priority">중요</span>}<time>{dateLabel(selected.createdAt)}</time>
            <span>작성자 {authorLabel(selected, adminProfile)}</span></div>
          <h1>{selected.title}</h1>
          <div className="an-tags">{(selected.tags || []).map(tag => <span key={tag}>#{tag}</span>)}</div>
          <div className="an-markdown" dangerouslySetInnerHTML={renderMarkdown(selected.content)} />
          {!!selectedLinks.length && <div className="an-link-list">{selectedLinks.map((link, index) =>
            <a className="an-link-card" key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener">
              {link.name || 'KMS 가이드 열기'}</a>)}</div>}
          <Acknowledgement post={selected} />
          {isAdmin && !!selected.history?.length && <details className="an-history"><summary>수정 이력 {selected.history.length}건</summary>
            {[...selected.history].reverse().map((entry, index) => <div key={`${entry.editedAt}-${index}`}>
              <strong>{entry.editedByName || '관리자'}</strong><time>{commentDateLabel(entry.editedAt)}</time>
              <span>{entry.previous?.title || '이전 게시글'}</span></div>)}</details>}
          {isAdmin && <div className="an-admin-actions"><button className="receipt" onClick={() => setReceiptPost(selected)}>✓ 수신 확인</button><button onClick={() => setEditor({ mode: 'edit', post: selected })}>수정</button><button onClick={() => remove(selected)}>삭제</button></div>}
          <Comments announcementId={selected.id} isAdmin={isAdmin} />
        </article> : <section className="an-index">
          <header><p>TEAM KNOWLEDGE</p><h1>{category}</h1><span>업무 변경사항과 중요한 안내를 빠르게 찾아보세요.</span></header>
          <div className="an-card-list">{filtered.map(post => <button key={post.id} className="an-page-row" onClick={() => navigate(`/announcement/${encodeURIComponent(post.id)}`)}>
            <span className="an-page-category" style={{ backgroundColor: categoryColor(post.category || '일반', categoryColors), color: '#fff' }}>{post.isPinned && <i>★</i>}{post.category || '일반'}</span>
            <span className="an-page-copy"><strong>{post.title}</strong><small>{snippetFor(post.content, '')}</small>
              {!!post.tags?.length && <span className="an-row-tags">{post.tags.slice(0, 3).map(tag => <i key={tag}>#{tag}</i>)}</span>}</span>
            <time>{dateLabel(post.createdAt)}</time>
          </button>)}
          {!filtered.length && <div className="an-empty">이 카테고리에 등록된 공지가 없습니다.</div>}</div>
        </section>}
      </main>
    </div>
    <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} posts={posts} guides={guides} onSelect={item => {
      if (item.kind === 'guide') window.announcementBridge.openGuide(item.id);
      else navigate(`/announcement/${encodeURIComponent(item.id)}`);
    }} />
    {editor && <Editor post={editor.post} categories={categories} onClose={() => setEditor(null)} />}
    {receiptPost && <ReceiptSummary post={receiptPost} onClose={() => setReceiptPost(null)} />}
    {categoryEditor && <CategoryManager categories={categories} colors={categoryColors} onClose={() => setCategoryEditor(false)}
      onSaved={(values, colors) => { setCategories(['전체', '중요', ...values]); setCategoryColors(colors); setCategoryEditor(false); }} />}
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
