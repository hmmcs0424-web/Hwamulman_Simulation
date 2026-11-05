/* Durable editor overlays. Simulation data and event handlers stay in the application. */
(() => {
  const ignored = '#btchat,#guide-warning-editor,#guide-warning-layer,script,style';
  const dynamic = '#fm,#client-view,#dep-view,#calc-view,#car-view,#stat-view,#cs-view,#set-view,#hp-b';
  let edits = [], replaying = false, suspended = false, scheduled = false, lastScope = '';
  const scope = () => window.guideWarningContext?.().key || 'cargo';
  const editable = node => node?.nodeType === 1 && !node.closest(ignored);
  function locator(node) {
    const steps = [];
    while (node && node !== document.body && !node.id) {
      steps.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes, node)); node = node.parentNode;
    }
    return {id:node?.id || '', steps};
  }
  function resolve(loc) {
    let node = loc.id ? document.getElementById(loc.id) : document.body;
    for (const i of loc.steps) node = node?.childNodes[i];
    return node;
  }
  function cleanHtml(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[data-guide-selected]').forEach(el => el.removeAttribute('data-guide-selected'));
    return copy.innerHTML;
  }
  function hash(value) {
    let n = 2166136261;
    for (let i=0;i<value.length;i++) n = Math.imul(n ^ value.charCodeAt(i),16777619);
    return (n >>> 0).toString(16);
  }
  const key = op => JSON.stringify([op.scope,op.loc,op.kind,op.name]);
  function append(op) {
    const previous = edits.at(-1);
    if (previous && key(previous) === key(op) && (op.kind === 'html' ? hash(previous.after) === op.before : previous.after === op.before)) {
      previous.after = op.after;
      if (previous.before === (op.kind === 'html' ? hash(previous.after) : previous.after)) edits.pop();
    } else edits.push(op);
  }
  function capture() {
    const nodes = new Map();
    for (const el of document.body.querySelectorAll('*')) {
      if (!editable(el)) continue;
      nodes.set(el, {loc:locator(el), html:cleanHtml(el), style:el.getAttribute('style'),
        className:el.getAttribute('class'), scope:el.closest(dynamic) ? scope() : '*'});
    }
    return nodes;
  }
  function record(before, records) {
    if (!before || replaying) return;
    const roots = new Set();
    for (const r of records) {
      const el = r.target.nodeType === 3 ? r.target.parentElement : r.target;
      if (!editable(el)) continue;
      if (r.type === 'attributes') {
        const old = before.get(el); if (!old) continue;
        if ((r.attributeName || r.name) === 'style') {
          const oldEl = document.createElement('span'); oldEl.setAttribute('style',old.style || '');
          const names = new Set([...oldEl.style,...el.style]);
          for (const name of names) {
            const a = oldEl.style.getPropertyValue(name), b = el.style.getPropertyValue(name);
            if (a !== b) append({kind:'style',loc:old.loc,scope:old.scope,name,before:a,after:b,
              priority:el.style.getPropertyPriority(name)});
          }
        }
      } else if (el !== document.body) roots.add(el);
      else for (const added of [...(r.addedNodes || r.added || []),...(r.removedNodes || r.removed || [])]) {
        if (added.nodeType !== 1 || !added.id?.startsWith('guide-added-')) continue;
        const anchor = (r.nextSibling || r.next)?.id || 'reg';
        append({kind:'insert',loc:{id:added.id,steps:[]},scope:scope(),anchor,
          before:added.isConnected ? null : added.outerHTML,after:added.isConnected ? added.outerHTML : null});
      }
    }
    for (const el of roots) {
      if ([...roots].some(other => other !== el && other.contains(el))) continue;
      const old = before.get(el); if (!old || !el.isConnected) continue;
      const after = cleanHtml(el);
      if (old.html !== after) append({kind:'html',loc:old.loc,scope:old.scope,before:hash(old.html),after});
    }
  }
  // Reconcile markup without replacing existing buttons/inputs and their event listeners.
  function morph(target, source) {
    const incoming = [...source.childNodes];
    for (let i=0;i<incoming.length;i++) {
      const next = incoming[i]; let current = target.childNodes[i];
      const compatible = node => node && node.nodeType === next.nodeType &&
        (node.nodeType !== 1 || (node.tagName === next.tagName && node.id === next.id));
      if (!compatible(current)) {
        const match = [...target.childNodes].slice(i+1).find(compatible);
        if (match) { target.insertBefore(match,current || null); current = match; }
        else { target.insertBefore(next.cloneNode(true),current || null); continue; }
      }
      if (next.nodeType === 3) { if(current.data !== next.data) current.data = next.data; }
      else if (next.nodeType === 1) {
        for (const attr of [...current.attributes]) {
          if (!next.hasAttribute(attr.name) && !/^on/i.test(attr.name)) current.removeAttribute(attr.name);
        }
        for (const attr of next.attributes) {
          if (!/^on/i.test(attr.name) && current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name,attr.value);
        }
        morph(current,next);
      }
    }
    while (target.childNodes.length > incoming.length) target.lastChild.remove();
  }
  function fragment(html) {
    const template = document.createElement('template');
    template.innerHTML = DOMPurify.sanitize(html,{ADD_ATTR:['data-guide-selected']});
    return template.content;
  }
  function apply() {
    if (replaying || suspended) return;
    replaying = true;
    try {
      const currentScope = scope();
      if (currentScope !== lastScope) {
        document.querySelectorAll('[id^="guide-added-"]').forEach(el => el.remove());
        lastScope = currentScope;
      }
      for (const op of edits) {
        if (op.scope !== '*' && op.scope !== currentScope) continue;
        const el = resolve(op.loc);
        if (op.kind === 'insert') {
          if (!op.after) { el?.remove(); continue; }
          if (!el) document.getElementById(op.anchor)?.before(fragment(op.after));
        } else if (editable(el) && op.kind === 'style') {
          if (el.style.getPropertyValue(op.name) !== op.after) {
            if (op.after) el.style.setProperty(op.name,op.after,op.priority || '');
            else el.style.removeProperty(op.name);
          }
        } else if (editable(el) && op.kind === 'html' && hash(cleanHtml(el)) === op.before) {
          morph(el,fragment(op.after));
        }
      }
    } finally { observer.takeRecords(); replaying = false; }
  }
  const observer = new MutationObserver(() => {
    if (replaying || suspended || scheduled) return;
    scheduled = true; queueMicrotask(() => { scheduled = false; apply(); });
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});
  window.guideEdits = {
    capture, record, apply, hash,
    suspend(value) { suspended = value; if(!value) observer.takeRecords(); },
    export() { return {schema:1,edits:JSON.parse(JSON.stringify(edits)),warnings:JSON.parse(document.getElementById('guide-warning-data').textContent)}; },
    load(data) {
      edits = Array.isArray(data?.edits) ? data.edits : [];
      if (Array.isArray(data?.warnings)) document.getElementById('guide-warning-data').textContent = JSON.stringify(data.warnings).replace(/</g,'\\u003c');
      apply();
    }
  };
  const embedded = document.getElementById('guide-edits-data');
  if (embedded) { try { window.guideEdits.load(JSON.parse(embedded.textContent)); } catch(e) { console.error('편집 백업을 불러오지 못했습니다.',e); } }
})();
