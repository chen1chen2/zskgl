export type SecurityLevel = "公开" | "内部" | "秘密";

export type SortKey =
  | "default"
  | "createdAsc"
  | "createdDesc"
  | "updatedAsc"
  | "updatedDesc"
  | "nameAsc"
  | "nameDesc";

export type PageName = "documentQuick" | "library" | "parse" | "preview" | "chunks";

export interface Library {
  id: number;
  name: string;
  summary: string;
  languages: string[];
  tags: string[];
  visibility: string;
  docs: number;
  role: "查看者" | "管理者";
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export type UploadStatus = "pending" | "uploading" | "done" | "error";

export interface UploadFileItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  level: SecurityLevel | "";
}
