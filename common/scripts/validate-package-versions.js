#!/usr/bin/env node

/**
 * This script validates that all package.json files use strict versioning
 * (no ^ or ~ prefixes) for dependencies.
 * 
 * Usage: node validate-package-versions.js [files...]
 * 
 * Exit codes:
 * - 0: All package.json files use strict versioning
 * - 1: One or more package.json files have non-strict versions
 */

const fs = require('fs');
const path = require('path');

/**
 * Validates if a version string uses strict versioning (no ^ or ~ prefixes)
 */
function isStrictVersion(version) {
  if (!version || typeof version !== 'string') {
    return true; // Skip non-string values
  }
  
  // Allow workspace protocol, file protocol, git urls, etc.
  if (version.startsWith('workspace:') || 
      version.startsWith('file:') || 
      version.startsWith('link:') ||
      version.startsWith('git+') ||
      version.startsWith('http://') ||
      version.startsWith('https://') ||
      version.startsWith('npm:') ||
      version === '*' ||
      version === 'latest') {
    return true;
  }
  
  // Check for ^ or ~ prefixes
  return !version.startsWith('^') && !version.startsWith('~');
}

/**
 * Validates dependencies in a package.json object
 */
function validateDependencies(packageJson, filePath) {
  const errors = [];
  const sections = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies'
  ];
  
  for (const section of sections) {
    if (packageJson[section]) {
      for (const [pkg, version] of Object.entries(packageJson[section])) {
        if (!isStrictVersion(version)) {
          errors.push({
            file: filePath,
            section,
            package: pkg,
            version
          });
        }
      }
    }
  }
  
  return errors;
}

/**
 * Main function to validate package.json files
 */
function main() {
  const args = process.argv.slice(2);
  
  // Filter to only process package.json files
  const packageJsonFiles = args.filter(file => {
    return file.endsWith('package.json') && fs.existsSync(file);
  });
  
  if (packageJsonFiles.length === 0) {
    console.log('No package.json files to validate.');
    process.exit(0);
  }
  
  let allErrors = [];
  
  for (const file of packageJsonFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const packageJson = JSON.parse(content);
      const errors = validateDependencies(packageJson, file);
      allErrors = allErrors.concat(errors);
    } catch (error) {
      console.error(`Error processing ${file}: ${error.message}`);
      process.exit(1);
    }
  }
  
  if (allErrors.length > 0) {
    console.error('\n❌ Found non-strict version declarations:\n');
    
    // Group errors by file
    const errorsByFile = {};
    for (const error of allErrors) {
      if (!errorsByFile[error.file]) {
        errorsByFile[error.file] = [];
      }
      errorsByFile[error.file].push(error);
    }
    
    for (const [file, errors] of Object.entries(errorsByFile)) {
      console.error(`📄 ${file}:`);
      for (const error of errors) {
        console.error(`   - ${error.section}: "${error.package}": "${error.version}"`);
      }
      console.error('');
    }
    
    console.error('⚠️  All dependencies must use strict versioning (without ^ or ~ prefixes).');
    console.error('   Replace versions like "^1.2.3" or "~1.2.3" with "1.2.3".\n');
    
    process.exit(1);
  }
  
  console.log('✅ All package.json files use strict versioning.');
  process.exit(0);
}

main();
