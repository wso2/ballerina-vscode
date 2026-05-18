/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { downloadExtensionFromMarketplace, ExtendedPage, Form, startVSCode, switchToIFrame } from "@wso2/playwright-vscode-tester";
import { test } from '@playwright/test';
import fs, { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getWebview } from './webview';
import { BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, DEFAULT_PROJECT_FOLDER_NAME, DEFAULT_PROJECT_NAME } from './constants';
import { waitForBISidebarTreeView } from './sidebar';

/** Runtime test workspace lives under e2e-test/data (sibling of e2e-playwright-tests). */
const dataFolder = path.join(__dirname, '..', '..', '..', 'data');
/** Template package committed with tests (minimal Ballerina project to copy). */
const emptyProjectPath = path.join(__dirname, '..', '..', 'data', 'empty_project');
export const extensionsFolder = path.join(__dirname, '..', '..', '..', '..', 'vsix');
const vscodeVersion = 'latest';
const baseVsCodeProfileName = process.env.BI_E2E_PROFILE_NAME ?? `bi-test-profile-${process.pid}`;
let vscodeLaunchAttempt = 0;
export const resourcesFolder = path.join(__dirname, '..', '..', '..', 'test-resources');
const extensionsWorkRoot = path.join(resourcesFolder, 'extensions-install');
const marketplaceExtensionsFolder = path.join(extensionsWorkRoot, 'marketplace-cache');
const preExtensionId = 'WSO2.wso2-integrator';
export const newProjectPath = path.join(dataFolder, DEFAULT_PROJECT_FOLDER_NAME);
export let vscode: any;
export let page: ExtendedPage;

const execAsync = promisify(exec);

function getVsCodeProfileName(): string {
    if (process.env.BI_E2E_PROFILE_NAME) {
        return process.env.BI_E2E_PROFILE_NAME;
    }
    vscodeLaunchAttempt += 1;
    return `${baseVsCodeProfileName}-${vscodeLaunchAttempt}`;
}

function resolveBallerinaVsixPath(): string {
    const ballerinaVsixFiles = fs.readdirSync(extensionsFolder)
        .filter((file) => /^ballerina-.*\.vsix$/i.test(file))
        .map((file) => ({
            file,
            fullPath: path.join(extensionsFolder, file),
            mtime: fs.statSync(path.join(extensionsFolder, file)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime);

    if (ballerinaVsixFiles.length === 0) {
        throw new Error(`No ballerina VSIX found in: ${extensionsFolder}`);
    }

    return ballerinaVsixFiles[0].fullPath;
}

async function prepareExtensionsForLaunch(profileName: string): Promise<string> {
    fs.mkdirSync(extensionsWorkRoot, { recursive: true });
    fs.mkdirSync(marketplaceExtensionsFolder, { recursive: true });

    // Ensure marketplace prerequisite VSIX is available locally.
    await downloadExtensionFromMarketplace(preExtensionId, marketplaceExtensionsFolder, true);

    const launchExtensionsFolder = path.join(extensionsWorkRoot, profileName);
    if (fs.existsSync(launchExtensionsFolder)) {
        fs.rmSync(launchExtensionsFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(launchExtensionsFolder, { recursive: true });

    const ballerinaVsix = resolveBallerinaVsixPath();
    fs.copyFileSync(ballerinaVsix, path.join(launchExtensionsFolder, path.basename(ballerinaVsix)));

    const prereqVsix = fs.readdirSync(marketplaceExtensionsFolder)
        .find((file) => /^wso2-integrator-.*\.vsix$/i.test(file));
    if (!prereqVsix) {
        throw new Error(`Prerequisite VSIX for ${preExtensionId} not found in: ${marketplaceExtensionsFolder}`);
    }
    fs.copyFileSync(
        path.join(marketplaceExtensionsFolder, prereqVsix),
        path.join(launchExtensionsFolder, prereqVsix)
    );

    return launchExtensionsFolder;
}

/**
 * Execute bal pull command to download Ballerina packages before project creation
 * This is done to fix "Language server has stopped working due to unresolved modules in your project. Please resolve them to proceed." issue
 * This is a temporary solution until Ballerina 2201.13.0 release
 */
async function executeBallPullCommand(): Promise<void> {
    console.log('Executing bal pull ballerina/task:2.7.0...');
    try {
        const { stdout, stderr } = await execAsync('bal pull ballerina/task:2.7.0');
        console.log('bal pull stdout:', stdout);
        if (stderr) {
            console.warn('bal pull stderr:', stderr);
        }
        console.log('✓ Successfully executed bal pull ballerina/task:2.7.0');
    } catch (error) {
        console.error('Failed to execute bal pull command:', error);
        // Don't throw error - continue with project creation even if bal pull fails
        // This ensures tests don't fail due to network issues or package availability
        console.warn('Continuing with project creation despite bal pull failure...');
    }
}

async function initVSCode() {
    if (vscode && page) {
        await page.executePaletteCommand('Reload Window');
    } else {
        const profileName = getVsCodeProfileName();
        const launchExtensionsFolder = await prepareExtensionsForLaunch(profileName);
        vscode = await startVSCode(
            resourcesFolder,
            vscodeVersion,
            undefined,
            false,
            launchExtensionsFolder,
            newProjectPath,
            profileName
        );
    }
    page = new ExtendedPage(await vscode!.firstWindow({ timeout: 60000 }));
}

async function resumeVSCode() {
    if (vscode && page) {
        await page.executePaletteCommand('Reload Window');
    } else {
        console.log('Starting VSCode');
        const profileName = getVsCodeProfileName();
        const launchExtensionsFolder = await prepareExtensionsForLaunch(profileName);
        vscode = await startVSCode(
            resourcesFolder,
            vscodeVersion,
            undefined,
            false,
            launchExtensionsFolder,
            newProjectPath,
            profileName
        );
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    page = new ExtendedPage(await vscode!.firstWindow({ timeout: 60000 }));
}

function resetTestProjectFromTemplate(): void {
    if (!existsSync(emptyProjectPath)) {
        throw new Error(`Empty project template not found: ${emptyProjectPath}`);
    }

    if (fs.existsSync(newProjectPath)) {
        fs.rmSync(newProjectPath, { recursive: true, force: true });
    }

    fs.cpSync(emptyProjectPath, newProjectPath, { recursive: true, force: true });
}

export async function toggleNotifications(disable: boolean) {
    const notificationStatus = page.page.locator('#status\\.notifications');
    await notificationStatus.waitFor();
    const ariaLabel = await notificationStatus.getAttribute('aria-label');
    if ((ariaLabel !== "Do Not Disturb" && disable) || (ariaLabel === "Do Not Disturb" && !disable)) {
        console.log("Toggling notifications");
        await page.executePaletteCommand("Notifications: Toggle Do Not Disturb Mode");
        console.log("Toggled notifications");
    }
    console.log("Finished");
}

export async function setupBallerinaIntegrator() {
    await waitForBISidebarTreeView(page);
    console.log('BI sidebar tree view is available');
    let webview;
    try {
        webview = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 20000);
    } catch (error) {
        console.log('Failed to get webview on first attempt, retrying...');
        await waitForBISidebarTreeView(page);
        webview = await getWebview(BI_INTEGRATOR_LABEL, page);
    }
    if (!webview) {
        throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
    }
    const txt = webview.locator(`text=${BI_INTEGRATOR_LABEL} for VS`);
    await txt.waitFor({ timeout: 30000 });
    const createNewIntegrationBtn = webview.getByRole('button', { name: 'Create New Integration' });
    try {
        // Check if 'Create New Integration' button exists
        await createNewIntegrationBtn.waitFor({ timeout: 1000 });
        console.log('Found Create New Integration button, clicking it');
        await createNewIntegrationBtn.click({ force: true });
    } catch (error) {
        console.log('Create New Integration button not found, will use Set up Ballerina distribution button');
        const setupButton = webview.getByRole('button', { name: 'Set up Ballerina distribution' });
        await setupButton.waitFor();
        await setupButton.click({ force: true });
        const restartButton = webview.getByRole('button', { name: 'Restart VS Code' });
        await restartButton.waitFor({ timeout: 600000 });
        await resumeVSCode();
        await setupBallerinaIntegrator();
    }
}

export async function createProject(page: ExtendedPage, projectName?: string) {
    console.log('Creating new project');

    // Execute bal pull command before project creation
    await executeBallPullCommand();

    await setupBallerinaIntegrator();
    const webview = await getWebview(BI_INTEGRATOR_LABEL, page);
    if (!webview) {
        throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
    }
    const form = new Form(page.page, BI_INTEGRATOR_LABEL, webview);
    await form.switchToFormView(false, webview);
    await form.fill({
        values: {
            'Integration Name*': {
                type: 'input',
                value: projectName ?? DEFAULT_PROJECT_NAME,
            },
            'Select Path': {
                type: 'directory',
                value: newProjectPath
            }
        }
    });
    await form.submit('Create Integration');
    const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
    if (!artifactWebView) {
        throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
    }
    const integrationName = artifactWebView.locator(`text=${projectName ?? DEFAULT_PROJECT_NAME}`);
    await integrationName.waitFor({ timeout: 200000 });
}

export function initTest(newProject: boolean = true, skipProjectCreation: boolean = true, cleanupAfter?: boolean, projectName?: string) {
    test.beforeAll(async ({ }, testInfo) => {
        console.log(`\n▶️  STARTING TEST: ${testInfo.title} (Attempt ${testInfo.retry + 1})`);
        fs.mkdirSync(dataFolder, { recursive: true });
        if (newProject) {
            resetTestProjectFromTemplate();
        }
        if (!vscode || !page) {
            console.log('  📦 Starting VSCode...');
            await initVSCode();
        } else {
            console.log('  🔄 Reloading VS Code after project reset...');
            await page.executePaletteCommand('Reload Window');
            page = new ExtendedPage(await vscode!.firstWindow({ timeout: 60000 }));
            await page.page.waitForLoadState();
        }
        await toggleNotifications(true);
        if (!skipProjectCreation) {
            await createProject(page, projectName);
        }
        console.log('  ✅ Test environment ready');
    });

    test.afterAll(async ({ }, testInfo) => {
        if (cleanupAfter && fs.existsSync(newProjectPath)) {
            fs.rmSync(newProjectPath, { recursive: true });
        }
        const status = testInfo.status ?? 'skipped';
        const statusEmoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
        console.log(`${statusEmoji} FINISHED TEST: ${testInfo.title} (${status.toUpperCase()}, Attempt ${testInfo.retry + 1})\n`);
    });
}

export function initMigrationTest() {
    test.beforeAll(async ({ }, testInfo) => {
        console.log(`>>> Starting migration tests. Title: ${testInfo.title}, Attempt: ${testInfo.retry + 1}`);
        console.log('Setting up BI extension for migration testing');
        fs.mkdirSync(dataFolder, { recursive: true });
        if (!existsSync(newProjectPath)) {
            resetTestProjectFromTemplate();
            console.log('Starting VSCode');
        } else {
            console.log('Resuming VSCode');
            await resumeVSCode();
            await page.page.waitForLoadState();
            await toggleNotifications(true);
        }
        await initVSCode();
        await page.page.waitForLoadState();
        await toggleNotifications(true);

        // Reload VS Code to apply the language server setting
        await page.executePaletteCommand('Reload Window');
        await page.page.waitForLoadState();
        await page.page.waitForTimeout(5000); // Give VS Code time to fully reload

        // Ensure BI sidebar tree view is available before navigating to Import External Integration
        await waitForBISidebarTreeView(page);
        const webview = await getWebview(BI_INTEGRATOR_LABEL, page);
        if (!webview) {
            throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
        }
        console.log('Migration test runner started');
    });
}
