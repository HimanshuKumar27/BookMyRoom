import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const targetDir = 'js';

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else if (filePath.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

try {
  console.log('Scanning all JS files for syntax correctness...');
  const files = getFilesRecursively(targetDir);
  console.log(`Found ${files.length} JavaScript files.`);
  
  let failed = 0;
  files.forEach(file => {
    // Skip example files if needed, but checking them is fine
    try {
      execSync(`node --check "${file}"`, { stdio: 'ignore' });
      console.log(`✓ ${file} is syntactically correct`);
    } catch (err) {
      console.error(`✗ Syntax error in file: ${file}`);
      failed++;
    }
  });

  if (failed > 0) {
    console.error(`\nCheck completed with ${failed} syntax errors.`);
    process.exit(1);
  } else {
    console.log('\nAll files passed syntax check successfully!');
    process.exit(0);
  }
} catch (error) {
  console.error('Syntax check failed:', error);
  process.exit(1);
}
