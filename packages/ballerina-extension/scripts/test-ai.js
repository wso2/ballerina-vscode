#!/usr/bin/env node

/**
 * AI Test Runner
 * Temporarily removes extension dependencies, runs AI tests, then restores them
 */

const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');
const BACKUP_PATH = path.join(__dirname, '../package.json.backup');

let originalPackageJson = null;

function log(message) {
    console.log(`[AI Test] ${message}`);
}

function backupPackageJson() {
    log('Backing up package.json...');
    originalPackageJson = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    fs.writeFileSync(BACKUP_PATH, originalPackageJson);
}

function removeExtensionDependencies() {
    log('Temporarily removing extension dependencies...');
    const pkg = JSON.parse(originalPackageJson);
    
    // Store original dependencies for reference
    pkg._originalExtensionDependencies = pkg.extensionDependencies || [];
    pkg.extensionDependencies = [];
    
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2));
    log(`Removed ${pkg._originalExtensionDependencies.length} extension dependencies`);
}

function restorePackageJson() {
    if (originalPackageJson) {
        log('Restoring original package.json...');
        fs.writeFileSync(PACKAGE_JSON_PATH, originalPackageJson);
        
        // Clean up backup
        if (fs.existsSync(BACKUP_PATH)) {
            fs.unlinkSync(BACKUP_PATH);
        }
        log('Package.json restored successfully');
    }
}

function runCommand(command, args, env = {}) {
    return new Promise((resolve, reject) => {
        log(`Running: ${command} ${args.join(' ')}`);
        
        const child = spawn(command, args, {
            stdio: 'inherit',
            env: { ...process.env, ...env },
            shell: true
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });
        
        child.on('error', reject);
    });
}

async function runAITests() {
    try {
        // Step 1: Backup and modify package.json
        backupPackageJson();
        removeExtensionDependencies();
        
        // Step 2: Build the extension
        log('Building extension...');
        await runCommand('pnpm', ['run', 'compile'], { AI_TEST_ENV: 'true' });
        
        // Step 3: Compile tests
        log('Compiling tests...');
        await runCommand('pnpm', ['run', 'test-compile'], { AI_TEST_ENV: 'true' });
        
        // Step 4: Run AI tests
        log('Running AI tests...');
        await runCommand('node', ['./out/test/runTest.js', '--grep', '^AI Code Generator Tests Suite'], { AI_TEST_ENV: 'true' });
        
        log('✅ AI tests completed successfully!');
        
    } catch (error) {
        log(`❌ AI tests failed: ${error.message}`);
        process.exit(1);
    } finally {
        // Always restore package.json
        restorePackageJson();
    }
}

// Handle cleanup on process termination
process.on('SIGINT', () => {
    log('Received SIGINT, cleaning up...');
    restorePackageJson();
    process.exit(1);
});

process.on('SIGTERM', () => {
    log('Received SIGTERM, cleaning up...');
    restorePackageJson();
    process.exit(1);
});

// Run the tests
runAITests();