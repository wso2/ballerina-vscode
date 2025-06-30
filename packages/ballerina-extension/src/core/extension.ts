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

import {
    workspace, window, commands, languages, Uri, ConfigurationChangeEvent, extensions, Extension, ExtensionContext,
    IndentAction, OutputChannel, StatusBarItem, StatusBarAlignment, env, TextEditor, ThemeColor,
    ConfigurationTarget, ProgressLocation
} from "vscode";
import {
    INVALID_HOME_MSG, INSTALL_BALLERINA, DOWNLOAD_BALLERINA, MISSING_SERVER_CAPABILITY, ERROR, COMMAND_NOT_FOUND,
    NO_SUCH_FILE, CONFIG_CHANGED, OLD_BALLERINA_VERSION, INVALID_FILE, INVALID_PROJECT,
    OLD_PLUGIN_INSTALLED,
    COOKIE_SETTINGS,
    UPDATE_BALLERINA_VERSION
} from "./messages";
import { join, sep } from 'path';
import { exec, spawnSync } from 'child_process';
import { LanguageClientOptions, State as LS_STATE, RevealOutputChannelOn, ServerOptions } from "vscode-languageclient/node";
import { getServerOptions } from '../utils/server/server';
import { ExtendedLangClient } from './extended-language-client';
import { debug, log, getOutputChannel, outputChannel, isWindows, isSupportedVersion, VERSION, isSupportedSLVersion } from '../utils';
import { AssertionError } from "assert";
import {
    BALLERINA_HOME, ENABLE_ALL_CODELENS, ENABLE_TELEMETRY, ENABLE_SEMANTIC_HIGHLIGHTING, OVERRIDE_BALLERINA_HOME,
    ENABLE_PERFORMANCE_FORECAST, ENABLE_DEBUG_LOG, ENABLE_BALLERINA_LS_DEBUG,
    ENABLE_EXPERIMENTAL_FEATURES, ENABLE_NOTEBOOK_DEBUG, ENABLE_RUN_FAST, ENABLE_INLAY_HINTS, FILE_DOWNLOAD_PATH,
    ENABLE_LIVE_RELOAD,
    ENABLE_AI_SUGGESTIONS,
    ENABLE_SEQUENCE_DIAGRAM_VIEW,
    ENABLE_BACKGROUND_DRIFT_CHECK,
    ENABLE_BALLERINA_INTEGRATOR,
    DEFINE_BALLERINA_INTEGRATOR_SCOPE,
    SHOW_LIBRARY_CONFIG_VARIABLES,
    LANG_SERVER_PATH,
    USE_BALLERINA_CLI_LANG_SERVER
}
    from "./preferences";
import TelemetryReporter from "vscode-extension-telemetry";
import {
    createTelemetryReporter, CMP_EXTENSION_CORE, sendTelemetryEvent, sendTelemetryException,
    TM_EVENT_ERROR_INVALID_BAL_HOME_CONFIGURED, TM_EVENT_EXTENSION_INIT, TM_EVENT_EXTENSION_INI_FAILED,
    TM_EVENT_ERROR_OLD_BAL_HOME_DETECTED,
    getMessageObject
} from "../features/telemetry";
import { BALLERINA_COMMANDS, runCommand } from "../features/project";
import { gitStatusBarItem } from "../features/editor-support/git-status";
import { checkIsPersistModelFile } from "../views/persist-layer-diagram/activator";
import { BallerinaProject, DownloadProgress, onDownloadProgress, SHARED_COMMANDS } from "@wso2/ballerina-core";
import os from "os";
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { RPCLayer } from "../RPCLayer";
import { VisualizerWebview } from "../views/visualizer/webview";

const SWAN_LAKE_REGEX = /(s|S)wan( |-)(l|L)ake/g;

export const EXTENSION_ID = 'wso2.ballerina';
const PREV_EXTENSION_ID = 'ballerina.ballerina';
export enum LANGUAGE {
    BALLERINA = 'ballerina',
    TOML = 'toml'
}

export enum WEBVIEW_TYPE {
    PERFORMANCE_FORECAST,
    SWAGGER,
    BBE,
    CONFIGURABLE
}

export interface ConstructIdentifier {
    filePath: string;
    kind: string;
    startLine: number;
    startColumn: number;
    name: string;
}

export interface Change {
    fileUri: Uri;
    startLine: number;
    startColumn: number;
}

export interface ChoreoSession {
    loginStatus: boolean;
    choreoUser?: string;
    choreoAccessToken?: string;
    choreoCookie?: string;
    choreoRefreshToken?: string;
    choreoLoginTime?: Date;
    tokenExpirationTime?: number;
}

export interface CodeServerContext {
    codeServerEnv: boolean;
    manageChoreoRedirectUri?: string;
    statusBarItem?: gitStatusBarItem;
    infoMessageStatus: {
        messageFirstEdit: boolean;
        sourceControlMessage: boolean;
    };
    telemetryTracker?: TelemetryTracker;
}

interface PerformanceForecastContext {
    infoMessageStatus: {
        signinChoreo: boolean;
    };
    temporaryDisabled?: boolean;
}

export interface WebviewContext {
    isOpen: boolean;
    type?: WEBVIEW_TYPE;
}

const showMessageInstallBallerinaCommand = 'ballerina.showMessageInstallBallerina';
const SDK_PREFIX = 'Ballerina ';
export class BallerinaExtension {
    public telemetryReporter: TelemetryReporter;
    public ballerinaHome: string;
    private ballerinaCmd: string;
    public ballerinaVersion: string;
    public biSupported: boolean;
    public isNPSupported: boolean;
    public extension: Extension<any>;
    private clientOptions: LanguageClientOptions;
    public langClient?: ExtendedLangClient;
    public context?: ExtensionContext;
    public isPersist?: boolean;
    private sdkVersion: StatusBarItem;
    private documentContext: DocumentContext;
    private codeServerContext: CodeServerContext;
    private webviewContext: WebviewContext;
    private perfForecastContext: PerformanceForecastContext;
    private ballerinaConfigPath: string;
    private isOpenedOnce: boolean;
    private ballerinaUserHome: string;
    private ballerinaUserHomeName; string;
    private ballerinaIntegratorVersion: string;
    private ballerinaIntegratorReleaseUrl: string;
    private ballerinaHomeCustomDirName: string;
    private ballerinaInstallationDir: string;
    private updateToolServerUrl: string;
    private ballerinaUpdateToolUserAgent: string;

    constructor() {
        this.ballerinaHome = '';
        this.ballerinaCmd = '';
        this.ballerinaVersion = '';
        this.biSupported = false;
        this.isNPSupported = false;
        this.isPersist = false;
        this.ballerinaUserHomeName = '.ballerina';
        this.ballerinaUserHome = path.join(this.getUserHomeDirectory(), this.ballerinaUserHomeName);
        this.ballerinaIntegratorReleaseUrl = "https://api.github.com/repos/ballerina-platform/ballerina-distribution/releases";
        this.ballerinaHomeCustomDirName = "ballerina-home";
        this.ballerinaInstallationDir = path.join(this.getBallerinaUserHome(), this.ballerinaHomeCustomDirName);

        this.updateToolServerUrl = "https://api.central.ballerina.io/2.0/update-tool";
        if (this.overrideBallerinaHome()) {
            this.updateToolServerUrl = "https://api.staging-central.ballerina.io/2.0/update-tool";
        }
        this.ballerinaUpdateToolUserAgent = this.getUpdateToolUserAgent();
        this.showStatusBarItem();
        // Load the extension
        this.extension = extensions.getExtension(EXTENSION_ID)!;
        this.clientOptions = {
            documentSelector: [{ scheme: 'file', language: LANGUAGE.BALLERINA }, {
                scheme: 'file', language:
                    LANGUAGE.TOML
            }],
            synchronize: { configurationSection: LANGUAGE.BALLERINA },
            outputChannel: getOutputChannel(),
            revealOutputChannelOn: RevealOutputChannelOn.Never,
            initializationOptions: {
                "enableSemanticHighlighting": <string>workspace.getConfiguration().get(ENABLE_SEMANTIC_HIGHLIGHTING),
                "enableBackgroundDriftCheck": <string>workspace.getConfiguration().get(ENABLE_BACKGROUND_DRIFT_CHECK),
                "enableInlayHints": <string>workspace.getConfiguration().get(ENABLE_INLAY_HINTS),
                "supportBalaScheme": "true",
                "supportQuickPick": "true",
                "supportPositionalRenamePopup": "true"
            }
        };

        this.telemetryReporter = createTelemetryReporter(this);
        this.documentContext = new DocumentContext();
        this.codeServerContext = {
            codeServerEnv: this.isCodeServerEnv(),
            manageChoreoRedirectUri: process.env.VSCODE_CHOREO_DEPLOY_URI,
            infoMessageStatus: {
                sourceControlMessage: true,
                messageFirstEdit: true
            }
        };
        if (this.isCodeServerEnv()) {
            commands.executeCommand('workbench.action.closeAllEditors');
            this.showCookieConsentMessage();
            this.getCodeServerContext().telemetryTracker = new TelemetryTracker();
        }
        this.webviewContext = { isOpen: false };
        this.perfForecastContext = {
            infoMessageStatus: {
                signinChoreo: true
            }
        };
        this.ballerinaConfigPath = '';
    }

    setContext(context: ExtensionContext) {
        this.context = context;
    }

    init(_onBeforeInit: Function): Promise<void> {
        if (extensions.getExtension(PREV_EXTENSION_ID)) {
            this.showUninstallOldVersion();
        }
        // Register show logs command.
        const showLogs = commands.registerCommand('ballerina.showLogs', () => {
            outputChannel.show();
        });
        this.context!.subscriptions.push(showLogs);

        commands.registerCommand(showMessageInstallBallerinaCommand, () => {
            this.showMessageInstallBallerina();
        });

        commands.registerCommand('ballerina.setup-ballerina', () => { // Install ballerina from central for new users. This should set the ballerina to system path
            this.installBallerina();
        });

        commands.registerCommand('ballerina.update-ballerina-dev-pack', () => { // Update developer pack from ballerina dev build and set to ballerina-home and enable plugin dev mode
            this.updateBallerinaDeveloperPack(true);
        });

        commands.registerCommand('ballerina.update-ballerina', () => { // Update release pack from ballerina update tool with terminal
            this.updateBallerina();
        });

        commands.registerCommand('ballerina.update-ballerina-visually', () => { // Update release pack from ballerina update tool with webview
            this.updateBallerinaVisually();
        });

        try {
            // Register pre init handlers.
            this.registerPreInitHandlers();

            // Check if ballerina home is set.
            if (this.overrideBallerinaHome()) {
                if (!this.getConfiguredBallerinaHome()) {
                    const message = "Trying to get ballerina version without setting ballerina home.";
                    sendTelemetryEvent(this, TM_EVENT_ERROR_INVALID_BAL_HOME_CONFIGURED, CMP_EXTENSION_CORE, getMessageObject(message));
                    throw new AssertionError({
                        message: message
                    });
                }

                debug("Ballerina home is configured in settings.");
                this.ballerinaHome = this.getConfiguredBallerinaHome();
            }

            // Validate the ballerina version.
            return this.getBallerinaVersion(this.ballerinaHome, this.overrideBallerinaHome()).then(async runtimeVersion => {
                debug("=".repeat(60));
                this.ballerinaVersion = runtimeVersion;
                log(`Plugin version: ${this.getVersion()}`);
                log(`Ballerina version: ${this.ballerinaVersion}`);

                this.biSupported = isSupportedSLVersion(this, 2201123); // Minimum supported version for BI
                this.isNPSupported = isSupportedSLVersion(this, 2201130) && this.enabledExperimentalFeatures(); // Minimum supported requirements for NP
                const { home } = this.autoDetectBallerinaHome();
                this.ballerinaHome = home;
                debug(`Ballerina Home: ${this.ballerinaHome}`);
                debug(`Plugin Dev Mode: ${this.overrideBallerinaHome()}`);
                debug(`Debug Mode: ${this.enableLSDebug()}`);
                debug(`Feature flags - Experimental: ${this.enabledExperimentalFeatures()}, BI: ${this.biSupported}, NP: ${this.isNPSupported}`);

                if (!this.ballerinaVersion.match(SWAN_LAKE_REGEX) || (this.ballerinaVersion.match(SWAN_LAKE_REGEX) &&
                    !isSupportedVersion(ballerinaExtInstance, VERSION.BETA, 3))) {
                    this.showMessageOldBallerina();
                    const message = `Ballerina version ${this.ballerinaVersion} is not supported. 
                        The extension supports Ballerina Swan Lake Beta 3+ versions.`;
                    sendTelemetryEvent(this, TM_EVENT_ERROR_OLD_BAL_HOME_DETECTED, CMP_EXTENSION_CORE, getMessageObject(message));
                    return;
                }

                // if Home is found load Language Server.
                let serverOptions: ServerOptions;
                serverOptions = getServerOptions(this);
                this.langClient = new ExtendedLangClient('ballerina-vscode', 'Ballerina LS Client', serverOptions,
                    this.clientOptions, this, false);

                _onBeforeInit(this.langClient);

                await this.langClient.start();
                debug(`Language Server Started`);

                // Following was put in to handle server startup failures.
                if (this.langClient.state === LS_STATE.Stopped) {
                    const message = "Couldn't establish language server connection.";
                    sendTelemetryEvent(this, TM_EVENT_EXTENSION_INI_FAILED, CMP_EXTENSION_CORE, getMessageObject(message));
                    log(message);
                    this.showPluginActivationError();
                } else if (this.langClient.state === LS_STATE.Running) {
                    await this.langClient?.registerExtendedAPICapabilities();
                    this.updateStatusBar(this.ballerinaVersion);
                    sendTelemetryEvent(this, TM_EVENT_EXTENSION_INIT, CMP_EXTENSION_CORE);
                }

                commands.registerCommand('ballerina.stopLangServer', () => {
                    this.langClient.stop();
                });
                debug("=".repeat(60));
            }, (reason) => {
                sendTelemetryException(this, reason, CMP_EXTENSION_CORE);
                this.showMessageInstallBallerina();
                throw new Error(reason);
            }).catch(e => {
                const msg = `Error when checking ballerina version. ${e.message}`;
                sendTelemetryException(this, e, CMP_EXTENSION_CORE, getMessageObject(msg));
                this.telemetryReporter.dispose();
                throw new Error(msg);
            });
        } catch (ex) {
            let msg = "Error happened.";
            if (ex instanceof Error) {
                msg = "Error while activating plugin. " + (ex.message ? ex.message : ex);
                // If any failure occurs while initializing show an error message
                this.showPluginActivationError();
                sendTelemetryException(this, ex, CMP_EXTENSION_CORE, getMessageObject(msg));
                this.telemetryReporter.dispose();
            }
            return Promise.reject(msg);
        }
    }

    private getUpdateToolUserAgent(): string {
        const platform = os.platform();
        if (platform === 'win32') {
            return "ballerina/2201.11.0 (win-64) Updater/1.4.5";
        } else if (platform === 'linux') {
            return "ballerina/2201.11.0 (linux-64) Updater/1.4.5";
        } else if (platform === 'darwin') {
            if (os.arch() === 'arm64') {
                return "ballerina/2201.11.0 (macos-arm-64) Updater/1.4.5";
            }
            return "ballerina/2201.11.0 (macos-64) Updater/1.4.5";
        }
        return null;
    }

    async getLatestBallerinaVersion(): Promise<string> {
        try {
            const latestDistributionVersionResponse = await this.axiosWithRetry({
                method: 'get',
                url: this.updateToolServerUrl + "/distributions/latest?version=2201.0.0&type=patch",
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const latestDistributionVersion = latestDistributionVersionResponse.data.patch;

            return latestDistributionVersion.toString();
        } catch (error) {
            window.showErrorMessage('Error getting the latest distribution version:', error);
            return null;
        }
    }

    async axiosWithRetry(
        config: AxiosRequestConfig,
        maxRetries: number = 3
    ): Promise<AxiosResponse> {
        let retries = 0;

        while (true) {
            try {
                return await axios(config);
            } catch (error) {
                retries++;

                if (retries > maxRetries) {
                    console.error(`Maximum retries (${maxRetries}) exceeded`);
                    throw error;
                }

                console.log(`Attempt ${retries} failed, retrying...`);

                // Optional: add exponential backoff
                const delay = 1000 * Math.pow(2, retries - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }


    async updateBallerina(restartWindow?: boolean) {
        this.getBallerinaVersion(this.ballerinaHome, false).then(async runtimeVersion => {
            const currentBallerinaVersion = runtimeVersion.split('-')[0];
            console.log('Current Ballerina version:', currentBallerinaVersion);
            const terminal = window.createTerminal('Update Ballerina');
            terminal.show();
            terminal.sendText('bal dist update');
            window.showInformationMessage('Please proceed with the bal command to update the ballerina distribution');
        }, (reason) => {
            console.error('Error getting the ballerina version:', reason.message);
            this.showMessageSetupBallerina(restartWindow);
        });
    }

    async updateBallerinaVisually() {
        commands.executeCommand(SHARED_COMMANDS.OPEN_BI_WELCOME);
        const realPath = this.ballerinaHome ? fs.realpathSync.native(this.ballerinaHome) : "";
        this.executeCommandWithProgress(realPath.includes("ballerina-home") ? 'bal dist update' : 'sudo bal dist update');
    }

    private async executeCommandWithProgress(command: string) {
        // Check if this is a sudo command (for macOS/Linux) or needs admin rights (Windows)
        const isSudoCommand = command.trim().startsWith('sudo');
        window.showInformationMessage(`Executing: ${command}`);
        if (isSudoCommand) {
            if (isWindows()) {
                // Windows: Use PowerShell with "Run as Administrator"
                return this.executeWindowsAdminCommand(command);
            } else {
                const terminal = window.createTerminal('Update Ballerina');
                terminal.show();
                terminal.sendText(command);
                window.showInformationMessage('Please proceed with the sudo command to update the ballerina distribution');
            }
        } else {
            // Regular non-elevated command
            return this.executeRegularCommand(command);
        }
    }

    // Execute a regular (non-admin) command
    private async executeRegularCommand(command: string): Promise<void> {
        let progressStep = 0;

        // Send initial progress notification
        let res: DownloadProgress = {
            message: `Starting execution of command...`,
            percentage: 0,
            success: false,
            step: progressStep
        };
        RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);

        return new Promise((resolve, reject) => {
            // Use exec for regular commands
            const childProcess = exec(command, { maxBuffer: 1024 * 1024 });
            let percentage = 0;
            childProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('Command output:', output);

                progressStep++;

                // Extract version and download percentage if present
                const downloadMatch = output.match(/Downloading\s+(\d+\.\d+\.\d+)\s+(\d+)%/);
                const message = downloadMatch ? `Downloading ${downloadMatch[1]}` : `${output.trim()}`;
                // Use the extracted percentage if available, otherwise calculate based on steps
                percentage = downloadMatch && parseInt(downloadMatch[2], 10);

                res = {
                    message: message,
                    percentage: percentage,
                    success: false,
                    step: progressStep
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            });

            childProcess.stderr.on('data', (data) => {
                const errorOutput = data.toString();
                console.error('Command error:', errorOutput);

                res = {
                    message: `Error: ${errorOutput.trim()}`,
                    percentage: 0,
                    success: false,
                    step: -1
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            });

            childProcess.on('close', (code) => {
                console.log(`Command exited with code ${code}`);

                res = {
                    message: code === 0 ? 'Command completed successfully' : `Command failed with code ${code}`,
                    percentage: 100,
                    success: code === 0,
                    step: code === 0 ? progressStep + 1 : -1
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);

                if (code === 0) {
                    window.showInformationMessage('Command executed successfully');
                    commands.executeCommand('workbench.action.reloadWindow');
                    resolve();
                } else {
                    window.showErrorMessage(`Command failed with exit code ${code}`);
                    reject(new Error(`Command failed with exit code ${code}`));
                }
            });
        });
    }

    // Execute a command with administrator privileges on Windows
    private async executeWindowsAdminCommand(command: string): Promise<void> {
        let progressStep = 0;

        // Remove 'sudo' prefix if present
        const actualCommand = command.replace(/^sudo\s+/, '');

        // Create PowerShell command to run as administrator
        const psCommand = `powershell -Command "Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \"${actualCommand}\"'"`;

        let res: DownloadProgress = {
            message: `Starting a powershell to update ballerina distribution...`,
            percentage: 0,
            success: false,
            step: progressStep
        };
        RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);

        // Show a message to the user that they'll need to respond to the UAC prompt
        window.showInformationMessage('Please confirm the User Account Control (UAC) prompt to run this command with administrator privileges');
        await new Promise((resolve, reject) => {
            try {
                // Execute the PowerShell command
                const childProcess = exec(psCommand, { maxBuffer: 1024 * 1024 });
                childProcess.stderr.on('data', (data) => {
                    const errorOutput = data.toString();
                    console.error('Command error:', errorOutput);
                    // Check for UAC cancellation
                    if (errorOutput.includes('cancelled by the user') || errorOutput.includes('was canceled')) {
                        const errorMessage = `Administrator privileges were denied. Command cannot be executed.`;
                        throw new Error(errorMessage);
                    }
                });
                childProcess.on('close', async (code, signal) => {
                    // Note: with Windows UAC, the actual admin process is detached, so this code
                    // only confirms the elevation request was successful, not the command itself
                    if (code === 0) {
                        // Check the versions
                        const initialVersion = this.ballerinaVersion;
                        // Get the current version
                        const currentVersion = await this.getBallerinaVersion(this.ballerinaHome, this.overrideBallerinaHome());
                        // If version changed or timeout reached, we're done
                        if (currentVersion !== initialVersion) {
                            console.log(`Update completed. Version changed from ${initialVersion} to ${currentVersion}`);
                            res = {
                                message: `Successfully updated to version: ${currentVersion}`,
                                percentage: 0,
                                success: true,
                                step: -1
                            };
                            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                            setTimeout(() => {
                                commands.executeCommand('workbench.action.reloadWindow');
                            }, 2000);
                        }
                    } else {
                        const errorMessage = `Failed to execute command with administrator privileges. Exit code: ${code}`;
                        throw new Error(errorMessage);
                    }
                });
            } catch (error) {
                const err = error instanceof Error ? error.message : String(error);
                const errorMessage = `Error executing admin command: ${err}`;
                console.error(errorMessage, error);
                throw new Error(errorMessage);
            }
        }).catch((error) => {
            console.error('Error executing Windows admin command:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res = {
                message: `${errorMessage}`,
                percentage: 0,
                success: false,
                step: -1
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            window.showErrorMessage(`Error executing admin command: ${errorMessage}`);
        });
    }

    // TODO: This can be removed.
    // Alternative method that uses a temporary script to execute sudo commands
    private async executeSudoCommandWithScript(command: string): Promise<void> {

        // macOS/Linux: Get password for sudo
        const password = await window.showInputBox({
            prompt: 'Enter your sudo password',
            password: true,
            ignoreFocusOut: true
        });

        if (password === undefined) {
            window.showErrorMessage('Password required for sudo command');
            return;
        }

        let progressStep = 0;

        // Send initial progress notification
        let res: DownloadProgress = {
            message: `Starting execution of sudo command...`,
            percentage: 0,
            success: false,
            step: progressStep
        };
        RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);

        return new Promise((resolve, reject) => {
            try {
                // Create a temporary file for the command
                const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-ballerina-'));
                const scriptPath = path.join(tempDir, 'sudo-script.sh');

                // Extract the actual command (remove 'sudo' prefix)
                const actualCommand = command.replace(/^sudo\s+/, '');

                // Create a script file that will be executed with sudo
                fs.writeFileSync(scriptPath, `#!/bin/bash\n${actualCommand}\n`, { mode: 0o755 });

                // Execute the script with sudo and pipe the password
                console.log(`Executing sudo command using script: ${scriptPath}`);

                // Use echo to pass the password to sudo
                const sudoCmd = `echo ${password} | sudo -S ${scriptPath}`;
                const childProcess = exec(sudoCmd);

                childProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    console.log('Command output:', output);

                    progressStep++;
                    const percentage = Math.min(progressStep * 10, 90);

                    res = {
                        message: `Executing: ${output.trim()}`,
                        percentage: percentage,
                        success: false,
                        step: progressStep
                    };
                    RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                });

                childProcess.stderr.on('data', (data) => {
                    const errorOutput = data.toString();
                    console.error('Command error:', errorOutput);

                    // Handle common sudo errors
                    if (errorOutput.includes('is not in the sudoers file') || errorOutput.includes('not allowed to execute')) {
                        res = {
                            message: `Sudo permission error: You don't have sudo privileges for this command`,
                            percentage: 0,
                            success: false,
                            step: -1
                        };
                        RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                        window.showErrorMessage(`Sudo permission error: You don't have privileges for this command`);
                        reject(new Error('Sudo permission error: insufficient privileges'));
                        return;
                    }

                    if (errorOutput.includes('incorrect password') || errorOutput.includes('Sorry, try again')) {
                        res = {
                            message: `Sudo authentication failed: Incorrect password`,
                            percentage: 0,
                            success: false,
                            step: -1
                        };
                        RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                        window.showErrorMessage(`Sudo authentication failed: Incorrect password`);
                        reject(new Error('Sudo authentication failed: Incorrect password'));
                        return;
                    }

                    res = {
                        message: `Error: ${errorOutput.trim()}`,
                        percentage: 0,
                        success: false,
                        step: -1
                    };
                    RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                });

                childProcess.on('close', (code) => {
                    console.log(`Command exited with code ${code}`);

                    // Clean up the temporary files
                    try {
                        fs.unlinkSync(scriptPath);
                        fs.rmdirSync(tempDir);
                    } catch (err) {
                        console.error('Error cleaning up temporary files:', err);
                    }

                    res = {
                        message: code === 0 ? 'Command completed successfully' : `Command failed with code ${code}`,
                        percentage: 100,
                        success: code === 0,
                        step: code === 0 ? progressStep + 1 : -1
                    };
                    RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);

                    if (code === 0) {
                        window.showInformationMessage('Command executed successfully');
                        commands.executeCommand('workbench.action.reloadWindow');
                        resolve();
                    } else {
                        window.showErrorMessage(`Command failed with exit code ${code}`);
                        reject(new Error(`Command failed with exit code ${code}`));
                    }
                });
            } catch (error) {
                console.error('Error executing sudo command with script:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                window.showErrorMessage(`Error executing sudo command: ${errorMessage}`);

                res = {
                    message: `Error executing sudo command: ${errorMessage}`,
                    percentage: 0,
                    success: false,
                    step: -1
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                reject(error);
            }
        });
    }

    // Install ballerina from the central
    private async installBallerina(restartWindow?: boolean) {
        try {
            let continueInstallation = true;
            // Remove the existing Ballerina version
            fs.rmSync(this.ballerinaInstallationDir, { recursive: true, force: true });

            // Download the latest update tool version
            continueInstallation = await this.downloadUpdateTool();

            if (!continueInstallation) {
                return;
            }
            // Get the latest distribution version
            const latestDistributionVersion = await this.getLatestBallerinaVersion();
            if (latestDistributionVersion === null) {
                window.showErrorMessage('Error getting the latest distribution version. Please try again.');
                return;
            }

            // Download the latest distribution zip
            continueInstallation = await this.downloadBallerina(latestDistributionVersion);
            if (!continueInstallation) {
                return;
            }

            let supportedJreVersion;
            try {
                if (this.updateToolServerUrl.includes('staging')) {
                    supportedJreVersion = "jdk-21.0.5+11-jre";
                } else {
                    // Get supported jre version
                    const distributionsResponse = await this.axiosWithRetry({
                        method: 'get',
                        url: this.updateToolServerUrl + "/distributions",
                        headers: {
                            'User-Agent': this.ballerinaUpdateToolUserAgent,
                            'Content-Type': 'application/json'
                        }
                    });
                    const distributions = distributionsResponse.data.list;
                    console.log('Filtered Distributions:', distributions.filter((distribution: any) => distribution.version === latestDistributionVersion));
                    supportedJreVersion = distributions.filter((distribution: any) => distribution.version === latestDistributionVersion)[0].dependencies[0].name;
                }
            } catch (error) {
                console.error('Error fetching Ballerina dependencies:', error);
                window.showErrorMessage('Error fetching Ballerina dependencies (JRE version). Please try again.');
                return;
            }

            if (supportedJreVersion !== undefined) {
                // Download the JRE zip
                continueInstallation = await this.downloadJre(supportedJreVersion);
                if (!continueInstallation) {
                    window.showErrorMessage('Error downloading Ballerina dependencies (JRE). Please try again.');
                    return;
                }

                // Set the Ballerina Home and Command for vscode
                await this.setBallerinaHomeAndCommand();

                // Set the executable permissions
                await this.setExecutablePermissions();

                // Set the Ballerina version
                const filePath = path.join(this.ballerinaInstallationDir, 'distributions', 'ballerina-version');
                fs.writeFileSync(filePath, `ballerina-${latestDistributionVersion}`);
                console.log(`Updated ${filePath} with version: ${latestDistributionVersion}`);

                // Set the Ballerina Home and Command for the user
                this.setBallerinaCommandForUser();

                let res: DownloadProgress = {
                    message: `Success..`,
                    success: true,
                    step: 5 // This is the last step
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                console.log('Ballerina has been installed successfully');
                if (restartWindow) {
                    commands.executeCommand('workbench.action.reloadWindow');
                } else {
                    window.showInformationMessage(`Ballerina has been installed successfully. Please restart the window to apply the changes.`);
                }
            }
        } catch (error) {
            console.error('Error downloading or setting up Ballerina:', error);
            window.showErrorMessage('Error downloading or setting up Ballerina. Please restart the window and try again.');
            throw error;
        }
    }

    private async downloadJre(jreVersion: string) {
        let status = false;
        const encodedJreVersion = jreVersion.replace('+', '%2B');
        const jreDownloadUrl = `${this.updateToolServerUrl}/dependencies/${encodedJreVersion}`;
        const ballerinaDependenciesPath = path.join(this.ballerinaInstallationDir, 'dependencies');
        try {
            // Create destination folder if it doesn't exist
            if (!fs.existsSync(ballerinaDependenciesPath)) {
                fs.mkdirSync(ballerinaDependenciesPath, { recursive: true });
            }

            // Download the artifact and save it to the user home directory
            let response;
            let res: DownloadProgress = {
                downloadedSize: 0,
                message: "Download starting...",
                percentage: 0,
                success: false,
                totalSize: 0,
                step: 4
            };
            try {
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                const sizeMB = 1024 * 1024;
                await window.withProgress(
                    {
                        location: ProgressLocation.Notification,
                        title: `Downloading Ballerina dependencies`,
                        cancellable: false,
                    },
                    async (progress) => {
                        let lastPercentageReported = 0;

                        response = await this.axiosWithRetry({
                            url: jreDownloadUrl,
                            method: 'GET',
                            responseType: 'arraybuffer',
                            headers: {
                                'User-Agent': this.ballerinaUpdateToolUserAgent
                            },
                            onDownloadProgress: (progressEvent) => {
                                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                console.log(`Total Size: ${progressEvent.total / sizeMB}MB`);
                                console.log(`Download progress: ${percentCompleted}%`);

                                if (percentCompleted > lastPercentageReported) {
                                    progress.report({ increment: percentCompleted - lastPercentageReported, message: `${percentCompleted}% of ${Math.round(progressEvent.total / sizeMB)}MB` });
                                    lastPercentageReported = percentCompleted;
                                }

                                // Sizes will be sent as MB
                                res = {
                                    downloadedSize: progressEvent.loaded / sizeMB,
                                    message: "Downloading...",
                                    percentage: percentCompleted,
                                    success: false,
                                    totalSize: progressEvent.total / sizeMB,
                                    step: 4
                                };
                                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                            }
                        });
                        return;
                    }
                );
            } catch (error) {
                // Sizes will be sent as MB
                res = {
                    ...res,
                    message: `Failed: ${error}`,
                    success: false,
                    step: -1 // Error step
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                console.error('Error downloading Ballerina dependencies:', error);
            }
            console.log('response:', response.data);
            const zipFilePath = path.join(ballerinaDependenciesPath, jreVersion + '.zip');
            fs.writeFileSync(zipFilePath, response.data);
            console.log(`Downloaded Ballerina dependencies to ${ballerinaDependenciesPath}`);

            // Setting the Ballerina Home location
            res = {
                ...res,
                message: `Setting the Ballerina dependencies...`,
                success: false,
                step: 4
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            const zip = new AdmZip(zipFilePath);
            zip.extractAllTo(ballerinaDependenciesPath, true);

            // Cleanup: Remove the downloaded zip file
            res = {
                ...res,
                message: `Cleaning up the temporary files...`,
                success: false,
                step: 4
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            fs.rmSync(zipFilePath);
            console.log('Cleanup complete.');
            status = true;
        } catch (error) {
            console.error('Error downloading Ballerina dependencies:', error);
            window.showErrorMessage('Error downloading Ballerina dependencies:', error);
        }
        return status;
    }

    private async downloadBallerina(distributionVersion: string) {
        let status = false;
        const distributionVersionUrl = `${this.updateToolServerUrl}/distributions/${distributionVersion}`;
        const ballerinaDistributionsPath = path.join(this.ballerinaInstallationDir, 'distributions');
        const distributionZipName = `ballerina-${distributionVersion}.zip`;
        try {
            // Create destination folder if it doesn't exist
            if (!fs.existsSync(ballerinaDistributionsPath)) {
                fs.mkdirSync(ballerinaDistributionsPath, { recursive: true });
            }

            // Download the artifact and save it to the user home directory
            let response;
            let res: DownloadProgress = {
                downloadedSize: 0,
                message: "Download starting...",
                percentage: 0,
                success: false,
                totalSize: 0,
                step: 3
            };
            try {
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                const sizeMB = 1024 * 1024;
                await window.withProgress(
                    {
                        location: ProgressLocation.Notification,
                        title: `Downloading Ballerina ${distributionVersion}`,
                        cancellable: false,
                    },
                    async (progress) => {
                        let lastPercentageReported = 0;

                        response = await this.axiosWithRetry({
                            url: distributionVersionUrl,
                            method: 'GET',
                            responseType: 'arraybuffer',
                            headers: {
                                'User-Agent': this.ballerinaUpdateToolUserAgent
                            },
                            onDownloadProgress: (progressEvent) => {
                                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                console.log(`Total Size: ${progressEvent.total / sizeMB}MB`);
                                console.log(`Download progress: ${percentCompleted}%`);

                                if (percentCompleted > lastPercentageReported) {
                                    progress.report({ increment: percentCompleted - lastPercentageReported, message: `${percentCompleted}% of ${Math.round(progressEvent.total / sizeMB)}MB` });
                                    lastPercentageReported = percentCompleted;
                                }

                                // Sizes will be sent as MB
                                res = {
                                    downloadedSize: progressEvent.loaded / sizeMB,
                                    message: "Downloading...",
                                    percentage: percentCompleted,
                                    success: false,
                                    totalSize: progressEvent.total / sizeMB,
                                    step: 3
                                };
                                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                            }
                        });
                        return;
                    }
                );
            } catch (error) {
                // Sizes will be sent as MB
                res = {
                    ...res,
                    message: `Failed: ${error}`,
                    success: false,
                    step: -1 // Error step
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                console.error('Error downloading Ballerina:', error);
            }
            const zipFilePath = path.join(ballerinaDistributionsPath, distributionZipName);
            fs.writeFileSync(zipFilePath, response.data);
            console.log(`Downloaded Ballerina to ${zipFilePath}`);

            // Setting the Ballerina Home location
            res = {
                ...res,
                message: `Setting the Ballerina Home location...`,
                success: false,
                step: 3
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            const zip = new AdmZip(zipFilePath);
            zip.extractAllTo(ballerinaDistributionsPath, true);

            // Cleanup: Remove the downloaded zip file
            res = {
                ...res,
                message: `Cleaning up the temporary files...`,
                success: false,
                step: 3
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            fs.rmSync(zipFilePath);
            console.log('Cleanup complete.');
            status = true;
        } catch (error) {
            console.error('Error downloading Ballerina:', error);
            window.showErrorMessage('Error downloading Ballerina:', error);
        }
        return status;
    }

    private async downloadUpdateTool() {
        let status = false;
        try {
            let res: DownloadProgress = {
                downloadedSize: 0,
                message: "Fetching Ballerina release details..",
                percentage: 0,
                success: false,
                totalSize: 0,
                step: 1
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);

            const latestToolVersionResponse = await this.axiosWithRetry({
                method: 'get',
                url: this.updateToolServerUrl + "/versions/latest",
                headers: {
                    'User-Agent': this.ballerinaUpdateToolUserAgent,
                    'Content-Type': 'application/json'
                }
            });
            const latestToolVersion = latestToolVersionResponse.data.version;
            const latestToolVersionUrl = `${this.updateToolServerUrl}/versions/${latestToolVersion}`;
            const updateToolZipName = `ballerina-command-${latestToolVersion}.zip`;

            // Create destination folder if it doesn't exist
            if (!fs.existsSync(this.getBallerinaUserHome())) {
                fs.mkdirSync(this.getBallerinaUserHome(), { recursive: true });
            }

            // Download the artifact and save it to the user home directory
            let response;
            res = {
                downloadedSize: 0,
                message: "Download starting...",
                percentage: 0,
                success: false,
                totalSize: 0,
                step: 2
            };
            try {
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                const sizeMB = 1024 * 1024;
                await window.withProgress(
                    {
                        location: ProgressLocation.Notification,
                        title: `Downloading Ballerina update tool ${latestToolVersion}`,
                        cancellable: false,
                    },
                    async (progress) => {
                        let lastPercentageReported = 0;

                        response = await this.axiosWithRetry({
                            method: 'GET',
                            url: latestToolVersionUrl,
                            responseType: 'arraybuffer',
                            headers: {
                                'User-Agent': this.ballerinaUpdateToolUserAgent,
                                'Content-Type': 'application/json'
                            },
                            onDownloadProgress: (progressEvent) => {
                                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                console.log(`Total Size: ${progressEvent.total / sizeMB}MB`);
                                console.log(`Download progress: ${percentCompleted}%`);

                                if (percentCompleted > lastPercentageReported) {
                                    progress.report({ increment: percentCompleted - lastPercentageReported, message: `${percentCompleted}% of ${Math.round(progressEvent.total / sizeMB)}MB` });
                                    lastPercentageReported = percentCompleted;
                                }

                                // Sizes will be sent as MB
                                res = {
                                    downloadedSize: progressEvent.loaded / sizeMB,
                                    message: "Downloading...",
                                    percentage: percentCompleted,
                                    success: false,
                                    totalSize: progressEvent.total / sizeMB,
                                    step: 2
                                };
                                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                            }
                        });
                        return;
                    }
                );
            } catch (error) {
                // Sizes will be sent as MB
                res = {
                    ...res,
                    message: `Failed: ${error}`,
                    success: false,
                    step: -1 // Error step
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                console.error('Error downloading Ballerina update tool:', error);
            }
            const zipFilePath = path.join(this.getBallerinaUserHome(), updateToolZipName);
            fs.writeFileSync(zipFilePath, response.data);
            console.log(`Downloaded Ballerina to ${zipFilePath}`);

            // Setting the Ballerina Home location
            res = {
                ...res,
                message: `Setting the Ballerina Home location...`,
                success: false,
                step: 2
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            const zip = new AdmZip(zipFilePath);
            zip.extractAllTo(this.getBallerinaUserHome(), true);
            const tempRootPath = path.join(this.getBallerinaUserHome(), updateToolZipName.replace('.zip', ''));
            fs.renameSync(tempRootPath, this.ballerinaInstallationDir);

            // Cleanup: Remove the downloaded zip file
            res = {
                ...res,
                message: `Cleaning up the temporary files...`,
                success: false,
                step: 2
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            fs.rmSync(zipFilePath);
            console.log('Cleanup complete.');
            status = true;
        } catch (error) {
            console.error('Error downloading Ballerina update tool:', error);
            window.showErrorMessage('Error downloading Ballerina update tool');
        }
        return status;
    }

    private setBallerinaCommandForUser() {
        const binFolderPath = path.join(this.getBallerinaHome(), 'bin');
        // Update the configuration with the new Ballerina Home
        let res: DownloadProgress = {
            message: `Setting the environment variables for user...`,
            success: false,
            step: 5
        };
        RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
        const platform = os.platform();
        if (platform === 'win32') {
            const command = `Set-ItemProperty -Path 'HKCU:\\Environment' -Name 'Path' -Value ([System.Environment]::GetEnvironmentVariable('Path', 'User') + ';${binFolderPath}')`;

            exec(`powershell.exe -Command "${command}"`, (error, stdout, stderr) => {
                if (error) {
                    window.showErrorMessage(`Failed to set command path: ${stderr}`);
                } else {
                    console.log(`Ballerina command path set successfully. You may need to restart your terminal for changes to take effect.`);
                }
            });
        } else if (platform === 'darwin') {
            const zshrcPath = path.join(os.homedir(), '.zshrc');
            const exportCommand = `\nexport PATH="${binFolderPath}:$PATH"\n`;

            fs.appendFile(zshrcPath, exportCommand, (err) => {
                if (err) {
                    window.showErrorMessage(`Failed to update .zshrc: ${err.message}`);
                } else {
                    console.log(`Ballerina command path set successfully. You may need to restart your terminal for changes to take effect.`);
                }
            });
        } else if (platform === 'linux') {
            const bashrcPath = path.join(os.homedir(), '.bashrc');
            const exportCommand = `\nexport PATH="${binFolderPath}:$PATH"\n`;

            fs.appendFile(bashrcPath, exportCommand, (err) => {
                if (err) {
                    window.showErrorMessage(`Failed to update .bashrc: ${err.message}`);
                } else {
                    console.log(`Ballerina command path set successfully. You may need to restart your terminal for changes to take effect.`);
                }
            });
        } else {
            console.log(`Running on ${platform}`);
        }
    }

    async updateBallerinaDeveloperPack(restartWindow?: boolean) {
        try {
            if (this.langClient?.isRunning()) {
                window.showInformationMessage(`Stopping the ballerina language server...`);
                await this.langClient.stop();
                await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for 15 seconds
            }

            window.showInformationMessage(`Updating Ballerina version`);
            // Remove the existing Ballerina version
            fs.rmSync(this.ballerinaInstallationDir, { recursive: true, force: true });

            await this.downloadAndUnzipBallerina(restartWindow);

            await this.setBallerinaHomeAndCommand(true);

            await this.setExecutablePermissions();

            let res: DownloadProgress = {
                message: `Success..`,
                success: true,
                step: 6 // This is the last step
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);

            console.log('Ballerina home has been set successfully.');
            if (restartWindow) {
                commands.executeCommand('workbench.action.reloadWindow');
            } else {
                window.showInformationMessage("Ballerina has been set up successfully");
            }
        } catch (error) {
            console.error('Error downloading or unzipping the Ballerina:', error);
            window.showErrorMessage('Error downloading or unzipping the Ballerina:', error);
        }
    }

    private async downloadAndUnzipBallerina(restartWindow?: boolean) {
        try {
            // Get the latest successful daily build run and artifacts
            let res: DownloadProgress = {
                downloadedSize: 0,
                message: "Fetching Ballerina release details..",
                percentage: 0,
                success: false,
                totalSize: 0,
                step: 1
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            const releasesResponse = await axios.get(this.ballerinaIntegratorReleaseUrl);
            const releases = releasesResponse.data;
            const tags = releases.map((release: any) => release.tag_name).filter((tag: string) => tag.includes("bi-pack"));
            if (tags.length === 0) {
                throw new Error('No Ballerina distribution found in the releases');
            }
            const latestTag = tags[0];
            console.log(`Latest release tag: ${latestTag}`);

            // Get the latest successful daily build run and artifacts
            res = {
                downloadedSize: 0,
                message: "Fetching latest ballerina distribution details..",
                percentage: 0,
                success: false,
                totalSize: 0,
                step: 2
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            const biReleaseResponse = await axios.get(`${this.ballerinaIntegratorReleaseUrl}/tags/${latestTag}`);
            const biRelease = biReleaseResponse.data;
            this.ballerinaIntegratorVersion = biRelease.tag_name.replace('v', '').split('-')[0];
            console.log(`Latest release version: ${this.ballerinaIntegratorVersion}`);

            const platform = os.platform();
            const asset = biRelease.assets.find((asset: any) => {
                if (platform === 'win32') {
                    return asset.name.endsWith('windows.zip');
                } else if (platform === 'linux') {
                    return asset.name.endsWith('linux.zip');
                } else if (platform === 'darwin') {
                    if (os.arch() === 'arm64') {
                        return asset.name.endsWith('macos-arm.zip');
                    } else {
                        return asset.name.endsWith('macos.zip');
                    }
                }
            });
            if (!asset) {
                throw new Error('No artifact found in the release ' + this.ballerinaIntegratorVersion);
            }
            const artifactUrl = asset.browser_download_url;

            // Create destination folder if it doesn't exist
            if (!fs.existsSync(this.getBallerinaUserHome())) {
                fs.mkdirSync(this.getBallerinaUserHome(), { recursive: true });
            }

            // Download the artifact and save it to the user home directory
            console.log(`Downloading artifact from ${artifactUrl}`);
            let response;
            try {
                res = {
                    downloadedSize: 0,
                    message: "Download starting...",
                    percentage: 0,
                    success: false,
                    totalSize: 0,
                    step: 3
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                const sizeMB = 1024 * 1024;
                await window.withProgress(
                    {
                        location: ProgressLocation.Notification,
                        title: `Downloading Ballerina distribution`,
                        cancellable: false,
                    },
                    async (progress) => {
                        let lastPercentageReported = 0;

                        response = await axios({
                            url: artifactUrl,
                            method: 'GET',
                            responseType: 'arraybuffer',
                            onDownloadProgress: (progressEvent) => {
                                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                console.log(`Total Size: ${progressEvent.total / sizeMB}MB`);
                                console.log(`Download progress: ${percentCompleted}%`);

                                if (percentCompleted > lastPercentageReported) {
                                    progress.report({ increment: percentCompleted - lastPercentageReported, message: `${percentCompleted}% of ${Math.round(progressEvent.total / sizeMB)}MB` });
                                    lastPercentageReported = percentCompleted;
                                }

                                // Sizes will be sent as MB
                                res = {
                                    downloadedSize: progressEvent.loaded / sizeMB,
                                    message: "Downloading...",
                                    percentage: percentCompleted,
                                    success: false,
                                    totalSize: progressEvent.total / sizeMB,
                                    step: 2
                                };
                                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                            }
                        });
                        if (restartWindow) {
                            window.showInformationMessage("Download complete. Please wait...");
                        }
                        return;
                    }
                );
                // ... existing code to handle the response ...
            } catch (error) {
                // Sizes will be sent as MB
                res = {
                    ...res,
                    message: `Failed: ${error}`,
                    success: false,
                    step: -1 // Error step
                };
                RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
                console.error('Error downloading artifact:', error);
            }
            const zipFilePath = path.join(this.getBallerinaUserHome(), asset.name);
            await fs.writeFileSync(zipFilePath, response.data);
            console.log(`Downloaded artifact to ${zipFilePath}`);

            if (restartWindow) {
                window.showInformationMessage("Setting the Ballerina distribution Home location...");
            }
            res = {
                ...res,
                message: `Setting the Ballerina distribution Home location...`,
                success: false,
                step: 4
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            // Unzip the artifact
            const zip = new AdmZip(zipFilePath);
            zip.extractAllTo(this.getBallerinaUserHome(), true);
            console.log(`Unzipped artifact to ${this.getBallerinaUserHome()}`);

            // Rename the root folder to the new name
            const tempRootPath = path.join(this.getBallerinaUserHome(), asset.name.replace('.zip', ''));
            fs.renameSync(tempRootPath, this.ballerinaInstallationDir);

            if (restartWindow) {
                window.showInformationMessage("Cleaning up the temp files...");
            }
            res = {
                ...res,
                message: `Cleaning up the temp files...`,
                success: false,
                step: 5
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
            // Cleanup: Remove the downloaded zip file
            fs.rmSync(zipFilePath);

            console.log('Cleanup complete.');
        } catch (error) {
            console.error('Error downloading or unzipping Ballerina version:', error);
            window.showErrorMessage('Error downloading or unzipping Ballerina version:', error);
        }
    }

    private async setBallerinaHomeAndCommand(isDev?: boolean) {
        let exeExtension = "";
        if (isWindows()) {
            exeExtension = ".bat";
        }

        // Set the Ballerina Home and Command
        this.ballerinaHome = this.ballerinaInstallationDir;
        this.ballerinaCmd = join(this.ballerinaHome, "bin") + sep + "bal" + exeExtension;

        // Update the configuration with the new Ballerina Home
        let res: DownloadProgress = {
            message: `Setting the configurable values in vscode...`,
            success: false,
            step: 5
        };
        RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);
        if (isDev) { // Set the vscode configurable values only for dev mode
            workspace.getConfiguration().update(BALLERINA_HOME, this.ballerinaHome, ConfigurationTarget.Global);
            workspace.getConfiguration().update(OVERRIDE_BALLERINA_HOME, true, ConfigurationTarget.Global);
        } else { // Turn off the dev mode when using prod installation
            workspace.getConfiguration().update(OVERRIDE_BALLERINA_HOME, false, ConfigurationTarget.Global);
        }
    }

    private async setExecutablePermissions() {
        try {
            let res: DownloadProgress = {
                message: `Setting the Ballerina distribution permissions...`,
                success: false,
                step: 5
            };
            RPCLayer._messenger.sendNotification(onDownloadProgress, { type: 'webview', webviewType: VisualizerWebview.viewType }, res);

            // Set permissions for the ballerina command
            await fs.promises.chmod(this.getBallerinaCmd(), 0o755);

            // Set permissions for lib
            await this.setPermissionsForDirectory(path.join(this.getBallerinaHome(), 'lib'), 0o755);

            // Set permissions for all files in the distributions
            await this.setPermissionsForDirectory(path.join(this.getBallerinaHome(), 'distributions'), 0o755);

            // Set permissions for all files in the dependencies
            await this.setPermissionsForDirectory(path.join(this.getBallerinaHome(), 'dependencies'), 0o755);

            console.log('Command files are now executable.');
        } catch (error) {
            console.error('Failed to set executable permissions:', error);
        }
    }

    private async setPermissionsForDirectory(directory: string, permissions: number) {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            const fullPath = path.join(directory, file);
            if (fs.statSync(fullPath).isDirectory()) {
                await this.setPermissionsForDirectory(fullPath, permissions);
            } else {
                await fs.promises.chmod(fullPath, permissions);
            }
        }
    }

    private getUserHomeDirectory(): string {
        return os.homedir();
    }

    getBallerinaUserHome(): string {
        return this.ballerinaUserHome;
    }

    showStatusBarItem() {
        this.sdkVersion = window.createStatusBarItem(StatusBarAlignment.Right, 100);
        this.updateStatusBar("Detecting");
        this.sdkVersion.command = "ballerina.showLogs";
        this.sdkVersion.show();

        window.onDidChangeActiveTextEditor((editor) => {
            this.sdkVersion.text = this.sdkVersion.text.replace(SDK_PREFIX, '');
            if (!editor) {
                this.updateStatusBar(this.sdkVersion.text);
                this.sdkVersion.show();
            } else if (editor.document.uri.scheme === 'file' && editor.document.languageId === 'ballerina') {
                this.sdkVersion.show();
            } else {
                this.sdkVersion.hide();
            }
        });
    }

    updateStatusBar(text: string) {
        if (!window.activeTextEditor) {
            this.sdkVersion.text = `${SDK_PREFIX}${text}`;
        } else {
            this.sdkVersion.text = text;
        }
    }

    showPluginActivationError(): any {
        // message to display on Unknown errors.
        // ask to enable debug logs.
        // we can ask the user to report the issue.

        // HACK: Remove this for the Ballerina extension. This should handle with Ballerina setup page.
        // this.updateStatusBar("Error");
        // this.sdkVersion.backgroundColor = new ThemeColor("statusBarItem.errorBackground");
        // window.showErrorMessage(UNKNOWN_ERROR);
    }

    registerPreInitHandlers(): any {
        // We need to restart VSCode if we change plugin configurations.
        workspace.onDidChangeConfiguration((params: ConfigurationChangeEvent) => {
            if (params.affectsConfiguration(BALLERINA_HOME)
                || params.affectsConfiguration(OVERRIDE_BALLERINA_HOME)
                || params.affectsConfiguration(ENABLE_ALL_CODELENS)
                || params.affectsConfiguration(ENABLE_DEBUG_LOG)
                || params.affectsConfiguration(ENABLE_BALLERINA_LS_DEBUG)
                || params.affectsConfiguration(ENABLE_EXPERIMENTAL_FEATURES)
                || params.affectsConfiguration(ENABLE_NOTEBOOK_DEBUG)
                || params.affectsConfiguration(ENABLE_LIVE_RELOAD)
                || params.affectsConfiguration(ENABLE_BALLERINA_INTEGRATOR)
                || params.affectsConfiguration(DEFINE_BALLERINA_INTEGRATOR_SCOPE)
                || params.affectsConfiguration(LANG_SERVER_PATH)
                || params.affectsConfiguration(USE_BALLERINA_CLI_LANG_SERVER)
            ) {
                this.showMsgAndRestart(CONFIG_CHANGED);
            }
        });

        languages.setLanguageConfiguration('ballerina', {
            onEnterRules: [
                {
                    beforeText: new RegExp('^\\s*#'),
                    action: {
                        appendText: '# ',
                        indentAction: IndentAction.None,
                    }
                }
            ]
        });
    }

    showMsgAndRestart(msg: string): void {
        const action = 'Restart Now';
        window.showInformationMessage(msg, action).then((selection) => {
            if (action === selection) {
                commands.executeCommand('workbench.action.reloadWindow');
            }
        });
    }

    async getBallerinaVersion(ballerinaHome: string, overrideBallerinaHome: boolean): Promise<string> {
        // Initialize with fresh environment
        await this.syncEnvironment();

        // if ballerina home is overridden, use ballerina cmd inside distribution
        // otherwise use wrapper command
        if (ballerinaHome) {
            debug(`Ballerina Home: ${ballerinaHome}`);
        }
        let distPath = "";
        if (overrideBallerinaHome) {
            distPath = join(ballerinaHome, "bin") + sep;
        }
        let exeExtension = "";
        if (isWindows()) {
            exeExtension = ".bat";
        }

        let ballerinaExecutor = '';
        return new Promise((resolve, reject) => {
            exec(distPath + 'bal' + exeExtension + ' version', (err, stdout, stderr) => {
                if (stdout) {
                    debug(`bal command stdout: ${stdout}`);
                }
                if (stderr) {
                    debug(`bal command _stderr: ${stderr}`);
                }
                if (err) {
                    debug(`bal command err: ${err}`);
                    reject(err);
                    return;
                }

                if (stdout.length === 0 || stdout.startsWith(ERROR) || stdout.includes(NO_SUCH_FILE) ||
                    stdout.includes(COMMAND_NOT_FOUND)) {
                    reject(stdout);
                    return;
                }

                ballerinaExecutor = 'bal';
                debug(`'bal' executor is picked up by the plugin.`);

                this.ballerinaCmd = (distPath + ballerinaExecutor + exeExtension).trim();
                try {
                    debug(`Ballerina version output: ${stdout}`);
                    const implVersionLine = stdout.split('\n')[0];
                    const replacePrefix = implVersionLine.startsWith("jBallerina")
                        ? /jBallerina /
                        : /Ballerina /;
                    const parsedVersion = implVersionLine.replace(replacePrefix, '').replace(/[\n\t\r]/g, '');
                    return resolve(parsedVersion);
                } catch (error) {
                    if (error instanceof Error) {
                        sendTelemetryException(this, error, CMP_EXTENSION_CORE);
                    }
                    return reject(error);
                }
            });
        });
    }

    showMissingBallerinaErrInStatusBar(): any {
        this.updateStatusBar("Not Found");
        this.sdkVersion.backgroundColor = new ThemeColor("statusBarItem.errorBackground");
        this.sdkVersion.command = showMessageInstallBallerinaCommand;
    }

    showMessageInstallBallerina(): any {
        const download: string = 'Download';
        const viewLogs: string = 'View Logs';
        window.showWarningMessage(INSTALL_BALLERINA, download, viewLogs).then((selection) => {
            if (download === selection) {
                commands.executeCommand('vscode.open', Uri.parse(DOWNLOAD_BALLERINA));
            } else if (viewLogs === selection) {
                const balOutput = ballerinaExtInstance.getOutPutChannel();
                if (balOutput) {
                    balOutput.show();
                }
            }

        });
    }

    showMessageUpdateBallerina(): any {
        const update = 'Update';
        window.showWarningMessage(UPDATE_BALLERINA_VERSION, update).then(selection => {
            if (selection === update) {
                const terminal = window.createTerminal('Update Ballerina');
                terminal.show();
                terminal.sendText('bal dist update');
                window.showInformationMessage('Ballerina update started. Please wait...');
            }
        });
    }

    showMessageSetupBallerina(restartWindow?: boolean): any {
        const installBallerina = 'Install Ballerina';
        window.showWarningMessage(INSTALL_BALLERINA, installBallerina).then(selection => {
            if (selection === installBallerina) {
                this.installBallerina(restartWindow);
            }
        });
    }

    showUninstallOldVersion(): void {
        const action = 'Uninstall';
        window.showErrorMessage(OLD_PLUGIN_INSTALLED, action).then(selection => {
            if (selection === action) {
                runCommand('', 'code', BALLERINA_COMMANDS.OTHER, '--uninstall-extension', PREV_EXTENSION_ID);
            }
        });
    }

    showMessageInvalidBallerinaHome(): void {
        const action = 'Open Settings';
        window.showWarningMessage(INVALID_HOME_MSG, action).then((selection) => {
            if (action === selection) {
                commands.executeCommand('workbench.action.openGlobalSettings');
            }
        });
    }

    showMessageOldBallerina(): any {
        const download: string = 'Download';
        window.showWarningMessage(OLD_BALLERINA_VERSION, download).then((selection) => {
            if (download === selection) {
                commands.executeCommand('vscode.open', Uri.parse(DOWNLOAD_BALLERINA));
            }
        });
    }

    showCookieConsentMessage(): any {
        const go: string = 'Go to console';
        window.showInformationMessage(COOKIE_SETTINGS, go).then(async (selection) => {
            const url = process.env.VSCODE_CHOREO_DEPLOY_URI;
            if (go === selection && url) {
                const callbackUri = await env.asExternalUri(Uri.parse(url));
                commands.executeCommand("vscode.open", callbackUri);
            }
        });
    }

    showMessageServerMissingCapability(): any {
        const download: string = 'Download';
        window.showErrorMessage(MISSING_SERVER_CAPABILITY, download).then((selection) => {
            if (download === selection) {
                commands.executeCommand('vscode.open', Uri.parse(DOWNLOAD_BALLERINA));
            }
        });
    }

    showMessageInvalidFile(): any {
        window.showErrorMessage(INVALID_FILE);
    }

    showMessageInvalidProject(): any {
        window.showErrorMessage(INVALID_PROJECT);
    }

    getPersistDiagramStatus(): boolean {
        return this.isPersist;
    }

    /**
     * Get ballerina home path.
     *
     * @returns {string}
     * @memberof BallerinaExtension
     */
    getBallerinaHome(): string {
        return this.ballerinaHome;
    }

    /**
    * Get ballerina executor command.
    *
    * @returns {string}
    * @memberof BallerinaExtension
    */
    getBallerinaCmd(): string {
        return this.ballerinaCmd;
    }

    /**
     * Get ballerina home path configured in preferences.
     *
     * @returns {string}
     * @memberof BallerinaExtension
     */
    getConfiguredBallerinaHome(): string {
        return <string>workspace.getConfiguration().get(BALLERINA_HOME);
    }

    getWebviewContext(): WebviewContext {
        return this.webviewContext;
    }

    setWebviewContext(context: WebviewContext) {
        this.webviewContext = context;
    }

    autoDetectBallerinaHome(): { home: string, isOldBallerinaDist: boolean, isBallerinaNotFound: boolean } {
        let balHomeOutput = "",
            isBallerinaNotFound = false,
            isOldBallerinaDist = false;
        try {
            const args = ['home'];
            let response;
            if (isWindows()) {
                // On Windows, use cmd.exe to run .bat files
                response = spawnSync('cmd.exe', ['/c', this.ballerinaCmd, ...args], { shell: true });
            } else {
                // On other platforms, use spawnSync directly
                response = spawnSync(this.ballerinaCmd, args, { shell: false });
            }
            if (response.stdout.length > 0) {
                balHomeOutput = response.stdout.toString().trim();
            } else if (response.stderr.length > 0) {
                let message = response.stderr.toString();
                // ballerina is installed, but ballerina home command is not found
                isOldBallerinaDist = message.includes("bal: unknown command 'home'");
                // ballerina is not installed
                isBallerinaNotFound = message.includes('command not found')
                    || message.includes('unknown command')
                    || message.includes('is not recognized as an internal or external command');
                log(`Error executing 'bal home'.\n<---- cmd output ---->\n${message}<---- cmd output ---->\n`);
            }

            // specially handle unknown ballerina command scenario for windows
            if (balHomeOutput === "" && isWindows()) {
                isOldBallerinaDist = true;
            }
        } catch (er) {
            if (er instanceof Error) {
                const { message } = er;
                // ballerina is installed, but ballerina home command is not found
                isOldBallerinaDist = message.includes("bal: unknown command 'home'");
                // ballerina is not installed
                isBallerinaNotFound = message.includes('command not found')
                    || message.includes('unknown command')
                    || message.includes('is not recognized as an internal or external command');
                log(`Error executing 'bal home'.\n<---- cmd output ---->\n${message}<---- cmd output ---->\n`);
            }
        }

        return {
            home: isBallerinaNotFound || isOldBallerinaDist ? '' : balHomeOutput,
            isBallerinaNotFound,
            isOldBallerinaDist
        };
    }

    public overrideBallerinaHome(): boolean {
        return <boolean>workspace.getConfiguration().get(OVERRIDE_BALLERINA_HOME);
    }

    public getID(): string {
        return this.extension.id;
    }

    public getVersion(): string {
        return this.extension.packageJSON.version;
    }

    public getOutPutChannel(): OutputChannel | undefined {
        return getOutputChannel();
    }

    public isTelemetryEnabled(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_TELEMETRY);
    }

    public isAllCodeLensEnabled(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_ALL_CODELENS);
    }

    public isCodeServerEnv(): boolean {
        return process.env.CODE_SERVER_ENV === 'true';
    }

    public enableLSDebug(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_BALLERINA_LS_DEBUG);
    }

    public enabledLiveReload(): boolean {
        return isSupportedSLVersion(this, 2201100) && workspace.getConfiguration().get(ENABLE_LIVE_RELOAD);
    }

    public enabledPerformanceForecasting(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_PERFORMANCE_FORECAST);
    }

    public enabledExperimentalFeatures(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_EXPERIMENTAL_FEATURES);
    }

    public enabledNotebookDebugMode(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_NOTEBOOK_DEBUG);
    }

    public enabledRunFast(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_RUN_FAST);
    }

    public getFileDownloadPath(): string {
        return <string>workspace.getConfiguration().get(FILE_DOWNLOAD_PATH);
    }

    public getConfiguredLangServerPath(): string {
        return <string>workspace.getConfiguration().get(LANG_SERVER_PATH);
    }

    public useDistributionLanguageServer(): boolean {
        return <boolean>workspace.getConfiguration().get(USE_BALLERINA_CLI_LANG_SERVER);
    }

    public async updatePerformanceForecastSetting(status: boolean) {
        await workspace.getConfiguration().update(ENABLE_PERFORMANCE_FORECAST, status);
    }

    public enableSequenceDiagramView(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_SEQUENCE_DIAGRAM_VIEW);
    }

    public enableAiSuggestions(): boolean {
        return <boolean>workspace.getConfiguration().get(ENABLE_AI_SUGGESTIONS);
    }

    public showLibraryConfigVariables(): boolean {
        return <boolean>workspace.getConfiguration().get(SHOW_LIBRARY_CONFIG_VARIABLES);
    }

    public getDocumentContext(): DocumentContext {
        return this.documentContext;
    }

    public setDiagramActiveContext(value: boolean) {
        commands.executeCommand('setContext', 'isBallerinaDiagram', value);
        this.documentContext.setActiveDiagram(value);
    }

    public setPersistStatusContext(textEditor: TextEditor) {
        if (textEditor?.document) {
            const fileUri: Uri = textEditor.document.uri;
            if (checkIsPersistModelFile(fileUri)) {
                this.isPersist = true;
                commands.executeCommand('setContext', 'isPersistModelActive', true);
                return;
            } else {
                this.isPersist = false;
            }
        }
        commands.executeCommand('setContext', 'isPersistModelActive', false);
    }

    public setChoreoAuthEnabled(value: boolean) {
        commands.executeCommand('setContext', 'isChoreoAuthEnabled', value);
    }
    public getChoreoSession(): ChoreoSession {
        return {
            loginStatus: false
        };
    }

    public getCodeServerContext(): CodeServerContext {
        return this.codeServerContext;
    }

    public getPerformanceForecastContext(): PerformanceForecastContext {
        return this.perfForecastContext;
    }

    public setPerformanceForecastContext(context: PerformanceForecastContext) {
        this.perfForecastContext = context;
    }

    public setBallerinaConfigPath(path: string) {
        this.ballerinaConfigPath = path;
    }

    public getBallerinaConfigPath(): string {
        return this.ballerinaConfigPath;
    }

    public setNotebookVariableViewEnabled(value: boolean) {
        commands.executeCommand('setContext', 'isNotebookVariableViewEnabled', value);
    }

    public setNotebookDebugModeEnabled(value: boolean) {
        commands.executeCommand('setContext', 'isNotebookDebugModeEnabled', value);
    }

    public getIsOpenedOnce(): boolean {
        return this.isOpenedOnce;
    }

    public setIsOpenedOnce(state: boolean) {
        this.isOpenedOnce = state;
    }


    /**
     * Synchronize process environment with the latest shell environment
     * This is especially important after Ballerina installation when PATH has been updated
     */
    private async syncEnvironment(): Promise<void> {
        try {
            const freshEnv = await getShellEnvironment();
            debug('Syncing process environment with shell environment');
            updateProcessEnv(freshEnv);
        } catch (error) {
            debug(`Failed to sync environment: ${error}`);
        }
    }
}

/**
 * Class keeps data related to text and diagram document changes.
 */
class DocumentContext {
    private diagramTreeElementClickedCallbacks: Array<(construct: ConstructIdentifier) => void> = [];
    private editorChangesCallbacks: Array<(change: Change) => void> = [];
    private latestDocument: Uri | undefined;
    private activeDiagram: boolean = false;
    private ballerinProject: BallerinaProject;

    public diagramTreeElementClicked(construct: ConstructIdentifier): void {
        this.diagramTreeElementClickedCallbacks.forEach((callback) => {
            callback(construct);
        });
    }

    public onDiagramTreeElementClicked(callback: (construct: ConstructIdentifier) => void) {
        this.diagramTreeElementClickedCallbacks.push(callback);
    }

    public onEditorChanged(callback: (change: Change) => void) {
        this.editorChangesCallbacks.push(callback);
    }

    public didEditorChange(change: Change): void {
        this.editorChangesCallbacks.forEach((callback) => {
            callback(change);
        });
    }

    public setLatestDocument(uri: Uri | undefined) {
        if (uri && (uri.scheme !== 'file' || uri.fsPath.split(sep).pop()?.split(".").pop() !== "bal")) {
            return;
        }
        this.latestDocument = uri;
    }

    public setCurrentProject(ballerinProject: BallerinaProject) {
        commands.executeCommand('setContext', 'isBallerinaProject', true);
        this.ballerinProject = ballerinProject;
    }

    public getCurrentProject(): BallerinaProject {
        return this.ballerinProject;
    }

    public getLatestDocument(): Uri | undefined {
        return this.latestDocument;
    }

    public isActiveDiagram(): boolean {
        return this.activeDiagram;
    }

    public setActiveDiagram(isActiveDiagram: boolean) {
        this.activeDiagram = isActiveDiagram;
    }
}

/**
 * Telemetry tracker keeps track of the events, and
 * it is used to send telemetry events in batches.
 */
export class TelemetryTracker {
    private textEditCount: number;
    private diagramEditCount: number;

    constructor() {
        this.diagramEditCount = 0;
        this.textEditCount = 0;
    }

    public reset() {
        this.textEditCount = 0;
        this.diagramEditCount = 0;
    }

    public hasTextEdits(): boolean {
        return this.textEditCount > 0;
    }

    public hasDiagramEdits(): boolean {
        return this.diagramEditCount > 0;
    }

    public incrementTextEditCount() {
        this.textEditCount++;
    }

    public incrementDiagramEditCount() {
        this.diagramEditCount++;
    }
}

function updateProcessEnv(newEnv: NodeJS.ProcessEnv): void {
    // Update PATH/Path specially to preserve existing values that might not be in shell env
    if (isWindows() && newEnv.Path) {
        process.env.Path = newEnv.Path;
    } else if (newEnv.PATH) {
        process.env.PATH = newEnv.PATH;
    }

    // Update other environment variables
    for (const key in newEnv) {
        // Skip PATH as we've already handled it, and skip some internal variables
        if (key !== 'PATH' && key !== 'Path' && !key.startsWith('npm_') && !key.startsWith('_')) {
            process.env[key] = newEnv[key];
        }
    }
}

function getShellEnvironment(): Promise<NodeJS.ProcessEnv> {
    return new Promise((resolve, reject) => {
        let command = '';

        if (isWindows()) {
            // Windows: use PowerShell to get environment
            command = 'powershell.exe -Command "[Environment]::GetEnvironmentVariables(\'Process\') | ConvertTo-Json"';
        } else {
            // Unix-like systems: source profile files and print environment
            const shell = process.env.SHELL || '/bin/bash';
            if (shell.includes('zsh')) {
                command = 'zsh -i -c "source ~/.zshrc > /dev/null 2>&1; env"';
            } else {
                command = 'bash -i -c "source ~/.bashrc > /dev/null 2>&1; env"';
            }
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                debug(`Error getting shell environment: ${error.message}`);
                return reject(error);
            }

            const env = { ...process.env }; // Start with current env

            try {
                if (isWindows()) {
                    // Parse PowerShell JSON output
                    const envVars = JSON.parse(stdout);
                    Object.keys(envVars).forEach(key => {
                        env[key] = envVars[key].toString();
                    });
                } else {
                    // Parse Unix env output (KEY=value format)
                    stdout.split('\n').forEach(line => {
                        const match = line.match(/^([^=]+)=(.*)$/);
                        if (match) {
                            env[match[1]] = match[2];
                        }
                    });
                }

                debug('Successfully retrieved fresh environment variables');
                resolve(env);
            } catch (parseError) {
                debug(`Error parsing environment output: ${parseError}`);
                reject(parseError);
            }
        });
    });
}

export const ballerinaExtInstance = new BallerinaExtension();
