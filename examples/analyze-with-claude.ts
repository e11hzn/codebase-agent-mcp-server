#!/usr/bin/env node

/**
 * Example: Analyze repository with Anthropic Claude integration
 *
 * This demonstrates how to integrate the Codebase Intelligence Agent
 * with Anthropic's Claude models for real AI-powered code analysis.
 *
 * Setup:
 *   1. npm install @anthropic-ai/sdk
 *   2. export ANTHROPIC_API_KEY=your-api-key
 *   3. npm run build
 *   4. node dist/examples/analyze-with-claude.js owner/repo "query"
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  generateRepoId,
  cloneRepository,
  indexRepository,
  getRepository,
  setRepository,
} from '../src/services/git.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load agent prompt
const AGENT_PROMPT = readFileSync(
  join(__dirname, '../../AGENT_PROMPT.md'),
  'utf-8'
);

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Read file contents from repository
 */
function readRepoFile(localPath: string, filePath: string): string | null {
  try {
    const fullPath = join(localPath, filePath);
    return readFileSync(fullPath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Build context from repository files
 */
function buildCodebaseContext(
  repoId: string,
  maxFiles: number = 10
): string {
  const repo = getRepository(repoId);
  if (!repo) throw new Error('Repository not found');

  let context = `# Repository: ${repo.owner}/${repo.name} (${repo.branch})\n\n`;
  context += `Total files indexed: ${repo.filesProcessed}\n\n`;

  // Common important files to include
  const commonFiles = [
    'README.md',
    'package.json',
    'tsconfig.json',
    'src/index.ts',
    'src/index.js',
    'src/main.ts',
    'src/app.ts',
    'src/App.tsx',
  ];

  let filesIncluded = 0;
  for (const file of commonFiles) {
    if (filesIncluded >= maxFiles) break;

    const content = readRepoFile(repo.localPath, file);
    if (content) {
      context += `## File: ${file}\n\n\`\`\`\n${content.slice(0, 5000)}\n\`\`\`\n\n`;
      filesIncluded++;
    }
  }

  if (filesIncluded === 0) {
    context += `\n*Note: Could not read common files. Repository has ${repo.filesProcessed} files indexed.*\n`;
  }

  return context;
}

/**
 * Query Claude with the agent prompt and codebase context
 */
async function queryWithClaude(
  query: string,
  codebaseContext: string
): Promise<string> {
  console.log('\n🤖 Querying Claude...\n');

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    temperature: 0,
    system: AGENT_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here is the codebase context:\n\n${codebaseContext}\n\n---\n\nUser Query: ${query}\n\nPlease analyze the codebase and provide a detailed response following the guidelines in your system prompt.`,
      },
    ],
  });

  // Extract text from response
  const textContent = message.content.find(block => block.type === 'text');
  return textContent && 'text' in textContent
    ? textContent.text
    : 'No response generated';
}

/**
 * Main analysis function
 */
async function analyzeWithClaude(
  owner: string,
  repo: string,
  branch: string,
  query: string
): Promise<void> {
  console.log(`\n🔍 Analyzing: ${owner}/${repo} (${branch})`);
  console.log(`📝 Query: "${query}"\n`);

  // Step 1: Index repository
  console.log('📊 Indexing repository...');
  const repoId = generateRepoId('github', owner, repo, branch);

  let repository = getRepository(repoId);
  if (!repository || repository.status !== 'ready') {
    const repoUrl = `https://github.com/${owner}/${repo}.git`;

    repository = {
      id: repoId,
      remote: 'github',
      owner,
      name: repo,
      branch,
      localPath: '',
      status: 'pending',
      filesProcessed: 0,
      totalFiles: 0,
    };
    setRepository(repoId, repository);

    const localPath = await cloneRepository(repoUrl, owner, repo, branch);
    repository.localPath = localPath;
    setRepository(repoId, repository);

    await indexRepository(repoId, localPath);
    repository = getRepository(repoId)!;
  }

  console.log(`✅ Indexed ${repository.filesProcessed} files\n`);

  // Step 2: Build context from key files
  console.log('📚 Building codebase context...');
  const codebaseContext = buildCodebaseContext(repoId, 10);
  console.log('✓ Context prepared\n');

  // Step 3: Query Claude
  const response = await queryWithClaude(query, codebaseContext);

  // Step 4: Display results
  console.log('═'.repeat(80));
  console.log('\n## Claude Analysis\n');
  console.log(response);
  console.log('\n' + '═'.repeat(80));
  console.log('\n✨ Analysis complete!\n');
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  owner: string;
  repo: string;
  branch: string;
  query: string;
} {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node analyze-with-claude.js <owner>/<repo> <query> [branch]');
    console.error('\nExample:');
    console.error('  node analyze-with-claude.js facebook/react "How does reconciliation work?"');
    process.exit(1);
  }

  const [ownerRepo, ...queryParts] = args;
  const [owner, repo] = ownerRepo.split('/');

  if (!owner || !repo) {
    console.error('Error: Repository must be in format "owner/repo"');
    process.exit(1);
  }

  const query = queryParts.join(' ');
  const branch = 'main';

  return { owner, repo, branch, query };
}

/**
 * Main entry point
 */
async function main() {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
    console.error('\nSet it with:');
    console.error('  export ANTHROPIC_API_KEY=your-api-key-here');
    process.exit(1);
  }

  const { owner, repo, branch, query } = parseArgs();

  try {
    await analyzeWithClaude(owner, repo, branch, query);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run
main().catch(console.error);
