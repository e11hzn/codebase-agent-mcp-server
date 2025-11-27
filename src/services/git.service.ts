// Git service for repository operations

import { simpleGit } from "simple-git";
import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";
import ignore from "ignore";
import {
  Repository,
  FileInfo,
  FileContent,
  RepositoryIndex,
  CommitInfo,
  FunctionInfo,
  SearchResult,
} from "../types.js";
import {
  REPOS_DIRECTORY,
  CODE_EXTENSIONS,
  IGNORE_PATTERNS,
  LANGUAGE_MAP,
  DEFAULT_BRANCH,
} from "../constants.js";

// In-memory storage for indexed repositories
const repositoryStore = new Map<string, Repository>();
const indexStore = new Map<string, RepositoryIndex>();

/**
 * Generate a unique repository ID
 */
export function generateRepoId(
  remote: string,
  owner: string,
  name: string,
  branch: string
): string {
  return `${remote}:${branch}:${owner}/${name}`;
}

/**
 * Get the local path for a repository
 */
export function getLocalPath(owner: string, name: string): string {
  return path.join(REPOS_DIRECTORY, owner, name);
}

/**
 * Clone or update a repository
 */
export async function cloneRepository(
  repoUrl: string,
  owner: string,
  name: string,
  branch: string = DEFAULT_BRANCH
): Promise<string> {
  const localPath = getLocalPath(owner, name);

  // Ensure directory exists
  await fs.mkdir(path.dirname(localPath), { recursive: true });

  // Check if repo already exists
  try {
    await fs.access(localPath);
    // Repository exists, try to update it
    const git = simpleGit(localPath);
    try {
      await git.fetch();
      await git.checkout(branch);
      await git.pull("origin", branch);
      console.error(`Updated repository at ${localPath}`);
    } catch (gitError) {
      // Git operations failed, directory might be corrupted
      // Remove the directory and re-clone
      console.error(`Failed to update repository, removing and re-cloning: ${gitError}`);
      await fs.rm(localPath, { recursive: true, force: true });
      const freshGit = simpleGit();
      await freshGit.clone(repoUrl, localPath, [
        "--branch", branch,
        "--single-branch"
      ]);
      console.error(`Re-cloned repository to ${localPath}`);
    }
  } catch {
    // Repository doesn't exist, clone it
    const git = simpleGit();
    await git.clone(repoUrl, localPath, [
      "--branch", branch,
      "--single-branch"
    ]);
    console.error(`Cloned repository to ${localPath}`);
  }

  return localPath;
}

/**
 * Index a repository by reading all code files
 */
export async function indexRepository(
  repoId: string,
  localPath: string
): Promise<RepositoryIndex> {
  const repo = repositoryStore.get(repoId);
  if (!repo) {
    throw new Error(`Repository ${repoId} not found in store`);
  }

  // Update status
  repo.status = "indexing";
  repositoryStore.set(repoId, repo);

  // Read .gitignore if it exists
  const ig = ignore.default();
  try {
    const gitignoreContent = await fs.readFile(
      path.join(localPath, ".gitignore"),
      "utf-8"
    );
    ig.add(gitignoreContent);
  } catch {
    // No .gitignore, continue
  }
  ig.add(IGNORE_PATTERNS);

  // Find all code files
  const allFiles = await glob("**/*", {
    cwd: localPath,
    nodir: true,
    dot: false,
  });

  const codeFiles = allFiles.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return CODE_EXTENSIONS.includes(ext) && !ig.ignores(file);
  });

  repo.totalFiles = codeFiles.length;
  repositoryStore.set(repoId, repo);

  const files = new Map<string, FileContent>();
  const functions = new Map<string, FunctionInfo>();
  const imports = new Map<string, string[]>();
  const exports = new Map<string, string[]>();

  let processed = 0;

  for (const filePath of codeFiles) {
    try {
      const fullPath = path.join(localPath, filePath);
      const content = await fs.readFile(fullPath, "utf-8");
      const ext = path.extname(filePath).toLowerCase();
      const language = LANGUAGE_MAP[ext] || "unknown";

      // Extract basic file info
      const fileContent: FileContent = {
        path: filePath,
        content,
        language,
        lines: content.split("\n").length,
        functions: extractFunctionNames(content, language),
        imports: extractImports(content, language),
        exports: extractExports(content, language),
      };

      files.set(filePath, fileContent);
      imports.set(filePath, fileContent.imports);
      exports.set(filePath, fileContent.exports);

      // Extract function info
      const fileFunctions = extractFunctions(content, filePath, language);
      for (const fn of fileFunctions) {
        functions.set(`${filePath}:${fn.name}`, fn);
      }

      processed++;
      repo.filesProcessed = processed;

      // Update progress periodically
      if (processed % 50 === 0) {
        repositoryStore.set(repoId, repo);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }

  // Update final status
  repo.status = "ready";
  repo.filesProcessed = processed;
  repo.indexedAt = new Date();
  repositoryStore.set(repoId, repo);

  const index: RepositoryIndex = {
    repository: repo,
    files,
    functions,
    imports,
    exports,
  };

  indexStore.set(repoId, index);
  return index;
}

/**
 * Extract function names from code
 */
function extractFunctionNames(content: string, language: string): string[] {
  const names: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    // Match common function patterns
    const patterns = [
      /function\s+(\w+)\s*\(/,                    // function name()
      /(\w+)\s*=\s*(?:async\s+)?function/,        // name = function
      /(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,  // name = () =>
      /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/,       // name() { (method)
      /def\s+(\w+)\s*\(/,                         // Python
      /func\s+(\w+)\s*\(/,                        // Go
      /fn\s+(\w+)\s*\(/,                          // Rust
      /public\s+(?:static\s+)?(?:\w+\s+)?(\w+)\s*\(/, // Java/C#
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] && !["if", "for", "while", "switch", "catch"].includes(match[1])) {
        names.push(match[1]);
      }
    }
  }

  return [...new Set(names)];
}

/**
 * Extract imports from code
 */
function extractImports(content: string, language: string): string[] {
  const imports: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const patterns = [
      /import\s+.*?from\s+['"]([^'"]+)['"]/,      // ES6 import
      /import\s+['"]([^'"]+)['"]/,                 // Side-effect import
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/,      // CommonJS require
      /from\s+(\S+)\s+import/,                     // Python
      /import\s+"([^"]+)"/,                        // Go
      /use\s+(\S+)/,                               // Rust
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        imports.push(match[1]);
      }
    }
  }

  return [...new Set(imports)];
}

/**
 * Extract exports from code
 */
function extractExports(content: string, language: string): string[] {
  const exports: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const patterns = [
      /export\s+(?:default\s+)?(?:const|let|var|function|class|async\s+function)\s+(\w+)/,
      /export\s+{\s*([^}]+)\s*}/,
      /module\.exports\s*=\s*(\w+)/,
      /exports\.(\w+)\s*=/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        // Handle multiple exports in { }
        const items = match[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]);
        exports.push(...items.filter(Boolean));
      }
    }
  }

  return [...new Set(exports)];
}

/**
 * Extract detailed function information
 */
function extractFunctions(
  content: string,
  filePath: string,
  language: string
): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = content.split("\n");

  const functionPatterns = [
    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/,
    /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/,
    /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*{/,
  ];

  let currentFunction: FunctionInfo | null = null;
  let braceCount = 0;
  let inFunction = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for function start
    for (const pattern of functionPatterns) {
      const match = trimmedLine.match(pattern);
      if (match && match[1]) {
        const name = match[1];
        const params = match[2] || "";

        if (currentFunction && inFunction) {
          currentFunction.endLine = i;
          functions.push(currentFunction);
        }

        currentFunction = {
          name,
          file: filePath,
          startLine: i + 1,
          endLine: i + 1,
          signature: `${name}(${params})`,
          calls: [],
          calledBy: [],
        };
        inFunction = true;
        braceCount = 0;
        break;
      }
    }

    // Track braces to find function end
    if (inFunction && currentFunction) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount <= 0 && line.includes("}")) {
        currentFunction.endLine = i + 1;
        functions.push(currentFunction);
        currentFunction = null;
        inFunction = false;
      }
    }
  }

  // Handle last function if file ends
  if (currentFunction && inFunction) {
    currentFunction.endLine = lines.length;
    functions.push(currentFunction);
  }

  return functions;
}

/**
 * Search for text/patterns in indexed files
 */
export function searchCode(
  repoId: string,
  query: string,
  options: {
    filePattern?: string;
    caseSensitive?: boolean;
    limit?: number;
  } = {}
): SearchResult[] {
  const index = indexStore.get(repoId);
  if (!index) {
    throw new Error(`Repository ${repoId} not indexed`);
  }

  const results: SearchResult[] = [];
  const limit = options.limit || 50;
  const flags = options.caseSensitive ? "g" : "gi";
  const searchRegex = new RegExp(escapeRegex(query), flags);

  for (const [filePath, fileContent] of index.files) {
    // Apply file pattern filter
    if (options.filePattern) {
      const pattern = new RegExp(options.filePattern);
      if (!pattern.test(filePath)) continue;
    }

    const lines = fileContent.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (searchRegex.test(lines[i])) {
        results.push({
          file: filePath,
          line: i + 1,
          content: lines[i].trim(),
          matchType: "exact",
          score: 1.0,
        });

        if (results.length >= limit) {
          return results;
        }
      }
    }
  }

  return results;
}

/**
 * Get file content
 */
export function getFileContent(
  repoId: string,
  filePath: string
): FileContent | undefined {
  const index = indexStore.get(repoId);
  if (!index) {
    throw new Error(`Repository ${repoId} not indexed`);
  }
  return index.files.get(filePath);
}

/**
 * Get file tree
 */
export async function getFileTree(
  repoId: string,
  dirPath: string = ""
): Promise<FileInfo[]> {
  const repo = repositoryStore.get(repoId);
  if (!repo) {
    throw new Error(`Repository ${repoId} not found`);
  }

  const fullPath = path.join(repo.localPath, dirPath);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });

  const ig = ignore.default().add(IGNORE_PATTERNS);

  const files: FileInfo[] = [];
  for (const entry of entries) {
    const relativePath = path.join(dirPath, entry.name);
    if (ig.ignores(relativePath)) continue;

    const info: FileInfo = {
      path: relativePath,
      name: entry.name,
      type: entry.isDirectory() ? "directory" : "file",
    };

    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      info.language = LANGUAGE_MAP[ext];
      try {
        const stats = await fs.stat(path.join(fullPath, entry.name));
        info.size = stats.size;
        info.lastModified = stats.mtime;
      } catch {
        // Skip stats on error
      }
    }

    files.push(info);
  }

  return files.sort((a, b) => {
    // Directories first, then alphabetically
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get git history for a file or directory
 */
export async function getGitHistory(
  repoId: string,
  filePath?: string,
  limit: number = 20
): Promise<CommitInfo[]> {
  const repo = repositoryStore.get(repoId);
  if (!repo) {
    throw new Error(`Repository ${repoId} not found`);
  }

  const git = simpleGit(repo.localPath);
  const options = {
    maxCount: limit,
    ...(filePath ? { file: filePath } : {}),
  };

  const log = await git.log(options);

  return log.all.map((commit) => ({
    hash: commit.hash,
    message: commit.message,
    author: commit.author_name,
    date: new Date(commit.date),
    files: [], // Would need separate call to get file list
  }));
}

/**
 * Get diff for a specific commit or between commits
 */
export async function getDiff(
  repoId: string,
  commitOrBranch: string,
  compareWith?: string
): Promise<string> {
  const repo = repositoryStore.get(repoId);
  if (!repo) {
    throw new Error(`Repository ${repoId} not found`);
  }

  const git = simpleGit(repo.localPath);

  if (compareWith) {
    // First, ensure we have all remote branches available
    try {
      // Fetch all branches from origin without updating local branches
      await git.fetch(['origin', '+refs/heads/*:refs/remotes/origin/*']);
    } catch (fetchError) {
      console.error(`Warning: Failed to fetch all branches: ${fetchError}`);
    }

    // Try different reference formats in order of preference
    const refsToTry = [
      compareWith,                    // Local branch
      `origin/${compareWith}`,        // Remote tracking branch
      `refs/remotes/origin/${compareWith}`,  // Full remote ref
    ];

    let lastError: any = null;
    for (const ref of refsToTry) {
      try {
        await git.revparse([ref]);
        // Reference exists, use it for diff
        return await git.diff([ref, commitOrBranch]);
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    // None of the references worked
    throw new Error(
      `Failed to resolve reference '${compareWith}'. ` +
      `Tried: ${refsToTry.join(', ')}. ` +
      `Last error: ${lastError}`
    );
  } else {
    return await git.diff([`${commitOrBranch}~1`, commitOrBranch]);
  }
}

/**
 * Store and retrieve repositories
 */
export function getRepository(repoId: string): Repository | undefined {
  return repositoryStore.get(repoId);
}

export function setRepository(repoId: string, repo: Repository): void {
  repositoryStore.set(repoId, repo);
}

export function listRepositories(): Repository[] {
  return Array.from(repositoryStore.values());
}

export function getIndex(repoId: string): RepositoryIndex | undefined {
  return indexStore.get(repoId);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
