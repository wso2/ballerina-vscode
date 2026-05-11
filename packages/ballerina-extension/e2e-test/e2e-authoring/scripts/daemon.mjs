#!/usr/bin/env node
/*
 * Demo-skill style Ballerina E2E writer daemon.
 *
 * This intentionally launches VS Code through @wso2/playwright-vscode-tester,
 * matching the committed E2E runner, then exposes a tiny HTTP endpoint that
 * evaluates authoring step JavaScript against that live IDE session.
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import vm from 'vm';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const {
  downloadExtensionFromMarketplace,
  ExtendedPage,
  startVSCode,
  switchToIFrame,
  Form,
} = require('@wso2/playwright-vscode-tester');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const authoringRoot = path.resolve(scriptDir, '..');
const extensionRoot = path.resolve(authoringRoot, '..', '..');
const e2eRoot = path.join(extensionRoot, 'e2e-test');
const resourcesFolder = path.join(e2eRoot, 'test-resources');
const dataFolder = path.join(e2eRoot, 'data');
const newProjectPath = path.join(dataFolder, 'test_project');
const extensionsFolder = path.join(extensionRoot, 'vsix');
const repoRootExtensionsFolder = path.resolve(extensionRoot, '..', '..', '..');
const authoringResourcesFolder = path.join(resourcesFolder, 'authoring');
const extensionsWorkRoot = path.join(authoringResourcesFolder, 'extensions-install');
const marketplaceExtensionsFolder = path.join(extensionsWorkRoot, 'marketplace-cache');
const preExtensionId = 'WSO2.wso2-integrator';
const vscodeVersion = process.env.BI_E2E_VSCODE_VERSION ?? 'latest';
const BI_INTEGRATOR_LABEL = 'WSO2 Integrator';

const sessionName = process.argv[2];
if (!sessionName) {
  console.error('Usage: daemon.mjs <session-name> [workspace-path]');
  process.exit(1);
}
if (!/^[a-zA-Z0-9_-]+$/.test(sessionName)) {
  console.error(`invalid session name: "${sessionName}" (allowed: a-z A-Z 0-9 _ -)`);
  process.exit(1);
}

const requestedWorkspace = process.argv[3] ? path.resolve(process.argv[3]) : dataFolder;
const sessionDir = `/tmp/ballerina-e2e-${sessionName}`;
const portFile = path.join(sessionDir, 'daemon.port');
const pidFile = path.join(sessionDir, 'daemon.pid');
const execScript = path.join(sessionDir, 'exec.sh');
const logPath = path.join(sessionDir, 'daemon.log');

function log(message) {
  fs.appendFileSync(logPath, `[${new Date().toISOString().slice(11, 23)}] ${message}\n`);
}

function isAlive() {
  if (!fs.existsSync(portFile)) return false;
  const existingPort = fs.readFileSync(portFile, 'utf8').trim();
  try {
    execSync(`curl -sf --max-time 2 http://127.0.0.1:${existingPort} --data-binary '"ping"'`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (isAlive()) {
  console.error(`daemon "${sessionName}" already running (session: ${sessionDir})`);
  process.exit(1);
}

fs.rmSync(sessionDir, { recursive: true, force: true });
fs.mkdirSync(sessionDir, { recursive: true });
fs.mkdirSync(authoringResourcesFolder, { recursive: true });

function resetAuthoringDataFolder() {
  fs.rmSync(dataFolder, { recursive: true, force: true });
  fs.mkdirSync(dataFolder, { recursive: true, mode: 0o777 });
}

function resolveBallerinaVsixPath() {
  const candidateFolders = [extensionsFolder, repoRootExtensionsFolder];
  const findFiles = () => candidateFolders.filter((folder) => fs.existsSync(folder)).flatMap((folder) => fs.readdirSync(folder)
    .filter((file) => /^ballerina-.*\.vsix$/i.test(file))
    .filter((file) => !/^ballerina-integrator-/i.test(file))
    .map((file) => ({
      file,
      fullPath: path.join(folder, file),
      mtime: fs.statSync(path.join(folder, file)).mtimeMs,
    })))
    .sort((a, b) => b.mtime - a.mtime);

  let files = findFiles();
  if (files.length === 0) {
    log('No local Ballerina VSIX found; running "rush build -t ballerina"');
    execSync('rush build -t ballerina', {
      cwd: repoRootExtensionsFolder,
      stdio: 'inherit',
      timeout: 60 * 60 * 1000,
    });
    files = findFiles();
  }

  if (files.length === 0) {
    throw new Error(`No local Ballerina VSIX found in: ${candidateFolders.join(', ')} after running "rush build -t ballerina".`);
  }
  return files[0].fullPath;
}

async function prepareExtensionsForLaunch(profileName) {
  fs.mkdirSync(extensionsWorkRoot, { recursive: true });
  fs.mkdirSync(marketplaceExtensionsFolder, { recursive: true });

  await downloadExtensionFromMarketplace(preExtensionId, marketplaceExtensionsFolder, true);

  const launchExtensionsFolder = path.join(extensionsWorkRoot, profileName);
  fs.rmSync(launchExtensionsFolder, { recursive: true, force: true });
  fs.mkdirSync(launchExtensionsFolder, { recursive: true });

  const ballerinaVsix = resolveBallerinaVsixPath();
  fs.copyFileSync(ballerinaVsix, path.join(launchExtensionsFolder, path.basename(ballerinaVsix)));

  const prereqVsix = fs.readdirSync(marketplaceExtensionsFolder)
    .find((file) => /^wso2-integrator-.*\.vsix$/i.test(file));
  if (!prereqVsix) {
    throw new Error(`Prerequisite VSIX for ${preExtensionId} not found in: ${marketplaceExtensionsFolder}`);
  }
  fs.copyFileSync(path.join(marketplaceExtensionsFolder, prereqVsix), path.join(launchExtensionsFolder, prereqVsix));

  return launchExtensionsFolder;
}

async function launchIDE() {
  resetAuthoringDataFolder();
  const profileName = `bi-authoring-${sessionName}-${process.pid}`;
  const launchExtensionsFolder = await prepareExtensionsForLaunch(profileName);
  log(`starting VS Code profile=${profileName} workspace=${requestedWorkspace}`);
  const vscode = await startVSCode(
    resourcesFolder,
    vscodeVersion,
    undefined,
    false,
    launchExtensionsFolder,
    requestedWorkspace,
    profileName
  );
  const firstWindow = await vscode.firstWindow({ timeout: 60000 });
  const extendedPage = new ExtendedPage(firstWindow);
  await firstWindow.waitForLoadState('domcontentloaded').catch(() => {});
  log('VS Code window ready');
  return { vscode, window: firstWindow, extendedPage };
}

const launched = await launchIDE();
const ctx = vm.createContext({
  ...launched,
  console,
  process,
  fs,
  path,
  execSync,
  Form,
  ExtendedPage,
  switchToIFrame,
  BI_INTEGRATOR_LABEL,
  sessionDir,
  extensionRoot,
  e2eRoot,
  dataFolder,
  newProjectPath,
});

function load(file) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  log(`loaded ${path.relative(authoringRoot, file)}`);
}

load(path.join(scriptDir, 'prelude.js'));
const helpersDir = path.join(authoringRoot, 'helpers');
for (const file of fs.readdirSync(helpersDir).sort()) {
  if (file.endsWith('.js')) load(path.join(helpersDir, file));
}
fs.watch(helpersDir, (_, file) => {
  if (!file?.endsWith('.js')) return;
  try {
    load(path.join(helpersDir, file));
  } catch (error) {
    log(`reload error ${file}: ${error.message}`);
  }
});

let tail = Promise.resolve();
http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const preview = body.trim().slice(0, 120).replace(/\n/g, ' ');
    const run = async () => {
      log(`run: ${preview}`);
      ctx.console = { log: (...args) => { if (!res.writableEnded) res.write(args.map(String).join(' ') + '\n'); } };
      const wrapped = `(async()=>{return(${body})})()`;
      let code;
      try {
        new vm.Script(wrapped);
        code = wrapped;
      } catch {
        code = `(async()=>{${body}})()`;
      }
      const result = vm.runInContext(code, ctx);
      if (!(result instanceof Promise)) return result;
      const STEP_TIMEOUT_MS = 600000;
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`step timed out after ${STEP_TIMEOUT_MS}ms`)), STEP_TIMEOUT_MS);
      });
      return Promise.race([result, timeoutPromise]).finally(() => clearTimeout(timer));
    };
    const next = tail.then(run);
    tail = next.then(() => {}, () => {});
    next.then(
      (result) => {
        log(`ok: ${preview}`);
        const out = typeof result === 'string' ? result : JSON.stringify(result) ?? '';
        res.end(out || (result === undefined ? 'ok' : String(result)));
      },
      (error) => {
        log(`err: ${error.message}`);
        res.writeHead(500);
        res.end((error.stack ?? error.message) + '\n');
      }
    );
  });
}).listen(0, '127.0.0.1', function onListen() {
  const { port } = this.address();
  fs.writeFileSync(portFile, String(port));
  fs.writeFileSync(pidFile, String(process.pid));
  fs.writeFileSync(execScript, `#!/bin/bash\nexec curl -s --fail-with-body --max-time \${TIMEOUT:-900} -X POST http://127.0.0.1:${port} --data-binary @-\n`, { mode: 0o755 });
  log(`ready on :${port}`);
  console.error(`ballerina-e2e-writer daemon '${sessionName}' ready: ${execScript}`);
});

process.on('SIGTERM', async () => {
  await launched.vscode.close().catch(() => {});
  process.exit(0);
});
process.on('SIGINT', async () => {
  await launched.vscode.close().catch(() => {});
  process.exit(0);
});
