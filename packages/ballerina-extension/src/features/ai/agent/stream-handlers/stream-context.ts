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

import { ExecutionContext, ProjectSource } from "@wso2/ballerina-core";
import { CopilotEventHandler } from "../../utils/events";

/**
 * Context object containing all shared state for stream event handlers.
 * Passed to every handler during stream processing.
 */
export interface StreamContext {
    // Event emission
    eventHandler: CopilotEventHandler;

    // Shared mutable state (accumulated during stream processing)
    modifiedFiles: string[];
    accumulatedMessages: any[];
    currentAssistantContent: any[];
    selectedLibraries: string[];

    // Configuration (immutable during stream)
    tempProjectPath: string;
    projects: ProjectSource[];
    shouldCleanup: boolean;
    messageId: string;
    userMessageContent: any;

    // Response promise (for abort/finish handling)
    response: Promise<any>;

    // Execution context (for workspace integration)
    ctx: ExecutionContext;
}
