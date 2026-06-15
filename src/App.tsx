import { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Library, PageName, SecurityLevel, SortKey, UploadFileItem, UploadStatus } from "./types";

const libraries: Library[] = [
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

const levelOptions: SecurityLevel[] = ["公开", "内部", "秘密"];
const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "default", label: "默认排序" },
  { key: "createdAsc", label: "创建时间升序" },
  { key: "createdDesc", label: "创建时间降序" },
  { key: "updatedAsc", label: "更新时间升序" },
  { key: "updatedDesc", label: "更新时间降序" },
  { key: "nameAsc", label: "库名称升序" },
  { key: "nameDesc", label: "库名称降序" },
];

const defaultDocumentName = '第12届北京国际电影节天坛奖相关手册-"同心"与"同乐"译文.docx';
const defaultSummary = "这里是文档的概述这里是文档的概述";

type ParseStage = "done" | "parsing" | "tagging" | "failed";
type DocumentSourceModule = "knowledgeBase" | "projectManagement" | "documentQuick";
type ChunkModalMode = "create" | "edit";
type ImportExportTab = "import" | "export";

interface ParseDocumentRow extends UploadFileItem {
  parseStage?: ParseStage;
  statusText?: string;
  summary?: string;
  creator?: string;
  updatedAt?: string;
  version?: number;
  historyVersions?: ParseDocumentRow[];
  sourceModule?: DocumentSourceModule;
}

interface ChunkContentItem {
  id: number;
  content: string;
  enabled: boolean;
  preview?: boolean;
  images?: ChunkImageItem[];
}

interface ChunkImageItem {
  id: string;
  name: string;
  size: number;
}

function parseDate(value: string) {
  const [datePart, timePart = "00:00"] = value.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function getLevelName(value?: string): SecurityLevel {
  const text = String(value || "公开");
  const level = text.includes("-") ? text.split("-").pop() : text;
  return level === "秘密" || level === "内部" ? level : "公开";
}

function getLevelClass(level: SecurityLevel) {
  return level === "秘密" ? "secret" : level === "内部" ? "internal" : "public";
}

function formatFileSize(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusLabel(status: UploadStatus, progress: number) {
  if (status === "pending") return "待上传";
  if (status === "uploading") return `${progress}%`;
  if (status === "done") return "100%";
  if (status === "error") return "失败";
  return "";
}

function displayFileName(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function getFileTypeMeta(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "file";
  if (["doc", "docx", "wps"].includes(extension)) return { className: "word", label: "W", name: "Word" };
  if (extension === "pdf") return { className: "pdf", label: "P", name: "PDF" };
  if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(extension)) return { className: "image", label: "I", name: "图片" };
  if (["mp3", "wav", "m4a", "aac"].includes(extension)) return { className: "audio", label: "A", name: "音频" };
  if (["xls", "xlsx", "csv"].includes(extension)) return { className: "sheet", label: "X", name: "表格" };
  if (["ppt", "pptx"].includes(extension)) return { className: "slide", label: "P", name: "演示文稿" };
  if (["txt", "md", "html"].includes(extension)) return { className: "text", label: "T", name: "文本" };
  return { className: "file", label: "F", name: "文件" };
}

function supportsChunkView(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return !["mp3", "wav", "m4a", "aac"].includes(extension);
}

function sortLibraries(items: Library[], currentSort: SortKey) {
  const sorted = [...items];
  const byCreated = (direction: number) => (a: Library, b: Library) => direction * (parseDate(a.createdAt) - parseDate(b.createdAt));
  const byUpdated = (direction: number) => (a: Library, b: Library) => direction * (parseDate(a.updatedAt) - parseDate(b.updatedAt));
  const byName = (direction: number) => (a: Library, b: Library) => direction * a.name.localeCompare(b.name, "zh-Hans-CN");

  const sorters: Record<SortKey, (a: Library, b: Library) => number> = {
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

function App() {
  const [page, setPage] = useState<PageName>("library");
  const [keyword, setKeyword] = useState("");
  const [owner, setOwner] = useState("");
  const [currentSort, setCurrentSort] = useState<SortKey>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [libraryName, setLibraryName] = useState("");
  const [libraryLevel, setLibraryLevel] = useState<SecurityLevel | "">("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadFileItem[]>([]);
  const [isDragover, setIsDragover] = useState(false);
  const [activeLibrary, setActiveLibrary] = useState<Library | null>(null);
  const [createdParseName, setCreatedParseName] = useState("新建知识库");
  const [createdParseLevel, setCreatedParseLevel] = useState<SecurityLevel>("公开");
  const [deleteTarget, setDeleteTarget] = useState<ParseDocumentRow | null>(null);
  const [clearLibraryOpen, setClearLibraryOpen] = useState(false);
  const [deleteLibraryOpen, setDeleteLibraryOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [editLibraryName, setEditLibraryName] = useState("");
  const [editLibraryLevel, setEditLibraryLevel] = useState<SecurityLevel | "">("");
  const [libraryCleared, setLibraryCleared] = useState(false);
  const [deletedLibraryIds, setDeletedLibraryIds] = useState<number[]>([]);
  const [deletedParseRowIds, setDeletedParseRowIds] = useState<string[]>([]);
  const [deletedHistoryVersionIds, setDeletedHistoryVersionIds] = useState<string[]>([]);
  const [activeParseRow, setActiveParseRow] = useState<ParseDocumentRow | null>(null);
  const [versionHistoryTarget, setVersionHistoryTarget] = useState<ParseDocumentRow | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadTimers = useRef<Record<string, number>>({});
  const toastTimer = useRef<number | null>(null);

  const filteredLibraries = useMemo(() => {
    const keywordValue = keyword.trim().toLowerCase();
    const ownerValue = owner.trim().toLowerCase();
    const filtered = libraries.filter((item) => {
      if (deletedLibraryIds.includes(item.id)) return false;
      const searchableText = [item.name, item.summary, ...item.languages, ...item.tags].join(" ").toLowerCase();
      return searchableText.includes(keywordValue) && item.owner.toLowerCase().includes(ownerValue);
    });
    return sortLibraries(filtered, currentSort);
  }, [currentSort, deletedLibraryIds, keyword, owner]);

  const parseName = activeLibrary ? activeLibrary.name : createdParseName;
  const parseLevel = activeLibrary ? getLevelName(activeLibrary.visibility) : createdParseLevel;

  const parseRows = useMemo<ParseDocumentRow[]>(() => {
    if (libraryCleared) return [];
    if (uploadedFiles.length) return uploadedFiles.filter((item) => !deletedParseRowIds.includes(item.id));
    const createMockFile = (name: string) => new File([""], name, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const mockRows: ParseDocumentRow[] = [
      {
        id: "default-document-done",
        file: createMockFile(defaultDocumentName),
        status: "done" as UploadStatus,
        progress: 100,
        level: parseLevel,
        parseStage: "done",
        summary: defaultSummary,
        creator: "管理员",
        updatedAt: "2026-06-03 14:20",
        version: 3,
        historyVersions: [
          {
            id: "default-document-version-2",
            file: createMockFile(defaultDocumentName),
            status: "done" as UploadStatus,
            progress: 100,
            level: parseLevel,
            parseStage: "done",
            summary: "第二版文档概述，已更新部分译文并补充天坛奖相关知识内容。",
            creator: "管理员",
            updatedAt: "2026-06-02 16:35",
            version: 2,
          },
          {
            id: "default-document-version-1",
            file: createMockFile(defaultDocumentName),
            status: "done" as UploadStatus,
            progress: 100,
            level: parseLevel,
            parseStage: "done",
            summary: "第一版文档概述，包含初始译文与基础知识点。",
            creator: "管理员",
            updatedAt: "2026-06-01 10:18",
            version: 1,
          },
        ],
      },
      {
        id: "default-audio-done",
        file: createMockFile("北京国际电影节开幕式双语采访音频.mp3"),
        status: "done" as UploadStatus,
        progress: 100,
        level: parseLevel,
        parseStage: "done",
        summary: "开幕式采访音频已完成转写与切片，包含嘉宾发言、活动介绍和核心术语内容。",
        creator: "管理员",
        updatedAt: "2026-06-03 14:15",
      },
      {
        id: "default-document-parsing",
        file: createMockFile('第12届北京国际电影节天坛奖相关手册-"同心"与"同乐"原文.docx'),
        status: "uploading" as UploadStatus,
        progress: 42,
        level: parseLevel,
        parseStage: "parsing",
        statusText: "文档解析中",
        summary: "正在对文档进行切片解析，系统将自动抽取正文内容、识别段落结构并生成知识片段。",
        creator: "管理员",
        updatedAt: "2026-06-03 14:12",
      },
      {
        id: "default-document-tagging",
        file: createMockFile("北京国际电影节天坛奖术语资料.docx"),
        status: "uploading" as UploadStatus,
        progress: 76,
        level: parseLevel,
        parseStage: "tagging",
        statusText: "标签生成中",
        summary: "文档解析完成，正在生成知识点、术语与语种标签。",
        creator: "管理员",
        updatedAt: "2026-06-03 14:08",
        version: 2,
        historyVersions: [
          {
            id: "default-document-tagging-version-1",
            file: createMockFile("北京国际电影节天坛奖术语资料.docx"),
            status: "done" as UploadStatus,
            progress: 100,
            level: parseLevel,
            parseStage: "done",
            summary: "第一版术语资料已完成解析，包含天坛奖基础术语与中英文表达。",
            creator: "管理员",
            updatedAt: "2026-06-01 15:26",
            version: 1,
          },
        ],
      },
      {
        id: "default-document-tagging-no-version",
        file: createMockFile("北京国际电影节天坛奖补充术语资料.docx"),
        status: "uploading" as UploadStatus,
        progress: 68,
        level: parseLevel,
        parseStage: "tagging",
        statusText: "标签生成中",
        summary: "文档解析完成，正在生成补充术语、知识点与语种标签。",
        creator: "管理员",
        updatedAt: "2026-06-03 14:05",
        sourceModule: "documentQuick",
      },
      {
        id: "default-document-failed",
        file: createMockFile("北京国际电影节项目说明附件.docx"),
        status: "error" as UploadStatus,
        progress: 0,
        level: parseLevel,
        parseStage: "failed",
        statusText: "文档解析失败，xxxxx",
        summary: "文档解析失败，xxxxx",
        creator: "管理员",
        updatedAt: "2026-06-03 14:02",
      },
    ];
    return mockRows
      .filter((item) => !deletedParseRowIds.includes(item.id))
      .map((item) => ({
        ...item,
        historyVersions: item.historyVersions?.filter((version) => !deletedHistoryVersionIds.includes(version.id)),
      }));
  }, [deletedHistoryVersionIds, deletedParseRowIds, libraryCleared, parseLevel, uploadedFiles]);

  useEffect(() => {
    const handleDocumentClick = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".sort-control")) setSortOpen(false);
      if (!target?.closest(".library-more")) setMoreOpen(false);
    };
    const handleKeydown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && modalOpen) closeLibraryModal();
      if (event.key === "Escape" && deleteTarget) closeDeleteConfirm();
      if (event.key === "Escape" && clearLibraryOpen) setClearLibraryOpen(false);
      if (event.key === "Escape" && deleteLibraryOpen) setDeleteLibraryOpen(false);
      if (event.key === "Escape" && collabOpen) setCollabOpen(false);
      if (event.key === "Escape" && publishModalOpen) closePublishModal();
      if (event.key === "Escape" && editModalOpen) closeEditModal();
      if (event.key === "Escape" && importExportOpen) setImportExportOpen(false);
      if (event.key === "Escape" && versionHistoryTarget) setVersionHistoryTarget(null);
    };
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [clearLibraryOpen, collabOpen, deleteLibraryOpen, deleteTarget, modalOpen, publishModalOpen, editModalOpen, importExportOpen, versionHistoryTarget]);

  useEffect(() => {
    return () => {
      Object.values(uploadTimers.current).forEach(window.clearInterval);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    setToastMessage(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimer.current = null;
    }, 2200);
  }

  function openLibraryModal() {
    setModalOpen(true);
  }

  function closeLibraryModal() {
    setModalOpen(false);
    setLibraryName("");
    setLibraryLevel("");
    setUploadedFiles([]);
    Object.values(uploadTimers.current).forEach(window.clearInterval);
    uploadTimers.current = {};
  }

  function openPublishModal() {
    setMoreOpen(false);
    setPublishModalOpen(true);
  }

  function closePublishModal() {
    setPublishModalOpen(false);
    setIsDragover(false);
  }

  function openEditModal() {
    setMoreOpen(false);
    setEditLibraryName(parseName);
    setEditLibraryLevel(parseLevel);
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
  }

  function openImportExportRecords() {
    setMoreOpen(false);
    setImportExportOpen(true);
  }

  function submitLibraryEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editLibraryName.trim()) return;
    if (activeLibrary) {
      setActiveLibrary((prev) =>
        prev ? { ...prev, name: editLibraryName.trim(), visibility: editLibraryLevel as SecurityLevel } : prev
      );
    } else {
      setCreatedParseName(editLibraryName.trim());
      setCreatedParseLevel(editLibraryLevel as SecurityLevel);
    }
    closeEditModal();
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploadedFiles((current) => {
      const remainingSlots = Math.max(0, 500 - current.length);
      return current.concat(
        files.slice(0, remainingSlots).map((file, index) => ({
          id: `${Date.now()}-${file.name}-${index}-${Math.random().toString(36).slice(2)}`,
          file,
          status: "pending",
          progress: 0,
          level: "",
        }))
      );
    });
  }

  function patchUpload(id: string, patch: Partial<UploadFileItem>) {
    setUploadedFiles((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function startUpload(item: UploadFileItem) {
    if (!item.level || item.status !== "pending" || uploadTimers.current[item.id]) return;
    patchUpload(item.id, { status: "uploading", progress: 0 });
    const totalMs = 1200 + Math.min(item.file.size / 1024, 3000);
    const stepMs = 120;
    const increment = Math.max(2, Math.round((100 / totalMs) * stepMs));
    uploadTimers.current[item.id] = window.setInterval(() => {
      setUploadedFiles((current) =>
        current.map((fileItem) => {
          if (fileItem.id !== item.id) return fileItem;
          const progress = Math.min(100, fileItem.progress + increment);
          if (progress >= 100) {
            window.clearInterval(uploadTimers.current[item.id]);
            delete uploadTimers.current[item.id];
            return { ...fileItem, status: "done", progress: 100 };
          }
          return { ...fileItem, progress };
        })
      );
    }, stepMs);
  }

  function startPendingUploads(items = uploadedFiles) {
    items.forEach((item) => {
      if (item.status === "pending" && item.level) startUpload(item);
    });
  }

  function setUploadLevel(id: string, level: SecurityLevel | "") {
    let nextItem: UploadFileItem | undefined;
    setUploadedFiles((current) =>
      current.map((item) => {
        if (item.id !== id || item.status === "uploading") return item;
        nextItem = { ...item, level };
        return nextItem;
      })
    );
    window.setTimeout(() => {
      if (nextItem?.status === "pending" && nextItem.level) startUpload(nextItem);
    });
  }

  function batchSetLevel(event: ChangeEvent<HTMLSelectElement>) {
    const level = event.target.value as SecurityLevel | "";
    if (!level) return;
    let nextItems: UploadFileItem[] = [];
    setUploadedFiles((current) => {
      nextItems = current.map((item) => (item.status === "uploading" ? item : { ...item, level }));
      return nextItems;
    });
    window.setTimeout(() => startPendingUploads(nextItems));
    event.target.value = "";
  }

  function removeUploadFile(id: string) {
    if (uploadTimers.current[id]) {
      window.clearInterval(uploadTimers.current[id]);
      delete uploadTimers.current[id];
    }
    setUploadedFiles((current) => current.filter((item) => item.id !== id));
  }

  function closeDeleteConfirm() {
    setDeleteTarget(null);
  }

  function requestDeleteDocument(item: ParseDocumentRow) {
    if (item.sourceModule === "projectManagement") {
      showToast("请从项目管理模块删除该文件");
      return;
    }
    if (item.sourceModule === "documentQuick") {
      showToast("请从文档快翻模块删除该文件");
      return;
    }
    setDeleteTarget(item);
  }

  function confirmDeleteDocument() {
    if (!deleteTarget) return;
    if (uploadTimers.current[deleteTarget.id]) {
      window.clearInterval(uploadTimers.current[deleteTarget.id]);
      delete uploadTimers.current[deleteTarget.id];
    }
    setUploadedFiles((current) => current.filter((item) => item.id !== deleteTarget.id));
    setDeletedParseRowIds((current) => (current.includes(deleteTarget.id) ? current : current.concat(deleteTarget.id)));
    setDeleteTarget(null);
  }

  function requestClearLibrary() {
    setMoreOpen(false);
    setClearLibraryOpen(true);
  }

  function requestDeleteLibrary() {
    setMoreOpen(false);
    setDeleteLibraryOpen(true);
  }

  function confirmClearLibrary() {
    Object.values(uploadTimers.current).forEach(window.clearInterval);
    uploadTimers.current = {};
    setUploadedFiles([]);
    setDeletedParseRowIds([]);
    setActiveParseRow(null);
    setLibraryCleared(true);
    setClearLibraryOpen(false);
  }

  function confirmDeleteLibrary() {
    Object.values(uploadTimers.current).forEach(window.clearInterval);
    uploadTimers.current = {};
    if (activeLibrary) {
      setDeletedLibraryIds((current) => (current.includes(activeLibrary.id) ? current : current.concat(activeLibrary.id)));
    }
    setUploadedFiles([]);
    setDeletedParseRowIds([]);
    setActiveParseRow(null);
    setActiveLibrary(null);
    setLibraryCleared(false);
    setDeleteLibraryOpen(false);
    setPage("library");
  }

  function openChunkContentPage(item: ParseDocumentRow) {
    if (!supportsChunkView(displayFileName(item.file))) {
      showToast("当前格式不支持查看切片");
      return;
    }
    setActiveParseRow(item);
    setMoreOpen(false);
    setDeleteTarget(null);
    setPage("chunks");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragover(false);
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  }

  function handleDropzoneKeydown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function showDocumentParsePage(library: Library | null = null) {
    setActiveLibrary(library);
    if (!library) {
      setCreatedParseName(libraryName.trim() || "新建知识库");
      setCreatedParseLevel(libraryLevel || "公开");
      setModalOpen(false);
    }
    setPage("parse");
    setMoreOpen(false);
    setDeleteTarget(null);
    setClearLibraryOpen(false);
    setDeleteLibraryOpen(false);
    setLibraryCleared(false);
    setDeletedParseRowIds([]);
  }

  function submitLibraryCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showDocumentParsePage();
  }

  function submitPublishKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startPendingUploads();
    closePublishModal();
  }

  return (
    <>
      <div className="app-shell">
        <Sidebar />
        <main className="workspace">
          <Topbar />
          {page === "library" && (
            <LibraryListPage
              keyword={keyword}
              owner={owner}
              currentSort={currentSort}
              sortOpen={sortOpen}
              items={filteredLibraries}
              onKeywordChange={setKeyword}
              onOwnerChange={setOwner}
              onOpenModal={openLibraryModal}
              onReset={() => {
                setKeyword("");
                setOwner("");
              }}
              onSubmitFilters={(event) => event.preventDefault()}
              onToggleSort={(event) => {
                event.stopPropagation();
                setSortOpen((open) => !open);
              }}
              onSort={(sortKey) => {
                setCurrentSort(sortKey);
                setSortOpen(false);
              }}
              onOpenLibrary={showDocumentParsePage}
            />
          )}
          {page === "parse" && (
            <DocumentParsePage
              libraryName={parseName}
              level={parseLevel}
              rows={parseRows}
              moreOpen={moreOpen}
              onBack={() => setPage("library")}
              onToggleMore={(event) => {
                event.stopPropagation();
                setMoreOpen((open) => !open);
              }}
              onPreview={() => setPage("preview")}
              onRequestDelete={requestDeleteDocument}
              onRequestClearLibrary={requestClearLibrary}
              onRequestDeleteLibrary={requestDeleteLibrary}
              onOpenPublish={openPublishModal}
              onOpenCollab={() => {
                setMoreOpen(false);
                setCollabOpen(true);
              }}
              onOpenEdit={openEditModal}
              onOpenImportExport={openImportExportRecords}
              onOpenChunks={openChunkContentPage}
              onOpenVersionHistory={setVersionHistoryTarget}
            />
          )}
          {page === "chunks" && activeParseRow && (
            <ChunkContentPage
              item={activeParseRow}
              fallbackLevel={parseLevel}
              onBack={() => setPage("parse")}
            />
          )}
          {page === "preview" && <PreviewPage onExit={() => setPage("parse")} />}
        </main>
      </div>

      {modalOpen && (
        <NewLibraryModal
          libraryName={libraryName}
          libraryLevel={libraryLevel}
          uploadedFiles={uploadedFiles}
          isDragover={isDragover}
          fileInputRef={fileInputRef}
          folderInputRef={folderInputRef}
          onClose={closeLibraryModal}
          onSubmit={submitLibraryCreate}
          onNameChange={setLibraryName}
          onLevelChange={setLibraryLevel}
          onAddFiles={addFiles}
          onBatchSetLevel={batchSetLevel}
          onRemoveFile={removeUploadFile}
          onSetFileLevel={setUploadLevel}
          onDrop={handleDrop}
          onDragState={setIsDragover}
          onDropzoneKeydown={handleDropzoneKeydown}
        />
      )}
      {publishModalOpen && (
        <PublishKnowledgeModal
          uploadedFiles={uploadedFiles}
          isDragover={isDragover}
          fileInputRef={fileInputRef}
          folderInputRef={folderInputRef}
          onClose={closePublishModal}
          onSubmit={submitPublishKnowledge}
          onAddFiles={addFiles}
          onBatchSetLevel={batchSetLevel}
          onRemoveFile={removeUploadFile}
          onSetFileLevel={setUploadLevel}
          onDrop={handleDrop}
          onDragState={setIsDragover}
          onDropzoneKeydown={handleDropzoneKeydown}
        />
      )}
      {editModalOpen && (
        <EditLibraryModal
          libraryName={editLibraryName}
          libraryLevel={editLibraryLevel}
          onClose={closeEditModal}
          onSubmit={submitLibraryEdit}
          onNameChange={setEditLibraryName}
          onLevelChange={setEditLibraryLevel}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          fileName={displayFileName(deleteTarget.file)}
          onCancel={closeDeleteConfirm}
          onConfirm={confirmDeleteDocument}
        />
      )}
      {clearLibraryOpen && (
        <DeleteConfirmModal
          message="是否确认清空该知识库？"
          onCancel={() => setClearLibraryOpen(false)}
          onConfirm={confirmClearLibrary}
        />
      )}
      {deleteLibraryOpen && (
        <DeleteConfirmModal
          message="是否确认删除该知识库？"
          onCancel={() => setDeleteLibraryOpen(false)}
          onConfirm={confirmDeleteLibrary}
        />
      )}
      {collabOpen && <CollabModal onClose={() => setCollabOpen(false)} />}
      {importExportOpen && <ImportExportRecordsModal onClose={() => setImportExportOpen(false)} />}
      {versionHistoryTarget && (
        <VersionHistoryModal
          item={versionHistoryTarget}
          fallbackLevel={parseLevel}
          onClose={() => setVersionHistoryTarget(null)}
          onPreview={() => {
            setVersionHistoryTarget(null);
            setPage("preview");
          }}
          onOpenChunks={(item) => {
            setVersionHistoryTarget(null);
            openChunkContentPage(item);
          }}
          deletedVersionIds={deletedHistoryVersionIds}
          onDeleteVersion={(version) => {
            setDeletedHistoryVersionIds((current) => current.includes(version.id) ? current : current.concat(version.id));
          }}
        />
      )}
      {toastMessage && <div className="app-toast" role="status" aria-live="polite">{toastMessage}</div>}
    </>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-name">智能翻译系统</span>
      </div>
      <nav className="main-nav">
        <a className="nav-item" href="#">
          <span className="nav-icon nav-home" aria-hidden="true" />
          <span>首页</span>
        </a>
        <a className="nav-item" href="#">
          <span className="nav-icon nav-doc" aria-hidden="true" />
          <span>文档快翻</span>
        </a>
        <a className="nav-item has-extra" href="#">
          <span className="nav-icon nav-folder" aria-hidden="true" />
          <span>项目管理</span>
          <span className="nav-extra" aria-hidden="true">+</span>
        </a>
        <section className="nav-group" aria-label="语言资产">
          <button className="nav-item nav-parent" type="button" aria-expanded="true">
            <span className="nav-icon nav-asset" aria-hidden="true" />
            <span>语言资产</span>
            <span className="nav-extra" aria-hidden="true">⌃</span>
          </button>
          <a className="nav-item nav-child" href="#">术语库</a>
          <a className="nav-item nav-child" href="#">语料库</a>
          <a className="nav-item nav-child active" href="#">知识库</a>
          <a className="nav-item nav-child" href="#">AI工具包</a>
        </section>
      </nav>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="topbar">
      <button className="collapse-btn" type="button" aria-label="收起侧边栏">‹</button>
      <label className="global-search">
        <span className="sr-only">搜索全部术语/语料</span>
        <input type="search" placeholder="搜索全部术语/语料" />
        <span className="search-icon" aria-hidden="true" />
      </label>
      <button className="avatar-btn" type="button" aria-label="用户菜单" />
    </header>
  );
}

interface LibraryListPageProps {
  keyword: string;
  owner: string;
  currentSort: SortKey;
  sortOpen: boolean;
  items: Library[];
  onKeywordChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onOpenModal: () => void;
  onReset: () => void;
  onSubmitFilters: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSort: (event: MouseEvent<HTMLButtonElement>) => void;
  onSort: (sortKey: SortKey) => void;
  onOpenLibrary: (library: Library) => void;
}

function LibraryListPage(props: LibraryListPageProps) {
  const {
    keyword,
    owner,
    currentSort,
    sortOpen,
    items,
    onKeywordChange,
    onOwnerChange,
    onOpenModal,
    onReset,
    onSubmitFilters,
    onToggleSort,
    onSort,
    onOpenLibrary,
  } = props;
  return (
    <section className="page-card" id="libraryListPage" aria-labelledby="page-title">
      <div className="tabs-row">
        <div className="asset-tabs" role="tablist" aria-label="语言资产类型">
          <button className="asset-tab" type="button" role="tab">术语库</button>
          <button className="asset-tab" type="button" role="tab">语料库</button>
          <button className="asset-tab active" type="button" role="tab" aria-selected="true" id="page-title">知识库</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-actions">
          <button className="primary-btn" type="button" onClick={onOpenModal}>+ 新建库</button>
          <button className="ghost-btn" type="button" disabled>删除</button>
        </div>
        <form className="filters" onSubmit={onSubmitFilters} onReset={onReset}>
          <label>
            <span className="sr-only">搜索库名/知识点/概要</span>
            <input value={keyword} onChange={(event) => onKeywordChange(event.target.value)} type="search" placeholder="搜索库名/知识点/概要" />
          </label>
          <label>
            <span className="sr-only">搜索创建人</span>
            <input value={owner} onChange={(event) => onOwnerChange(event.target.value)} type="search" placeholder="搜索创建人" />
          </label>
          <button className="query-btn" type="submit">查询</button>
          <button className="reset-btn" type="reset">重置</button>
          <div className="sort-control">
            <button className="icon-btn sort-trigger" type="button" aria-label="排序" aria-haspopup="menu" aria-expanded={sortOpen} title="排序" onClick={onToggleSort}>
              <span aria-hidden="true">☷</span>
            </button>
            <div className={`sort-menu${sortOpen ? "" : " hidden"}`} role="menu" aria-label="知识库排序">
              {sortOptions.map((option) => (
                <button key={option.key} className={`sort-option${currentSort === option.key ? " active" : ""}`} type="button" role="menuitem" onClick={() => onSort(option.key)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      <div className="library-grid" aria-live="polite">
        {items.map((item) => <LibraryCard key={item.id} item={item} onOpen={() => onOpenLibrary(item)} />)}
      </div>

      <div className={`empty-state${items.length ? " hidden" : ""}`}>
        <div className="empty-figure" aria-hidden="true" />
        <p>暂无匹配的知识库</p>
      </div>

      <footer className="pagination" aria-label="分页">
        <span>共 {items.length} 条</span>
        <button className="page-arrow" type="button" disabled aria-label="上一页">‹</button>
        <button className="page-current" type="button" aria-current="page">1</button>
        <button className="page-arrow" type="button" disabled aria-label="下一页">›</button>
        <select aria-label="每页条数" defaultValue="20 条/页">
          <option>20 条/页</option>
          <option>50 条/页</option>
        </select>
      </footer>
    </section>
  );
}

function LibraryCard({ item, onOpen }: { item: Library; onOpen: () => void }) {
  const visibleLanguages = item.languages.slice(0, 3);
  const hiddenLanguages = item.languages.slice(3);
  const isSelectable = item.role === "管理者";
  const summaryTooltipId = `library-summary-tooltip-${item.id}`;
  return (
    <article className={`library-card${isSelectable ? "" : " library-card-readonly"}`}>
      <input className="library-checkbox" type="checkbox" aria-label={isSelectable ? `选择${item.name}` : `${item.name}为查看者权限，不可勾选`} disabled={!isSelectable} title={isSelectable ? undefined : "查看者不可勾选"} />
      <a className="library-title" href="#" title={item.name} onClick={(event) => { event.preventDefault(); onOpen(); }}>{item.name}</a>
      <div className="library-summary-wrap" tabIndex={0} aria-describedby={summaryTooltipId}>
        <p className="library-summary">{item.summary}</p>
        <div className="library-summary-tooltip" id={summaryTooltipId} role="tooltip">
          <p>{item.summary}</p>
          <div className="library-summary-topics" aria-label="知识点标签">
            {item.tags.map((tag) => <span key={tag} className="tag topic-tag">{tag}</span>)}
          </div>
        </div>
      </div>
      <div className="tag-row">
        {visibleLanguages.map((language) => <span key={language} className="tag language-tag" title={language}>{language}</span>)}
        {hiddenLanguages.length > 0 && <span className="tag language-more" title={item.languages.join("、")}>...</span>}
        <span className="visibility">{item.visibility}</span>
      </div>
      <div className="library-meta">
        <span className="doc-count"><strong>{item.docs}</strong> 个文档</span>
        <span className="view-link">· {item.role}</span>
      </div>
      <div className="library-footer">
        <span className="user-dot" aria-hidden="true" />
        <span className="owner" title={item.owner}>{item.owner}</span>
        <span className="updated-at">{item.updatedAt}</span>
      </div>
    </article>
  );
}

interface DocumentParsePageProps {
  libraryName: string;
  level: SecurityLevel;
  rows: ParseDocumentRow[];
  moreOpen: boolean;
  onBack: () => void;
  onToggleMore: (event: MouseEvent<HTMLButtonElement>) => void;
  onPreview: () => void;
  onRequestDelete: (item: ParseDocumentRow) => void;
  onRequestClearLibrary: () => void;
  onRequestDeleteLibrary: () => void;
  onOpenPublish: () => void;
  onOpenCollab: () => void;
  onOpenEdit: () => void;
  onOpenImportExport: () => void;
  onOpenChunks: (item: ParseDocumentRow) => void;
  onOpenVersionHistory: (item: ParseDocumentRow) => void;
}

function DocumentParsePage({ libraryName, level, rows, moreOpen, onBack, onToggleMore, onPreview, onRequestDelete, onRequestClearLibrary, onRequestDeleteLibrary, onOpenPublish, onOpenCollab, onOpenEdit, onOpenImportExport, onOpenChunks, onOpenVersionHistory }: DocumentParsePageProps) {
  const levelClass = getLevelClass(level);
  return (
    <section className="document-parse-page" id="documentParsePage" aria-labelledby="documentParseTitle">
      <header className="parse-header">
        <div className="parse-title-wrap">
          <button className="parse-back-btn" type="button" aria-label="返回知识库首页" onClick={onBack}>‹</button>
          <div>
            <h1 id="documentParseTitle">{libraryName}</h1>
            <span className={`parse-status parse-status-${levelClass}`} title={`密级：${level}`} aria-label={`密级：${level}`}>
              <span className="parse-level-text">{level}</span>
            </span>
          </div>
        </div>
        <div className="parse-header-actions">
          <button className="collab-btn" type="button" aria-label="协作" onClick={onOpenCollab}>
            <span className="collab-icon" aria-hidden="true" />
            <span>协作</span>
          </button>
          <div className="library-more">
            <button className="more-btn" type="button" aria-label="更多操作" aria-haspopup="menu" aria-expanded={moreOpen} onClick={onToggleMore}>...</button>
            <div className={`library-more-menu${moreOpen ? "" : " hidden"}`} role="menu" aria-label="知识库操作">
              <button type="button" role="menuitem" onClick={onOpenEdit}>编辑信息</button>
              <button type="button" role="menuitem" onClick={onOpenImportExport}>导入导出记录</button>
              <button className="danger-lite" type="button" role="menuitem" onClick={onRequestClearLibrary}>清空库</button>
              <button className="danger-lite" type="button" role="menuitem" onClick={onRequestDeleteLibrary}>删除库</button>
            </div>
          </div>
        </div>
      </header>

      <div className="parse-toolbar">
        <div className="parse-toolbar-actions">
          <button className="primary-btn" type="button" onClick={onOpenPublish}>发布知识</button>
        </div>
        <form className="parse-filters">
          <input type="search" placeholder="搜索文件名/知识点/概述" />
        </form>
      </div>

      <div className="parse-table">
        {rows.map((item, index) => (
          <ParseRow
            key={item.id}
            item={item}
            index={index}
            fallbackLevel={level}
            onPreview={onPreview}
            onRequestDelete={onRequestDelete}
            onOpenChunks={onOpenChunks}
            onOpenVersionHistory={onOpenVersionHistory}
          />
        ))}
      </div>

      <footer className="parse-pagination" aria-label="文档分页">
        <span>共 {rows.length} 条</span>
        <button type="button" disabled>上一页</button>
        <button type="button" disabled>下一页</button>
        <select aria-label="每页条数" defaultValue="10条/页">
          <option>10条/页</option>
          <option>20条/页</option>
          <option>50条/页</option>
        </select>
      </footer>
    </section>
  );
}

function ParseRow({
  item,
  index,
  fallbackLevel,
  onPreview,
  onRequestDelete,
  onOpenChunks,
  onOpenVersionHistory,
  historyMode = false,
}: {
  item: ParseDocumentRow;
  index: number;
  fallbackLevel: SecurityLevel;
  onPreview: () => void;
  onRequestDelete?: (item: ParseDocumentRow) => void;
  onOpenChunks: (item: ParseDocumentRow) => void;
  onOpenVersionHistory?: (item: ParseDocumentRow) => void;
  historyMode?: boolean;
}) {
  const fileName = displayFileName(item.file);
  const fileType = getFileTypeMeta(fileName);
  const fileLevel = item.level ? getLevelName(item.level) : fallbackLevel;
  const fileLevelClass = getLevelClass(fileLevel);
  const parseStage = item.parseStage || (item.status === "error" ? "failed" : item.status === "uploading" ? "parsing" : "done");
  const statusText = item.statusText || (parseStage === "failed" ? "文档解析失败，xxxxx" : parseStage === "tagging" ? "标签生成中" : parseStage === "parsing" ? "文档解析中" : "");
  const summaryText = item.summary || defaultSummary;
  const isDone = parseStage === "done";
  const canPreview = isDone && supportsChunkView(fileName);
  const languages = ["中", "英", "法", "德"];
  const topics = ["知识点", "术语", "规范", "摘要"];
  const summaryTooltipId = `parse-summary-tooltip-${item.id}`;
  const hasHistory = Boolean(item.historyVersions?.length);
  const canDelete = !item.sourceModule || item.sourceModule === "knowledgeBase";
  const creator = item.creator || "管理员";
  const updatedAt = item.updatedAt || "2026-06-03 14:20";
  return (
    <article className={`parse-row parse-row-${parseStage}${index === 0 && !historyMode ? " parse-row-active" : ""}${historyMode ? " parse-row-history" : ""}`} role="button" tabIndex={0} onClick={() => onOpenChunks(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenChunks(item); } }}>
      <div className={`parse-file-icon parse-file-icon-${fileType.className}`} aria-label={`${fileType.name}类型文件`}>{fileType.label}</div>
      <div className="parse-content">
        <div className="parse-file-line">
          <strong title={fileName}>{fileName}</strong>
          {hasHistory && !historyMode ? (
            <span className="parse-latest-badge">最新版本 V{item.version}</span>
          ) : (
            item.version && <span className="parse-version-badge">V{item.version}</span>
          )}
          {statusText && <span className={`parse-stage parse-stage-${parseStage}`}>{statusText}</span>}
          <span className={`parse-file-security parse-file-security-${fileLevelClass}`} title={`文档密级：${fileLevel}`} aria-label={`文档密级：${fileLevel}`}>
            {fileLevel}
          </span>
          {isDone && (
            <span className="parse-lang-icons parse-icon-group" aria-label="语种">
              {languages.slice(0, 2).map((item) => <span key={item} className="parse-chip parse-chip-lang">{item}</span>)}
              <span className="parse-chip-more" title={languages.join("、")}>...</span>
            </span>
          )}
        </div>
        <div className={`parse-secondary-line${isDone ? "" : " parse-secondary-line-meta-only"}`}>
          {isDone && (
            <div className="parse-summary-wrap" tabIndex={0} aria-describedby={summaryTooltipId}>
              <p className="parse-summary">{summaryText}</p>
              <div className="parse-summary-tooltip" id={summaryTooltipId} role="tooltip">
                <p>{summaryText}</p>
                <div className="parse-summary-topics" aria-label="知识点标签">
                  {topics.map((topic) => <span key={topic} className="parse-chip parse-chip-knowledge">{topic}</span>)}
                </div>
              </div>
            </div>
          )}
          <div className="parse-meta" aria-label={`创建人：${creator}，更新时间：${updatedAt}`}>
            <span>创建人：{creator}</span>
            <span>更新时间：{updatedAt}</span>
          </div>
        </div>
      </div>
      <div className="parse-actions" onClick={(event) => event.stopPropagation()}>
        {isDone && <button type="button">下载</button>}
        {canPreview && <button type="button" onClick={onPreview}>预览</button>}
        {hasHistory && !historyMode && onOpenVersionHistory && (
          <button className="parse-history-btn" type="button" onClick={() => onOpenVersionHistory(item)}>历史版本</button>
        )}
        {canDelete && onRequestDelete && <button className="parse-delete-btn" type="button" onClick={() => onRequestDelete(item)}>删除</button>}
      </div>
    </article>
  );
}

function VersionHistoryModal({
  item,
  fallbackLevel,
  onClose,
  onPreview,
  onOpenChunks,
  deletedVersionIds,
  onDeleteVersion,
}: {
  item: ParseDocumentRow;
  fallbackLevel: SecurityLevel;
  onClose: () => void;
  onPreview: () => void;
  onOpenChunks: (item: ParseDocumentRow) => void;
  deletedVersionIds: string[];
  onDeleteVersion: (item: ParseDocumentRow) => void;
}) {
  const [deleteVersionTarget, setDeleteVersionTarget] = useState<ParseDocumentRow | null>(null);
  const historyVersions = [...(item.historyVersions || [])]
    .filter((version) => !deletedVersionIds.includes(version.id))
    .sort((a, b) => (b.version || 0) - (a.version || 0));

  useEffect(() => {
    const handleKeydown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && deleteVersionTarget) setDeleteVersionTarget(null);
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [deleteVersionTarget]);

  function confirmDeleteVersion() {
    if (!deleteVersionTarget) return;
    onDeleteVersion(deleteVersionTarget);
    setDeleteVersionTarget(null);
  }

  return (
    <div className="modal-mask version-history-mask" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="version-history-modal" role="dialog" aria-modal="true" aria-labelledby="versionHistoryTitle">
        <header className="version-history-header">
          <div>
            <h2 id="versionHistoryTitle">历史版本</h2>
          </div>
          <button className="records-close" type="button" aria-label="关闭历史版本" onClick={onClose}>×</button>
        </header>
        <div className="version-history-body">
          {historyVersions.length > 0 ? (
            <div className="version-history-list">
              {historyVersions.map((version, index) => (
                <ParseRow
                  key={version.id}
                  item={version}
                  index={index}
                  fallbackLevel={fallbackLevel}
                  onPreview={onPreview}
                  onRequestDelete={setDeleteVersionTarget}
                  onOpenChunks={onOpenChunks}
                  historyMode
                />
              ))}
            </div>
          ) : (
            <div className="version-history-empty">暂无历史版本</div>
          )}
        </div>
        <footer className="version-history-footer">
          <button className="modal-cancel" type="button" onClick={onClose}>关闭</button>
        </footer>
      </section>
      {deleteVersionTarget && (
        <DeleteConfirmModal
          fileName={`${displayFileName(deleteVersionTarget.file)}（V${deleteVersionTarget.version}）`}
          message="是否确认删除该历史版本？删除后无法恢复。"
          onCancel={() => setDeleteVersionTarget(null)}
          onConfirm={confirmDeleteVersion}
        />
      )}
    </div>
  );
}

function ChunkContentPage({ item, fallbackLevel, onBack }: { item: ParseDocumentRow; fallbackLevel: SecurityLevel; onBack: () => void }) {
  const fileName = displayFileName(item.file);
  const fileType = getFileTypeMeta(fileName);
  const fileLevel = item.level ? getLevelName(item.level) : fallbackLevel;
  const [chunks, setChunks] = useState<ChunkContentItem[]>([
    {
      id: 1,
      content: "术语库展示添加搜索 添加术语词条展示导出译文字体问题（新罗马字体）目录翻译不准问题格式还原",
      enabled: true,
    },
    {
      id: 2,
      content: "模糊匹配有问题",
      enabled: true,
      preview: true,
    },
    {
      id: 3,
      content: "未来需求点：1、图的翻译2、移动端",
      enabled: true,
    },
  ]);
  const [chunkModalMode, setChunkModalMode] = useState<ChunkModalMode | null>(null);
  const [deletingChunk, setDeletingChunk] = useState<ChunkContentItem | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [selectedChunkIds, setSelectedChunkIds] = useState<number[]>([]);
  const [editingChunk, setEditingChunk] = useState<ChunkContentItem | null>(null);
  const [chunkDraft, setChunkDraft] = useState("");
  const [chunkEnabledDraft, setChunkEnabledDraft] = useState(true);
  const [chunkImagesDraft, setChunkImagesDraft] = useState<ChunkImageItem[]>([]);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectedCount = selectedChunkIds.length;
  const allSelected = chunks.length > 0 && selectedCount === chunks.length;
  const partiallySelected = selectedCount > 0 && selectedCount < chunks.length;

  useEffect(() => {
    const handleKeydown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (chunkModalMode) closeChunkModal();
        if (deletingChunk) setDeletingChunk(null);
        if (batchDeleteOpen) setBatchDeleteOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [batchDeleteOpen, chunkModalMode, deletingChunk]);

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  useEffect(() => {
    setSelectedChunkIds((current) => current.filter((id) => chunks.some((chunk) => chunk.id === id)));
  }, [chunks]);

  function closeChunkModal() {
    setChunkModalMode(null);
    setEditingChunk(null);
  }

  function confirmDeleteChunk() {
    if (!deletingChunk) return;
    setChunks((current) => current.filter((chunk) => chunk.id !== deletingChunk.id));
    setSelectedChunkIds((current) => current.filter((id) => id !== deletingChunk.id));
    setDeletingChunk(null);
  }

  function confirmBatchDeleteChunks() {
    if (!selectedChunkIds.length) return;
    setChunks((current) => current.filter((chunk) => !selectedChunkIds.includes(chunk.id)));
    setSelectedChunkIds([]);
    setBatchDeleteOpen(false);
  }

  function toggleChunkSelection(id: number, checked: boolean) {
    setSelectedChunkIds((current) => {
      if (checked) return current.includes(id) ? current : current.concat(id);
      return current.filter((item) => item !== id);
    });
  }

  function toggleAllChunks(checked: boolean) {
    setSelectedChunkIds(checked ? chunks.map((chunk) => chunk.id) : []);
  }

  function openChunkCreator() {
    setChunkModalMode("create");
    setEditingChunk(null);
    setChunkDraft("");
    setChunkEnabledDraft(true);
    setChunkImagesDraft([]);
  }

  function openChunkEditor(chunk: ChunkContentItem) {
    setChunkModalMode("edit");
    setEditingChunk(chunk);
    setChunkDraft(chunk.content);
    setChunkEnabledDraft(chunk.enabled);
    setChunkImagesDraft(chunk.images || []);
  }

  function submitChunkEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chunkModalMode || !chunkDraft.trim()) return;
    if (chunkModalMode === "create") {
      setChunks((current) => [
        {
          id: Math.max(0, ...current.map((chunk) => chunk.id)) + 1,
          content: chunkDraft.trim(),
          enabled: chunkEnabledDraft,
          images: chunkImagesDraft,
        },
        ...current,
      ]);
    } else if (editingChunk) {
      setChunks((current) =>
        current.map((chunk) =>
          chunk.id === editingChunk.id
            ? { ...chunk, content: chunkDraft.trim(), enabled: chunkEnabledDraft, images: chunkImagesDraft }
            : chunk
        )
      );
    }
    closeChunkModal();
  }

  return (
    <section className="chunk-page" aria-labelledby="chunkPageTitle">
      <header className="chunk-file-header">
        <button className="chunk-back-btn" type="button" aria-label="返回文档解析列表" onClick={onBack}>‹</button>
        <span className={`parse-file-icon parse-file-icon-${fileType.className}`} aria-label={`${fileType.name}类型文件`}>{fileType.label}</span>
        <h1 id="chunkPageTitle" title={fileName}>{fileName}</h1>
        {item.historyVersions?.length ? (
          <span className="parse-latest-badge">最新版本 V{item.version}</span>
        ) : (
          item.version && <span className="parse-version-badge">V{item.version}</span>
        )}
        <span className={`chunk-level parse-file-security parse-file-security-${getLevelClass(fileLevel)}`}>1 - {fileLevel}</span>
      </header>

      <div className="chunk-card">
        <div className="chunk-section-title">
          <h2>切片内容</h2>
        </div>
        <div className="chunk-toolbar">
          <div className="chunk-left-actions">
            <button className="primary-btn" type="button" onClick={openChunkCreator}>+ 新增</button>
            <button className="ghost-btn chunk-batch-delete" type="button" disabled={!selectedCount} onClick={() => setBatchDeleteOpen(true)}>批量删除</button>
            <span className="chunk-selected">已选择：<strong>{selectedCount}</strong></span>
          </div>
          <form className="chunk-filters">
            <div className="select-wrap chunk-status-select">
              <select aria-label="启用状态" defaultValue="all">
                <option value="all">全部</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </div>
            <input type="search" placeholder="请输入切片内容" aria-label="搜索切片内容" />
          </form>
        </div>

        <div className="chunk-table" role="table" aria-label="切片内容列表">
          <div className="chunk-table-head" role="row">
            <label className="chunk-check-cell"><input ref={selectAllRef} type="checkbox" aria-label="全选切片" checked={allSelected} onChange={(event) => toggleAllChunks(event.target.checked)} /></label>
            <span>切片块内容</span>
            <span>启用状态</span>
          <span>操作</span>
          </div>
          {chunks.map((chunk) => <ChunkContentRow key={chunk.id} item={chunk} selected={selectedChunkIds.includes(chunk.id)} onSelect={(checked) => toggleChunkSelection(chunk.id, checked)} onEdit={() => openChunkEditor(chunk)} onDelete={() => setDeletingChunk(chunk)} />)}
        </div>

        <footer className="chunk-pagination" aria-label="切片分页">
          <span>共 {chunks.length} 条</span>
          <select aria-label="每页条数" defaultValue="10条/页">
            <option>10条/页</option>
            <option>20条/页</option>
            <option>50条/页</option>
          </select>
          <button type="button" disabled aria-label="上一页">‹</button>
          <button className="chunk-page-current" type="button" aria-current="page">1</button>
          <button type="button" disabled aria-label="下一页">›</button>
          <span>前往</span>
          <input type="number" min="1" defaultValue="1" aria-label="跳转页码" />
          <span>页</span>
        </footer>
      </div>
      {chunkModalMode && (
        <ChunkEditModal
          title={chunkModalMode === "create" ? "新增切片块" : "编辑切片块"}
          content={chunkDraft}
          enabled={chunkEnabledDraft}
          images={chunkImagesDraft}
          onContentChange={setChunkDraft}
          onEnabledChange={setChunkEnabledDraft}
          onImagesChange={setChunkImagesDraft}
          onCancel={closeChunkModal}
          onSubmit={submitChunkEdit}
        />
      )}
      {deletingChunk && (
        <DeleteConfirmModal
          message="是否确认删除该切片块？"
          onCancel={() => setDeletingChunk(null)}
          onConfirm={confirmDeleteChunk}
        />
      )}
      {batchDeleteOpen && (
        <DeleteConfirmModal
          message={`是否确认删除已选择的 ${selectedCount} 个切片块？`}
          onCancel={() => setBatchDeleteOpen(false)}
          onConfirm={confirmBatchDeleteChunks}
        />
      )}
    </section>
  );
}

function ChunkContentRow({ item, selected, onSelect, onEdit, onDelete }: { item: ChunkContentItem; selected: boolean; onSelect: (checked: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="chunk-table-row" role="row">
      <label className="chunk-check-cell"><input type="checkbox" aria-label={`选择切片${item.id}`} checked={selected} onChange={(event) => onSelect(event.target.checked)} /></label>
      <div className="chunk-content-cell">
        <p>{item.content}</p>
        {item.preview && <div className="chunk-preview-thumb" aria-label="切片截图预览"><div className="chunk-preview-doc" /></div>}
      </div>
      <div className="chunk-enabled-cell"><button className={`switch-on${item.enabled ? "" : " switch-off"}`} type="button" role="switch" aria-checked={item.enabled} aria-label="启用状态" /></div>
      <div className="chunk-row-actions">
        <button type="button" onClick={onEdit}>编辑</button>
        <button className="danger-lite" type="button" onClick={onDelete}>删除</button>
      </div>
    </article>
  );
}

function ChunkEditModal({ title, content, enabled, images, onContentChange, onEnabledChange, onImagesChange, onCancel, onSubmit }: { title: string; content: string; enabled: boolean; images: ChunkImageItem[]; onContentChange: (value: string) => void; onEnabledChange: (value: boolean) => void; onImagesChange: (value: ChunkImageItem[]) => void; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState("");
  const maxImageCount = 5;
  const maxImageSize = 50 * 1024 * 1024;

  function addChunkImages(fileList: FileList | null) {
    if (!fileList?.length) return;
    const nextImages = [...images];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const isValidType = file.type === "image/png" || file.type === "image/jpeg" || ["png", "jpg", "jpeg"].includes(extension);
      if (!isValidType) {
        errors.push(`${file.name} 类型不支持`);
        return;
      }
      if (file.size > maxImageSize) {
        errors.push(`${file.name} 超过50M`);
        return;
      }
      if (nextImages.length >= maxImageCount) {
        errors.push("最多上传5张图片");
        return;
      }
      nextImages.push({ id: `${Date.now()}-${file.name}-${nextImages.length}`, name: file.name, size: file.size });
    });

    onImagesChange(nextImages);
    setImageError(errors[0] || "");
  }

  function removeChunkImage(id: string) {
    onImagesChange(images.filter((image) => image.id !== id));
    setImageError("");
  }

  return (
    <div className="modal-mask" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="chunk-edit-modal" role="dialog" aria-modal="true" aria-labelledby="chunkEditTitle">
        <header className="modal-header">
          <h2 id="chunkEditTitle">{title}</h2>
          <button className="modal-close" type="button" aria-label="关闭弹窗" onClick={onCancel}>×</button>
        </header>
        <form className="chunk-edit-form" id="chunkEditForm" onSubmit={onSubmit}>
          <label className="chunk-edit-field required">
            <span>切片块内容</span>
            <div className="chunk-edit-control">
              <textarea value={content} onChange={(event) => onContentChange(event.target.value)} placeholder="请输入切片块内容" maxLength={5000} autoFocus />
              <small>{content.trim().length}/5000</small>
            </div>
          </label>
          <div className="chunk-edit-field chunk-image-field">
            <span>上传图片</span>
            <div className="chunk-image-control">
              <div className="chunk-image-upload-row">
                <button className="chunk-image-upload" type="button" disabled={images.length >= maxImageCount} onClick={() => imageInputRef.current?.click()}>
                  上传图片
                </button>
                <span className="chunk-image-count">{images.length}/{maxImageCount}</span>
              </div>
              <input ref={imageInputRef} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" multiple hidden onChange={(event) => { addChunkImages(event.target.files); event.target.value = ""; }} />
              <small>支持 png、jpg、jpeg，最多5张，单张最大50M</small>
              {imageError && <p className="chunk-image-error">{imageError}</p>}
              {images.length > 0 && (
                <div className="chunk-image-list">
                  {images.map((image) => (
                    <div className="chunk-image-item" key={image.id}>
                      <span className="chunk-image-thumb" aria-hidden="true" />
                      <span className="chunk-image-name" title={image.name}>{image.name}</span>
                      <span className="chunk-image-size">{formatFileSize(image.size)}</span>
                      <button type="button" aria-label={`移除${image.name}`} onClick={() => removeChunkImage(image.id)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="chunk-edit-field chunk-edit-status">
            <span>启用状态</span>
            <button className={`switch-on${enabled ? "" : " switch-off"}`} type="button" role="switch" aria-checked={enabled} onClick={() => onEnabledChange(!enabled)}>
              <span className="sr-only">启用状态</span>
            </button>
          </div>
        </form>
        <footer className="modal-footer">
          <button className="modal-cancel" type="button" onClick={onCancel}>取消</button>
          <button className="modal-confirm" type="submit" form="chunkEditForm" disabled={!content.trim()}>保存</button>
        </footer>
      </section>
    </div>
  );
}

function DeleteConfirmModal({ fileName, message, onCancel, onConfirm }: { fileName?: string; message?: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-mask" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="deleteConfirmTitle" aria-describedby="deleteConfirmDesc">
        <header className="delete-confirm-header">
          <span className="delete-confirm-icon" aria-hidden="true">!</span>
          <h2 id="deleteConfirmTitle">确认删除</h2>
        </header>
        <div className="delete-confirm-body">
          <p id="deleteConfirmDesc">{message || "是否确认删除该文档？"}</p>
          {fileName && <span title={fileName}>{fileName}</span>}
        </div>
        <footer className="delete-confirm-footer">
          <button className="modal-cancel" type="button" onClick={onCancel}>取消</button>
          <button className="danger-confirm" type="button" onClick={onConfirm}>确认删除</button>
        </footer>
      </section>
    </div>
  );
}

function CollabModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-mask collab-mask" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="collab-image-modal" role="dialog" aria-modal="true" aria-label="协作">
        <div className="collab-image-frame">
          <img src="/collab-popup.svg" alt="协作弹窗" />
          <button className="modal-close" type="button" aria-label="关闭协作者弹窗" onClick={onClose}>×</button>
        </div>
      </section>
    </div>
  );
}

function ImportExportRecordsModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<ImportExportTab>("import");
  const records = activeTab === "import"
    ? [
        {
          id: 1,
          document: '【有术语译文】第12届北京国际电影节主视觉海报-“同心·笃行”原文-中英术语',
          level: "内部",
          operator: "管理员",
          operatedAt: "2026-06-03 13:53",
          status: "已完成",
          version: 3,
          isLatestVersion: true,
        },
        {
          id: 2,
          document: "北京国际电影节天坛奖相关手册-原文.docx",
          level: "公开",
          operator: "管理员",
          operatedAt: "2026-06-03 13:50",
          status: "解析中",
          version: 2,
          isLatestVersion: false,
        },
        {
          id: 3,
          document: "北京国际电影节项目说明附件.docx",
          level: "公开",
          operator: "管理员",
          operatedAt: "2026-06-03 13:47",
          status: "解析失败",
        },
      ]
    : [
        {
          id: 1,
          document: '【有术语译文】第12届北京国际电影节主视觉海报-“同心·笃行”原文-中英术语',
          level: "内部",
          operator: "管理员",
          operatedAt: "2026-06-03 14:12",
          status: "导出成功",
          version: 3,
          isLatestVersion: true,
        },
        {
          id: 2,
          document: "北京国际电影节天坛奖相关手册-译文.docx",
          level: "公开",
          operator: "管理员",
          operatedAt: "2026-06-03 14:08",
          status: "导出中",
          version: 2,
          isLatestVersion: false,
        },
        {
          id: 3,
          document: "北京国际电影节项目说明附件.docx",
          level: "公开",
          operator: "管理员",
          operatedAt: "2026-06-03 14:03",
          status: "导出失败",
        },
      ];

  return (
    <div className="modal-mask records-mask" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="records-modal" role="dialog" aria-modal="true" aria-labelledby="recordsModalTitle">
        <header className="records-header">
          <h2 id="recordsModalTitle">导入导出记录</h2>
          <button className="records-close" type="button" aria-label="关闭导入导出记录" onClick={onClose}>×</button>
        </header>
        <div className="records-tabs" role="tablist" aria-label="导入导出记录类型">
          <button className={activeTab === "import" ? "active" : ""} type="button" role="tab" aria-selected={activeTab === "import"} onClick={() => setActiveTab("import")}>导入记录</button>
          <button className={activeTab === "export" ? "active" : ""} type="button" role="tab" aria-selected={activeTab === "export"} onClick={() => setActiveTab("export")}>导出记录</button>
        </div>
        <div className="records-table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th className="records-col-index">序号</th>
                <th>文档</th>
                <th className="records-col-level">涉密等级</th>
                <th className="records-col-operator">操作人</th>
                <th className="records-col-time">操作时间</th>
                <th className="records-col-status">状态</th>
                <th className="records-col-action">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? records.map((record) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td>
                    <div className="records-document-cell">
                      <span className="records-document" title={record.document}>{record.document}</span>
                      {record.isLatestVersion ? (
                        <span className="parse-latest-badge">最新版本 V{record.version}</span>
                      ) : (
                        record.version && <span className="parse-version-badge">V{record.version}</span>
                      )}
                    </div>
                  </td>
                  <td><span className="records-level">{record.level}</span></td>
                  <td>{record.operator}</td>
                  <td>{record.operatedAt}</td>
                  <td><span className={`records-status records-status-${record.status.includes("失败") ? "failed" : record.status.includes("中") ? "processing" : "complete"}`}>{record.status}</span></td>
                  <td>
                    {record.status === "导出成功" && (
                      <button className="records-download-btn" type="button" aria-label={`下载${record.document}`}>下载</button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="records-empty" colSpan={7}>暂无记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="records-pagination" aria-label="导入导出记录分页">
          <span>共 {records.length} 条</span>
          <button type="button" disabled aria-label="上一页">‹</button>
          <button className="active" type="button" aria-current="page">1</button>
          <button type="button" disabled aria-label="下一页">›</button>
        </footer>
      </section>
    </div>
  );
}

interface NewLibraryModalProps {
  libraryName: string;
  libraryLevel: SecurityLevel | "";
  uploadedFiles: UploadFileItem[];
  isDragover: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onLevelChange: (value: SecurityLevel | "") => void;
  onAddFiles: (fileList: FileList | File[]) => void;
  onBatchSetLevel: (event: ChangeEvent<HTMLSelectElement>) => void;
  onRemoveFile: (id: string) => void;
  onSetFileLevel: (id: string, value: SecurityLevel | "") => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragState: (value: boolean) => void;
  onDropzoneKeydown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

interface UploadPanelProps {
  uploadedFiles: UploadFileItem[];
  isDragover: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onAddFiles: (fileList: FileList | File[]) => void;
  onBatchSetLevel: (event: ChangeEvent<HTMLSelectElement>) => void;
  onRemoveFile: (id: string) => void;
  onSetFileLevel: (id: string, value: SecurityLevel | "") => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragState: (value: boolean) => void;
  onDropzoneKeydown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

function NewLibraryModal(props: NewLibraryModalProps) {
  const {
    libraryName,
    libraryLevel,
    uploadedFiles,
    isDragover,
    fileInputRef,
    folderInputRef,
    onClose,
    onSubmit,
    onNameChange,
    onLevelChange,
    onAddFiles,
    onBatchSetLevel,
    onRemoveFile,
    onSetFileLevel,
    onDrop,
    onDragState,
    onDropzoneKeydown,
  } = props;
  const canConfirm = Boolean(libraryName.trim() && libraryLevel);
  return (
    <div className="modal-mask" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="library-modal" role="dialog" aria-modal="true" aria-labelledby="libraryModalTitle">
        <header className="modal-header">
          <h2 id="libraryModalTitle">新建知识库</h2>
          <button className="modal-close" type="button" aria-label="关闭弹窗" onClick={onClose}>×</button>
        </header>
        <form className="modal-body" id="libraryCreateForm" onSubmit={onSubmit}>
          <div className="modal-form-panel">
            <label className="form-row required">
              <span>库名称</span>
              <input value={libraryName} onChange={(event) => onNameChange(event.target.value)} type="text" placeholder="请输入库名称" maxLength={40} autoFocus />
            </label>
            <label className="form-row required">
              <span>涉密等级</span>
              <div className="select-wrap select-wrap-full">
                <select value={libraryLevel} onChange={(event) => onLevelChange(event.target.value as SecurityLevel | "")}>
                  <option value="">请选择</option>
                  {levelOptions.map((level) => <option key={level}>{level}</option>)}
                </select>
              </div>
            </label>
          </div>
          <div className="modal-upload-panel">
            <UploadPanel
              uploadedFiles={uploadedFiles}
              isDragover={isDragover}
              fileInputRef={fileInputRef}
              folderInputRef={folderInputRef}
              onAddFiles={onAddFiles}
              onBatchSetLevel={onBatchSetLevel}
              onRemoveFile={onRemoveFile}
              onSetFileLevel={onSetFileLevel}
              onDrop={onDrop}
              onDragState={onDragState}
              onDropzoneKeydown={onDropzoneKeydown}
            />
          </div>
        </form>
        <footer className="modal-footer">
          <button className="modal-cancel" type="button" onClick={onClose}>取消</button>
          <button className="modal-confirm" type="submit" form="libraryCreateForm" disabled={!canConfirm}>确定</button>
        </footer>
      </section>
    </div>
  );
}

function EditLibraryModal({
  libraryName,
  libraryLevel,
  onClose,
  onSubmit,
  onNameChange,
  onLevelChange,
}: {
  libraryName: string;
  libraryLevel: SecurityLevel | "";
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onLevelChange: (value: SecurityLevel | "") => void;
}) {
  const canConfirm = Boolean(libraryName.trim() && libraryLevel);

  return (
    <div className="modal-mask" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="edit-library-modal" role="dialog" aria-modal="true" aria-labelledby="editLibraryModalTitle">
        <header className="modal-header edit-library-header">
          <h2 id="editLibraryModalTitle">编辑知识库</h2>
        </header>
        <form className="edit-library-body" id="libraryEditForm" onSubmit={onSubmit}>
          <label className="form-row required">
            <span>库名称</span>
            <input value={libraryName} onChange={(event) => onNameChange(event.target.value)} type="text" placeholder="请输入库名称" maxLength={40} autoFocus />
          </label>
          <label className="form-row required">
            <span>涉密等级</span>
            <div className="select-wrap select-wrap-full">
              <select value={libraryLevel} disabled aria-disabled="true" onChange={(event) => onLevelChange(event.target.value as SecurityLevel | "")}>
                <option value="">请选择</option>
                {levelOptions.map((level) => <option key={level}>{level}</option>)}
              </select>
            </div>
          </label>
        </form>
        <footer className="modal-footer">
          <button className="modal-cancel" type="button" onClick={onClose}>取消</button>
          <button className="modal-confirm" type="submit" form="libraryEditForm" disabled={!canConfirm}>确定</button>
        </footer>
      </section>
    </div>
  );
}

function UploadPanel(props: UploadPanelProps) {
  const {
    uploadedFiles,
    isDragover,
    fileInputRef,
    folderInputRef,
    onAddFiles,
    onBatchSetLevel,
    onRemoveFile,
    onSetFileLevel,
    onDrop,
    onDragState,
    onDropzoneKeydown,
  } = props;

  return (
    <>
      <div className="upload-title">导入文件</div>
      <p className="upload-subtitle">支持文件类型：.doc, .docx, .wps, .ppt, .pptx, .xls, .xlsx, .pdf, .html, .txt, .md, .csv, .png, .jpg, .jpeg, .gif, .bmp, .webp</p>
      <div
        className={`upload-dropzone${isDragover ? " is-dragover" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="点击或拖拽上传文件/文件夹"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest(".upload-action-btn")) return;
          fileInputRef.current?.click();
        }}
        onKeyDown={onDropzoneKeydown}
        onDragEnter={(event) => { event.preventDefault(); event.stopPropagation(); onDragState(true); }}
        onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); onDragState(true); }}
        onDragLeave={(event) => { event.preventDefault(); event.stopPropagation(); onDragState(false); }}
        onDrop={onDrop}
      >
        <span className="upload-line">
          <span className="upload-icon" aria-hidden="true">⇧</span>
          <strong>点击或拖拽上传文档</strong>
        </span>
        <small>最多上传500个文件，单文件≤100M</small>
        <div className="upload-actions">
          <button className="upload-action-btn" type="button" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }}>上传文件</button>
          <button className="upload-action-btn" type="button" onClick={(event) => { event.stopPropagation(); folderInputRef.current?.click(); }}>上传文件夹</button>
        </div>
        <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => { if (event.target.files) onAddFiles(event.target.files); event.target.value = ""; }} />
        <input ref={folderInputRef} type="file" multiple hidden {...{ webkitdirectory: "", directory: "" }} onChange={(event) => { if (event.target.files) onAddFiles(event.target.files); event.target.value = ""; }} />
      </div>
      <div className="upload-batch-level select-wrap">
        <select onChange={onBatchSetLevel} defaultValue="">
          <option value="">批量设置涉密等级</option>
          {levelOptions.map((level) => <option key={level}>{level}</option>)}
        </select>
      </div>
      <div className="upload-file-list">
        {uploadedFiles.map((item) => (
          <UploadFileRow key={item.id} item={item} onRemove={() => onRemoveFile(item.id)} onLevelChange={(level) => onSetFileLevel(item.id, level)} />
        ))}
      </div>
    </>
  );
}

interface PublishKnowledgeModalProps extends UploadPanelProps {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function PublishKnowledgeModal(props: PublishKnowledgeModalProps) {
  const { onClose, onSubmit, uploadedFiles, ...uploadProps } = props;
  const canConfirm = uploadedFiles.length > 0;

  return (
    <div className="modal-mask" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="publish-modal" role="dialog" aria-modal="true" aria-label="导入文件">
        <form className="publish-upload-body" id="publishKnowledgeForm" onSubmit={onSubmit}>
          <UploadPanel uploadedFiles={uploadedFiles} {...uploadProps} />
        </form>
        <footer className="modal-footer">
          <button className="modal-cancel" type="button" onClick={onClose}>取消</button>
          <button className="modal-confirm" type="submit" form="publishKnowledgeForm" disabled={!canConfirm}>确定</button>
        </footer>
      </section>
    </div>
  );
}

function UploadFileRow({ item, onRemove, onLevelChange }: { item: UploadFileItem; onRemove: () => void; onLevelChange: (level: SecurityLevel | "") => void }) {
  const isUploading = item.status === "uploading";
  const progress = isUploading ? item.progress : item.status === "done" ? 100 : 0;
  const name = displayFileName(item.file);
  return (
    <div className={`upload-file upload-file-${item.status}`}>
      <span className="file-icon" aria-hidden="true">F</span>
      <div className="file-main">
        <div className="file-info">
          <span className="file-name" title={name}>{name}</span>
          <span className="file-size">{formatFileSize(item.file.size)}</span>
        </div>
        {isUploading && <div className="file-progress-bar"><div className="file-progress-bar-inner" style={{ width: `${progress}%` }} /></div>}
      </div>
      <div className="file-level select-wrap">
        <select value={item.level} disabled={isUploading} onChange={(event) => onLevelChange(event.target.value as SecurityLevel | "")}>
          <option value="">设置密级</option>
          {levelOptions.map((level) => <option key={level}>{level}</option>)}
        </select>
      </div>
      <span className={`file-progress file-status-${item.status}`}>{statusLabel(item.status, item.progress)}</span>
      <button className="file-remove-btn" type="button" aria-label="删除文件" disabled={isUploading} onClick={onRemove} />
    </div>
  );
}

function PreviewPage({ onExit }: { onExit: () => void }) {
  return (
    <section className="preview-page" aria-label="原译对照预览">
      <header className="preview-toolbar">
        <div className="preview-tabs" role="tablist" aria-label="预览模式">
          <button className="preview-tab active" type="button" role="tab" aria-selected="true">原译对照</button>
          <button className="preview-tab" type="button" role="tab">原文</button>
          <button className="preview-tab" type="button" role="tab">译文</button>
        </div>
        <div className="preview-actions">
          <button className="preview-tool-btn" type="button">刷新</button>
          <button className="preview-exit-btn" type="button" onClick={onExit}>退出预览</button>
        </div>
      </header>
      <div className="preview-compare">
        <article className="preview-paper preview-source" aria-label="原文">
          <h2>第 12 届北京国际电影节主视觉海报 主打中国红！</h2>
          <p>昨天，第十二届北京国际电影节组委会召开新闻发布会，介绍本届电影节筹备情况。</p>
          <p>本届电影节将于 8 月 13 日至 8 月 20 日在京举办，电影节主题为“同心·笃行”，包括“天坛奖”评奖、开幕式及红毯仪式、北京展映、北京策划·主题论坛、北京市场、电影嘉年华、大学生电影节、闭幕式暨颁奖典礼、“电影+”九大主体板块。</p>
          <p>本届“天坛奖”评委会主席为中国著名演员李雪健，评委会其他 6 名成员为中国导演郭帆，英国导演凯文·麦克唐纳，阿根廷导演卢奎西亚·马特尔，意大利导演米开朗基罗·弗兰马汀诺，中国演员秦海璐和中国导演、演员吴京。</p>
          <p>今年“天坛奖”全球报名影片数量达到 1450 部，总数较去年增长 63%，其中国外影片来自 88 个国家和地区共计 1193 部。</p>
          <p>最终入围“天坛奖”的影片包括土耳其/波兰/德国/丹麦合拍影片《安纳托利亚豹》、美国影片《珍妮热线》、泰国影片《速度与爱情》、法国影片《全职》、中国影片《海的尽头是草原》等。</p>
          <p>作为电影产业的风向标，今年北京市场的“云上市场”将在现有官网平台基础上首次登陆百度“希壤”元宇宙空间，打造全球第一个“元宇宙电影节”。</p>
        </article>
        <div className="preview-divider" aria-hidden="true" />
        <article className="preview-paper preview-target" aria-label="译文">
          <h2>The main visual for the 12th Beijing International Film Festival is unveiled, featuring Chinese red!</h2>
          <p>Yesterday, the organizing committee of the 12th Beijing International Film Festival held a press conference to introduce the preparations for this year's festival.</p>
          <p>The festival will be held in Beijing from August 13 to August 20, with the theme “United Hearts, Steadfast Actions.” It includes nine main sections: the Tiantan Award competition, the opening ceremony and red carpet event, Beijing Screenings, Beijing Planning & Theme Forum, Beijing Market, Film Carnival, College Student Film Festival, the closing ceremony and awards presentation, and “Film+.”</p>
          <p>The jury chair for this year's Tiantan Award is renowned Chinese actor Li Xuejian, with six other members including Chinese director Guo Fan, British director Kevin Macdonald, Argentine director Lucrecia Martel, Italian director Michelangelo Frammartino, Chinese actress Qin Hailu, and Chinese director and actor Wu Jing.</p>
          <p>This year, the Tiantan Award received 1,450 entries from around the world, a 63% increase from last year, including 1,193 international films from 88 countries and regions.</p>
          <p>The finalists include the Turkish/Polish/German/Danish co-production Anatolian Leopard, the U.S. film Call Jane, the Thai film Fast and Love, the French film Full Time, and the Chinese film In Search of Lost Time.</p>
          <p>As a bellwether for the film industry, this year's Cloud Market of the Beijing International Film Festival will, for the first time, launch on Baidu's XiRang metaverse space based on the existing official website platform.</p>
        </article>
      </div>
    </section>
  );
}

export default App;
