#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEST_RESULTS_DIR = path.join(process.cwd(), 'test-results');

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

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
    
    // Prepare prompt for AI analysis
    const prompt = `
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

    // Call AI API (simplified example - implement actual API call)
    console.log('Sending to AI for analysis...');
    console.log('Prompt:', prompt);
    
    // In a real implementation, you would call the OpenAI API here
    // For example using the OpenAI Node.js SDK:
    // import OpenAI from 'openai';
    // const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [{ role: "user", content: prompt }],
    // });
    // console.log(response.choices[0].message.content);
    
    console.log('\nTo analyze this test failure manually:');
    console.log(`- View the HTML report: npx playwright show-report`);
    console.log(`- Check the error context: ${path.join(fullPath, 'error-context.md')}`);
    console.log(`- View the trace: npx playwright show-trace ${path.join(fullPath, traceFiles[0])}`);
  }
}

main().catch(console.error);