// Type definitions for the Codebase MCP Server

export interface Repository {
  id: string;
  remote: "github" | "gitlab" | "local";
  owner: string;
  name: string;
  branch: string;
  localPath: string;
  status: "pending" | "indexing" | "ready" | "error";
  filesProcessed: number;
  totalFiles: number;
  indexedAt?: Date;
  error?: string;
}

export interface FileInfo {
  path: string;
  name: string;
  type: "file" | "directory";
  size?: number;
  language?: string;
  lastModified?: Date;
}

export interface CodeLocation {
  file: string;
  startLine: number;
  endLine: number;
  content: string;
}

export interface FunctionInfo {
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  signature: string;
  description?: string;
  calls: string[];
  calledBy: string[];
}

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  matchType: "exact" | "fuzzy" | "semantic";
  score: number;
}

export interface QueryResult {
  answer: string;
  sources: CodeLocation[];
  confidence: number;
}

export interface DiffAnalysis {
  summary: string;
  criticalIssues: Issue[];
  suggestions: Issue[];
  affectedAreas: string[];
}

export interface Issue {
  severity: "critical" | "warning" | "info";
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
  relatedCode?: CodeLocation;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

export interface RepositoryIndex {
  repository: Repository;
  files: Map<string, FileContent>;
  functions: Map<string, FunctionInfo>;
  imports: Map<string, string[]>;
  exports: Map<string, string[]>;
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  lines: number;
  functions: string[];
  imports: string[];
  exports: string[];
}

export enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown"
}
