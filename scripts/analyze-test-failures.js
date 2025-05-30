#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Get current file's directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TEST_RESULTS_DIR = path.join(process.cwd(), 'test-results');

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  // Find test result directories
  const testDirs = fs.readdirSync(TEST_RESULTS_DIR)
    .filter(name => fs.statSync(path.join(TEST_RESULTS_DIR, name)).isDirectory())
    .filter(name => name.includes('-chromium'));

  for (const testDir of testDirs) {
    const fullPath = path.join(TEST_RESULTS_DIR, testDir);
    
    // Check if this test failed
    const traceFiles = fs.readdirSync(fullPath)
      .filter(file => file.endsWith('.zip'));
    
    if (traceFiles.length === 0) continue; // No trace file means test passed
    
    console.log(`Analyzing failed test: ${testDir}`);
    
    // Collect context from various files
    const contextFiles = {
      'error-context.md': fs.existsSync(path.join(fullPath, 'error-context.md')) 
        ? fs.readFileSync(path.join(fullPath, 'error-context.md'), 'utf8') 
        : '',
      'console-logs.txt': fs.existsSync(path.join(fullPath, 'console-logs.txt'))
        ? fs.readFileSync(path.join(fullPath, 'console-logs.txt'), 'utf8')
        : '',
      'page-errors.txt': fs.existsSync(path.join(fullPath, 'page-errors.txt'))
        ? fs.readFileSync(path.join(fullPath, 'page-errors.txt'), 'utf8')
        : '',
    };
    
    // Get screenshot if available
    const screenshots = fs.readdirSync(fullPath)
      .filter(file => file.endsWith('.png'));
    
    if (screenshots.length > 0) {
      console.log(`Screenshot available at: ${path.join(fullPath, screenshots[0])}`);
    }
    
    // Prepare system prompt for AI analysis
    const systemPrompt = `You are an expert Playwright test debugging assistant. 
Your job is to analyze test failures and provide actionable solutions.
Focus on identifying the root cause and suggesting specific fixes.
Be concise but thorough in your analysis.`;

    // Prepare user prompt with test context
    const userPrompt = `
I'm debugging a Playwright test failure. Here's the context:

## Test Information
Test: ${testDir}

## Error Context
${contextFiles['error-context.md']}

## Console Logs
${contextFiles['console-logs.txt']}

## Page Errors
${contextFiles['page-errors.txt']}

Based on this information, please:
1. Identify the likely cause of the test failure
2. Suggest specific fixes to the test code
3. Recommend any changes to the application code if relevant
4. Provide any additional debugging steps I should take
`;

    console.log('Sending to Claude for analysis...');

    try {
      // Call Anthropic API with Claude 3.5 Sonnet
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 5000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ]
      });
      
      // Extract and display the analysis
      console.log('\n===== CLAUDE ANALYSIS =====\n');
      console.log(response.content[0].text);
      console.log('\n===========================\n');
      
      // Save the analysis to a file
      const analysisPath = path.join(fullPath, 'ai-analysis.md');
      fs.writeFileSync(analysisPath, response.content[0].text);
      console.log(`Analysis saved to: ${analysisPath}`);
    } catch (error) {
      console.error('Error calling Anthropic API:', error.message);
      if (error.status) {
        console.error(`Status: ${error.status}`);
      }
      if (error.error?.type) {
        console.error(`Error type: ${error.error.type}`);
      }
    }
    
    console.log('\nTo analyze this test failure manually:');
    console.log(`- View the HTML report: npx playwright show-report`);
    console.log(`- Check the error context: ${path.join(fullPath, 'error-context.md')}`);
    console.log(`- View the trace: npx playwright show-trace ${path.join(fullPath, traceFiles[0])}`);
  }
}

main().catch(console.error);