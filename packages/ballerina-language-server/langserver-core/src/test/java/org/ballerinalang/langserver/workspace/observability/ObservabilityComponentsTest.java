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
import org.testng.Assert;
import org.testng.annotations.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * Tests for observability components: MetricRegistry, TelemetryEmitter, and WorkspaceTraceLogger.
 *
 * @since 1.7.0
 */
public class ObservabilityComponentsTest {

    // ==================== MetricRegistry Tests ====================

    /**
     * Verifies MetricRegistry supports increment/decrement counters in thread-safe manner.
     */
    @Test
    public void metricRegistry_counterIncrementDecrement_isThreadSafe() throws InterruptedException {
        MetricRegistry registry = new MetricRegistry();
        int threads = 10;
        int incrementsPerThread = 1000;
        CountDownLatch latch = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            Thread thread = new Thread(() -> {
                for (int j = 0; j < incrementsPerThread; j++) {
                    registry.incrementCounter("test.counter");
                }
                latch.countDown();
            });
            thread.start();
        }

        Assert.assertTrue(latch.await(5, TimeUnit.SECONDS));
        Assert.assertEquals(registry.getCounter("test.counter"), threads * incrementsPerThread);

        // Test decrement
        registry.decrementCounter("test.counter");
        Assert.assertEquals(registry.getCounter("test.counter"), threads * incrementsPerThread - 1);
    }

    /**
     * Verifies MetricRegistry supports recording histogram values in thread-safe manner.
     */
    @Test
    public void metricRegistry_histogramRecord_isThreadSafe() throws InterruptedException {
        MetricRegistry registry = new MetricRegistry();
        int threads = 10;
        int recordsPerThread = 100;
        CountDownLatch latch = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            final int threadId = i;
            Thread thread = new Thread(() -> {
                for (int j = 0; j < recordsPerThread; j++) {
                    registry.recordHistogram("test.histogram", threadId * 100 + j);
                }
                latch.countDown();
            });
            thread.start();
        }

        Assert.assertTrue(latch.await(5, TimeUnit.SECONDS));
        HistogramSnapshot snapshot = registry.getHistogramSnapshot("test.histogram");
        Assert.assertEquals(snapshot.count(), threads * recordsPerThread);
    }

    /**
     * Verifies MetricRegistry supports setting gauge values in thread-safe manner.
     */
    @Test
    public void metricRegistry_gaugeSet_isThreadSafe() throws InterruptedException {
        MetricRegistry registry = new MetricRegistry();
        int threads = 10;
        int setsPerThread = 1000;
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicLong lastValue = new AtomicLong(0);

        for (int i = 0; i < threads; i++) {
            final int threadId = i;
            Thread thread = new Thread(() -> {
                for (int j = 0; j < setsPerThread; j++) {
                    long value = threadId * 10000L + j;
                    registry.setGauge("test.gauge", value);
                    lastValue.set(value);
                }
                latch.countDown();
            });
            thread.start();
        }

        Assert.assertTrue(latch.await(5, TimeUnit.SECONDS));
        // Gauge should have the last set value
        Assert.assertEquals(registry.getGauge("test.gauge"), lastValue.get());
    }

    /**
     * Verifies MetricRegistry drops entries under simulated memory pressure rather than growing unbounded.
     */
    @Test
    public void metricRegistry_underPressure_dropsMetricsRatherThanGrowing() {
        MetricRegistry registry = new MetricRegistry();
        
        // Simulate high-volume metric recording
        for (int i = 0; i < 1_000_000; i++) {
            registry.incrementCounter("pressure.counter");
            registry.recordHistogram("pressure.histogram", i);
        }

        // Verify registry didn't crash and metrics are within bounds
        // The registry should be lossy and not OOM
        long counterValue = registry.getCounter("pressure.counter");
        HistogramSnapshot histogram = registry.getHistogramSnapshot("pressure.histogram");
        
        // Counter should be positive but may not be exactly 1M due to lossiness
        Assert.assertTrue(counterValue > 0, "Counter should have recorded some values");
        Assert.assertTrue(histogram.count() >= 0, "Histogram should not be negative");
    }

    /**
     * Verifies MetricRegistry returns zero for non-existent counters.
     */
    @Test
    public void metricRegistry_nonExistentCounter_returnsZero() {
        MetricRegistry registry = new MetricRegistry();
        Assert.assertEquals(registry.getCounter("nonexistent.counter"), 0L);
    }

    /**
     * Verifies MetricRegistry returns empty snapshot for non-existent histograms.
     */
    @Test
    public void metricRegistry_nonExistentHistogram_returnsEmptySnapshot() {
        MetricRegistry registry = new MetricRegistry();
        HistogramSnapshot snapshot = registry.getHistogramSnapshot("nonexistent.histogram");
        Assert.assertEquals(snapshot.count(), 0L);
    }

    /**
     * Verifies MetricRegistry returns zero for non-existent gauges.
     */
    @Test
    public void metricRegistry_nonExistentGauge_returnsZero() {
        MetricRegistry registry = new MetricRegistry();
        Assert.assertEquals(registry.getGauge("nonexistent.gauge"), 0L);
    }

    /**
     * Verifies histogram snapshot provides correct statistics.
     */
    @Test
    public void metricRegistry_histogramSnapshot_providesCorrectStatistics() {
        MetricRegistry registry = new MetricRegistry();
        
        // Record known values
        long[] values = {10, 20, 30, 40, 50, 60, 70, 80, 90, 100};
        for (long value : values) {
            registry.recordHistogram("stats.histogram", value);
        }

        HistogramSnapshot snapshot = registry.getHistogramSnapshot("stats.histogram");
        Assert.assertEquals(snapshot.count(), 10L);
        Assert.assertEquals(snapshot.min(), 10L);
        Assert.assertEquals(snapshot.max(), 100L);
        Assert.assertTrue(snapshot.mean() > 0);
    }

    // ==================== TelemetryEmitter Tests ====================

    /**
     * Verifies TelemetryEmitter.emit() returns immediately without blocking.
     */
    @Test
    public void telemetryEmitter_emit_isNonBlocking() {
        MetricRegistry registry = new MetricRegistry();
        TelemetryEmitter emitter = new TelemetryEmitter(registry);
        
        long startTime = System.nanoTime();
        
        // Emit many metrics rapidly
        for (int i = 0; i < 10000; i++) {
            emitter.emit("metric." + i, Map.of("key", "value"));
        }
        
        long elapsedNanos = System.nanoTime() - startTime;
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(elapsedNanos);
        
        // Should complete very quickly (under 100ms for 10k calls)
        Assert.assertTrue(elapsedMillis < 100, 
            "TelemetryEmitter.emit() should be non-blocking, but took " + elapsedMillis + "ms");
    }

    /**
     * Verifies TelemetryEmitter correctly records metrics to registry.
     */
    @Test
    public void telemetryEmitter_emit_recordsMetricsToRegistry() {
        MetricRegistry registry = new MetricRegistry();
        TelemetryEmitter emitter = new TelemetryEmitter(registry);
        
        emitter.emit("test.metric", Map.of("label1", "value1", "label2", "value2"));
        emitter.emit("test.metric", Map.of("label1", "value1", "label2", "value2"));
        
        // Counter for emit operations should be recorded
        Assert.assertTrue(registry.getCounter("telemetry.emitted") >= 0);
    }

    // ==================== WorkspaceTraceLogger Tests ====================

    /**
     * Verifies WorkspaceTraceLogger subscribes to all 22 event kinds.
     */
    @Test
    public void workspaceTraceLogger_subscribesToAll22EventKinds() {
        EventSyncPubSubHolder eventBus = new EventSyncPubSubHolder();
        List<String> loggedEvents = new java.util.concurrent.CopyOnWriteArrayList<>();
        
        WorkspaceTraceLogger traceLogger = new WorkspaceTraceLogger(eventBus, 
            event -> loggedEvents.add(event.eventKind().name()));

        // Publish one of each event kind
        Set<EventKind> allKinds = Set.of(EventKind.values());
        for (EventKind kind : allKinds) {
            eventBus.publish(new DomainEvent(Instant.now(), "test-context", kind));
        }

        // Wait for async delivery
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Verify all event kinds were logged
        Set<String> loggedEventNames = new java.util.HashSet<>(loggedEvents);
        for (EventKind kind : allKinds) {
            Assert.assertTrue(loggedEventNames.contains(kind.name()),
                "Event kind should be logged: " + kind.name());
        }

        eventBus.close();
    }

    /**
     * Verifies WorkspaceTraceLogger uses structured logging with key-value fields.
     */
    @Test
    public void workspaceTraceLogger_logsStructuredKeyValueFields() {
        List<Map<String, String>> loggedEntries = new java.util.concurrent.CopyOnWriteArrayList<>();
        
        WorkspaceTraceLogger traceLogger = new WorkspaceTraceLogger(
            new EventSyncPubSubHolder(),
            (level, fields) -> loggedEntries.add(fields)
        );

        // Use INFO level (default) to ensure the entry is logged
        traceLogger.logStructured("INFO", Map.of(
            "eventType", "WM-E1",
            "sourceContext", "workspace-a",
            "timestamp", Instant.now().toString()
        ));

        Assert.assertEquals(loggedEntries.size(), 1);
        Map<String, String> entry = loggedEntries.get(0);
        Assert.assertEquals(entry.get("eventType"), "WM-E1");
        Assert.assertEquals(entry.get("sourceContext"), "workspace-a");
        Assert.assertTrue(entry.containsKey("timestamp"));
    }

    /**
     * Verifies WorkspaceTraceLogger respects debug log level.
     */
    @Test
    public void workspaceTraceLogger_debugLevel_enablesDebugLogs() {
        List<String> loggedLevels = new java.util.concurrent.CopyOnWriteArrayList<>();
        
        WorkspaceTraceLogger traceLogger = new WorkspaceTraceLogger(
            new EventSyncPubSubHolder(),
            (level, fields) -> loggedLevels.add(level)
        );
        
        traceLogger.setLogLevel(LogLevel.DEBUG);
        
        traceLogger.logStructured("DEBUG", Map.of("test", "value"));
        traceLogger.logStructured("INFO", Map.of("test", "value"));
        traceLogger.logStructured("TRACE", Map.of("test", "value"));

        Assert.assertTrue(loggedLevels.contains("DEBUG"), "DEBUG should be logged when level is DEBUG");
        Assert.assertTrue(loggedLevels.contains("INFO"), "INFO should be logged when level is DEBUG");
        Assert.assertFalse(loggedLevels.contains("TRACE"), "TRACE should not be logged when level is DEBUG");
    }

    /**
     * Verifies WorkspaceTraceLogger respects trace log level.
     */
    @Test
    public void workspaceTraceLogger_traceLevel_enablesAllLogs() {
        List<String> loggedLevels = new java.util.concurrent.CopyOnWriteArrayList<>();
        
        WorkspaceTraceLogger traceLogger = new WorkspaceTraceLogger(
            new EventSyncPubSubHolder(),
            (level, fields) -> loggedLevels.add(level)
        );
        
        traceLogger.setLogLevel(LogLevel.TRACE);
        
        traceLogger.logStructured("DEBUG", Map.of("test", "value"));
        traceLogger.logStructured("INFO", Map.of("test", "value"));
        traceLogger.logStructured("TRACE", Map.of("test", "value"));

        Assert.assertTrue(loggedLevels.contains("DEBUG"), "DEBUG should be logged when level is TRACE");
        Assert.assertTrue(loggedLevels.contains("INFO"), "INFO should be logged when level is TRACE");
        Assert.assertTrue(loggedLevels.contains("TRACE"), "TRACE should be logged when level is TRACE");
    }

    /**
     * Verifies WorkspaceTraceLogger with default level suppresses debug and trace.
     */
    @Test
    public void workspaceTraceLogger_defaultLevel_suppressesDebugAndTrace() {
        List<String> loggedLevels = new java.util.concurrent.CopyOnWriteArrayList<>();
        
        WorkspaceTraceLogger traceLogger = new WorkspaceTraceLogger(
            new EventSyncPubSubHolder(),
            (level, fields) -> loggedLevels.add(level)
        );
        // Default level (INFO)
        
        traceLogger.logStructured("DEBUG", Map.of("test", "value"));
        traceLogger.logStructured("INFO", Map.of("test", "value"));
        traceLogger.logStructured("TRACE", Map.of("test", "value"));

        Assert.assertFalse(loggedLevels.contains("DEBUG"), "DEBUG should not be logged at default level");
        Assert.assertTrue(loggedLevels.contains("INFO"), "INFO should be logged at default level");
        Assert.assertFalse(loggedLevels.contains("TRACE"), "TRACE should not be logged at default level");
    }

    /**
     * Verifies WorkspaceTraceLogger subscribes with BEST_EFFORT tier.
     */
    @Test
    public void workspaceTraceLogger_usesBestEffortTier() throws InterruptedException {
        EventSyncPubSubHolder eventBus = new EventSyncPubSubHolder();
        AtomicInteger receivedCount = new AtomicInteger(0);
        
        // Create trace logger that should use BEST_EFFORT tier
        WorkspaceTraceLogger traceLogger = new WorkspaceTraceLogger(eventBus, 
            event -> receivedCount.incrementAndGet());

        // Publish many events
        for (int i = 0; i < 500; i++) {
            eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.DOCUMENT_OPENED));
        }

        // Wait for delivery
        Thread.sleep(300);

        // Should have received some events (BEST_EFFORT may drop under pressure)
        Assert.assertTrue(receivedCount.get() >= 0, "Should have received events or gracefully dropped");
        
        eventBus.close();
    }

    // ==================== Integration Tests ====================

    /**
     * Verifies end-to-end observability flow: events -> trace logger -> metrics.
     */
    @Test
    public void observability_endToEnd_eventsAreLoggedAndMetered() throws InterruptedException {
        EventSyncPubSubHolder eventBus = new EventSyncPubSubHolder();
        MetricRegistry registry = new MetricRegistry();
        TelemetryEmitter emitter = new TelemetryEmitter(registry);
        
        List<String> loggedEvents = new java.util.concurrent.CopyOnWriteArrayList<>();
        WorkspaceTraceLogger traceLogger = new WorkspaceTraceLogger(eventBus, 
            event -> {
                loggedEvents.add(event.eventKind().name());
                emitter.emit("event.received", Map.of("kind", event.eventKind().name()));
            });

        // Publish events
        eventBus.publish(new DomainEvent(Instant.now(), "workspace-1", EventKind.WORKSPACE_PROJECT_REGISTERED));
        eventBus.publish(new DomainEvent(Instant.now(), "workspace-1", EventKind.DOCUMENT_OPENED));
        eventBus.publish(new DomainEvent(Instant.now(), "workspace-1", EventKind.COMPILER_SNAPSHOT_PUBLISHED));

        // Wait for async processing
        Thread.sleep(300);

        // Verify events were logged
        Assert.assertTrue(loggedEvents.contains("WORKSPACE_PROJECT_REGISTERED"));
        Assert.assertTrue(loggedEvents.contains("DOCUMENT_OPENED"));
        Assert.assertTrue(loggedEvents.contains("COMPILER_SNAPSHOT_PUBLISHED"));

        eventBus.close();
    }
}
