// Repository management tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  IndexRepositoryInputSchema,
  GetRepositoryStatusInputSchema,
  ListRepositoriesInputSchema,
  type IndexRepositoryInput,
  type GetRepositoryStatusInput,
  type ListRepositoriesInput,
} from "../schemas/index.js";
import {
  generateRepoId,
  cloneRepository,
  indexRepository,
  getRepository,
  setRepository,
  listRepositories,
} from "../services/git.service.js";
import { Repository } from "../types.js";

/**
 * Register repository management tools with the MCP server
 */
export function registerRepositoryTools(server: McpServer): void {
  // Index Repository Tool
  server.registerTool(
    "git_index_repository",
    {
      title: "Index Git Repository",
      description: `Index a Git repository for code search and analysis.

This tool clones or updates a repository and indexes all code files for searching and querying. The indexing process:
1. Clones the repository (or pulls latest if already cloned)
2. Scans all code files (respecting .gitignore)
3. Extracts functions, imports, exports, and dependencies
4. Makes the codebase searchable via other tools

Args:
  - remote ('github' | 'gitlab' | 'local'): Git remote type
  - owner (string): Repository owner/organization
  - repository (string): Repository name
  - branch (string): Branch to index (default: 'main')
  - reload (boolean): Force re-indexing (default: false)
  - response_format ('markdown' | 'json'): Output format

Returns:
  Repository status including:
  - id: Unique repository identifier
  - status: 'pending' | 'indexing' | 'ready' | 'error'
  - filesProcessed: Number of files indexed
  - totalFiles: Total files to index

Examples:
  - Index React repo: { remote: "github", owner: "facebook", repository: "react" }
  - Force reindex: { ..., reload: true }`,
      inputSchema: IndexRepositoryInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: IndexRepositoryInput) => {
      try {
        const { remote, owner, repository, branch, reload, response_format } = params;
        const repoId = generateRepoId(remote, owner, repository, branch);

        // Check if already indexed
        let repo = getRepository(repoId);
        if (repo && repo.status === "ready" && !reload) {
          const output = formatRepositoryStatus(repo, response_format);
          return {
            content: [{ type: "text", text: output }],
          };
        }

        // Build clone URL
        let repoUrl: string;
        if (remote === "github") {
          repoUrl = `https://github.com/${owner}/${repository}.git`;
        } else if (remote === "gitlab") {
          repoUrl = `https://gitlab.com/${owner}/${repository}.git`;
        } else {
          repoUrl = `${owner}/${repository}`; // Local path
        }

        // Create repository record
        repo = {
          id: repoId,
          remote,
          owner,
          name: repository,
          branch,
          localPath: "",
          status: "pending",
          filesProcessed: 0,
          totalFiles: 0,
        };
        setRepository(repoId, repo);

        // Clone repository
        const localPath = await cloneRepository(repoUrl, owner, repository, branch);
        repo.localPath = localPath;
        setRepository(repoId, repo);

        // Index repository (async - returns immediately with pending status)
        indexRepository(repoId, localPath).catch((error) => {
          const errorRepo = getRepository(repoId);
          if (errorRepo) {
            errorRepo.status = "error";
            errorRepo.error = error instanceof Error ? error.message : String(error);
            setRepository(repoId, errorRepo);
          }
        });

        // Return current status
        repo = getRepository(repoId)!;
        const output = formatRepositoryStatus(repo, response_format);

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error indexing repository: ${message}\n\nTry checking:\n- Repository URL is correct\n- Repository is public or you have access\n- Branch name exists`,
            },
          ],
        };
      }
    }
  );

  // Get Repository Status Tool
  server.registerTool(
    "git_get_repository_status",
    {
      title: "Get Repository Status",
      description: `Check the indexing status of a repository.

Use this to monitor indexing progress or verify a repository is ready for querying.

Args:
  - remote ('github' | 'gitlab' | 'local'): Git remote type
  - owner (string): Repository owner/organization
  - repository (string): Repository name
  - branch (string): Branch name (default: 'main')
  - response_format ('markdown' | 'json'): Output format

Returns:
  Repository status with indexing progress and any errors.`,
      inputSchema: GetRepositoryStatusInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetRepositoryStatusInput) => {
      try {
        const { remote, owner, repository, branch, response_format } = params;
        const repoId = generateRepoId(remote, owner, repository, branch);

        const repo = getRepository(repoId);
        if (!repo) {
          return {
            content: [
              {
                type: "text",
                text: `Repository ${owner}/${repository} (${branch}) not found.\n\nUse git_index_repository to index it first.`,
              },
            ],
          };
        }

        const output = formatRepositoryStatus(repo, response_format);
        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error getting status: ${message}` }],
        };
      }
    }
  );

  // List Repositories Tool
  server.registerTool(
    "git_list_repositories",
    {
      title: "List Indexed Repositories",
      description: `List all repositories that have been indexed.

Args:
  - status ('all' | 'pending' | 'indexing' | 'ready' | 'error'): Filter by status
  - response_format ('markdown' | 'json'): Output format

Returns:
  List of repositories with their current indexing status.`,
      inputSchema: ListRepositoriesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: ListRepositoriesInput) => {
      try {
        const { status, response_format } = params;

        let repos = listRepositories();
        if (status !== "all") {
          repos = repos.filter((r) => r.status === status);
        }

        if (repos.length === 0) {
          return {
            content: [
              {
                type: "text",
                text:
                  status === "all"
                    ? "No repositories indexed yet.\n\nUse git_index_repository to index a repository."
                    : `No repositories with status '${status}'.`,
              },
            ],
          };
        }

        const output = formatRepositoryList(repos, response_format);
        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing repositories: ${message}` }],
        };
      }
    }
  );
}

/**
 * Format repository status for output
 */
function formatRepositoryStatus(
  repo: Repository,
  format: string
): string {
  if (format === "json") {
    return JSON.stringify(
      {
        id: repo.id,
        remote: repo.remote,
        owner: repo.owner,
        name: repo.name,
        branch: repo.branch,
        status: repo.status,
        filesProcessed: repo.filesProcessed,
        totalFiles: repo.totalFiles,
        indexedAt: repo.indexedAt?.toISOString(),
        error: repo.error,
      },
      null,
      2
    );
  }

  const statusEmoji =
    repo.status === "ready"
      ? "✅"
      : repo.status === "indexing"
      ? "⏳"
      : repo.status === "error"
      ? "❌"
      : "📋";

  let markdown = `## ${statusEmoji} ${repo.owner}/${repo.name}\n\n`;
  markdown += `**Branch:** ${repo.branch}\n`;
  markdown += `**Status:** ${repo.status}\n`;
  markdown += `**Progress:** ${repo.filesProcessed}/${repo.totalFiles} files\n`;

  if (repo.indexedAt) {
    markdown += `**Indexed at:** ${repo.indexedAt.toLocaleString()}\n`;
  }

  if (repo.error) {
    markdown += `\n**Error:** ${repo.error}\n`;
  }

  return markdown;
}

/**
 * Format repository list for output
 */
function formatRepositoryList(repos: Repository[], format: string): string {
  if (format === "json") {
    return JSON.stringify(
      {
        total: repos.length,
        repositories: repos.map((r) => ({
          id: r.id,
          owner: r.owner,
          name: r.name,
          branch: r.branch,
          status: r.status,
          filesProcessed: r.filesProcessed,
        })),
      },
      null,
      2
    );
  }

  let markdown = `## Indexed Repositories (${repos.length})\n\n`;

  for (const repo of repos) {
    const statusEmoji =
      repo.status === "ready"
        ? "✅"
        : repo.status === "indexing"
        ? "⏳"
        : repo.status === "error"
        ? "❌"
        : "📋";

    markdown += `${statusEmoji} **${repo.owner}/${repo.name}** (${repo.branch}) - ${repo.status}`;
    if (repo.status === "indexing") {
      markdown += ` (${repo.filesProcessed}/${repo.totalFiles} files)`;
    }
    markdown += "\n";
  }

  return markdown;
}
