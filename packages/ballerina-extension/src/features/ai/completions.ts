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

import { ballerinaExtInstance } from "./../../core";
import { commands, window } from "vscode";
import {
    TM_EVENT_AUTH_COPILOT, CMP_AUTH_COPILOT, sendTelemetryEvent,
    sendTelemetryException
} from "./../telemetry";
import { PALETTE_COMMANDS } from "./../project/cmds/cmd-runner";
import { loginGithubCopilot } from '../../utils/ai/auth';

export function activateCopilotLoginCommand() {
    commands.registerCommand(PALETTE_COMMANDS.LOGIN_COPILOT, async () => {
        try {
            sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_AUTH_COPILOT, CMP_AUTH_COPILOT);
            await loginGithubCopilot();
        } catch (error) {
            if (error instanceof Error) {
                sendTelemetryException(ballerinaExtInstance, error, CMP_AUTH_COPILOT);
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unkown error occurred.");
            }
        }
    });
}

export function resetBIAuth() {
    commands.registerCommand(PALETTE_COMMANDS.RESET_BI, async () => {
        await ballerinaExtInstance.context.secrets.delete('GITHUB_TOKEN');
        await ballerinaExtInstance.context.secrets.delete('GITHUB_COPILOT_TOKEN');
        await ballerinaExtInstance.context.secrets.delete('LOGIN_ALERT_SHOWN');
    });
}
