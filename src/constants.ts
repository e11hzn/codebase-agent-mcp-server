// Constants for the Codebase MCP Server

export const SERVER_NAME = "codebase-mcp-server";
export const SERVER_VERSION = "1.0.0";

// Character limits for responses
export const CHARACTER_LIMIT = 50000;
export const FILE_CONTENT_LIMIT = 10000;
export const SEARCH_RESULTS_LIMIT = 50;

// Pagination defaults
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// File patterns
export const CODE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyw",
  ".java", ".kt", ".scala",
  ".go",
  ".rs",
  ".c", ".cpp", ".cc", ".h", ".hpp",
  ".cs",
  ".rb",
  ".php",
  ".swift",
  ".vue", ".svelte",
  ".sql",
  ".sh", ".bash", ".zsh",
  ".yaml", ".yml",
  ".json",
  ".xml",
  ".html", ".css", ".scss", ".sass", ".less",
  ".md", ".mdx",
  ".graphql", ".gql",
  ".proto",
  ".tf", ".tfvars"
];

export const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "__pycache__",
  ".pytest_cache",
  "venv",
  ".venv",
  "env",
  ".env",
  "target",
  "bin",
  "obj",
  ".idea",
  ".vscode",
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.log"
];

// Language detection by extension
export const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".pyw": "python",
  ".java": "java",
  ".kt": "kotlin",
  ".scala": "scala",
  ".go": "go",
  ".rs": "rust",
  ".c": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".swift": "swift",
  ".vue": "vue",
  ".svelte": "svelte",
  ".sql": "sql",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "zsh",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".json": "json",
  ".xml": "xml",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".md": "markdown",
  ".mdx": "mdx",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".proto": "protobuf",
  ".tf": "terraform",
  ".tfvars": "terraform"
};

// Git defaults
export const DEFAULT_BRANCH = "main";
export const CLONE_DEPTH = 0;
export const REPOS_DIRECTORY = "/tmp/mcp-repos";
