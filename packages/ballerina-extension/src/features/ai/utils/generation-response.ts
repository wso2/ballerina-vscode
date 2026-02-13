// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { extension } from "../../../BalExtensionContext";
import { StateMachine } from "../../../stateMachine";
import {
    sendTelemetryEvent,
    TM_EVENT_BALLERINA_AI_GENERATION_KEPT,
    TM_EVENT_BALLERINA_AI_GENERATION_DISCARD,
    CMP_BALLERINA_AI_GENERATION
} from "../../telemetry";
import { getHashedProjectId } from "../../telemetry/common/project-id";

/**
 * Sends a telemetry event when the user keeps an AI-generated response.
 *
 * @param messageId - The message identifier for the kept generation
 */
export async function sendGenerationKeptTelemetry(messageId: string): Promise<void> {
    const projectPath = StateMachine.context()?.projectPath || '';
    const projectId = await getHashedProjectId(projectPath);

    sendTelemetryEvent(
        extension.ballerinaExtInstance,
        TM_EVENT_BALLERINA_AI_GENERATION_KEPT,
        CMP_BALLERINA_AI_GENERATION,
        {
            'message.id': messageId,
            'project.id': projectId,
        }
    );
}

/**
 * Sends a telemetry event when the user discard an AI-generated response.
 *
 * @param messageId - The message identifier for the discarded generation
 */
export async function sendGenerationDiscardTelemetry(messageId: string): Promise<void> {
    const projectPath = StateMachine.context()?.projectPath || '';
    const projectId = await getHashedProjectId(projectPath);

    sendTelemetryEvent(
        extension.ballerinaExtInstance,
        TM_EVENT_BALLERINA_AI_GENERATION_DISCARD,
        CMP_BALLERINA_AI_GENERATION,
        {
            'message.id': messageId,
            'project.id': projectId,
        }
    );
}
