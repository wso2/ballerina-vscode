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
    sendTelemetryEvent, sendTelemetryException, TM_EVENT_PASTE_AS_RECORD, CMP_XML_TO_RECORD,
} from "../../telemetry";
import { commands, window, env } from "vscode";
import { ballerinaExtInstance, DIAGNOSTIC_SEVERITY } from "../../../core";
import { PALETTE_COMMANDS, MESSAGES } from "./cmd-runner";
import { isSupportedSLVersion } from "../../../utils";
import { XMLToRecord } from "@wso2/ballerina-core";

const MSG_NOT_SUPPORT = "Paste XML as a Ballerina record feature is not supported";

export function activatePasteXMLAsRecord() {

    if (!ballerinaExtInstance.langClient) {
        return;
    }

    commands.registerCommand(PALETTE_COMMANDS.PASTE_XML_AS_RECORD, () => {
        // This command is only available since Swan Lake Update 7 patch 2
        if (!isSupportedSLVersion(ballerinaExtInstance, 220172)) {
            window.showErrorMessage(`${MSG_NOT_SUPPORT} in ${ballerinaExtInstance.ballerinaVersion}`);
            return;
        }
        if (!window.activeTextEditor || !window.activeTextEditor?.document.fileName.endsWith('.bal')) {
            window.showErrorMessage("Target is not a Ballerina file!");
            return;
        }
        sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_PASTE_AS_RECORD, CMP_XML_TO_RECORD);
        env.clipboard.readText()
            .then(clipboardText => {
                if (!ballerinaExtInstance.langClient) {
                    window.showErrorMessage("Ballerina language client not found.");
                    return;
                }
                ballerinaExtInstance.langClient.convertXMLToRecord({
                    xmlValue: clipboardText,
                    isClosed: false,
                    isRecordTypeDesc: false,
                    forceFormatRecordFields: false

                })
                    .then(lSResponse => {
                        const response = lSResponse as XMLToRecord;
                        if (!response) {
                            window.showErrorMessage(MESSAGES.INVALID_XML_RESPONSE);
                            return;
                        }
                        // Check undefined diagnostics for when older SDK is used which does not send diagnostics in response.
                        if (response.diagnostics === undefined && (response.codeBlock === undefined || response.codeBlock === "")) {
                            window.showErrorMessage(MESSAGES.INVALID_XML);
                            return;
                        }
                        if (response.diagnostics !== undefined) {
                            for (const diagnostic of response.diagnostics) {
                                if (diagnostic.severity === undefined || diagnostic.severity === DIAGNOSTIC_SEVERITY.ERROR) {
                                    window.showErrorMessage(diagnostic.message);
                                } else if (diagnostic.severity === DIAGNOSTIC_SEVERITY.WARNING) {
                                    window.showWarningMessage(diagnostic.message);
                                } else {
                                    window.showInformationMessage(diagnostic.message);
                                }
                            }
                        }
                        const codeBlock = response.codeBlock;
                        const editor = window.activeTextEditor;
                        editor?.edit(editBuilder => {
                            if (editor.selection.isEmpty) {
                                const startPosition = editor.selection.active;
                                editBuilder.insert(startPosition, codeBlock);
                            } else {
                                editBuilder.replace(editor.selection, codeBlock);
                            }
                        });
                        error => {
                            window.showErrorMessage(error.message);
                            sendTelemetryException(ballerinaExtInstance, error, CMP_XML_TO_RECORD);
                        };
                    });
            },
                error => {
                    window.showErrorMessage(error.message);
                    sendTelemetryException(ballerinaExtInstance, error, CMP_XML_TO_RECORD);
                });
    });
}
