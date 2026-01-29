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
import {
    sendTelemetryEvent,
    TM_EVENT_BALLERINA_AI_GENERATION_KEPT,
    TM_EVENT_BALLERINA_AI_GENERATION_DISCARD,
    CMP_BALLERINA_AI_GENERATION
} from "../../telemetry";

/**
 * Sends a telemetry event when the user keeps an AI-generated response.
 *
 * @param projectId - The project identifier
 * @param messageId - The message identifier for the kept generation
 */
export function sendGenerationKeptTelemetry(projectId: string, messageId: string): void {
    sendTelemetryEvent(
        extension.ballerinaExtInstance,
        TM_EVENT_BALLERINA_AI_GENERATION_KEPT,
        CMP_BALLERINA_AI_GENERATION,
        {
            projectId,
            messageId,
        }
    );
}

export function sendGenerationDiscardTelemetry(projectId: string, messageId: string){
    sendTelemetryEvent(
        extension.ballerinaExtInstance,
        TM_EVENT_BALLERINA_AI_GENERATION_DISCARD,
        CMP_BALLERINA_AI_GENERATION,
        {
            projectId,
            messageId,
        }
    );
}
