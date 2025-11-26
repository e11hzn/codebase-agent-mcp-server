# Codebase MCP Server

A Model Context Protocol (MCP) server that provides AI agents with intelligent codebase understanding capabilities. This server enables LLMs to index, search, and analyze Git repositories, similar to [Greptile](https://greptile.com).

## Features

- **Repository Indexing**: Clone and index Git repositories from GitHub, GitLab, or local paths
- **Code Search**: Search for text patterns across indexed codebases
- **Natural Language Queries**: Query codebases using natural language
- **File Navigation**: Browse directory structures and file contents
- **Function Analysis**: Analyze specific functions and their relationships
- **Git History**: Access commit history and diffs
- **PR Review Support**: Review diffs with full codebase context

## 🚀 Quick Start

**New to this project?** Start here:

1. **[QUICK_START.md](QUICK_START.md)** - Get up and running in 5 minutes
2. **[USAGE_GUIDE.md](USAGE_GUIDE.md)** - Comprehensive usage documentation
3. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Full implementation details
4. **[examples/](examples/)** - LLM integration examples (OpenAI, Claude)

## Installation

```bash
npm install
npm run build
```

## Usage Modes

### 1. CLI Tool (Recommended for Getting Started)

Analyze any GitHub repository directly from the command line:

```bash
# General analysis
npm run analyze -- facebook/react main

# Ask specific questions
npm run analyze -- facebook/react main "How does reconciliation work?"
```

See [QUICK_START.md](QUICK_START.md) for more examples.

### 2. MCP Server (For Claude Desktop Integration)

#### Stdio Transport (Local)

```bash
npm start
```

#### HTTP Transport (Remote/Web)

```bash
TRANSPORT=http PORT=3000 npm start
```

### 3. With LLM Integration (For AI-Powered Analysis)

See [examples/](examples/) for OpenAI and Anthropic Claude integration examples.

## Available Tools

### Repository Management

| Tool | Description |
|------|-------------|
| `git_index_repository` | Index a Git repository for searching and analysis |
| `git_get_repository_status` | Check indexing status of a repository |
| `git_list_repositories` | List all indexed repositories |

### Code Search & Query

| Tool | Description |
|------|-------------|
| `git_query_codebase` | Query the codebase in natural language |
| `git_search_code` | Search for text patterns in code |
| `git_get_file_content` | Retrieve specific file contents |
| `git_get_file_tree` | Get directory structure |
| `git_get_git_history` | Get commit history |
| `git_analyze_function` | Analyze a specific function |
| `git_review_diff` | Review a diff/commit |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TRANSPORT` | Transport type (`stdio` or `http`) | `stdio` |
| `PORT` | HTTP server port | `3000` |

### Claude Desktop Configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "codebase": {
      "command": "node",
      "args": ["/path/to/codebase-mcp-server/dist/index.js"]
    }
  }
}
```

### HTTP Client Configuration

For remote access, configure your MCP client to connect to:

```
http://localhost:3000/mcp
```

## Example Usage

### Index a Repository

```json
{
  "tool": "git_index_repository",
  "arguments": {
    "remote": "github",
    "owner": "facebook",
    "repository": "react",
    "branch": "main"
  }
}
```

### Search for Code

```json
{
  "tool": "git_search_code",
  "arguments": {
    "query": "useState",
    "repositories": [{
      "remote": "github",
      "owner": "facebook",
      "repository": "react",
      "branch": "main"
    }],
    "file_pattern": "\\.tsx?$"
  }
}
```

### Query Codebase

```json
{
  "tool": "git_query_codebase",
  "arguments": {
    "query": "How does the reconciliation algorithm work?",
    "repositories": [{
      "remote": "github",
      "owner": "facebook",
      "repository": "react",
      "branch": "main"
    }]
  }
}
```

## Agent Prompt

See `AGENT_PROMPT.md` for a comprehensive system prompt that instructs AI agents on how to effectively use this MCP server for codebase intelligence tasks.

## Architecture

```
codebase-mcp-server/
├── src/
│   ├── index.ts           # Main entry point
│   ├── types.ts           # TypeScript type definitions
│   ├── constants.ts       # Configuration constants
│   ├── services/
│   │   └── git.service.ts # Git operations and indexing
│   ├── schemas/
│   │   └── index.ts       # Zod validation schemas
│   └── tools/
│       ├── repository.tools.ts  # Repository management tools
│       └── search.tools.ts      # Search and query tools
└── dist/                  # Built JavaScript files
```

## Limitations

- Repositories are stored in `/tmp/mcp-repos` (cleared on restart)
- No persistent storage (repositories need re-indexing after restart)
- Basic keyword search (no semantic/AI-powered search)
- Function extraction is heuristic-based

## Future Enhancements

- Persistent repository storage
- Semantic code search using embeddings
- More sophisticated function relationship mapping
- Support for more version control systems
- Code complexity analysis
- Security vulnerability detection

## License

MIT
