const libraries = [
  {
    id: 1,
    name: "一个测试库",
    summary: "电影节与文化类知识沉淀，覆盖天坛奖相关片名、奖项、影评与活动资料。",
    languages: ["中", "英", "法", "日", "韩"],
    tags: ["电影", "文化", "天坛奖", "影评", "获奖影片"],
    visibility: "1-公开",
    docs: 20,
    role: "查看者",
    owner: "项目经理03",
    createdAt: "2026-5-19 11:07",
    updatedAt: "2026-5-19 11:07",
  },
  {
    id: 2,
    name: "中石油西南院-项目术语库",
    summary: "面向能源地质项目的知识库，整理院内术语、项目资料与行业表达。",
    languages: ["中", "英", "法", "德"],
    tags: ["能源", "地质"],
    visibility: "1-公开",
    docs: 10,
    role: "管理者",
    owner: "项目经理03",
    createdAt: "2026-5-19 11:05",
    updatedAt: "2026-5-19 11:05",
  },
  {
    id: 3,
    name: "手持通讯器产品说明4页-项目知识库",
    summary: "收录手持通讯器产品说明、操作步骤、硬件参数和售后支持相关知识点。",
    languages: ["中", "英", "法", "西"],
    tags: ["产品说明", "通讯器", "操作指南", "硬件"],
    visibility: "1-公开",
    docs: 20,
    role: "管理者",
    owner: "管理员",
    createdAt: "2026-5-15 17:02",
    updatedAt: "2026-5-15 17:02",
  },
  {
    id: 4,
    name: "测试术语库",
    summary: "用于验证知识库创建、检索、权限与标签展示流程的测试数据。",
    languages: ["中"],
    tags: ["测试"],
    visibility: "1-公开",
    docs: 20,
    role: "管理者",
    owner: "管理员",
    createdAt: "2026-4-1 14:15",
    updatedAt: "2026-4-1 14:15",
  },
];

const grid = document.querySelector("#libraryGrid");
const emptyState = document.querySelector("#emptyState");
const totalText = document.querySelector("#totalText");
const filterForm = document.querySelector("#filterForm");
const nameFilter = document.querySelector("#nameFilter");
const ownerFilter = document.querySelector("#ownerFilter");
const sortTrigger = document.querySelector("#sortTrigger");
const sortMenu = document.querySelector("#sortMenu");
const sortOptions = [...document.querySelectorAll(".sort-option")];
const createLibraryBtn = document.querySelector("#createLibraryBtn");
const libraryListPage = document.querySelector("#libraryListPage");
const documentParsePage = document.querySelector("#documentParsePage");
const documentParseTitle = document.querySelector("#documentParseTitle");
const parseBackBtn = document.querySelector("#parseBackBtn");
const parseTable = document.querySelector("#parseTable");
const libraryModal = document.querySelector("#libraryModal");
const libraryCreateForm = document.querySelector("#libraryCreateForm");
const modalCloseBtn = document.querySelector("#modalCloseBtn");
const modalCancelBtn = document.querySelector("#modalCancelBtn");
const modalConfirmBtn = document.querySelector("#modalConfirmBtn");
const newLibraryName = document.querySelector("#newLibraryName");
const newLibraryLevel = document.querySelector("#newLibraryLevel");

let currentSort = "default";

function parseDate(value) {
  const [datePart, timePart = "00:00"] = value.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function sortLibraries(items) {
  const sorted = [...items];
  const byCreated = (direction) => (a, b) => direction * (parseDate(a.createdAt) - parseDate(b.createdAt));
  const byUpdated = (direction) => (a, b) => direction * (parseDate(a.updatedAt) - parseDate(b.updatedAt));
  const byName = (direction) => (a, b) => direction * a.name.localeCompare(b.name, "zh-Hans-CN");

  const sorters = {
    default: (a, b) => a.id - b.id,
    createdAsc: byCreated(1),
    createdDesc: byCreated(-1),
    updatedAsc: byUpdated(1),
    updatedDesc: byUpdated(-1),
    nameAsc: byName(1),
    nameDesc: byName(-1),
  };

  return sorted.sort(sorters[currentSort]);
}

function renderLibraries(items) {
  grid.innerHTML = "";
  totalText.textContent = `共 ${items.length} 条`;
  emptyState.classList.toggle("hidden", items.length > 0);

  for (const item of items) {
    const visibleLanguages = item.languages.slice(0, 3);
    const hiddenLanguages = item.languages.slice(3);
    const visibleTags = item.tags.slice(0, 3);
    const hiddenTags = item.tags.slice(3);
    const card = document.createElement("article");
    const isSelectable = item.role === "管理者";
    card.className = `library-card${isSelectable ? "" : " library-card-readonly"}`;
    card.innerHTML = `
      <input
        class="library-checkbox"
        type="checkbox"
        aria-label="${isSelectable ? `选择${item.name}` : `${item.name}为查看者权限，不可勾选`}"
        ${isSelectable ? "" : "disabled aria-disabled=\"true\" title=\"查看者不可勾选\""}
      />
      <a class="library-title" href="#" title="${item.name}">${item.name}</a>
      <p class="library-summary" title="${item.summary}">${item.summary}</p>
      <div class="tag-row">
        ${visibleLanguages.map((language) => `<span class="tag language-tag" title="${language}">${language}</span>`).join("")}
        ${hiddenLanguages.length ? `<span class="tag language-more" title="${item.languages.join("、")}">...</span>` : ""}
        ${visibleTags.map((tag) => `<span class="tag topic-tag" title="${tag}">${tag}</span>`).join("")}
        ${hiddenTags.length ? `<span class="tag topic-more" title="${item.tags.join("、")}">...</span>` : ""}
        <span class="visibility">${item.visibility}</span>
      </div>
      <div class="library-meta">
        <span class="doc-count"><strong>${item.docs}</strong> 个文档</span>
        <span class="view-link">· ${item.role}</span>
      </div>
      <div class="library-footer">
        <span class="user-dot" aria-hidden="true"></span>
        <span class="owner" title="${item.owner}">${item.owner}</span>
        <span class="updated-at">${item.updatedAt}</span>
      </div>
    `;
    grid.append(card);
  }
}

function applyFilters() {
  const keywordValue = nameFilter.value.trim().toLowerCase();
  const ownerValue = ownerFilter.value.trim().toLowerCase();
  const filtered = libraries.filter((item) => {
    const searchableText = [item.name, item.summary, ...item.languages, ...item.tags].join(" ").toLowerCase();
    const matchesKeyword = searchableText.includes(keywordValue);
    const matchesOwner = item.owner.toLowerCase().includes(ownerValue);
    return matchesKeyword && matchesOwner;
  });
  renderLibraries(sortLibraries(filtered));
}

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  applyFilters();
});

filterForm.addEventListener("reset", () => {
  window.setTimeout(() => renderLibraries(sortLibraries(libraries)));
});

sortTrigger.addEventListener("click", () => {
  const isOpen = sortTrigger.getAttribute("aria-expanded") === "true";
  sortTrigger.setAttribute("aria-expanded", String(!isOpen));
  sortMenu.classList.toggle("hidden", isOpen);
});

sortOptions.forEach((option) => {
  option.addEventListener("click", () => {
    currentSort = option.dataset.sort;
    sortOptions.forEach((item) => item.classList.toggle("active", item === option));
    sortTrigger.setAttribute("aria-expanded", "false");
    sortMenu.classList.add("hidden");
    applyFilters();
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".sort-control")) {
    sortTrigger.setAttribute("aria-expanded", "false");
    sortMenu.classList.add("hidden");
  }
});

function updateCreateConfirmState() {
  modalConfirmBtn.disabled = !(newLibraryName.value.trim() && newLibraryLevel.value);
}

function openLibraryModal() {
  libraryModal.classList.remove("hidden");
  newLibraryName.focus();
  updateCreateConfirmState();
}

function closeLibraryModal() {
  libraryModal.classList.add("hidden");
  libraryCreateForm.reset();
  if (typeof uploadedFiles !== "undefined") {
    uploadedFiles.length = 0;
    if (typeof uploadInFlight !== "undefined") uploadInFlight = 0;
    if (typeof setLevelLockState === "function") setLevelLockState();
    if (typeof renderUploadedFiles === "function") renderUploadedFiles();
  }
  updateCreateConfirmState();
}

createLibraryBtn.addEventListener("click", openLibraryModal);
modalCloseBtn.addEventListener("click", closeLibraryModal);
modalCancelBtn.addEventListener("click", closeLibraryModal);

libraryModal.addEventListener("click", (event) => {
  if (event.target === libraryModal) {
    closeLibraryModal();
  }
});

const langSourceEl = document.querySelector("#newLibrarySource");
const langTargetEl = document.querySelector("#newLibraryTarget");
const langSwapBtn = document.querySelector(".lang-swap");

if (langSwapBtn && langSourceEl && langTargetEl) {
  langSwapBtn.addEventListener("click", () => {
    const tmp = langSourceEl.value;
    langSourceEl.value = langTargetEl.value;
    langTargetEl.value = tmp;
    updateCreateConfirmState();
  });
}

[newLibraryName, newLibraryLevel].forEach((field) => {
  if (!field) return;
  field.addEventListener("input", updateCreateConfirmState);
  field.addEventListener("change", updateCreateConfirmState);
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderParseIcons(index) {
  const languages = ["中", "英", "法", "德"];
  const topics = ["知识点", "术语", "规范", "摘要"];
  return `
    <div class="parse-icon-groups">
      <div class="parse-icon-group parse-lang-icons" aria-label="语种">
        ${languages.slice(0, 2).map((item) => `<span class="parse-chip parse-chip-lang">${item}</span>`).join("")}
        <span class="parse-chip-more" title="${languages.join("、")}">...</span>
      </div>
      <div class="parse-icon-group parse-knowledge-icons" aria-label="知识点">
        ${topics.slice(0, 2).map((item) => `<span class="parse-chip parse-chip-knowledge">${item}</span>`).join("")}
        <span class="parse-chip-more" title="${topics.join("、")}">...</span>
      </div>
    </div>
  `;
}

function showDocumentParsePage() {
  const libraryName = newLibraryName.value.trim() || "新建知识库";
  const selectedFiles = uploadedFiles.length ? [...uploadedFiles] : [];
  documentParseTitle.textContent = libraryName;
  parseTable.innerHTML = "";

  const rows = selectedFiles.length
    ? selectedFiles
    : [
        {
          file: { name: "第12届北京国际电影节天坛奖相关手册-\"同心\"与\"同乐\"译文.docx", size: 0 },
          progress: 0,
        },
      ];

  rows.forEach((item, index) => {
    const fileName = item.file.webkitRelativePath || item.file.name;
    const safeFileName = escapeHtml(fileName);
    const row = document.createElement("article");
    row.className = `parse-row${index === 0 ? " parse-row-active" : ""}`;
    row.innerHTML = `
      <div class="parse-file-icon" aria-hidden="true">📄</div>
      <div class="parse-content">
        <div class="parse-file-line">
          <strong title="${safeFileName}">${safeFileName}</strong>
          <span class="parse-link">文档解析中...</span>
        </div>
        <p>正在对文档进行切片解析，系统将自动抽取正文内容、识别段落结构并生成知识片段。</p>
      </div>
      ${renderParseIcons(index)}
      <div class="parse-actions">
        <button type="button">预览</button>
        <button class="parse-delete-btn" type="button" aria-label="删除文档">🗑</button>
      </div>
    `;
    parseTable.append(row);

    window.setTimeout(() => {
      const status = row.querySelector(".parse-link");
      if (status) status.textContent = "切片解析中";
    }, 800 + index * 250);

    window.setTimeout(() => {
      const status = row.querySelector(".parse-link");
      if (status) status.textContent = "切片解析完成";
    }, 2200 + index * 300);
  });

  libraryModal.classList.add("hidden");
  libraryListPage.classList.add("hidden");
  documentParsePage.classList.remove("hidden");
}

libraryCreateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showDocumentParsePage();
});

if (parseBackBtn) {
  parseBackBtn.addEventListener("click", () => {
    documentParsePage.classList.add("hidden");
    libraryListPage.classList.remove("hidden");
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !libraryModal.classList.contains("hidden")) {
    closeLibraryModal();
  }
});

const uploadDropzone = document.querySelector("#uploadDropzone");
const uploadFileBtn = document.querySelector("#uploadFileBtn");
const uploadFolderBtn = document.querySelector("#uploadFolderBtn");
const uploadFileInput = document.querySelector("#uploadFileInput");
const uploadFolderInput = document.querySelector("#uploadFolderInput");
const batchFileLevel = document.querySelector("#batchFileLevel");
const uploadFileList = document.querySelector("#uploadFileList");

const uploadedFiles = [];
let uploadInFlight = 0;

const LEVEL_OPTIONS = ["公开", "内部", "秘密"];

function hasActiveUpload() {
  return uploadInFlight > 0;
}

function setLevelLockState() {
  if (!newLibraryLevel) return;
  newLibraryLevel.disabled = false;
  newLibraryLevel.removeAttribute("title");
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusLabel(item) {
  if (item.status === "pending") return "待上传";
  if (item.status === "uploading") return `${item.progress}%`;
  if (item.status === "done") return "100%";
  if (item.status === "error") return "失败";
  return "";
}

function renderUploadedFiles() {
  if (!uploadFileList) return;
  uploadFileList.innerHTML = "";
  uploadedFiles.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = `upload-file upload-file-${item.status}`;
    const displayName = item.file.webkitRelativePath || item.file.name;
    const sizeText = formatFileSize(item.file.size);
    const isUploading = item.status === "uploading";
    const progress = isUploading ? item.progress : item.status === "done" ? 100 : 0;
    const levelDisabled = isUploading;
    const levelOptions = ['<option value="">设置密级</option>']
      .concat(
        LEVEL_OPTIONS.map(
          (lv) => `<option value="${lv}" ${item.level === lv ? "selected" : ""}>${lv}</option>`
        )
      )
      .join("");
    row.innerHTML = `
      <span class="file-icon" aria-hidden="true">F</span>
      <div class="file-main">
        <div class="file-info">
          <span class="file-name" title="${displayName}">${displayName}</span>
          <span class="file-size">${sizeText}</span>
        </div>
        ${isUploading ? `<div class="file-progress-bar"><div class="file-progress-bar-inner" style="width:${progress}%"></div></div>` : ""}
      </div>
      <div class="file-level select-wrap">
        <select data-level-index="${index}" ${levelDisabled ? "disabled" : ""}>
          ${levelOptions}
        </select>
      </div>
      <span class="file-progress file-status-${item.status}">${statusLabel(item)}</span>
      <button type="button" aria-label="删除文件" data-index="${index}" ${isUploading ? "disabled" : ""}>🗑</button>
    `;
    uploadFileList.append(row);
  });
}

function startUpload(item) {
  if (!item || item.status !== "pending") return;
  if (!item.level) return;
  item.status = "uploading";
  item.progress = 0;
  uploadInFlight += 1;
  setLevelLockState();
  renderUploadedFiles();

  const totalMs = 1200 + Math.min(item.file.size / 1024, 3000);
  const stepMs = 120;
  const increment = Math.max(2, Math.round((100 / totalMs) * stepMs));

  const timer = window.setInterval(() => {
    item.progress = Math.min(100, item.progress + increment);
    if (item.progress >= 100) {
      window.clearInterval(timer);
      item.status = "done";
      uploadInFlight = Math.max(0, uploadInFlight - 1);
      setLevelLockState();
    }
    renderUploadedFiles();
  }, stepMs);
}

function startPendingUploads() {
  uploadedFiles.forEach((item) => {
    if (item.status === "pending" && item.level) startUpload(item);
  });
}

function addFiles(fileList) {
  if (!fileList || !fileList.length) return;
  Array.from(fileList).forEach((file) => {
    if (uploadedFiles.length >= 500) return;
    uploadedFiles.push({ file, status: "pending", progress: 0, level: "" });
  });
  renderUploadedFiles();
}

if (batchFileLevel) {
  batchFileLevel.addEventListener("change", () => {
    if (!batchFileLevel.value) return;
    uploadedFiles.forEach((item) => {
      if (item.status !== "uploading") {
        item.level = batchFileLevel.value;
      }
    });
    renderUploadedFiles();
    startPendingUploads();
  });
}

if (uploadFileBtn && uploadFileInput) {
  uploadFileBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    uploadFileInput.click();
  });
  uploadFileInput.addEventListener("change", () => {
    addFiles(uploadFileInput.files);
    uploadFileInput.value = "";
  });
}

if (uploadFolderBtn && uploadFolderInput) {
  uploadFolderBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    uploadFolderInput.click();
  });
  uploadFolderInput.addEventListener("change", () => {
    addFiles(uploadFolderInput.files);
    uploadFolderInput.value = "";
  });
}

if (uploadDropzone) {
  uploadDropzone.addEventListener("click", (event) => {
    if (event.target.closest(".upload-action-btn")) return;
    uploadFileInput && uploadFileInput.click();
  });
  uploadDropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      uploadFileInput && uploadFileInput.click();
    }
  });
  ["dragenter", "dragover"].forEach((type) =>
    uploadDropzone.addEventListener(type, (event) => {
      event.preventDefault();
      event.stopPropagation();
      uploadDropzone.classList.add("is-dragover");
    })
  );
  ["dragleave", "drop"].forEach((type) =>
    uploadDropzone.addEventListener(type, (event) => {
      event.preventDefault();
      event.stopPropagation();
      uploadDropzone.classList.remove("is-dragover");
    })
  );
  uploadDropzone.addEventListener("drop", (event) => {
    const items = event.dataTransfer && event.dataTransfer.items;
    if (items && items.length && typeof items[0].webkitGetAsEntry === "function") {
      const collected = [];
      let pending = 0;
      const flush = () => {
        if (pending === 0) {
          addFiles(collected);
        }
      };
      const traverse = (entry, path = "") => {
        if (!entry) return;
        if (entry.isFile) {
          pending += 1;
          entry.file((file) => {
            try {
              Object.defineProperty(file, "webkitRelativePath", {
                value: path + file.name,
                configurable: true,
              });
            } catch (_) {}
            collected.push(file);
            pending -= 1;
            flush();
          });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          pending += 1;
          const readEntries = () => {
            reader.readEntries((entries) => {
              if (!entries.length) {
                pending -= 1;
                flush();
                return;
              }
              entries.forEach((sub) => traverse(sub, path + entry.name + "/"));
              readEntries();
            });
          };
          readEntries();
        }
      };
      Array.from(items).forEach((item) => {
        const entry = item.webkitGetAsEntry();
        if (entry) traverse(entry);
      });
      flush();
    } else if (event.dataTransfer && event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  });
}

if (uploadFileList) {
  uploadFileList.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-index]");
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (Number.isNaN(index)) return;
    uploadedFiles.splice(index, 1);
    renderUploadedFiles();
  });

  uploadFileList.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-level-index]");
    if (!select) return;
    const index = Number(select.dataset.levelIndex);
    if (Number.isNaN(index)) return;
    const item = uploadedFiles[index];
    if (!item || item.status === "uploading") return;
    item.level = select.value;
    if (item.status === "pending" && item.level) {
      startUpload(item);
    } else {
      renderUploadedFiles();
    }
  });
}

renderLibraries(sortLibraries(libraries));
