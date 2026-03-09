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

package org.ballerinalang.langserver.workspace.observability;

import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

/**
 * Subscribes to all domain events and emits structured trace logs.
 * 
 * <p>The trace logger uses BEST_EFFORT delivery tier to ensure observability
 * never blocks domain operations. It supports configurable log levels
 * (--debug, --trace flags) and structured logging with key-value fields.
 *
 * @since 1.7.0
 */
public class WorkspaceTraceLogger implements AutoCloseable {

    private static final String SUBSCRIBER_ID = "workspace-trace-logger";
    private static final Set<EventKind> ALL_EVENT_KINDS = EnumSet.allOf(EventKind.class);

    private final EventSyncPubSubHolder eventBus;
    private final AtomicReference<LogLevel> logLevel;
    private final BiConsumer<String, Map<String, String>> logConsumer;
    private final Consumer<DomainEvent> eventConsumer;
    private volatile boolean subscribed = false;

    /**
     * Creates a trace logger that logs to the console.
     *
     * @param eventBus the event bus to subscribe to
     */
    public WorkspaceTraceLogger(EventSyncPubSubHolder eventBus) {
        this(eventBus, LogLevel.INFO, null);
    }

    /**
     * Creates a trace logger with a custom event consumer for testing.
     *
     * @param eventBus the event bus to subscribe to
     * @param eventConsumer consumer for received events
     */
    public WorkspaceTraceLogger(EventSyncPubSubHolder eventBus, Consumer<DomainEvent> eventConsumer) {
        this(eventBus, LogLevel.INFO, eventConsumer);
    }

    /**
     * Creates a trace logger with custom log consumer for testing structured logging.
     *
     * @param eventBus the event bus to subscribe to
     * @param logConsumer consumer for structured log entries (level, fields)
     */
    public WorkspaceTraceLogger(EventSyncPubSubHolder eventBus, BiConsumer<String, Map<String, String>> logConsumer) {
        this.eventBus = Objects.requireNonNull(eventBus, "eventBus must not be null");
        this.logLevel = new AtomicReference<>(LogLevel.INFO);
        this.eventConsumer = null;
        // Wrap the consumer to respect log levels
        this.logConsumer = logConsumer != null ? 
            (level, fields) -> {
                if (shouldLog(level, logLevel.get())) {
                    logConsumer.accept(level, fields);
                }
            } : this::defaultLogOutput;
        subscribe();
    }

    /**
     * Creates a trace logger with specified log level and consumer.
     *
     * @param eventBus the event bus to subscribe to
     * @param initialLevel the initial log level
     * @param eventConsumer custom event consumer (null for default console logging)
     */
    public WorkspaceTraceLogger(EventSyncPubSubHolder eventBus, LogLevel initialLevel, 
                                Consumer<DomainEvent> eventConsumer) {
        this.eventBus = Objects.requireNonNull(eventBus, "eventBus must not be null");
        this.logLevel = new AtomicReference<>(initialLevel != null ? initialLevel : LogLevel.INFO);
        this.eventConsumer = eventConsumer;
        
        // Use provided consumer or default to console logging
        this.logConsumer = eventConsumer != null ? 
            (level, fields) -> {} : // Consumer handles events directly
            this::defaultLogOutput;
        
        subscribe();
    }

    /**
     * Subscribes to all domain events with BEST_EFFORT tier.
     */
    private void subscribe() {
        if (subscribed) {
            return;
        }
        
        eventBus.subscribe(SUBSCRIBER_ID, SubscriberTier.BEST_EFFORT, ALL_EVENT_KINDS, this::handleEvent);
        subscribed = true;
    }

    /**
     * Handles incoming domain events.
     */
    private void handleEvent(DomainEvent event) {
        if (event == null) {
            return;
        }

        LogLevel currentLevel = logLevel.get();
        
        // Route to appropriate handler based on log level
        if (eventConsumer != null) {
            eventConsumer.accept(event);
        } else {
            logEvent(event, currentLevel);
        }
    }

    /**
     * Logs an event at the appropriate level.
     */
    private void logEvent(DomainEvent event, LogLevel currentLevel) {
        String level = determineLogLevel(event);
        
        if (!shouldLog(level, currentLevel)) {
            return;
        }

        Map<String, String> fields = eventToFields(event);
        logConsumer.accept(level, fields);
    }

    /**
     * Determines the appropriate log level for an event type.
     */
    private String determineLogLevel(DomainEvent event) {
        return switch (event.eventKind()) {
            case WORKSPACE_PROJECT_REGISTERED,
                 WORKSPACE_PROJECT_EVICTED,
                 WORKSPACE_PROJECT_HEALTH_STATE_CHANGED,
                 WORKSPACE_PROJECT_KIND_TRANSITIONED,
                 COMPILER_COMPILATION_FAILED,
                 COMPILER_RECOVERY_ATTEMPT_EXHAUSTED,
                 EXECUTION_PROCESS_STARTED,
                 EXECUTION_PROCESS_TERMINATED -> "INFO";
            case DOCUMENT_OPENED,
                 DOCUMENT_CLOSED,
                 DOCUMENT_CHANGED,
                 DOCUMENT_CONFIG_FILE_CHANGED,
                 COMPILER_SNAPSHOT_PUBLISHED,
                 COMPILER_COMPILATION_CANCELLED -> "DEBUG";
            case COMPILER_RESOLUTION_COMPLETED,
                 COMPILER_DIAGNOSTICS_READY,
                 DOCUMENT_FILE_WATCHER_EVENTS_PROCESSED,
                 DOCUMENT_SANDBOX_INVALIDATED,
                 WORKSPACE_PROJECT_TIER_CHANGED,
                 WORKSPACE_BATCH_PROJECTS_REGISTERED,
                 EXECUTION_PROCESS_OUTPUT,
                 CACHE_INVALIDATION_REQUESTED -> "TRACE";
        };
    }

    /**
     * Checks if a log entry should be emitted based on current level.
     * Higher priority levels are more restrictive (ERROR > WARN > INFO > DEBUG > TRACE).
     */
    private boolean shouldLog(String entryLevel, LogLevel currentLevel) {
        LogLevel entry = LogLevel.fromString(entryLevel);
        // Entry is logged if its priority is >= current level priority
        // e.g., if current is DEBUG (1), log DEBUG (1), INFO (2), WARN (3), ERROR (4)
        return entry.priority >= currentLevel.priority;
    }

    /**
     * Converts a domain event to structured fields.
     */
    private Map<String, String> eventToFields(DomainEvent event) {
        Map<String, String> fields = new ConcurrentHashMap<>();
        fields.put("timestamp", event.timestamp().toString());
        fields.put("eventType", event.eventKind().name());
        fields.put("eventId", event.eventKind().eventId());
        fields.put("sourceContext", event.sourceContext());
        fields.put("coalesceScope", event.coalesceScope());
        return fields;
    }

    /**
     * Default console log output.
     */
    private void defaultLogOutput(String level, Map<String, String> fields) {
        StringBuilder sb = new StringBuilder();
        sb.append("[").append(level).append("] ");
        
        // Add timestamp first
        String timestamp = fields.get("timestamp");
        if (timestamp != null) {
            sb.append(timestamp).append(" ");
        }
        
        // Add event type
        String eventType = fields.get("eventType");
        if (eventType != null) {
            sb.append(eventType);
        }
        
        // Add remaining fields as key=value
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            String key = entry.getKey();
            if (key.equals("timestamp") || key.equals("eventType")) {
                continue;
            }
            sb.append(" ").append(key).append("=").append(entry.getValue());
        }
        
        System.out.println(sb.toString());
    }

    /**
     * Sets the log level.
     *
     * @param level the new log level
     */
    public void setLogLevel(LogLevel level) {
        this.logLevel.set(level != null ? level : LogLevel.INFO);
    }

    /**
     * Gets the current log level.
     *
     * @return the current log level
     */
    public LogLevel getLogLevel() {
        return logLevel.get();
    }

    /**
     * Logs a structured entry at the specified level.
     * 
     * <p>This method is primarily for testing purposes.
     *
     * @param level the log level
     * @param fields the structured fields
     */
    public void logStructured(String level, Map<String, String> fields) {
        if (shouldLog(level, logLevel.get())) {
            logConsumer.accept(level, fields);
        }
    }

    @Override
    public void close() {
        // Note: We cannot unsubscribe from EventSyncPubSubHolder directly,
        // but we can set log level to OFF to stop processing
        logLevel.set(LogLevel.OFF);
    }
}

/**
 * Log levels for the trace logger.
 *
 * @since 1.7.0
 */
enum LogLevel {
    /** Most verbose - logs everything including TRACE events */
    TRACE(0),
    /** Debug level - logs DEBUG, INFO, WARN, ERROR */
    DEBUG(1),
    /** Default level - logs INFO, WARN, ERROR */
    INFO(2),
    /** Warning level - logs WARN, ERROR */
    WARN(3),
    /** Error level - logs only ERROR */
    ERROR(4),
    /** Disables all logging */
    OFF(5);

    final int priority;

    LogLevel(int priority) {
        this.priority = priority;
    }

    /**
     * Parses a log level from a string.
     *
     * @param level the level string
     * @return the parsed level, or INFO if unknown
     */
    static LogLevel fromString(String level) {
        if (level == null) {
            return INFO;
        }
        return switch (level.toUpperCase()) {
            case "TRACE" -> TRACE;
            case "DEBUG" -> DEBUG;
            case "INFO" -> INFO;
            case "WARN", "WARNING" -> WARN;
            case "ERROR" -> ERROR;
            case "OFF" -> OFF;
            default -> INFO;
        };
    }
}
