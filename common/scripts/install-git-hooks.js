#!/usr/bin/env node

/**
 * This script initializes Husky git hooks after Rush installation.
 * It should be run as part of the postRushInstall event hook.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '../..');
const huskyPath = path.join(repoRoot, 'node_modules', 'husky', 'bin.js');

console.log('Initializing Husky git hooks...');

// Check if husky is installed
if (!fs.existsSync(huskyPath)) {
  console.log('Installing root dependencies first...');
  try {
    execSync('pnpm install --ignore-workspace', {
      cwd: repoRoot,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Failed to install root dependencies:', error.message);
    process.exit(1);
  }
}

// Now initialize husky
try {
  execSync(`node "${huskyPath}" install`, {
    cwd: repoRoot,
    stdio: 'inherit'
  });
  console.log('✅ Husky git hooks initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Husky:', error.message);
  process.exit(1);
}
