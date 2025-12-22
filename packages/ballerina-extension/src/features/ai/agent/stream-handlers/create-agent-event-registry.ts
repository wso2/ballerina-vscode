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
import { TextDeltaHandler } from "./handlers/text-delta-handler";
import { TextStartHandler } from "./handlers/text-start-handler";
import { ErrorHandler } from "./handlers/error-handler";
import { AbortHandler } from "./handlers/abort-handler";
import { FinishHandler } from "./handlers/finish-handler";

/**
 * Creates and configures a StreamEventRegistry for the agent service.
 * Registers all event handlers in the appropriate order.
 *
 * @returns A configured StreamEventRegistry ready for use
 */
export function createAgentEventRegistry(): StreamEventRegistry {
    const registry = new StreamEventRegistry();

    // Register all handlers
    registry.register(new TextDeltaHandler());
    registry.register(new TextStartHandler());
    registry.register(new ErrorHandler());
    registry.register(new AbortHandler());
    registry.register(new FinishHandler());

    return registry;
}
