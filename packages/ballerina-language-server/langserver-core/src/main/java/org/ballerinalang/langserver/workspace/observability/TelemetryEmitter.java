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

import javax.annotation.Nonnull;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Lock-free, non-blocking telemetry emitter for structured metric events.
 * 
 * <p>The telemetry emitter provides a simple interface for recording
 * metric events with associated key-value labels. All operations are
 * non-blocking and return immediately.
 *
 * @since 1.7.0
 */
public class TelemetryEmitter {

    private static final int MAX_LABEL_KEYS = 100;
    private static final int MAX_LABEL_VALUE_LENGTH = 256;

    private final MetricRegistry metricRegistry;
    private final ConcurrentHashMap<String, AtomicLong> emittedCounters;

    /**
     * Creates a new telemetry emitter backed by the given metric registry.
     *
     * @param metricRegistry the registry to record metrics to
     * @throws NullPointerException if metricRegistry is null
     */
    public TelemetryEmitter(@Nonnull MetricRegistry metricRegistry) {
        this.metricRegistry = metricRegistry;
        this.emittedCounters = new ConcurrentHashMap<>();
    }

    /**
     * Emits a telemetry event with associated labels.
     * 
     * <p>This method is non-blocking and returns immediately. The event
     * is recorded asynchronously in the underlying metric registry.
     *
     * @param metricName the name of the metric
     * @param labels key-value labels associated with the event
     */
    public void emit(String metricName, Map<String, String> labels) {
        if (metricName == null || metricName.isBlank()) {
            return;
        }

        // Increment global telemetry counter
        metricRegistry.incrementCounter("telemetry.emitted");
        
        // Increment metric-specific counter
        String counterName = "telemetry." + sanitizeMetricName(metricName);
        metricRegistry.incrementCounter(counterName);

        // Record label cardinality if labels are provided
        if (labels != null && !labels.isEmpty()) {
            String labelCounterName = counterName + ".labeled";
            metricRegistry.incrementCounter(labelCounterName);
            
            // Track unique label combinations (capped to prevent explosion)
            recordLabelCardinality(counterName, labels);
        }
    }

    /**
     * Emits a telemetry event with a numeric value.
     *
     * @param metricName the name of the metric
     * @param value the numeric value to record
     */
    public void emitValue(String metricName, long value) {
        if (metricName == null || metricName.isBlank()) {
            return;
        }

        metricRegistry.incrementCounter("telemetry.emitted");
        
        String counterName = "telemetry." + sanitizeMetricName(metricName);
        metricRegistry.incrementCounter(counterName);
        metricRegistry.recordHistogram(counterName + ".values", value);
    }

    /**
     * Emits a gauge value.
     *
     * @param metricName the name of the metric
     * @param value the gauge value to set
     */
    public void emitGauge(String metricName, long value) {
        if (metricName == null || metricName.isBlank()) {
            return;
        }

        String gaugeName = "telemetry." + sanitizeMetricName(metricName) + ".gauge";
        metricRegistry.setGauge(gaugeName, value);
    }

    /**
     * Returns the number of times emit has been called for a specific metric.
     *
     * @param metricName the metric name
     * @return the emission count
     */
    public long getEmitCount(String metricName) {
        String counterName = "telemetry." + sanitizeMetricName(metricName);
        return metricRegistry.getCounter(counterName);
    }

    /**
     * Records label cardinality for a metric, capping the number of unique combinations.
     */
    private void recordLabelCardinality(String baseName, Map<String, String> labels) {
        // Sanitize labels to prevent memory explosion
        Map<String, String> sanitizedLabels = sanitizeLabels(labels);
        
        // Create a unique key from sorted label pairs for cardinality tracking
        String cardinalityKey = baseName + ":" + createLabelKey(sanitizedLabels);
        
        AtomicLong counter = emittedCounters.computeIfAbsent(cardinalityKey, k -> new AtomicLong(0));
        long current = counter.incrementAndGet();
        
        // Report cardinality as a gauge
        if (current == 1) {
            // New unique combination
            metricRegistry.incrementCounter(baseName + ".cardinality");
        }
    }

    /**
     * Sanitizes a metric name to be registry-safe.
     */
    private String sanitizeMetricName(String name) {
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    /**
     * Sanitizes labels to prevent memory issues.
     */
    private Map<String, String> sanitizeLabels(Map<String, String> labels) {
        if (labels == null || labels.isEmpty()) {
            return Map.of();
        }

        Map<String, String> result = new ConcurrentHashMap<>();
        int count = 0;
        
        for (Map.Entry<String, String> entry : labels.entrySet()) {
            if (count >= MAX_LABEL_KEYS) {
                break;
            }
            
            String key = entry.getKey();
            String value = entry.getValue();
            
            if (key != null && !key.isBlank() && value != null) {
                // Truncate long values
                if (value.length() > MAX_LABEL_VALUE_LENGTH) {
                    value = value.substring(0, MAX_LABEL_VALUE_LENGTH);
                }
                result.put(key, value);
                count++;
            }
        }
        
        return result;
    }

    /**
     * Creates a deterministic key from labels.
     */
    private String createLabelKey(Map<String, String> labels) {
        if (labels.isEmpty()) {
            return "";
        }
        
        // Sort keys for deterministic ordering
        return labels.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .reduce((a, b) -> a + "," + b)
                .orElse("");
    }
}
