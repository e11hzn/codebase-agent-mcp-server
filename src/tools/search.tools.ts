// Search and query tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  QueryCodebaseInputSchema,
  SearchCodeInputSchema,
  GetFileContentInputSchema,
  GetFileTreeInputSchema,
  GetGitHistoryInputSchema,
  AnalyzeFunctionInputSchema,
  ReviewDiffInputSchema,
  type QueryCodebaseInput,
  type SearchCodeInput,
  type GetFileContentInput,
  type GetFileTreeInput,
  type GetGitHistoryInput,
  type AnalyzeFunctionInput,
  type ReviewDiffInput,
} from "../schemas/index.js";
import {
  generateRepoId,
  getRepository,
  getIndex,
  searchCode,
  getFileContent,
  getFileTree,
  getGitHistory,
  getDiff,
} from "../services/git.service.js";
import { CHARACTER_LIMIT, FILE_CONTENT_LIMIT } from "../constants.js";

/**
 * Register search and query tools with the MCP server
 */
export function registerSearchTools(server: McpServer): void {
  // Query Codebase Tool
  server.registerTool(
    "git_query_codebase",
    {
      title: "Query Codebase",
      description: `Query the codebase in natural language to understand code structure and behavior.

This tool searches indexed repositories to answer questions about the code. It finds relevant files, functions, and code patterns to provide context for answering your question.

Args:
  - query (string): Natural language question (e.g., "How does authentication work?")
  - repositories (array): List of repositories to search
  - response_format ('markdown' | 'json'): Output format

Returns:
  Relevant code snippets, file references, and context to answer the question.

Examples:
  - "How does the payment processing work?"
  - "What database schema is used for users?"
  - "Where are API endpoints defined?"`,
      inputSchema: QueryCodebaseInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: QueryCodebaseInput) => {
      try {
        const { query, repositories, response_format } = params;

        // Extract keywords from query for searching
        const keywords = extractKeywords(query);
        const allResults: Array<{
          repoId: string;
          file: string;
          line: number;
          content: string;
        }> = [];

        for (const repo of repositories) {
          const repoId = generateRepoId(
            repo.remote,
            repo.owner,
            repo.repository,
            repo.branch
          );

          const repoData = getRepository(repoId);
          if (!repoData || repoData.status !== "ready") {
            continue;
          }

          // Search for each keyword
          for (const keyword of keywords) {
            const results = searchCode(repoId, keyword, { limit: 10 });
            for (const result of results) {
              allResults.push({
                repoId,
                file: result.file,
                line: result.line,
                content: result.content,
              });
            }
          }
        }

        // Deduplicate and sort by relevance
        const uniqueResults = deduplicateResults(allResults);
        const output = formatQueryResults(query, uniqueResults, response_format);

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error querying codebase: ${message}` }],
        };
      }
    }
  );

  // Search Code Tool
  server.registerTool(
    "git_search_code",
    {
      title: "Search Code",
      description: `Search for text patterns in indexed repositories.

Performs text search across all indexed code files. Supports filtering by file patterns and case sensitivity.

Args:
  - query (string): Search text or pattern
  - repositories (array): List of repositories to search
  - file_pattern (string, optional): Regex to filter files (e.g., '\\.ts$')
  - case_sensitive (boolean): Case-sensitive search (default: false)
  - limit (number): Max results (default: 20, max: 100)
  - response_format ('markdown' | 'json'): Output format

Returns:
  List of matches with file path, line number, and content.

Examples:
  - Search for function: { query: "handlePayment" }
  - TypeScript only: { query: "interface User", file_pattern: "\\.ts$" }`,
      inputSchema: SearchCodeInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: SearchCodeInput) => {
      try {
        const {
          query,
          repositories,
          file_pattern,
          case_sensitive,
          limit,
          response_format,
        } = params;

        const allResults: Array<{
          repoId: string;
          repoName: string;
          file: string;
          line: number;
          content: string;
        }> = [];

        for (const repo of repositories) {
          const repoId = generateRepoId(
            repo.remote,
            repo.owner,
            repo.repository,
            repo.branch
          );

          const repoData = getRepository(repoId);
          if (!repoData || repoData.status !== "ready") {
            continue;
          }

          const results = searchCode(repoId, query, {
            filePattern: file_pattern,
            caseSensitive: case_sensitive,
            limit,
          });

          for (const result of results) {
            allResults.push({
              repoId,
              repoName: `${repo.owner}/${repo.repository}`,
              file: result.file,
              line: result.line,
              content: result.content,
            });
          }
        }

        const output = formatSearchResults(allResults, response_format);
        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error searching code: ${message}` }],
        };
      }
    }
  );

  // Get File Content Tool
  server.registerTool(
    "git_get_file_content",
    {
      title: "Get File Content",
      description: `Retrieve the content of a specific file from an indexed repository.

Args:
  - remote, owner, repository, branch: Repository reference
  - file_path (string): Path to file within repository
  - start_line (number, optional): Starting line (1-indexed)
  - end_line (number, optional): Ending line (inclusive)
  - response_format ('markdown' | 'json'): Output format

Returns:
  File content with language detection and line numbers.`,
      inputSchema: GetFileContentInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetFileContentInput) => {
      try {
        const {
          remote,
          owner,
          repository,
          branch,
          file_path,
          start_line,
          end_line,
          response_format,
        } = params;

        const repoId = generateRepoId(remote, owner, repository, branch);
        const repoData = getRepository(repoId);

        if (!repoData || repoData.status !== "ready") {
          return {
            content: [
              {
                type: "text",
                text: `Repository not indexed. Use git_index_repository first.`,
              },
            ],
          };
        }

        const fileContent = getFileContent(repoId, file_path);
        if (!fileContent) {
          return {
            content: [
              {
                type: "text",
                text: `File not found: ${file_path}\n\nUse git_get_file_tree to list available files.`,
              },
            ],
          };
        }

        // Apply line range if specified
        let content = fileContent.content;
        const lines = content.split("\n");

        if (start_line || end_line) {
          const start = (start_line || 1) - 1;
          const end = end_line || lines.length;
          content = lines.slice(start, end).join("\n");
        }

        // Truncate if too long
        if (content.length > FILE_CONTENT_LIMIT) {
          content =
            content.substring(0, FILE_CONTENT_LIMIT) +
            `\n\n... (truncated, showing first ${FILE_CONTENT_LIMIT} characters)`;
        }

        const output = formatFileContent(
          file_path,
          content,
          fileContent.language,
          start_line || 1,
          response_format
        );

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error getting file: ${message}` }],
        };
      }
    }
  );

  // Get File Tree Tool
  server.registerTool(
    "git_get_file_tree",
    {
      title: "Get File Tree",
      description: `Get the directory structure of a repository.

Args:
  - remote, owner, repository, branch: Repository reference
  - directory (string): Directory path (empty for root)
  - response_format ('markdown' | 'json'): Output format

Returns:
  List of files and directories with metadata.`,
      inputSchema: GetFileTreeInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetFileTreeInput) => {
      try {
        const { remote, owner, repository, branch, directory, response_format } =
          params;

        const repoId = generateRepoId(remote, owner, repository, branch);
        const repoData = getRepository(repoId);

        if (!repoData) {
          return {
            content: [
              {
                type: "text",
                text: `Repository not found. Use git_index_repository first.`,
              },
            ],
          };
        }

        const files = await getFileTree(repoId, directory);
        const output = formatFileTree(directory || "/", files, response_format);

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error getting file tree: ${message}` }],
        };
      }
    }
  );

  // Get Git History Tool
  server.registerTool(
    "git_get_git_history",
    {
      title: "Get Git History",
      description: `Get commit history for a repository or specific file.

Args:
  - remote, owner, repository, branch: Repository reference
  - file_path (string, optional): File to get history for
  - limit (number): Max commits to return (default: 20)
  - response_format ('markdown' | 'json'): Output format

Returns:
  List of commits with hash, message, author, and date.`,
      inputSchema: GetGitHistoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetGitHistoryInput) => {
      try {
        const { remote, owner, repository, branch, file_path, limit, response_format } =
          params;

        const repoId = generateRepoId(remote, owner, repository, branch);
        const repoData = getRepository(repoId);

        if (!repoData) {
          return {
            content: [
              {
                type: "text",
                text: `Repository not found. Use git_index_repository first.`,
              },
            ],
          };
        }

        const commits = await getGitHistory(repoId, file_path, limit);
        const output = formatGitHistory(commits, file_path, response_format);

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error getting history: ${message}` }],
        };
      }
    }
  );

  // Analyze Function Tool
  server.registerTool(
    "git_analyze_function",
    {
      title: "Analyze Function",
      description: `Analyze a specific function to understand its purpose and usage.

Args:
  - remote, owner, repository, branch: Repository reference
  - function_name (string): Name of function to analyze
  - file_path (string, optional): File path if name is ambiguous
  - response_format ('markdown' | 'json'): Output format

Returns:
  Function signature, location, description, and call relationships.`,
      inputSchema: AnalyzeFunctionInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: AnalyzeFunctionInput) => {
      try {
        const {
          remote,
          owner,
          repository,
          branch,
          function_name,
          file_path,
          response_format,
        } = params;

        const repoId = generateRepoId(remote, owner, repository, branch);
        const index = getIndex(repoId);

        if (!index) {
          return {
            content: [
              {
                type: "text",
                text: `Repository not indexed. Use git_index_repository first.`,
              },
            ],
          };
        }

        // Find matching functions
        const matches: Array<{
          key: string;
          info: { name: string; file: string; startLine: number; endLine: number; signature: string };
        }> = [];

        for (const [key, info] of index.functions) {
          if (info.name === function_name) {
            if (!file_path || key.startsWith(file_path)) {
              matches.push({ key, info });
            }
          }
        }

        if (matches.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Function '${function_name}' not found.\n\nTry git_search_code to find similar functions.`,
              },
            ],
          };
        }

        // Get function content
        const results = [];
        for (const match of matches) {
          const fileContent = index.files.get(match.info.file);
          if (fileContent) {
            const lines = fileContent.content.split("\n");
            const content = lines
              .slice(match.info.startLine - 1, match.info.endLine)
              .join("\n");
            results.push({
              ...match.info,
              content,
              language: fileContent.language,
            });
          }
        }

        const output = formatFunctionAnalysis(results, response_format);
        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error analyzing function: ${message}` }],
        };
      }
    }
  );

  // Review Diff Tool
  server.registerTool(
    "git_review_diff",
    {
      title: "Review Diff",
      description: `Review a diff/commit with full codebase context.

This tool retrieves the diff for a commit or between branches, providing context for code review.

Args:
  - remote, owner, repository, branch: Repository reference
  - commit (string): Commit SHA or branch to review
  - compare_with (string, optional): Base commit/branch for comparison
  - response_format ('markdown' | 'json'): Output format

Returns:
  Diff content with file changes and statistics.`,
      inputSchema: ReviewDiffInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: ReviewDiffInput) => {
      try {
        const { remote, owner, repository, branch, commit, compare_with, response_format } =
          params;

        const repoId = generateRepoId(remote, owner, repository, branch);
        const repoData = getRepository(repoId);

        if (!repoData) {
          return {
            content: [
              {
                type: "text",
                text: `Repository not found. Use git_index_repository first.`,
              },
            ],
          };
        }

        const diff = await getDiff(repoId, commit, compare_with);

        if (!diff) {
          return {
            content: [{ type: "text", text: "No changes found in the specified range." }],
          };
        }

        const output = formatDiff(diff, commit, compare_with, response_format);
        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error reviewing diff: ${message}` }],
        };
      }
    }
  );
}

// Helper functions

function extractKeywords(query: string): string[] {
  // Remove common words and extract significant terms
  const stopWords = new Set([
    "the", "is", "at", "which", "on", "a", "an", "and", "or", "but",
    "in", "with", "to", "for", "of", "how", "does", "what", "where",
    "why", "when", "who", "this", "that", "these", "those", "are", "was",
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

function deduplicateResults(
  results: Array<{ repoId: string; file: string; line: number; content: string }>
): Array<{ repoId: string; file: string; line: number; content: string }> {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.repoId}:${r.file}:${r.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatQueryResults(
  query: string,
  results: Array<{ repoId: string; file: string; line: number; content: string }>,
  format: string
): string {
  if (format === "json") {
    return JSON.stringify({ query, results, total: results.length }, null, 2);
  }

  if (results.length === 0) {
    return `No relevant code found for: "${query}"\n\nTry:\n- Different keywords\n- Checking if repositories are indexed\n- Using git_search_code for specific text`;
  }

  let markdown = `## Query: "${query}"\n\n`;
  markdown += `Found ${results.length} relevant code snippets:\n\n`;

  // Group by file
  const byFile = new Map<string, typeof results>();
  for (const r of results) {
    const key = `${r.repoId}:${r.file}`;
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key)!.push(r);
  }

  for (const [key, fileResults] of byFile) {
    const [, file] = key.split(":", 2);
    markdown += `### ${file}\n\n`;
    for (const r of fileResults.slice(0, 5)) {
      markdown += `**Line ${r.line}:** \`${r.content.trim()}\`\n`;
    }
    markdown += "\n";
  }

  return markdown;
}

function formatSearchResults(
  results: Array<{
    repoId: string;
    repoName: string;
    file: string;
    line: number;
    content: string;
  }>,
  format: string
): string {
  if (format === "json") {
    return JSON.stringify({ results, total: results.length }, null, 2);
  }

  if (results.length === 0) {
    return "No matches found.";
  }

  let markdown = `## Search Results (${results.length})\n\n`;

  for (const r of results) {
    markdown += `- **${r.repoName}** \`${r.file}:${r.line}\`\n`;
    markdown += `  \`${r.content.trim()}\`\n`;
  }

  return markdown;
}

function formatFileContent(
  path: string,
  content: string,
  language: string,
  startLine: number,
  format: string
): string {
  if (format === "json") {
    return JSON.stringify({ path, language, startLine, content }, null, 2);
  }

  return `## ${path}\n\n**Language:** ${language}\n\n\`\`\`${language}\n${content}\n\`\`\``;
}

function formatFileTree(
  directory: string,
  files: Array<{ path: string; name: string; type: string; language?: string }>,
  format: string
): string {
  if (format === "json") {
    return JSON.stringify({ directory, files }, null, 2);
  }

  let markdown = `## Directory: ${directory}\n\n`;

  const dirs = files.filter((f) => f.type === "directory");
  const regularFiles = files.filter((f) => f.type === "file");

  if (dirs.length > 0) {
    markdown += "**Directories:**\n";
    for (const d of dirs) {
      markdown += `- 📁 ${d.name}/\n`;
    }
    markdown += "\n";
  }

  if (regularFiles.length > 0) {
    markdown += "**Files:**\n";
    for (const f of regularFiles) {
      const lang = f.language ? ` (${f.language})` : "";
      markdown += `- 📄 ${f.name}${lang}\n`;
    }
  }

  return markdown;
}

function formatGitHistory(
  commits: Array<{ hash: string; message: string; author: string; date: Date }>,
  filePath: string | undefined,
  format: string
): string {
  if (format === "json") {
    return JSON.stringify({ commits, filePath }, null, 2);
  }

  let markdown = filePath
    ? `## Git History: ${filePath}\n\n`
    : `## Git History\n\n`;

  for (const c of commits) {
    markdown += `- **${c.hash.substring(0, 7)}** ${c.message}\n`;
    markdown += `  *${c.author}* - ${c.date.toLocaleDateString()}\n`;
  }

  return markdown;
}

function formatFunctionAnalysis(
  functions: Array<{
    name: string;
    file: string;
    startLine: number;
    endLine: number;
    signature: string;
    content: string;
    language: string;
  }>,
  format: string
): string {
  if (format === "json") {
    return JSON.stringify({ functions }, null, 2);
  }

  let markdown = "";

  for (const fn of functions) {
    markdown += `## Function: ${fn.name}\n\n`;
    markdown += `**File:** ${fn.file}\n`;
    markdown += `**Lines:** ${fn.startLine}-${fn.endLine}\n`;
    markdown += `**Signature:** \`${fn.signature}\`\n\n`;
    markdown += `\`\`\`${fn.language}\n${fn.content}\n\`\`\`\n\n`;
  }

  return markdown;
}

function formatDiff(
  diff: string,
  commit: string,
  compareWith: string | undefined,
  format: string
): string {
  if (format === "json") {
    return JSON.stringify({ commit, compareWith, diff }, null, 2);
  }

  const title = compareWith
    ? `## Diff: ${compareWith}...${commit}`
    : `## Diff: ${commit}`;

  return `${title}\n\n\`\`\`diff\n${diff}\n\`\`\``;
}
