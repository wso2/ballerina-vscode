#!/usr/bin/env node
/**
 * Copies the locally-built Ballerina Language Server distribution jar from
 *   packages/ballerina-language-server/build/ballerina-language-server-<version>.jar
 * into
 *   packages/ballerina-extension/ls/
 *
 * If no local jar is found and --fallback-download is passed, delegate to
 * download-ls.js so a CI/clean build still produces a working vsix.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const fallbackDownload = args.includes('--fallback-download');

const PROJECT_ROOT = path.join(__dirname, '..');
const LS_DEST = path.join(PROJECT_ROOT, 'ls');
const LS_BUILD_DIR = path.join(PROJECT_ROOT, '..', 'ballerina-language-server', 'build');

function findPackJar() {
    if (!fs.existsSync(LS_BUILD_DIR)) return null;
    // The `pack` Gradle task writes to build/ballerina-language-server-<version>.jar
    const candidates = fs.readdirSync(LS_BUILD_DIR)
        .filter((f) => /^ballerina-language-server-.+\.jar$/.test(f))
        .map((f) => path.join(LS_BUILD_DIR, f));
    if (candidates.length === 0) return null;
    // Pick the most recently modified to handle stale jars.
    candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return candidates[0];
}

function clearDest() {
    if (!fs.existsSync(LS_DEST)) return;
    for (const f of fs.readdirSync(LS_DEST)) {
        if (/^ballerina-language-server-.+\.jar$/.test(f)) {
            fs.unlinkSync(path.join(LS_DEST, f));
        }
    }
}

function copyLocal() {
    const jar = findPackJar();
    if (!jar) return false;
    if (!fs.existsSync(LS_DEST)) fs.mkdirSync(LS_DEST, { recursive: true });
    clearDest();
    const dest = path.join(LS_DEST, path.basename(jar));
    fs.copyFileSync(jar, dest);
    console.log(`Copied local LS jar: ${path.relative(PROJECT_ROOT, jar)} -> ls/${path.basename(jar)}`);
    return true;
}

if (copyLocal()) {
    process.exit(0);
}

if (fallbackDownload) {
    console.log('No local LS jar found; falling back to download-ls.js');
    const r = spawnSync(process.execPath, [path.join(__dirname, 'download-ls.js')], { stdio: 'inherit' });
    process.exit(r.status ?? 1);
}

console.error(
    `No locally-built LS jar found in ${path.relative(PROJECT_ROOT, LS_BUILD_DIR)}.\n` +
    `Run \`rush build --to ballerina-language-server\` first, or use the \`provisionLS\` script ` +
    `(which falls back to downloading the released jar).`
);
process.exit(1);
