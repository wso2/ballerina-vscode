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

export interface CopilotMessageStartContent {
    input_tokens: number;
};

export interface CopilotContentBlockContent {
    text: string;
};

export interface CopilotErrorContent {
    message: string;
};

export interface CopilotMessageStopContent {
    total_input_tokens: number;
    output_tokens: number;
    stop_reason?: string;
};

export enum CopilotEvent {
    MESSAGE_START = "message_start",
    CONTENT_BLOCK = "content_block",
    ERROR = "error",
    MESSAGE_STOP = "message_stop",
}

export interface CopilotSSEEvent {
    event: CopilotEvent;
    body: CopilotMessageStartContent | CopilotContentBlockContent | CopilotErrorContent | CopilotMessageStopContent;
}

export function parseCopilotSSEEvent(chunk: string): CopilotSSEEvent {
    let event: string | undefined;
    let dataLines: string[] = [];

    chunk.split("\n").forEach((line) => {
        if (line.startsWith("event: ")) {
            event = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
            dataLines.push(line.slice(6).trim());
        }
    });

    if (!event) {
        throw new Error("Event field is missing in SSE event");
    }

    let body: any;
    try {
        body = JSON.parse(dataLines.join(""));
    } catch (e) {
        throw new Error("Invalid JSON data in SSE event");
    }

    switch (event) {
        case "message_start":
            return { event: CopilotEvent.MESSAGE_START, body: body as CopilotMessageStartContent };
        case "content_block":
            return { event: CopilotEvent.CONTENT_BLOCK, body: body as CopilotContentBlockContent };
        case "error":
            return { event: CopilotEvent.ERROR, body: body as CopilotErrorContent };
        case "message_stop":
            return { event: CopilotEvent.MESSAGE_STOP, body: body as CopilotMessageStopContent };
    }
}

export function hasCodeBlocks(text: string) {
    const codeBlockRegex = /<code[^>]*>[\s\S]*?<\/code>/i;
    return codeBlockRegex.test(text);
}
