# Quick Start Guide

## What You Have Now

A working CLI tool that uses the **Codebase Intelligence Agent** prompt to analyze GitHub repositories!

## Installation (One-time setup)

```bash
cd /Users/haithamzaben/code/e11hzn/codebase-agent-mcp-server
npm install
npm run build
```

## Basic Usage

### Analyze Any GitHub Repository

```bash
npm run analyze -- <owner>/<repo> [branch]
```

### Examples

```bash
# Analyze the React repository
npm run analyze -- facebook/react main

# Analyze Next.js
npm run analyze -- vercel/next main

# Analyze your own project
npm run analyze -- e11hzn/done main

# Ask specific questions
npm run analyze -- facebook/react main "How does reconciliation work?"
npm run analyze -- vercel/next main "Explain the routing system"
```

## What Happens

1. **Clones** the repository to `/tmp/mcp-repos/`
2. **Indexes** all code files (respects `.gitignore`)
3. **Analyzes** the codebase structure
4. **Shows** available analysis actions or answers your query

## Sample Output

```
🔍 Indexing repository: e11hzn/done (main)

📥 Cloning repository...
✓ Cloned to: /tmp/mcp-repos/e11hzn/done
📊 Indexing files...
✅ Indexed 67 files

# Codebase Analysis: e11hzn/done

**Branch:** main
**Files Indexed:** 67

## Available Actions

The Codebase Intelligence Agent can help you:
- Understand architecture
- Trace data flow
- Find patterns
- Review code
- Explain features
- Locate functionality
```

## Next Steps

### Option 1: Integrate with an LLM

To get **real AI-powered analysis**, integrate with OpenAI or Anthropic:

```typescript
import OpenAI from 'openai';
import { readFileSync } from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const agentPrompt = readFileSync('./AGENT_PROMPT.md', 'utf-8');

const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: agentPrompt },
    { role: 'user', content: query },
  ],
});
```

### Option 2: Use as MCP Server

Run as an MCP server for Claude Desktop:

```bash
npm start
```

Then add to Claude Desktop config:

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

## Files Created

- `src/analyze-repo.ts` - CLI tool for repository analysis
- `USAGE_GUIDE.md` - Comprehensive usage documentation
- `QUICK_START.md` - This file!
- `AGENT_PROMPT.md` - The Codebase Intelligence Agent system prompt (already existed)

## Common Commands

```bash
# Build the project
npm run build

# Analyze a repo (general overview)
npm run analyze -- owner/repo

# Analyze with a specific question
npm run analyze -- owner/repo main "Your question here"

# Start MCP server
npm start

# Start MCP server on HTTP
TRANSPORT=http PORT=3000 npm start
```

## Tips

1. The first run clones the repo (may take time for large repos)
2. Subsequent runs use cached data (much faster)
3. Use specific questions for better targeted analysis
4. The agent prompt is loaded from `AGENT_PROMPT.md`
5. See `USAGE_GUIDE.md` for advanced usage and LLM integration

## What's the Agent Prompt?

The `AGENT_PROMPT.md` file contains instructions that tell an AI how to:
- Analyze codebases like a senior developer
- Review code with full context
- Answer questions about code structure
- Provide actionable insights
- Follow best practices for code analysis

It's similar to how **Greptile** works - giving AI deep codebase understanding.

## Examples of Questions You Can Ask

- "How is the project structured?"
- "What happens when a user logs in?"
- "Show me all API endpoints"
- "Where is error handling implemented?"
- "How does authentication work?"
- "Are there any security vulnerabilities?"
- "Explain the state management approach"
- "What testing strategy is used?"

## Get Help

- See `USAGE_GUIDE.md` for detailed documentation
- Check `AGENT_PROMPT.md` to understand the agent's capabilities
- Read `README.md` for architecture details

---

**Ready to analyze some code!** 🚀
