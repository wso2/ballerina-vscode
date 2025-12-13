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

import { StreamEventRegistry } from "./stream-event-registry";
import { TextDeltaHandler } from "./text-delta-handler";
import { TextStartHandler } from "./text-start-handler";
import { ToolCallHandler } from "./tool-call-handler";
import { ToolResultHandler } from "./tool-result-handler";
import { ErrorHandler } from "./error-handler";
import { AbortHandler } from "./abort-handler";
import { FinishHandler } from "./finish-handler";

/**
 * Creates and configures a StreamEventRegistry for the agent service.
 * Registers all 7 event handlers in the appropriate order.
 *
 * @returns A configured StreamEventRegistry ready for use
 */
export function createAgentEventRegistry(): StreamEventRegistry {
    const registry = new StreamEventRegistry();

    // Register all handlers
    registry.register(new TextDeltaHandler());
    registry.register(new TextStartHandler());
    registry.register(new ToolCallHandler());
    registry.register(new ToolResultHandler());
    registry.register(new ErrorHandler());
    registry.register(new AbortHandler());
    registry.register(new FinishHandler());

    return registry;
}
