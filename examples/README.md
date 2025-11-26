# Codebase Intelligence Agent - Examples

This directory contains example implementations showing how to integrate the Codebase Intelligence Agent with various LLM providers.

## Available Examples

### 1. OpenAI Integration (`analyze-with-openai.ts`)

Uses OpenAI's GPT models (GPT-4 Turbo) for codebase analysis.

**Setup:**
```bash
npm install openai
export OPENAI_API_KEY=your-api-key
```

**Usage:**
```bash
npm run build
node dist/examples/analyze-with-openai.js owner/repo "Your query here"
```

**Example:**
```bash
node dist/examples/analyze-with-openai.js facebook/react "How does the reconciliation algorithm work?"
```

### 2. Anthropic Claude Integration (`analyze-with-claude.ts`)

Uses Anthropic's Claude models (Claude 3.5 Sonnet) for codebase analysis.

**Setup:**
```bash
npm install @anthropic-ai/sdk
export ANTHROPIC_API_KEY=your-api-key
```

**Usage:**
```bash
npm run build
node dist/examples/analyze-with-claude.js owner/repo "Your query here"
```

**Example:**
```bash
node dist/examples/analyze-with-claude.js vercel/next "Explain the routing system"
```

## How It Works

Each example follows this flow:

1. **Index Repository**: Clone and index the GitHub repository
2. **Build Context**: Extract relevant files and build context for the LLM
3. **Query AI**: Send the agent prompt, codebase context, and user query to the LLM
4. **Display Results**: Show the AI's analysis with citations and explanations

## Agent Prompt

All examples use the Codebase Intelligence Agent prompt from `../AGENT_PROMPT.md`, which instructs the AI to:

- Analyze code like a senior developer
- Provide specific file and line references
- Explain not just "what" but "why"
- Follow best practices for code review
- Give actionable, concrete suggestions

## Customization

### Adding More Context

You can modify the examples to include more files:

```typescript
// In buildCodebaseContext()
const commonFiles = [
  'README.md',
  'package.json',
  'src/**/*.ts',  // Use glob patterns
  'docs/**/*.md',
];
```

### Smart File Selection

For better results, implement smart file selection based on the query:

```typescript
async function getRelevantFiles(query: string): Promise<string[]> {
  // Use embeddings or keyword matching
  // to find files most relevant to the query

  // Example: If query mentions "authentication"
  // return files with "auth", "login", "session" in name

  return relevantFiles;
}
```

### Using Different Models

**OpenAI:**
```typescript
model: 'gpt-4-turbo-preview'  // Current
model: 'gpt-4'                // Standard GPT-4
model: 'gpt-3.5-turbo'        // Faster, cheaper
```

**Anthropic:**
```typescript
model: 'claude-3-5-sonnet-20241022'  // Current (best)
model: 'claude-3-opus-20240229'      // Most capable
model: 'claude-3-haiku-20240307'     // Fastest, cheapest
```

### Adjusting Response Length

**OpenAI:**
```typescript
max_tokens: 2000  // Adjust as needed
```

**Anthropic:**
```typescript
max_tokens: 4096  // Claude can handle longer responses
```

## Advanced Features to Add

### 1. Semantic Code Search

Use embeddings to find relevant code:

```typescript
import { OpenAIEmbeddings } from '@langchain/openai';

async function semanticSearch(query: string, codeFiles: string[]) {
  const embeddings = new OpenAIEmbeddings();

  // Generate embeddings for query and code files
  // Find most similar files using cosine similarity

  return relevantFiles;
}
```

### 2. Multi-Turn Conversations

Allow follow-up questions:

```typescript
const conversationHistory = [];

conversationHistory.push({
  role: 'user',
  content: 'How does authentication work?'
});

conversationHistory.push({
  role: 'assistant',
  content: aiResponse
});

conversationHistory.push({
  role: 'user',
  content: 'Can you show me the login function?'
});
```

### 3. Code Graph Analysis

Build a dependency graph:

```typescript
interface CodeGraph {
  files: Map<string, FileNode>;
  functions: Map<string, FunctionNode>;
  dependencies: Map<string, string[]>;
}

// Use to answer:
// "What depends on this function?"
// "How do these modules connect?"
```

### 4. Incremental Analysis

Cache analysis results:

```typescript
interface AnalysisCache {
  repositoryId: string;
  query: string;
  response: string;
  timestamp: Date;
}

// Check cache before querying LLM
const cached = getFromCache(repoId, query);
if (cached && !isStale(cached)) {
  return cached.response;
}
```

## Cost Optimization

### Token Usage

Monitor and optimize token usage:

```typescript
// Count tokens before sending
import { encoding_for_model } from 'tiktoken';

const encoding = encoding_for_model('gpt-4');
const tokens = encoding.encode(codebaseContext + query);
console.log(`Estimated tokens: ${tokens.length}`);

// Truncate if needed
if (tokens.length > 6000) {
  codebaseContext = truncateContext(codebaseContext, 6000);
}
```

### Caching Strategies

1. **Cache common queries**: "How is this project structured?"
2. **Cache file contents**: Don't re-read files
3. **Use cheaper models**: For simple queries, use GPT-3.5 or Haiku

### Batching

Process multiple queries in one request:

```typescript
const queries = [
  "How does authentication work?",
  "Where is error handling?",
  "What's the testing strategy?"
];

const batchedQuery = queries
  .map((q, i) => `${i+1}. ${q}`)
  .join('\n');

const response = await queryAI(batchedQuery, context);
```

## Real-World Usage Patterns

### Onboarding New Developers

```typescript
const onboardingQueries = [
  "What is this project about?",
  "How is the code organized?",
  "What are the main features?",
  "How do I get started with development?",
  "What testing tools are used?",
  "How is deployment handled?"
];

for (const query of onboardingQueries) {
  const response = await analyzeWithAI(query);
  console.log(`\n## ${query}\n\n${response}\n`);
}
```

### Code Review Assistant

```typescript
// Review a PR
const diff = await git.diff('main...feature-branch');

const reviewPrompt = `
Review this code change:

${diff}

Check for:
- Bugs and logic errors
- Security vulnerabilities
- Performance issues
- Code style consistency
- Missing tests
`;

const review = await queryAI(reviewPrompt, codebaseContext);
```

### Documentation Generation

```typescript
const docPrompt = `
Generate comprehensive documentation for this codebase including:
- Project overview
- Architecture diagram (in Mermaid syntax)
- API documentation
- Setup instructions
- Common use cases
`;

const docs = await queryAI(docPrompt, codebaseContext);
writeFileSync('GENERATED_DOCS.md', docs);
```

## Testing Your Integration

```bash
# Test with a small repo first
node dist/examples/analyze-with-claude.js e11hzn/done "Explain this project"

# Then try larger repos
node dist/examples/analyze-with-claude.js facebook/react "How does hooks work?"

# Test different query types
node dist/examples/analyze-with-claude.js vercel/next "Find security issues"
node dist/examples/analyze-with-claude.js vercel/next "Explain the routing"
node dist/examples/analyze-with-claude.js vercel/next "What testing strategy is used?"
```

## Troubleshooting

### API Rate Limits

If you hit rate limits:

```typescript
// Add retry logic with exponential backoff
async function queryWithRetry(query: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryAI(query);
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

### Context Too Large

If context exceeds token limits:

```typescript
// Prioritize files
const filesByImportance = sortFilesByImportance(files, query);
const topFiles = filesByImportance.slice(0, 10);

// Or chunk the context
const chunks = chunkContext(codebaseContext, 5000);
for (const chunk of chunks) {
  const partialResponse = await queryAI(query, chunk);
  responses.push(partialResponse);
}
```

## Next Steps

1. **Pick an example** (OpenAI or Claude)
2. **Install dependencies** and set API key
3. **Test with a small repo**
4. **Customize for your needs**
5. **Add advanced features** as needed

See `../USAGE_GUIDE.md` for more information!
