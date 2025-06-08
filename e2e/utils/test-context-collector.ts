import fs from 'fs';
import path from 'path';
import { test as base } from '@playwright/test';

// Extend the Playwright test with context collection
export const test = base.extend({
  page: async ({ page }, use) => {
    // Setup context collection
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        const testInfo = test.info();
        const contextDir = path.join('test-results', testInfo.titlePath.join('-'));
        
        if (!fs.existsSync(contextDir)) {
          fs.mkdirSync(contextDir, { recursive: true });
        }
        
        fs.appendFileSync(
          path.join(contextDir, 'console-logs.txt'), 
          `[${msg.type()}] ${msg.text()}\n`
        );
      }
    });
    
    // Capture DOM snapshot on failure
    page.on('pageerror', error => {
      const testInfo = test.info();
      const contextDir = path.join('test-results', testInfo.titlePath.join('-'));
      
      if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
      }
      
      fs.appendFileSync(
        path.join(contextDir, 'page-errors.txt'), 
        `${error.message}\n${error.stack || ''}\n`
      );
    });
    
    await use(page);
  }
});

// Helper to capture additional context
export async function captureTestContext(page, testInfo) {
  const contextDir = path.join('test-results', testInfo.titlePath.join('-'));
  
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  
  // Capture DOM snapshot
  const html = await page.content();
  fs.writeFileSync(path.join(contextDir, 'dom-snapshot.html'), html);
  
  // Capture page state as markdown
  const snapshot = await page.accessibility.snapshot();
  const markdownContent = `
# Page snapshot

\`\`\`yaml
${formatAccessibilityTree(snapshot)}
\`\`\`

# Test source
${testInfo.file}:${testInfo.line}

\`\`\`typescript
${getTestSourceCode(testInfo)}
\`\`\`
`;
  
  fs.writeFileSync(path.join(contextDir, 'error-context.md'), markdownContent);
}

// Helper function to format accessibility tree as YAML
function formatAccessibilityTree(node, indent = 0) {
  if (!node) return '';
  
  let result = '- ' + (node.role || 'element') + (node.name ? ` "${node.name}"` : '') + ':\n';
  
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result += '  '.repeat(indent + 1) + formatAccessibilityTree(child, indent + 1);
    }
  }
  
  return result;
}

// Helper to get test source code
function getTestSourceCode(testInfo) {
  if (!fs.existsSync(testInfo.file)) return '';
  
  const content = fs.readFileSync(testInfo.file, 'utf8');
  const lines = content.split('\n');
  
  // Get 10 lines before and after the test line
  const startLine = Math.max(0, testInfo.line - 10);
  const endLine = Math.min(lines.length, testInfo.line + 10);
  
  return lines.slice(startLine, endLine)
    .map((line, i) => `${startLine + i + 1} | ${line}`)
    .join('\n');
}