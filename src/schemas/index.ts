// Zod schemas for MCP tool inputs

import { z } from "zod";
import { ResponseFormat } from "../types.js";

// Response format enum for output
export const ResponseFormatSchema = z
  .enum(["json", "markdown"])
  .default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

// Repository reference schema
export const RepositoryRefSchema = z.object({
  remote: z
    .enum(["github", "gitlab", "local"])
    .describe("Git remote type: 'github', 'gitlab', or 'local'"),
  owner: z
    .string()
    .min(1)
    .describe("Repository owner/organization (e.g., 'facebook')"),
  repository: z
    .string()
    .min(1)
    .describe("Repository name (e.g., 'react')"),
  branch: z
    .string()
    .default("main")
    .describe("Branch name (default: 'main')"),
}).strict();

// Index repository input
export const IndexRepositoryInputSchema = z.object({
  remote: z
    .enum(["github", "gitlab", "local"])
    .describe("Git remote type: 'github', 'gitlab', or 'local'"),
  owner: z
    .string()
    .min(1)
    .describe("Repository owner/organization (e.g., 'facebook')"),
  repository: z
    .string()
    .min(1)
    .describe("Repository name (e.g., 'react')"),
  branch: z
    .string()
    .default("main")
    .describe("Branch name to index (default: 'main')"),
  reload: z
    .boolean()
    .default(false)
    .describe("Force re-indexing even if already indexed"),
  response_format: ResponseFormatSchema,
}).strict();

// Get repository status input
export const GetRepositoryStatusInputSchema = z.object({
  remote: z
    .enum(["github", "gitlab", "local"])
    .describe("Git remote type"),
  owner: z
    .string()
    .min(1)
    .describe("Repository owner/organization"),
  repository: z
    .string()
    .min(1)
    .describe("Repository name"),
  branch: z
    .string()
    .default("main")
    .describe("Branch name"),
  response_format: ResponseFormatSchema,
}).strict();

// List repositories input
export const ListRepositoriesInputSchema = z.object({
  status: z
    .enum(["all", "pending", "indexing", "ready", "error"])
    .default("all")
    .describe("Filter by indexing status"),
  response_format: ResponseFormatSchema,
}).strict();

// Query codebase input
export const QueryCodebaseInputSchema = z.object({
  query: z
    .string()
    .min(3)
    .max(1000)
    .describe("Natural language question about the codebase"),
  repositories: z
    .array(RepositoryRefSchema)
    .min(1)
    .describe("List of repositories to query"),
  response_format: ResponseFormatSchema,
}).strict();

// Search code input
export const SearchCodeInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .describe("Search query (text or pattern to find)"),
  repositories: z
    .array(RepositoryRefSchema)
    .min(1)
    .describe("List of repositories to search"),
  file_pattern: z
    .string()
    .optional()
    .describe("Optional regex pattern to filter files (e.g., '\\.ts$' for TypeScript files)"),
  case_sensitive: z
    .boolean()
    .default(false)
    .describe("Whether search is case-sensitive"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  response_format: ResponseFormatSchema,
}).strict();

// Get file content input
export const GetFileContentInputSchema = z.object({
  remote: z
    .enum(["github", "gitlab", "local"])
    .describe("Git remote type"),
  owner: z
    .string()
    .min(1)
    .describe("Repository owner/organization"),
  repository: z
    .string()
    .min(1)
    .describe("Repository name"),
  branch: z
    .string()
    .default("main")
    .describe("Branch name"),
  file_path: z
    .string()
    .min(1)
    .describe("Path to the file within the repository"),
  start_line: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Starting line number (1-indexed)"),
  end_line: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Ending line number (inclusive)"),
  response_format: ResponseFormatSchema,
}).strict();

// Get file tree input
export const GetFileTreeInputSchema = z.object({
  remote: z
    .enum(["github", "gitlab", "local"])
    .describe("Git remote type"),
  owner: z
    .string()
    .min(1)
    .describe("Repository owner/organization"),
  repository: z
    .string()
    .min(1)
    .describe("Repository name"),
  branch: z
    .string()
    .default("main")
    .describe("Branch name"),
  directory: z
    .string()
    .default("")
    .describe("Directory path (empty for root)"),
  response_format: ResponseFormatSchema,
}).strict();

// Get git history input
export const GetGitHistoryInputSchema = z.object({
  remote: z
    .enum(["github", "gitlab", "local"])
    .describe("Git remote type"),
  owner: z
    .string()
    .min(1)
    .describe("Repository owner/organization"),
  repository: z
    .string()
    .min(1)
    .describe("Repository name"),
  branch: z
    .string()
    .default("main")
    .describe("Branch name"),
  file_path: z
    .string()
    .optional()
    .describe("Optional file path to get history for specific file"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum commits to return"),
  response_format: ResponseFormatSchema,
}).strict();

// Analyze function input
export const AnalyzeFunctionInputSchema = z.object({
  remote: z
    .enum(["github", "gitlab", "local"])
    .describe("Git remote type"),
  owner: z
    .string()
    .min(1)
    .describe("Repository owner/organization"),
  repository: z
    .string()
    .min(1)
    .describe("Repository name"),
  branch: z
    .string()
    .default("main")
    .describe("Branch name"),
  function_name: z
    .string()
    .min(1)
    .describe("Name of the function to analyze"),
  file_path: z
    .string()
    .optional()
    .describe("Optional file path if function name is ambiguous"),
  response_format: ResponseFormatSchema,
}).strict();

// Review diff input
export const ReviewDiffInputSchema = z.object({
  remote: z
    .enum(["github", "gitlab", "local"])
    .describe("Git remote type"),
  owner: z
    .string()
    .min(1)
    .describe("Repository owner/organization"),
  repository: z
    .string()
    .min(1)
    .describe("Repository name"),
  branch: z
    .string()
    .default("main")
    .describe("Branch name"),
  commit: z
    .string()
    .min(1)
    .describe("Commit SHA or branch name to review"),
  compare_with: z
    .string()
    .optional()
    .describe("Optional base commit/branch to compare against"),
  response_format: ResponseFormatSchema,
}).strict();

// Type exports
export type IndexRepositoryInput = z.infer<typeof IndexRepositoryInputSchema>;
export type GetRepositoryStatusInput = z.infer<typeof GetRepositoryStatusInputSchema>;
export type ListRepositoriesInput = z.infer<typeof ListRepositoriesInputSchema>;
export type QueryCodebaseInput = z.infer<typeof QueryCodebaseInputSchema>;
export type SearchCodeInput = z.infer<typeof SearchCodeInputSchema>;
export type GetFileContentInput = z.infer<typeof GetFileContentInputSchema>;
export type GetFileTreeInput = z.infer<typeof GetFileTreeInputSchema>;
export type GetGitHistoryInput = z.infer<typeof GetGitHistoryInputSchema>;
export type AnalyzeFunctionInput = z.infer<typeof AnalyzeFunctionInputSchema>;
export type ReviewDiffInput = z.infer<typeof ReviewDiffInputSchema>;
