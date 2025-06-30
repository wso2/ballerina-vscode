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
import { BallerinaExtension } from '../../core';
import { commands, extensions, StatusBarAlignment, StatusBarItem, ThemeColor, window, workspace } from 'vscode';
import { PALETTE_COMMANDS } from '../project';
// import { hasDiagram } from '../../views/diagram';
import { CMP_GIT_STATUS, sendTelemetryEvent, TM_EVENT_GIT_COMMIT } from '../telemetry';
const schedule = require('node-schedule');

export class gitStatusBarItem {
    private statusBarItem: StatusBarItem;
    private latestGitHash: string = "";
    private extension: BallerinaExtension;
    private repo;

    constructor(extension: BallerinaExtension) {
        const gitExtension = extensions.getExtension('vscode.git');
        const api = gitExtension ? gitExtension.exports.getAPI(1) : null;

        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
        this.extension = extension;
        this.repo = api ? api.repositories[0] : null;
    }

    async updateGitStatus() {
        if (!this.repo) {
            return;
        }

        const head = this.repo.state.HEAD;
        const { ahead, behind } = head;

        if (this.repo.state.workingTreeChanges.length > 0 || this.repo.state.indexChanges.length > 0 || ahead > 0 ||
            behind > 0) {
            this.statusBarItem.text = `$(cloud-upload) Sync with Choreo upstream`;
            this.statusBarItem.backgroundColor = new ThemeColor('statusBarItem.errorBackground');
            this.statusBarItem.command = {
                command: PALETTE_COMMANDS.CHOREO_SYNC_CHANGES,
                title: 'Focus Source Control'
            };
            this.statusBarItem.show();
        } else {
            this.statusBarItem.text = `$(compare-changes) In sync with Choreo upstream`;
            this.statusBarItem.backgroundColor = new ThemeColor('statusBarItem.activeBackground');
            this.statusBarItem.show();
        }
    }

    updateGitCommit() {
        if (!this.repo) {
            return;
        }

        const head = this.repo.state.HEAD;
        const { commit } = head;

        if (this.latestGitHash === "") {
            this.latestGitHash = commit;
            return;
        }

        if (this.latestGitHash != commit) {
            this.latestGitHash = commit;
            //editor-workspace-git-commit
            sendTelemetryEvent(this.extension, TM_EVENT_GIT_COMMIT, CMP_GIT_STATUS);
        }
    }
}

export function activate(ballerinaExtInstance: BallerinaExtension) {
    if (!ballerinaExtInstance.getCodeServerContext().codeServerEnv) {
        return;
    }

    // Update status bar
    const statusBarItem = new gitStatusBarItem(ballerinaExtInstance);
    ballerinaExtInstance.getCodeServerContext().statusBarItem = statusBarItem;
    workspace.onDidChangeTextDocument(_event => {
        // if (hasDiagram) {
        //     return;
        // }
        statusBarItem.updateGitStatus();
    });
    workspace.onDidOpenTextDocument(_event => {
        statusBarItem.updateGitStatus();
    });
    schedule.scheduleJob('*/10 * * * * *', function () {
        statusBarItem.updateGitStatus();
        statusBarItem.updateGitCommit();
    });

    const commitAndPush = commands.registerCommand(PALETTE_COMMANDS.CHOREO_SYNC_CHANGES, () => {
        ballerinaExtInstance.getCodeServerContext().statusBarItem?.updateGitStatus();
        showChoreoPushMessage(ballerinaExtInstance, true);
    });

    ballerinaExtInstance.context!.subscriptions.push(commitAndPush);
}

export function showChoreoPushMessage(ballerinaExtInstance: BallerinaExtension, isCommand: boolean = false) {
    if (!ballerinaExtInstance.getCodeServerContext().codeServerEnv ||
        (!isCommand && !ballerinaExtInstance.getCodeServerContext().infoMessageStatus.messageFirstEdit)) {
        return;
    }
    if (isCommand) {
        if (ballerinaExtInstance.getCodeServerContext().infoMessageStatus.sourceControlMessage) {
            sourceControllerDetails(ballerinaExtInstance);
        } else {
            commands.executeCommand(PALETTE_COMMANDS.FOCUS_SOURCE_CONTROL);
        }
        return;
    }

    const moreInfo = "More Information";
    const sync = "Sync changes with Choreo";
    window.showInformationMessage('Sync project changes using the VS Code Source Control activity and try out on ' +
        'Choreo.', moreInfo, sync).then(selection => {
            if (selection == moreInfo) {
                sourceControllerDetails(ballerinaExtInstance);
                return;
            }
            if (selection == sync) {
                commands.executeCommand(PALETTE_COMMANDS.FOCUS_SOURCE_CONTROL);
            }
        });
    ballerinaExtInstance.getCodeServerContext().infoMessageStatus.messageFirstEdit = false;
}

export function sourceControllerDetails(ballerinaExtInstance: BallerinaExtension) {
    const stop = "Don't show again!";
    const sync = "Sync my changes with Choreo";
    window.showInformationMessage('Make sure you commit and push project changes using the VS Code Source Control ' +
        'activity to try out on the Choreo environment.', {
        modal: true, detail: '\nFirst, go to the Source Control on the VS Code Activity bar. \nEnter a commit ' +
            'message and `Commit` all changes. \nThen, `Push` all changes using the `More Actions...` button on ' +
            'the source control activity.'
    }, sync, stop).then((selection) => {
        if (sync === selection) {
            commands.executeCommand(PALETTE_COMMANDS.FOCUS_SOURCE_CONTROL);
        }
        if (stop === selection) {
            ballerinaExtInstance.getCodeServerContext().infoMessageStatus.sourceControlMessage = false;
        }
    });
}
