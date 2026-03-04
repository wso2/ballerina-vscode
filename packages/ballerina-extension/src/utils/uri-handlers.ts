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
import { URLSearchParams } from "url";
import { window, Uri, ProviderResult, commands } from "vscode";
import { BallerinaExtension } from "../core";
import { handleOpenFile, handleOpenRepo } from ".";
import { CMP_OPEN_VSCODE_URL, TM_EVENT_OPEN_FILE_URL_START, TM_EVENT_OPEN_REPO_URL_START, sendTelemetryEvent } from "../features/telemetry";
import { IOpenCompSrcCmdParams, CommandIds as PlatformExtCommandIds } from "@wso2/wso2-platform-core";

export function activateUriHandlers(ballerinaExtInstance: BallerinaExtension) {
    window.registerUriHandler({
        handleUri(uri: Uri): ProviderResult<void> {
            const urlParams = new URLSearchParams(uri.query);
            switch (uri.path) {
                case '/open-file':
                    const gistId = urlParams.get('gist');
                    const fileName = urlParams.get('file');
                    const repoFileUrl = urlParams.get('repoFileUrl');
                    sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_OPEN_FILE_URL_START, CMP_OPEN_VSCODE_URL);
                    if ((gistId && fileName) || repoFileUrl) {
                        handleOpenFile(ballerinaExtInstance, gistId, fileName, repoFileUrl);
                    } else {
                        window.showErrorMessage(`Gist or the file not found!`);
                    }
                    break;
                case '/open-repo':
                    const repoUrl = urlParams.get('repoUrl');
                    const openFile = urlParams.get('openFile');
                    sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_OPEN_REPO_URL_START, CMP_OPEN_VSCODE_URL);
                    if (repoUrl) {
                        handleOpenRepo(ballerinaExtInstance, repoUrl, openFile);
                    } else {
                        window.showErrorMessage(`Repository url not found!`);
                    }
                    break;
                case '/signin':
                    // Legacy OAuth callback route - no longer used
                    // Authentication is now handled via Devant platform extension
                    console.log("Legacy /signin route called - authentication now uses Devant platform extension");
                    break;
                case '/open':
                    const org = urlParams.get("org");
                    const project = urlParams.get("project");
                    const component = urlParams.get("component");
                    const technology = urlParams.get("technology");
                    const integrationType = urlParams.get("integrationType");
                    const integrationDisplayType = urlParams.get("integrationDisplayType");
                    if (org && project && component && technology && integrationType) {
                        commands.executeCommand(PlatformExtCommandIds.OpenCompSrcDir, {
                            org, project, component, technology, integrationType, integrationDisplayType, extName: "Devant"
                        } as IOpenCompSrcCmdParams);
                    } else {
                        window.showErrorMessage('Invalid component URL parameters');
                    }
                    break;

            }
        }
    });
}
