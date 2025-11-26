#!/usr/bin/env node

/**
 * Example: Analyze repository with OpenAI integration
 *
 * This demonstrates how to integrate the Codebase Intelligence Agent
 * with OpenAI's GPT models for real AI-powered code analysis.
 *
 * Setup:
 *   1. npm install openai
 *   2. export OPENAI_API_KEY=your-api-key
 *   3. npm run build
 *   4. node dist/examples/analyze-with-openai.js owner/repo "query"
 */

import OpenAI from 'openai';
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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get relevant files from the indexed repository
 */
async function getRelevantFiles(
  repoId: string,
  query: string,
  maxFiles: number = 5
): Promise<string[]> {
  const repo = getRepository(repoId);
  if (!repo) throw new Error('Repository not found');

  // TODO: Implement smart file selection based on query
  // For now, just return common entry points
  const commonFiles = [
    'README.md',
    'package.json',
    'src/index.ts',
    'src/index.js',
    'src/main.ts',
    'src/main.js',
    'src/app.ts',
    'src/app.js',
  ];

  const relevantFiles: string[] = [];

  // Use simple-git or file system to find files
  // This is a simplified version - in production, you'd want
  // to use embeddings or keyword matching to find relevant files

  return relevantFiles.slice(0, maxFiles);
}

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
  files: string[]
): string {
  const repo = getRepository(repoId);
  if (!repo) throw new Error('Repository not found');

  let context = `# Repository: ${repo.owner}/${repo.name} (${repo.branch})\n\n`;
  context += `Total files indexed: ${repo.filesProcessed}\n\n`;

  for (const file of files) {
    const content = readRepoFile(repo.localPath, file);
    if (content) {
      context += `## File: ${file}\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
    }
  }

  return context;
}

/**
 * Query OpenAI with the agent prompt and codebase context
 */
async function queryWithAI(
  query: string,
  codebaseContext: string
): Promise<string> {
  console.log('\n🤖 Querying AI agent...\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    temperature: 0,
    max_tokens: 2000,
    messages: [
      {
        role: 'system',
        content: AGENT_PROMPT,
      },
      {
        role: 'user',
        content: `${codebaseContext}\n\n---\n\nUser Query: ${query}`,
      },
    ],
  });

  return completion.choices[0].message.content || 'No response generated';
}

/**
 * Main analysis function
 */
async function analyzeWithOpenAI(
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

  // Step 2: Get relevant files (simplified - you'd want smarter selection)
  console.log('🔎 Finding relevant files...');
  const relevantFiles = await getRelevantFiles(repoId, query);
  console.log(`Found ${relevantFiles.length} relevant files\n`);

  // Step 3: Build context
  const codebaseContext = buildCodebaseContext(repoId, relevantFiles);

  // Step 4: Query AI
  const response = await queryWithAI(query, codebaseContext);

  // Step 5: Display results
  console.log('═'.repeat(80));
  console.log('\n## AI Analysis\n');
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
    console.error('Usage: node analyze-with-openai.js <owner>/<repo> <query> [branch]');
    console.error('\nExample:');
    console.error('  node analyze-with-openai.js facebook/react "How does reconciliation work?"');
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
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable not set');
    console.error('\nSet it with:');
    console.error('  export OPENAI_API_KEY=your-api-key-here');
    process.exit(1);
  }

  const { owner, repo, branch, query } = parseArgs();

  try {
    await analyzeWithOpenAI(owner, repo, branch, query);
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
