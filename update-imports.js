#!/usr/bin/env node

/**
 * Script to update all import statements after file renaming
 * This script reads the rename-mapping.json and updates all imports accordingly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the rename mapping
const mappingPath = path.join(__dirname, 'rename-mapping.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

// Build a map of old paths to new paths
const renameMap = new Map();

// Process all categories in the mapping
Object.values(mapping.rename_mappings).forEach(category => {
  if (Array.isArray(category)) {
    category.forEach(rename => {
      // Remove 'src/' prefix and file extension for matching
      const fromPath = rename.from.replace(/^src\//, '').replace(/\.(tsx?|jsx?)$/, '');
      const toPath = rename.to.replace(/^src\//, '').replace(/\.(tsx?|jsx?)$/, '');
      renameMap.set(fromPath, toPath);
    });
  }
});

console.log('=== Import Update Script ===');
console.log(`Found ${renameMap.size} file renames to process`);
console.log('');

// Function to convert PascalCase path to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

// Build sed commands for each rename
const sedCommands = [];

renameMap.forEach((newPath, oldPath) => {
  // Handle different import patterns:
  // 1. from './OldFile' or from '../OldFile' (relative imports)
  // 2. from '@/OldFile' (alias imports)
  // 3. from 'components/OldFile' (direct imports)

  const oldFileName = path.basename(oldPath);
  const newFileName = path.basename(newPath);
  const oldDir = path.dirname(oldPath);
  const newDir = path.dirname(newPath);

  // Create sed pattern for this rename
  // This will match: from './OldFile', from '../path/OldFile', from '@/path/OldFile'
  if (oldFileName !== newFileName || oldDir !== newDir) {
    sedCommands.push({
      old: oldPath,
      new: newPath,
      oldFile: oldFileName,
      newFile: newFileName
    });
  }
});

console.log('Building find & replace patterns...');
console.log('');

// Create a Node script to do the replacements
const replacements = Array.from(renameMap.entries()).map(([oldPath, newPath]) => {
  return { oldPath, newPath };
});

const scriptContent = `
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const replacements = ${JSON.stringify(replacements, null, 2)};

// Find all TypeScript and JavaScript files
const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
  cwd: '${process.cwd()}',
  absolute: true
});

console.log(\`Processing \${files.length} files...\`);

let totalReplacements = 0;
const filesChanged = new Set();

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let fileChanged = false;

  replacements.forEach(({ oldPath, newPath }) => {
    const oldFile = oldPath.split('/').pop();
    const newFile = newPath.split('/').pop();

    // Pattern 1: Match exact path in imports (handles ./, ../, @/)
    const pattern1 = new RegExp(
      \`(from\\\\s+['"\\\`])(\\\\.\\\\.?/.*/)?\${oldPath.replace(/\\//g, '\\\\/')}(['"\\\`])\`,
      'g'
    );

    // Pattern 2: Match filename only (for when directory is already correct)
    const pattern2 = new RegExp(
      \`(from\\\\s+['"\\\`])(\\\\.\\\\.?/.*/)?\${oldFile}(['"\\\`])\`,
      'g'
    );

    const newContent1 = content.replace(pattern1, (match, before, dir, after) => {
      totalReplacements++;
      fileChanged = true;
      return before + (dir || '') + newPath + after;
    });

    const newContent2 = newContent1.replace(pattern2, (match, before, dir, after) => {
      if (oldFile !== newFile) {
        totalReplacements++;
        fileChanged = true;
        return before + (dir || '') + newFile + after;
      }
      return match;
    });

    content = newContent2;
  });

  if (fileChanged) {
    fs.writeFileSync(file, content, 'utf8');
    filesChanged.add(file);
  }
});

console.log(\`\\nComplete!\`);
console.log(\`Files changed: \${filesChanged.size}\`);
console.log(\`Total replacements: \${totalReplacements}\`);

if (filesChanged.size > 0) {
  console.log('\\nFiles modified:');
  Array.from(filesChanged).forEach(f => {
    console.log(\`  - \${f.replace(process.cwd() + '/', '')}\`);
  });
}
`;

// Write the update script
const updateScriptPath = path.join(__dirname, 'update-imports-worker.js');
fs.writeFileSync(updateScriptPath, scriptContent, 'utf8');

console.log('Update script created at: update-imports-worker.js');
console.log('');
console.log('To run the import updates:');
console.log('  npm install glob  # If not already installed');
console.log('  node update-imports-worker.js');
console.log('');
console.log('Or use your IDE\'s refactoring feature for automatic updates!');
