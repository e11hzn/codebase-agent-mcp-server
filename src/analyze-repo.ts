#!/usr/bin/env node

/**
 * CLI tool to analyze GitHub repositories using the Codebase Intelligence Agent
 *
 * Usage:
 *   npm run analyze -- <owner>/<repo> [branch] [query]
 *
 * Examples:
 *   npm run analyze -- facebook/react main "How does the reconciliation algorithm work?"
 *   npm run analyze -- vercel/next main "Explain the routing system"
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  generateRepoId,
  cloneRepository,
  indexRepository,
  getRepository,
  setRepository,
} from './services/git.service.js';
import type { Repository } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the agent prompt
const AGENT_PROMPT = readFileSync(
  join(__dirname, '../AGENT_PROMPT.md'),
  'utf-8'
);

interface AnalysisResult {
  repository: string;
  branch: string;
  status: 'success' | 'error';
  indexingInfo?: {
    filesProcessed: number;
    totalFiles: number;
    indexedAt?: Date;
  };
  query?: string;
  response?: string;
  error?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  owner: string;
  repo: string;
  branch: string;
  query?: string;
} {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run analyze -- <owner>/<repo> [branch] [query]');
    console.error('\nExamples:');
    console.error('  npm run analyze -- facebook/react');
    console.error('  npm run analyze -- facebook/react main');
    console.error('  npm run analyze -- facebook/react main "How does reconciliation work?"');
    process.exit(1);
  }

  const [ownerRepo, branch = 'main', ...queryParts] = args;
  const [owner, repo] = ownerRepo.split('/');

  if (!owner || !repo) {
    console.error('Error: Repository must be in format "owner/repo"');
    process.exit(1);
  }

  const query = queryParts.length > 0 ? queryParts.join(' ') : undefined;

  return { owner, repo, branch, query };
}

/**
 * Index a repository for analysis
 */
async function indexRepo(
  owner: string,
  repo: string,
  branch: string
): Promise<Repository> {
  console.log(`\n🔍 Indexing repository: ${owner}/${repo} (${branch})\n`);

  const repoId = generateRepoId('github', owner, repo, branch);

  // Check if already indexed
  let repository = getRepository(repoId);
  if (repository && repository.status === 'ready') {
    console.log(`✅ Repository already indexed with ${repository.filesProcessed} files\n`);
    return repository;
  }

  // Clone and index
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

  console.log('📥 Cloning repository...');
  const localPath = await cloneRepository(repoUrl, owner, repo, branch);
  repository.localPath = localPath;
  setRepository(repoId, repository);
  console.log(`✓ Cloned to: ${localPath}`);

  console.log('📊 Indexing files...');
  await indexRepository(repoId, localPath);

  repository = getRepository(repoId)!;

  if (repository.status === 'error') {
    throw new Error(repository.error || 'Unknown indexing error');
  }

  console.log(`✅ Indexed ${repository.filesProcessed} files\n`);
  return repository;
}

/**
 * Perform basic codebase analysis
 */
function analyzeCodebase(repository: Repository): string {
  const { owner, name, branch, filesProcessed, localPath } = repository;

  let analysis = `# Codebase Analysis: ${owner}/${name}\n\n`;
  analysis += `**Branch:** ${branch}\n`;
  analysis += `**Files Indexed:** ${filesProcessed}\n`;
  analysis += `**Local Path:** ${localPath}\n\n`;

  analysis += `## Repository Overview\n\n`;
  analysis += `This repository has been successfully indexed and is ready for analysis.\n`;
  analysis += `You can now query the codebase using natural language questions.\n\n`;

  analysis += `## Available Actions\n\n`;
  analysis += `The Codebase Intelligence Agent can help you:\n\n`;
  analysis += `- **Understand architecture**: "How is the project structured?"\n`;
  analysis += `- **Trace data flow**: "What happens when a user submits a form?"\n`;
  analysis += `- **Find patterns**: "Show me all API endpoint definitions"\n`;
  analysis += `- **Review code**: "Are there any security vulnerabilities?"\n`;
  analysis += `- **Explain features**: "How does authentication work?"\n`;
  analysis += `- **Locate functionality**: "Where is error handling implemented?"\n\n`;

  return analysis;
}

/**
 * Simulate agent query response (placeholder for actual LLM integration)
 */
function simulateQueryResponse(query: string, repository: Repository): string {
  let response = `## Query: "${query}"\n\n`;
  response += `> **Note:** This is a placeholder response. To get actual AI-powered analysis,\n`;
  response += `> integrate this tool with an LLM (OpenAI, Anthropic, etc.) that has access\n`;
  response += `> to the indexed codebase files.\n\n`;

  response += `### How to implement full analysis:\n\n`;
  response += `1. **Load Agent Prompt**: Use the prompt from AGENT_PROMPT.md as system context\n`;
  response += `2. **Provide Codebase Context**: Include relevant files from ${repository.localPath}\n`;
  response += `3. **Pass User Query**: Send the query to the LLM with codebase context\n`;
  response += `4. **Return Analysis**: The agent will provide detailed, context-aware answers\n\n`;

  response += `### Example Integration:\n\n`;
  response += '```typescript\n';
  response += 'import { ChatOpenAI } from "@langchain/openai";\n\n';
  response += 'const llm = new ChatOpenAI({\n';
  response += '  modelName: "gpt-4",\n';
  response += '  temperature: 0,\n';
  response += '});\n\n';
  response += 'const result = await llm.invoke([\n';
  response += '  { role: "system", content: AGENT_PROMPT },\n';
  response += '  { role: "user", content: query },\n';
  response += ']);\n';
  response += '```\n\n';

  return response;
}

/**
 * Main analysis function
 */
async function main(): Promise<void> {
  const { owner, repo, branch, query } = parseArgs();

  const result: AnalysisResult = {
    repository: `${owner}/${repo}`,
    branch,
    status: 'success',
  };

  try {
    // Index the repository
    const repository = await indexRepo(owner, repo, branch);

    result.indexingInfo = {
      filesProcessed: repository.filesProcessed,
      totalFiles: repository.totalFiles,
      indexedAt: repository.indexedAt,
    };

    // Perform analysis
    console.log('═'.repeat(80));

    if (query) {
      // Query-specific analysis
      console.log('\n📝 Processing query...\n');
      const response = simulateQueryResponse(query, repository);
      result.query = query;
      result.response = response;
      console.log(response);
    } else {
      // General analysis
      const analysis = analyzeCodebase(repository);
      result.response = analysis;
      console.log(analysis);
    }

    console.log('═'.repeat(80));
    console.log('\n✨ Analysis complete!\n');

    // Show agent prompt info
    console.log('💡 **Tip:** The Codebase Intelligence Agent prompt has been loaded.');
    console.log('   To see the full prompt, check: AGENT_PROMPT.md\n');

  } catch (error) {
    result.status = 'error';
    result.error = error instanceof Error ? error.message : String(error);

    console.error('\n❌ Error during analysis:');
    console.error(`   ${result.error}\n`);

    if (error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the analysis
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
