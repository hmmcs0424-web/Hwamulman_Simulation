const STORAGE_KEY = "hwamulman-message-templates-v1";

const seedData = {
  categories: [
    { id: "pause-defense", name: "일시정지 방어", color: "#f59e0b" },
    { id: "mancharo-switch", name: "만차로 전환", color: "#3b82f6" }
  ],
  templates: [
    {
      id: "medium-welfare",
      categoryId: "pause-defense",
      title: "중형 차주 복지서비스 안내",
      content: `[화물맨 복지서비스 안내]

안녕하세요, 차주님.
함께 달리는 상생 파트너 화물맨입니다.

통화 시 안내드린 회원 복지 혜택을 문자로 다시 안내드립니다.

■ 바로 이용/문의 가능한 서비스

- 선착불 안심결제
- 올라핀테크 안심결제
- 법무지원
- 제휴사 세무 서비스
- 적재물보험 무료가입 서비스(특약별도)

■ 정회원 1년 유지 시 가능한 서비스
화물맨 스티커를 차량에 부착하신 뒤 인증 사진을 제출하시고, 1년 이상 회원 자격을 유지하시면 아래 혜택을 이용하실 수 있습니다.

- 차량 수리 위로금
- 제휴 펜션 할인
- 근조화 지원

■ 리스타트 캠페인

- 미수금 피해 보상

자세한 내용은 고객센터로 연락 주시면 상세하게 안내해 드리겠습니다.
◆ 고객센터: 1800-1234 (ARS 2번)

오늘도 안전 운전하시기 바랍니다.
감사합니다.`
    },
    {
      id: "large-welfare",
      categoryId: "pause-defense",
      title: "대형 및 기타 차종 차주 복지서비스 안내",
      content: `[화물맨 복지서비스 안내]

안녕하세요, 차주님.
함께 달리는 상생 파트너 화물맨입니다.

통화 시 안내드린 회원 복지 혜택을 문자로 다시 안내드립니다.

■ 바로 이용/문의 가능한 서비스

- 선착불 안심결제
- 올라핀테크 안심결제
- 법무지원
- 제휴사 세무 서비스

■ 정회원 1년 유지 시 가능한 서비스
화물맨 스티커를 차량에 부착하신 뒤 인증 사진을 제출하시고, 1년 이상 회원 자격을 유지하시면 아래 혜택을 이용하실 수 있습니다.

- 차량 수리 위로금
- 제휴 펜션 할인
- 근조화 지원

■ 리스타트 캠페인

- 미수금 피해 보상

자세한 내용은 고객센터로 연락 주시면 상세하게 안내해 드리겠습니다.
◆ 고객센터: 1800-1234 (ARS 2번)

오늘도 안전 운전하시기 바랍니다.
감사합니다.`
    },
    {
      id: "one-month-free",
      categoryId: "pause-defense",
      title: "1개월 무료 이용 안내",
      content: `[화물맨 1개월 무료 이용 안내]

상담 시 안내드린 대로 현재 이용 중인 요금제를 1개월 동안 무료로 적용해 드릴 예정입니다.

무료 이용기간: [시작일]~[종료일]

궁금한 사항은 언제든지 고객센터로 연락주세요. (📞1800-1234 → ARS 2번)`
    },
    {
      id: "switch-considering",
      categoryId: "mancharo-switch",
      title: "5~14톤 동행 이벤트 전환 생각해 보겠다고 하는 경우",
      content: `[화물맨] 안녕하세요, 화물맨입니다. 만차로 앱 서비스 종료 예정에 따라 화물맨 앱 전환 관련 안내드렸습니다.

아래 링크를 눌러 화물맨 차주용 앱을 설치해 주세요.
https://play.google.com/store/apps/details?id=ktc.cargo.driver
설치 후 기존 만차로 앱에서 사용하시던 정보로 로그인해 이용해 주세요.

■ 이벤트 혜택으로 6개월간 무료로 이용 가능
■ 이후 부가세 포함 월 27,500원으로 이용 (유료 결제로 전환되기 14일 전에 다시 안내드리므로 그때 최종 결제 여부를 결정하실 수 있습니다.)

충분히 생각해 보신 뒤 전환을 원하시면 고객센터로 연락 주시고 “만차로 이용 중이며 화물맨으로 변경하고 싶다”고 말씀해 주세요.

오늘도 안전운행 하세요! 감사합니다.

문의: [1800-1234]`
    },
    {
      id: "missed-call",
      categoryId: "mancharo-switch",
      title: "부재중 문자",
      content: `[화물맨] 안녕하세요, 화물맨입니다.

만차로 앱 서비스 종료 예정에 따른 화물맨 앱 전환 안내를 위해 연락드렸으나 통화가 연결되지 않아 문자드립니다.

확인 후 편하신 시간에 고객센터로 연락 주시면 전환 방법을 안내해 드리겠습니다.

감사합니다.
문의: [1800-1234]`
    },
    {
      id: "documents-guide",
      categoryId: "mancharo-switch",
      title: "서류 안내 문자",
      content: `[화물맨 서류 안내]

안녕하세요, 화물맨입니다.
아래 링크를 눌러 화물맨 차주용 앱을 설치해 주세요.
https://play.google.com/store/apps/details?id=ktc.cargo.driver
설치 후 기존 만차로 앱에서 사용하시던 정보로 로그인해 이용해 주세요.

화물맨 앱에서 배차 후 세금계산서 발행 등 관련 기능을 이용하시려면 아래 서류를 제출해 주세요.

1. 차량등록증

2. 사업자등록증

3. 화물운송자격증

서류는 사진으로 촬영해 채널톡으로 보내주시면 됩니다.
채널톡 경로 : 개발 후 링크 등록 예정
문의: [1660-0303 1번 차주가입 선택]`
    },
    {
      id: "deposit-guide",
      categoryId: "mancharo-switch",
      title: "예치금 이용 방법",
      content: `[화물맨 이용 안내]

화물맨 앱에서 예치금 이용 시 계좌 등록 방법을 안내드립니다.

운송료가 예치금으로 정산되거나, 선착불 화물 배차 시 주선 수수료가 발생하는 경우 예치금에서 자동 정산됩니다.

예치금 이용 시 계좌 등록이 필요하여 아래 경로로 신청 부탁드립니다.

1. 통장 사본, 신분증 제출

자세한 방법은 고객센터로 문의 부탁드립니다.
문의: [1660-0303 1번 차주가입 선택]`
    },
    {
      id: "install-link",
      categoryId: "mancharo-switch",
      title: "설치 링크 문자",
      content: `[화물맨 앱 설치 안내]

아래 링크를 눌러 화물맨 차주용 앱을 설치해 주세요.
https://play.google.com/store/apps/details?id=ktc.cargo.driver

설치 후 기존 만차로 앱에서 사용하시던 정보로 로그인해 이용해 주세요.

문의: [1800-1234]`
    }
  ]
};

const palette = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#64748b"];
let data = loadData();
let selectedCategory = "all";
let activeTemplateId = null;
let activeOriginalContent = "";
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.categories) && Array.isArray(stored.templates)) return stored;
  } catch (error) {
    console.warn("저장된 템플릿을 불러오지 못했습니다.", error);
  }
  return clone(seedData);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCategory(id) {
  return data.categories.find((category) => category.id === id);
}

function normalizeNewlines(text) {
  return String(text || "").replace(/\r\n?/g, "\n");
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  renderCategories();
  renderTemplates();
  renderCategoryOptions();
}

function renderCategories() {
  const allCount = data.templates.length;
  const buttons = [
    `<button class="category-tab ${selectedCategory === "all" ? "active" : ""}" type="button" role="tab" aria-selected="${selectedCategory === "all"}" data-category="all" style="--category-color:#4b5563">전체 <span class="count">${allCount}</span></button>`
  ];

  data.categories.forEach((category) => {
    const count = data.templates.filter((template) => template.categoryId === category.id).length;
    buttons.push(`<button class="category-tab ${selectedCategory === category.id ? "active" : ""}" type="button" role="tab" aria-selected="${selectedCategory === category.id}" data-category="${escapeHtml(category.id)}" style="--category-color:${category.color}">${escapeHtml(category.name)} <span class="count">${count}</span></button>`);
  });

  $("#categoryTabs").innerHTML = buttons.join("");
}

function renderTemplates() {
  const query = $("#searchInput").value.trim().toLocaleLowerCase("ko");
  const visible = data.templates.filter((template) => {
    const inCategory = selectedCategory === "all" || template.categoryId === selectedCategory;
    const searchable = `${template.title}\n${template.content}`.toLocaleLowerCase("ko");
    return inCategory && (!query || searchable.includes(query));
  });

  const activeCategory = selectedCategory === "all" ? null : getCategory(selectedCategory);
  $("#listTitle").textContent = activeCategory ? activeCategory.name : "전체 템플릿";
  $("#listDescription").textContent = activeCategory ? `${activeCategory.name} 상황에서 사용하는 문자 문구입니다.` : "등록된 모든 문자 문구입니다.";
  $("#editCategoryButton").hidden = !activeCategory;
  $("#resultCount").textContent = `총 ${visible.length}개`;
  $("#emptyState").hidden = visible.length > 0;

  $("#templateGrid").innerHTML = visible.map((template) => {
    const category = getCategory(template.categoryId) || { name: "미분류", color: "#64748b" };
    return `<article class="template-card" style="--category-color:${category.color}">
      <div class="card-accent"></div>
      <div class="card-body">
        <span class="card-category">${escapeHtml(category.name)}</span>
        <h3>${escapeHtml(template.title)}</h3>
        <p class="card-preview">${escapeHtml(template.content)}</p>
      </div>
      <footer class="card-footer">
        <button class="open-template" type="button" data-open-template="${escapeHtml(template.id)}">내용 보기</button>
        <button class="quick-copy" type="button" data-copy-template="${escapeHtml(template.id)}" aria-label="${escapeHtml(template.title)} 바로 복사" title="바로 복사">▣</button>
        <button class="card-edit" type="button" data-edit-template="${escapeHtml(template.id)}" aria-label="${escapeHtml(template.title)} 수정" title="수정">✎</button>
      </footer>
    </article>`;
  }).join("");
}

function renderCategoryOptions() {
  $("#templateCategory").innerHTML = data.categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join("");
}

function openModal(element) {
  element.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => element.querySelector("button, input, textarea, select")?.focus());
}

function closeModal(element) {
  element.hidden = true;
  if (!$$('.modal-backdrop:not([hidden])').length) document.body.style.overflow = "";
}

function openTemplate(id) {
  const template = data.templates.find((item) => item.id === id);
  if (!template) return;
  const category = getCategory(template.categoryId) || { name: "미분류", color: "#64748b" };
  activeTemplateId = template.id;
  activeOriginalContent = normalizeNewlines(template.content);
  $("#modalCategoryBadge").textContent = category.name;
  $("#modalCategoryBadge").style.setProperty("--category-color", category.color);
  $("#templateModalTitle").textContent = template.title;
  $("#messageEditor").value = activeOriginalContent;
  updateCharacterCount();
  openModal($("#templateModal"));
}

function openTemplateForm(id = "") {
  const template = id ? data.templates.find((item) => item.id === id) : null;
  $("#templateForm").reset();
  $("#templateId").value = template?.id || "";
  $("#templateFormTitle").textContent = template ? "템플릿 수정" : "템플릿 추가";
  $("#deleteTemplateButton").hidden = !template;
  if (template) {
    $("#templateCategory").value = template.categoryId;
    $("#templateTitle").value = template.title;
    $("#templateContent").value = normalizeNewlines(template.content);
  } else if (selectedCategory !== "all") {
    $("#templateCategory").value = selectedCategory;
  }
  openModal($("#templateFormModal"));
}

function renderColorSwatches(selected) {
  $("#colorSwatches").innerHTML = palette.map((color) => `<button class="color-swatch ${color.toLowerCase() === selected.toLowerCase() ? "selected" : ""}" type="button" data-color="${color}" style="--swatch:${color}" aria-label="색상 ${color}"></button>`).join("");
}

function openCategoryForm(id = "") {
  const category = id ? getCategory(id) : null;
  const color = category?.color || palette[0];
  $("#categoryForm").reset();
  $("#categoryId").value = category?.id || "";
  $("#categoryModalTitle").textContent = category ? "카테고리 설정" : "카테고리 추가";
  $("#categoryName").value = category?.name || "";
  $("#categoryColor").value = color;
  $("#deleteCategoryButton").hidden = !category;
  renderColorSwatches(color);
  updateCategoryPreview();
  openModal($("#categoryModal"));
}

function updateCategoryPreview() {
  const name = $("#categoryName").value.trim() || "새 카테고리";
  const color = $("#categoryColor").value;
  $("#categoryPreview").textContent = name;
  $("#categoryPreview").style.setProperty("--preview-color", color);
}

function updateCharacterCount() {
  const text = $("#messageEditor").value;
  const bytes = new Blob([text]).size;
  $("#characterCount").textContent = `${text.length.toLocaleString()}자 · ${bytes.toLocaleString()}bytes`;
}

async function copyText(text) {
  const normalized = normalizeNewlines(text);
  try {
    await navigator.clipboard.writeText(normalized);
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = normalized;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw error;
  }
  showToast("줄바꿈을 포함해 클립보드에 복사했습니다.");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function toggleAdmin() {
  const active = document.body.classList.toggle("admin-mode");
  $("#adminToggle").classList.toggle("active", active);
  $("#adminToggle").setAttribute("aria-pressed", String(active));
  $("#modeLabel").textContent = active ? "관리자 모드" : "직원 모드";
  if (!active) $$(".modal-backdrop").forEach(closeModal);
}

$("#adminToggle").addEventListener("click", toggleAdmin);
$("#searchInput").addEventListener("input", renderTemplates);
$("#addTemplateButton").addEventListener("click", () => openTemplateForm());
$("#addCategoryButton").addEventListener("click", () => openCategoryForm());
$("#editCategoryButton").addEventListener("click", () => selectedCategory !== "all" && openCategoryForm(selectedCategory));
$("#messageEditor").addEventListener("input", updateCharacterCount);
$("#resetMessageButton").addEventListener("click", () => {
  $("#messageEditor").value = activeOriginalContent;
  updateCharacterCount();
  showToast("원문으로 되돌렸습니다.");
});
$("#copyButton").addEventListener("click", () => copyText($("#messageEditor").value));
$("#adminEditTemplateButton").addEventListener("click", () => {
  closeModal($("#templateModal"));
  openTemplateForm(activeTemplateId);
});

$("#categoryTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  selectedCategory = button.dataset.category;
  render();
});

$("#templateGrid").addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-template]");
  const copyButton = event.target.closest("[data-copy-template]");
  const editButton = event.target.closest("[data-edit-template]");
  if (openButton) openTemplate(openButton.dataset.openTemplate);
  if (copyButton) {
    const template = data.templates.find((item) => item.id === copyButton.dataset.copyTemplate);
    if (template) copyText(template.content);
  }
  if (editButton) openTemplateForm(editButton.dataset.editTemplate);
});

$("#templateForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("#templateId").value;
  const next = {
    id: id || makeId("template"),
    categoryId: $("#templateCategory").value,
    title: $("#templateTitle").value.trim(),
    content: normalizeNewlines($("#templateContent").value).trim()
  };
  if (id) {
    const index = data.templates.findIndex((item) => item.id === id);
    if (index >= 0) data.templates[index] = next;
  } else {
    data.templates.push(next);
  }
  saveData();
  closeModal($("#templateFormModal"));
  render();
  showToast(id ? "템플릿을 수정했습니다." : "새 템플릿을 추가했습니다.");
});

$("#deleteTemplateButton").addEventListener("click", () => {
  const id = $("#templateId").value;
  const template = data.templates.find((item) => item.id === id);
  if (!template || !confirm(`‘${template.title}’ 템플릿을 삭제할까요?`)) return;
  data.templates = data.templates.filter((item) => item.id !== id);
  saveData();
  closeModal($("#templateFormModal"));
  render();
  showToast("템플릿을 삭제했습니다.");
});

$("#categoryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("#categoryId").value;
  const next = {
    id: id || makeId("category"),
    name: $("#categoryName").value.trim(),
    color: $("#categoryColor").value
  };
  if (id) {
    const index = data.categories.findIndex((item) => item.id === id);
    if (index >= 0) data.categories[index] = next;
  } else {
    data.categories.push(next);
    selectedCategory = next.id;
  }
  saveData();
  closeModal($("#categoryModal"));
  render();
  showToast(id ? "카테고리 설정을 저장했습니다." : "새 카테고리를 추가했습니다.");
});

$("#deleteCategoryButton").addEventListener("click", () => {
  const id = $("#categoryId").value;
  const category = getCategory(id);
  const count = data.templates.filter((item) => item.categoryId === id).length;
  if (!category) return;
  if (count > 0) {
    alert(`이 카테고리에 템플릿이 ${count}개 있어 삭제할 수 없습니다. 먼저 템플릿을 다른 카테고리로 이동해 주세요.`);
    return;
  }
  if (!confirm(`‘${category.name}’ 카테고리를 삭제할까요?`)) return;
  data.categories = data.categories.filter((item) => item.id !== id);
  selectedCategory = "all";
  saveData();
  closeModal($("#categoryModal"));
  render();
  showToast("카테고리를 삭제했습니다.");
});

$("#colorSwatches").addEventListener("click", (event) => {
  const swatch = event.target.closest("[data-color]");
  if (!swatch) return;
  $("#categoryColor").value = swatch.dataset.color;
  renderColorSwatches(swatch.dataset.color);
  updateCategoryPreview();
});
$("#categoryColor").addEventListener("input", () => {
  renderColorSwatches($("#categoryColor").value);
  updateCategoryPreview();
});
$("#categoryName").addEventListener("input", updateCategoryPreview);

$$('[data-close-modal]').forEach((button) => button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop"))));
$$('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener("mousedown", (event) => {
  if (event.target === backdrop) closeModal(backdrop);
}));

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#searchInput").focus();
  }
  if (event.key === "Escape") {
    const openModals = $$(".modal-backdrop:not([hidden])");
    if (openModals.length) closeModal(openModals.at(-1));
  }
});

render();
