// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

import { SubmitFeedbackRequest } from "@wso2/ballerina-core";
import { fetchWithAuth } from "./ai-client";
import { OLD_BACKEND_URL } from "../utils";
import { extension } from "../../../BalExtensionContext";
import { sendTelemetryEvent, TM_EVENT_BALLERINA_AI_GENERATION_FEEDBACK, CMP_BALLERINA_AI_GENERATION } from "../../telemetry";
import { cleanDiagnosticMessages } from "../../../rpc-managers/ai-panel/utils";

export async function submitFeedback(content: SubmitFeedbackRequest): Promise<boolean> {
    try {
        sendTelemetryEvent(
            extension.ballerinaExtInstance,
            TM_EVENT_BALLERINA_AI_GENERATION_FEEDBACK,
            CMP_BALLERINA_AI_GENERATION,
            {
                feedbackType: content.positive ? 'positive' : 'negative',
                hasFeedbackText: content.feedbackText ? 'true' : 'false',
                feedbackTextLength: content.feedbackText?.length.toString() || '0',
                hasChatThread: content.messages.length > 0 ? 'true' : 'false',
                chatThread: JSON.stringify(content.messages),
            }
        );

        const payload = {
            feedback: content.feedbackText,
            positive: content.positive,
            messages: content.messages,
            diagnostics: cleanDiagnosticMessages(content.diagnostics)
        };

        const response = await fetchWithAuth(`${OLD_BACKEND_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return true;
        } else {
            console.error("Failed to submit feedback");
            return false;
        }
    } catch (error) {
        console.error("Error submitting feedback:", error);
        return false;
    }
}