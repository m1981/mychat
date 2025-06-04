import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get project root from current working directory
const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, './src');

// Use aliases from vite.config.ts to identify important directories
const aliasDirectories = [
  '@components',
  '@hooks',
  '@store',
  '@utils',
  '@api',
  '@contexts',
  '@capabilities',
  '@models',
  '@lib'
];

interface FileInfo {
  path: string;
  relativePath: string;
  isLegacy: boolean;
  imports: string[];
  exports: string[];
  patterns: {
    legacy: string[];
    modern: string[];
  };
}

interface DirectoryTree {
  name: string;
  path: string;
  isLegacy: boolean;
  legacyRatio: number;
  children: (DirectoryTree | FileNode)[];
}

interface FileNode {
  name: string;
  path: string;
  isLegacy: boolean;
  isFile: true;
}

// Collect all TypeScript/React files
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (/\.(ts|tsx)$/.test(file) && !file.includes('.test.') && !file.includes('.spec.')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Detect legacy patterns in a file
function detectLegacyPatterns(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const legacyPatterns = [];
  
  // Check for class components
  if (content.includes('extends React.Component') || content.includes('extends Component')) {
    legacyPatterns.push('Class Component');
  }
  
  // Check for lifecycle methods
  if (content.includes('componentDidMount') || 
      content.includes('componentWillUnmount') || 
      content.includes('componentDidUpdate')) {
    legacyPatterns.push('Lifecycle Methods');
  }
  
  // Check for legacy context API
  if (content.includes('React.createContext') && content.includes('Consumer')) {
    legacyPatterns.push('Legacy Context API');
  }
  
  // Check for HOCs
  if (content.includes('withRouter') || content.includes('connect(')) {
    legacyPatterns.push('Higher Order Components');
  }
  
  // Check for legacy state management
  if (content.includes('mapStateToProps') || content.includes('mapDispatchToProps')) {
    legacyPatterns.push('Redux Connect Pattern');
  }
  
  return legacyPatterns;
}

// Detect modern patterns in a file
function detectModernPatterns(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const modernPatterns = [];
  
  // Check for hooks
  if (content.includes('useState') || 
      content.includes('useEffect') || 
      content.includes('useContext')) {
    modernPatterns.push('React Hooks');
  }
  
  // Check for functional components
  if ((content.includes('function') || content.includes('=>')) && 
      content.includes('return') && 
      content.includes('props') && 
      !content.includes('extends')) {
    modernPatterns.push('Functional Component');
  }
  
  // Check for modern state management
  if (content.includes('useStore') || content.includes('create(')) {
    modernPatterns.push('Modern State Management');
  }
  
  return modernPatterns;
}

// Analyze a file and return its info
function analyzeFile(filePath: string): FileInfo {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(projectRoot, filePath);
  
  // Extract imports
  const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+[^;]+|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Extract exports
  const exportRegex = /export\s+(const|let|var|function|class|interface|type|enum|default)\s+([a-zA-Z0-9_$]+)/g;
  const exports: string[] = [];
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[2]);
  }
  
  const legacyPatterns = detectLegacyPatterns(filePath);
  const modernPatterns = detectModernPatterns(filePath);
  
  // Determine if file is legacy based on patterns
  const isLegacy = legacyPatterns.length > 0 && legacyPatterns.length > modernPatterns.length;
  
  return {
    path: filePath,
    relativePath,
    isLegacy,
    imports,
    exports,
    patterns: {
      legacy: legacyPatterns,
      modern: modernPatterns
    }
  };
}

// Build directory tree
function buildDirectoryTree(dir: string, allFiles: FileInfo[]): DirectoryTree {
  const name = path.basename(dir);
  const relativePath = path.relative(projectRoot, dir);
  
  const children: (DirectoryTree | FileNode)[] = [];
  
  // Get subdirectories
  const subdirs = fs.readdirSync(dir)
    .map(file => path.join(dir, file))
    .filter(file => fs.statSync(file).isDirectory());
  
  // Add subdirectory trees
  for (const subdir of subdirs) {
    children.push(buildDirectoryTree(subdir, allFiles));
  }
  
  // Add files in this directory
  const filesInDir = allFiles.filter(file => path.dirname(file.path) === dir);
  for (const file of filesInDir) {
    children.push({
      name: path.basename(file.path),
      path: file.relativePath,
      isLegacy: file.isLegacy,
      isFile: true
    });
  }
  
  // Calculate legacy ratio
  const legacyFiles = children.filter(child => child.isLegacy).length;
  const legacyRatio = children.length > 0 ? legacyFiles / children.length : 0;
  
  return {
    name,
    path: relativePath,
    isLegacy: legacyRatio > 0.5,
    legacyRatio,
    children
  };
}

// Print tree as text
function printTree(node: DirectoryTree | FileNode, indent = '', isLast = true): void {
  const marker = isLast ? '└── ' : '├── ';
  const nodeIndent = indent + marker;
  
  // Add color indicators for legacy status
  const legacyIndicator = node.isLegacy ? '🔴' : '🟢';
  
  if ('isFile' in node) {
    console.log(`${nodeIndent}${legacyIndicator} ${node.name}`);
  } else {
    // For directories, show legacy ratio
    const legacyPercentage = Math.round(node.legacyRatio * 100);
    console.log(`${nodeIndent}${legacyIndicator} ${node.name} (${legacyPercentage}% legacy)`);
    
    // Print children
    const childIndent = indent + (isLast ? '    ' : '│   ');
    
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children.length - 1;
      printTree(child, childIndent, isLastChild);
    });
  }
}

// Print partial tree for a specific directory
function printPartialTree(rootTree: DirectoryTree, targetPath: string): void {
  const parts = targetPath.split('/').filter(Boolean);
  let currentNode: DirectoryTree = rootTree;
  
  // Navigate to the target directory
  for (const part of parts) {
    const child = currentNode.children.find(c => !('isFile' in c) && c.name === part);
    if (!child || 'isFile' in child) {
      console.log(`Directory ${targetPath} not found in the tree`);
      return;
    }
    currentNode = child as DirectoryTree;
  }
  
  // Print the subtree
  console.log(`\n📂 Tree for ${targetPath || 'root'}:\n`);
  printTree(currentNode);
}

// Main function
function analyzeProject() {
  console.log('🔍 Analyzing project structure...');
  
  // Get all TS files
  const allFiles = getAllTsFiles(srcDir);
  console.log(`Found ${allFiles.length} TypeScript files`);
  
  // Analyze each file
  const analyzedFiles = allFiles.map(file => analyzeFile(file));
  
  // Count legacy vs modern files
  const legacyFiles = analyzedFiles.filter(file => file.isLegacy);
  console.log(`\n📊 Project Overview:`);
  console.log(`Total files: ${allFiles.length}`);
  console.log(`Legacy files: ${legacyFiles.length} (${Math.round(legacyFiles.length / allFiles.length * 100)}%)`);
  console.log(`Modern files: ${allFiles.length - legacyFiles.length} (${Math.round((allFiles.length - legacyFiles.length) / allFiles.length * 100)}%)`);
  
  // Build directory tree
  const rootTree = buildDirectoryTree(srcDir, analyzedFiles);
  
  // Print trees for important directories based on vite aliases
  console.log('\n📂 Directory Structure Analysis:');
  
  for (const alias of aliasDirectories) {
    const dirPath = alias.replace('@', '');
    printPartialTree(rootTree, dirPath);
  }
  
  // Print overall tree
  console.log('\n📂 Complete Project Structure:');
  printTree(rootTree);
  
  // Identify potential refactoring targets
  console.log('\n🎯 Top Refactoring Targets:');
  const sortedByLegacy = analyzedFiles
    .filter(file => file.isLegacy)
    .sort((a, b) => b.patterns.legacy.length - a.patterns.legacy.length)
    .slice(0, 10);
  
  sortedByLegacy.forEach((file, index) => {
    console.log(`${index + 1}. ${file.relativePath}`);
    console.log(`   Legacy patterns: ${file.patterns.legacy.join(', ')}`);
  });
}

// Run the analysis
analyzeProject();