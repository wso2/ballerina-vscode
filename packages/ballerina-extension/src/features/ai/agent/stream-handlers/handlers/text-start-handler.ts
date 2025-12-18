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

import { StreamEventHandler } from "../stream-event-handler";
import { StreamContext } from "../stream-context";

/**
 * Handles text-start events from the stream.
 * Emits a newline to the UI and initializes a text block in the current assistant content.
 *
 * Note: This fixes the duplicate "text-start" case bug that existed in the original switch statement.
 */
export class TextStartHandler implements StreamEventHandler {
    readonly eventType = "text-start";

    canHandle(eventType: string): boolean {
        return eventType === this.eventType;
    }

    async handle(part: any, context: StreamContext): Promise<void> {
        context.currentAssistantContent.push({ type: "text", text: "" });
        context.eventHandler({ type: "content_block", content: " \n" });
    }
}
