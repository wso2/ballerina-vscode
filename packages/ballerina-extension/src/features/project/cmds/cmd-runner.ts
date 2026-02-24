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

import { BallerinaProject } from "@wso2/ballerina-core";
import { Terminal, window, workspace } from "vscode";
import { isSupportedSLVersion, isWindows, createVersionNumber } from "../../../utils";
import { extension } from "../../../BalExtensionContext";
import { TracerMachine } from "../../../features/tracing";


export const PALETTE_COMMANDS = {
    ADD: 'ballerina.project.add',
    BUILD: 'ballerina.project.build',
    PACK: 'ballerina.project.pack',
    CLOUD: 'ballerina.create.cloud',
    LOGIN_COPILOT: "ballerina.login.copilot",
    RESET_BI: "ballerina.reset.bi",
    DOC: 'ballerina.project.doc',
    FOCUS_EXPLORER: 'ballerinaExplorerTreeView.focus',
    RUN_CMD: 'ballerina.project.run.cmd',
    RUN: 'ballerina.project.run',
    SAVE_ALL: 'workbench.action.files.saveFiles',
    TEST: 'ballerina.project.test',
    PASTE_JSON_AS_RECORD: 'ballerina.pasteAsRecord',
    PASTE_XML_AS_RECORD: 'ballerina.pasteXMLAsRecord',
    CHOREO_SIGNIN: 'ballerina.choreo.signin',
    CHOREO_ANON_SIGNIN: 'ballerina.choreo.anonymous.signin',
    CHOREO_SIGNOUT: 'ballerina.choreo.signout',
    FOCUS_SOURCE_CONTROL: 'workbench.view.scm',
    CHOREO_SYNC_CHANGES: 'ballerina.choreo.sync',
    PERFORMANCE_FORECAST_ENABLE: 'performance.forecasting.enable',
    PERFORMANCE_FORECAST_DISABLE: 'performance.forecasting.disable',
    TRY_IT: 'ballerina.tryIt',
    OPEN_IN_DIAGRAM: 'ballerina.openIn.diagram',
    SHOW_DIAGRAM: 'ballerina.show.diagram',
    SHOW_SOURCE: 'ballerina.show.source',
    SHOW_ARCHITECTURE_VIEW: 'ballerina.view.architectureView',
    REFRESH_SHOW_ARCHITECTURE_VIEW: "ballerina.view.architectureView.refresh",
    RUN_CONFIG: 'ballerina.project.run.config',
    CONFIG_CREATE_COMMAND: 'ballerina.project.config.create',
    SHOW_ENTITY_DIAGRAM: 'ballerina.view.entityDiagram',
    SHOW_SERVICE_DESIGNER_VIEW: 'ballerina.view.serviceDesigner',
    SHOW_GRAPHQL_DESIGNER_VIEW: 'ballerina.view.graphqlDesigner'
};

export const INTERNAL_DEBUG_COMMAND = "ballerina.internal.debug";
export const SOURCE_DEBUG_COMMAND = "ballerina.source.debug";
export const TEST_DEBUG_COMMAND = "ballerina.test.debug";
export const FOCUS_DEBUG_CONSOLE_COMMAND = 'workbench.debug.action.focusRepl';

export enum BALLERINA_COMMANDS {
    TEST = "test", BUILD = "build", FORMAT = "format", RUN = "run", RUN_WITH_WATCH = "run --watch", DOC = "doc",
    ADD = "add", OTHER = "other", PACK = "pack", RUN_WITH_EXPERIMENTAL = "run --experimental",
    BUILD_WITH_EXPERIMENTAL = "build --experimental", PACK_WITH_EXPERIMENTAL = "pack --experimental",
}

export enum PROJECT_TYPE {
    SINGLE_FILE = "SINGLE_FILE_PROJECT",
    BUILD_PROJECT = "BUILD_PROJECT",
    BALR_PROJECT = "BALR_PROJECT",
    WORKSPACE = "WORKSPACE_PROJECT"
}

export enum COMMAND_OPTIONS {
    ALL = "--all"
}

export enum MESSAGES {
    NOT_SUPPORT = "Ballerina version is not supported by the VSCode plugin.",
    MODULE_NAME = "Enter module name.",
    SELECT_OPTION = "Select a build option.",
    NOT_IN_PROJECT = "Current file does not belong to a Ballerina project.",
    INVALID_PACK = "Only a Ballerina package can be packed.",
    INVALID_JSON = "Invalid JSON String",
    INVALID_JSON_RESPONSE = "JSON response is invalid.",
    INVALID_XML = "Invalid XML String",
    INVALID_XML_RESPONSE = "XML response is invalid.",
    NO_PROJECT_FOUND = "No Ballerina project found.",
    NO_FILE_FOUND = "Unable to locate the file."
}

export const BAL_CONFIG_FILE = 'Config.toml';
const TERMINAL_NAME = 'Terminal';
const BAL_CONFIG_FILES = 'BAL_CONFIG_FILES';

let terminal: Terminal;

export function runCommand(file: BallerinaProject | string, executor: string, cmd: BALLERINA_COMMANDS,
    ...args: string[]) {
    TracerMachine.startServer();
    runCommandWithConf(file, executor, cmd, '', ...args);
}

export function runCommandWithConf(file: BallerinaProject | string, executor: string, cmd: BALLERINA_COMMANDS,
    confPath: string, ...args: string[]) {
    TracerMachine.startServer();
    if (terminal) {
        terminal.dispose();
    }
    let filePath = '';
    typeof file === 'string' ? filePath = file : filePath = file.path!;
    let argsList = '';
    if (args && args.length > 0) {
        args.forEach((arg) => {
            try {
                arg = arg.trim();
                arg = /\s/g.test(arg) ? `"${arg}"` : arg;
                argsList += arg.concat(' ');
            } catch (e) {
                // error
            }
        });
    }
    let commandText;
    // Quote executor path to handle spaces in directory names
    const quotedExecutor = /\s/g.test(executor) ? `"${executor}"` : executor;
    if (cmd === BALLERINA_COMMANDS.OTHER) {
        commandText = `${quotedExecutor} ${argsList}`;
        terminal = window.createTerminal({ name: TERMINAL_NAME });
    } else {
        let env = {};

        // Get launch.json configs
        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const config = workspace.getConfiguration(
                'launch',
                workspaceFolders![0].uri
            );
            const values: any = config.get('configurations');

            if (values.length > 0) {
                const configurations = values[0];
                // envs
                if (configurations['env']) {
                    env = configurations['env'];
                }

                // program args
                if (configurations['programArgs'] && configurations['programArgs'].length > 0) {
                    configurations['programArgs'].forEach((arg) => {
                        try {
                            arg = arg.trim();
                            arg = /\s/g.test(arg) ? `"${arg}"` : arg;
                            argsList += arg.concat(' ');
                        } catch (e) {
                            // error
                        }
                    });
                }
            }
        }

        commandText = `${quotedExecutor} ${cmd} ${argsList}`;
        if (confPath !== '') {
            const configs = env['BAL_CONFIG_FILES'] ? `${env['BAL_CONFIG_FILES']}:${confPath}` : confPath;
            Object.assign(env, { BAL_CONFIG_FILES: configs });
        }
        terminal = window.createTerminal({ name: TERMINAL_NAME, cwd: filePath, env });
    }
    terminal.sendText(isWindows() ? 'cls' : 'clear', true);
    terminal.show(true);
    if (confPath !== '') {
        terminal.sendText(isWindows() ? `echo $Env:${BAL_CONFIG_FILES}` : `echo $${BAL_CONFIG_FILES}`);
    }
    terminal.sendText(commandText, true);
}

export function runTerminalCommand(executor: string, file?: BallerinaProject | string, env?: { [key: string]: string }) {
    let filePath = '';
    typeof file === 'string' ? filePath = file : filePath = file?.path!;
    if (!terminal) {
        terminal = window.createTerminal({ name: TERMINAL_NAME, cwd: filePath, env: env });
    }
    terminal.sendText(executor);
}

export function clearTerminal(): void {
    if (terminal) {
        terminal.dispose();
    }
}

export function createTerminal(path: string, env?: { [key: string]: string }): void {
    if (terminal) {
        terminal = window.createTerminal({ name: TERMINAL_NAME, cwd: path, env: env });
    }
}

export function getRunCommand(): BALLERINA_COMMANDS {
    if (isSupportedSLVersion(extension.ballerinaExtInstance, createVersionNumber(2201, 13, 0)) && extension.ballerinaExtInstance.enabledExperimentalFeatures()) {
        return BALLERINA_COMMANDS.RUN_WITH_EXPERIMENTAL;
    } else if (extension.ballerinaExtInstance.enabledLiveReload()) {
        return BALLERINA_COMMANDS.RUN_WITH_WATCH;
    }
    return BALLERINA_COMMANDS.RUN;
}

