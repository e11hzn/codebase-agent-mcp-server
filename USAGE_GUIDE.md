# Codebase Intelligence Agent - Usage Guide

This guide shows you how to use the Codebase Intelligence Agent to analyze GitHub repositories.

## Quick Start

### 1. Build the Project

```bash
cd /Users/haithamzaben/code/e11hzn/codebase-agent-mcp-server
npm install
npm run build
```

### 2. Analyze a Repository

```bash
npm run analyze -- <owner>/<repo> [branch] [query]
```

## Usage Examples

### Example 1: Basic Repository Analysis

Analyze a repository without a specific query:

```bash
npm run analyze -- facebook/react main
```

This will:
1. Clone the React repository
2. Index all code files
3. Show a general overview of the codebase
4. List available analysis actions

### Example 2: Query-Specific Analysis

Ask a specific question about the codebase:

```bash
npm run analyze -- vercel/next main "How does the routing system work?"
```

```bash
npm run analyze -- facebook/react main "Explain the reconciliation algorithm"
```

```bash
npm run analyze -- microsoft/typescript main "Where is type checking implemented?"
```

### Example 3: Default Branch

If you don't specify a branch, it defaults to `main`:

```bash
npm run analyze -- nodejs/node
```

## How It Works

### 1. Repository Indexing

When you run the analysis tool:

1. **Cloning**: The repository is cloned to `/tmp/mcp-repos`
2. **Indexing**: All code files are scanned (respects `.gitignore`)
3. **Processing**: Files are parsed for functions, imports, exports
4. **Caching**: Indexed data is stored in memory for quick access

### 2. Agent Prompt

The tool uses the Codebase Intelligence Agent prompt from `AGENT_PROMPT.md`, which provides:

- Guidelines for analyzing code
- Best practices for code review
- Format for answering questions
- Context on how to use the indexed codebase

### 3. Analysis Output

The tool provides:

- **Indexing Status**: Number of files processed
- **Repository Overview**: Structure and organization
- **Query Response**: Answer to your specific question (if provided)
- **Action Suggestions**: What else you can ask about the codebase

## Advanced Usage

### Integrating with an LLM

The current implementation provides a placeholder for LLM integration. To get actual AI-powered analysis, integrate with an LLM:

#### Option 1: OpenAI Integration

```typescript
import OpenAI from 'openai';
import { readFileSync } from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const agentPrompt = readFileSync('./AGENT_PROMPT.md', 'utf-8');

async function analyzeWithLLM(query: string, codebaseContext: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: agentPrompt },
      { role: 'user', content: `Codebase Context:\n${codebaseContext}\n\nQuery: ${query}` },
    ],
  });

  return completion.choices[0].message.content;
}
```

#### Option 2: Anthropic Claude Integration

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const agentPrompt = readFileSync('./AGENT_PROMPT.md', 'utf-8');

async function analyzeWithClaude(query: string, codebaseContext: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: agentPrompt,
    messages: [
      {
        role: 'user',
        content: `Codebase Context:\n${codebaseContext}\n\nQuery: ${query}`,
      },
    ],
  });

  return message.content[0].text;
}
```

#### Option 3: LangChain Integration

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { readFileSync } from 'fs';

const agentPrompt = readFileSync('./AGENT_PROMPT.md', 'utf-8');

const llm = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0,
});

const prompt = ChatPromptTemplate.fromMessages([
  ['system', agentPrompt],
  ['human', 'Codebase Context:\n{context}\n\nQuery: {query}'],
]);

const chain = prompt.pipe(llm);

async function analyzeWithLangChain(query: string, context: string) {
  const result = await chain.invoke({ query, context });
  return result.content;
}
```

### Getting Codebase Context

To provide context to the LLM, read relevant files from the indexed repository:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import { getRepository } from './services/git.service.js';

function getCodebaseContext(repoId: string, relevantFiles: string[]): string {
  const repo = getRepository(repoId);
  if (!repo) throw new Error('Repository not found');

  let context = '';
  for (const file of relevantFiles) {
    const filePath = join(repo.localPath, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      context += `\n\n## File: ${file}\n\`\`\`\n${content}\n\`\`\`\n`;
    } catch (error) {
      console.error(`Could not read file: ${file}`);
    }
  }

  return context;
}
```

## Common Use Cases

### 1. Understanding Architecture

```bash
npm run analyze -- facebook/react main "Explain the overall architecture and how components relate"
```

### 2. Code Review

```bash
npm run analyze -- yourorg/yourrepo feature-branch "Review the changes and identify potential issues"
```

### 3. Onboarding New Developers

```bash
npm run analyze -- yourorg/yourrepo main "How does user authentication work?"
npm run analyze -- yourorg/yourrepo main "Where is the database schema defined?"
npm run analyze -- yourorg/yourrepo main "What happens when a user submits a form?"
```

### 4. Finding Security Issues

```bash
npm run analyze -- yourorg/yourrepo main "Are there any security vulnerabilities?"
npm run analyze -- yourorg/yourrepo main "Find all SQL queries and check for injection risks"
```

### 5. Performance Analysis

```bash
npm run analyze -- yourorg/yourrepo main "Identify performance bottlenecks"
npm run analyze -- yourorg/yourrepo main "Find expensive database queries"
```

### 6. Dependency Tracking

```bash
npm run analyze -- yourorg/yourrepo main "What depends on the UserService class?"
npm run analyze -- yourorg/yourrepo main "Trace all usages of the database connection"
```

## MCP Server Mode

You can also run this as an MCP server that other applications (like Claude Desktop) can connect to:

### Start the Server

```bash
npm run build
npm start
```

### Configure Claude Desktop

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codebase": {
      "command": "node",
      "args": ["/Users/haithamzaben/code/e11hzn/codebase-agent-mcp-server/dist/index.js"]
    }
  }
}
```

### Using with Claude Desktop

Once configured, Claude will have access to these tools:

- `git_index_repository` - Index a GitHub repository
- `git_search_code` - Search for code patterns
- `git_query_codebase` - Ask questions about the codebase
- `git_get_file_content` - Read specific files
- `git_get_file_tree` - Browse directory structure
- `git_analyze_function` - Analyze specific functions
- `git_review_diff` - Review code changes

Example conversation in Claude Desktop:

```
You: Index the React repository
Claude: [uses git_index_repository tool]

You: How does the useState hook work?
Claude: [uses git_search_code and git_get_file_content to find and read relevant files, then explains]

You: Show me all the test files
Claude: [uses git_get_file_tree to browse the structure]
```

## Tips

1. **Start Broad**: Begin with general questions to understand the codebase structure
2. **Then Go Deep**: Ask specific questions about particular features or functions
3. **Reference Files**: Always ask the agent to cite specific files and line numbers
4. **Follow Up**: Use follow-up questions to dig deeper into interesting areas
5. **Compare Patterns**: Ask to compare similar implementations across the codebase

## Troubleshooting

### Repository Clone Fails

**Problem**: Can't clone private repositories

**Solution**: Private repos require authentication. For now, this tool only supports public GitHub repositories. To support private repos, you'll need to:

1. Generate a GitHub Personal Access Token
2. Use it in the clone URL: `https://<token>@github.com/owner/repo.git`

### Indexing Takes Too Long

**Problem**: Large repositories take a long time to index

**Solution**:
- Use a specific branch with fewer files
- The indexing happens once - subsequent runs use cached data
- Consider adding file pattern filters to skip large binary files

### Out of Memory

**Problem**: TypeScript compilation or indexing runs out of memory

**Solution**:
```bash
npm run build:mem  # Uses increased memory limit
```

## Next Steps

1. **Enhance the tool** by adding LLM integration (see examples above)
2. **Add more analysis features** like dependency graphs, complexity metrics
3. **Create a web UI** for easier interaction
4. **Add support for private repositories** with authentication
5. **Implement caching** to persist indexed data across restarts

## Contributing

To add new features to the analyzer:

1. **Add new tools** in `src/tools/`
2. **Extend git service** in `src/services/git.service.ts`
3. **Update schemas** in `src/schemas/`
4. **Modify agent prompt** in `AGENT_PROMPT.md`

See the main `README.md` for more details on the architecture.
