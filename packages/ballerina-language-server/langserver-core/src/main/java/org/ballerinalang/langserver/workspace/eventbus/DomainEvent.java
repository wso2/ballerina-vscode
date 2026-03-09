/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package org.ballerinalang.langserver.workspace.eventbus;

import java.time.Instant;
import java.util.Objects;

/**
 * Base immutable domain event value routed through the event bus.
 *
 * @param timestamp event occurrence time
 * @param sourceContext source context identifier for routing and coalescing
 * @param eventKind domain event kind
 * @param coalesceScope optional per-event coalesce scope, defaults to source context
 * @since 1.7.0
 */
public record DomainEvent(Instant timestamp, String sourceContext, EventKind eventKind, String coalesceScope) {

    /**
     * Creates a domain event where coalescing is scoped by {@code sourceContext}.
     *
     * @param timestamp event occurrence time
     * @param sourceContext source context identifier
     * @param eventKind domain event kind
     */
    public DomainEvent(Instant timestamp, String sourceContext, EventKind eventKind) {
        this(timestamp, sourceContext, eventKind, sourceContext);
    }

    public DomainEvent {
        Objects.requireNonNull(timestamp, "timestamp must not be null");
        Objects.requireNonNull(eventKind, "eventKind must not be null");
        requireText(sourceContext, "sourceContext must not be blank");
        requireText(coalesceScope, "coalesceScope must not be blank");
    }

    /**
     * Returns the key used by coalesceable delivery channels.
     *
     * @return deterministic coalesce key
     */
    public String coalesceKey() {
        return eventKind + "|" + sourceContext + "|" + coalesceScope;
    }

    private static void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }
}
