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

import { StreamEventHandler } from "./stream-event-handler";
import { StreamContext } from "./stream-context";

/**
 * Registry for managing stream event handlers.
 * Replaces the monolithic switch statement with automatic event routing.
 */
export class StreamEventRegistry {
    private handlers: Map<string, StreamEventHandler>;

    constructor() {
        this.handlers = new Map();
    }

    /**
     * Registers a handler for a specific event type
     * @param handler - The event handler to register
     */
    register(handler: StreamEventHandler): void {
        this.handlers.set(handler.eventType, handler);
    }

    /**
     * Gets the handler for a specific event type
     * @param eventType - The event type to get handler for
     * @returns The handler if found, undefined otherwise
     */
    getHandler(eventType: string): StreamEventHandler | undefined {
        return this.handlers.get(eventType);
    }

    /**
     * Handles a stream event by routing it to the appropriate handler
     * @param part - The stream event part
     * @param context - Shared context for handlers
     */
    async handleEvent(part: any, context: StreamContext): Promise<void> {
        const handler = this.handlers.get(part.type);
        if (handler) {
            await handler.handle(part, context);
        } else {
            console.warn(`[StreamEventRegistry] No handler registered for event type: ${part.type}`);
        }
    }
}
