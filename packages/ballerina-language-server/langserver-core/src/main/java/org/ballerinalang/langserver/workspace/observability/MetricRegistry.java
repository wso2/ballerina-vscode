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

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

/**
 * Thread-safe metric registry for collecting counters, histograms, and gauges.
 * 
 * <p>This registry is designed to be lossy under memory pressure - it drops
 * metrics rather than causing out-of-memory errors. All operations are
 * lock-free and non-blocking.
 *
 * @since 1.7.0
 */
public class MetricRegistry {

    private static final int MAX_METRIC_KEYS = 10_000;
    private static final int HISTOGRAM_MAX_VALUES = 10_000;

    private final ConcurrentHashMap<String, LongAdder> counters;
    private final ConcurrentHashMap<String, Histogram> histograms;
    private final ConcurrentHashMap<String, AtomicLong> gauges;

    /**
     * Creates a new metric registry with bounded capacity.
     */
    public MetricRegistry() {
        this.counters = new ConcurrentHashMap<>();
        this.histograms = new ConcurrentHashMap<>();
        this.gauges = new ConcurrentHashMap<>();
    }

    /**
     * Increments a counter metric by 1.
     * 
     * <p>If the metric key doesn't exist, it is created. If the registry
     * is at capacity, the increment may be silently dropped.
     *
     * @param name the counter name
     */
    public void incrementCounter(String name) {
        if (name == null || name.isBlank()) {
            return;
        }
        
        LongAdder counter = counters.get(name);
        if (counter == null) {
            if (counters.size() >= MAX_METRIC_KEYS) {
                // Drop metric under pressure
                return;
            }
            LongAdder newCounter = new LongAdder();
            LongAdder existing = counters.putIfAbsent(name, newCounter);
            counter = existing != null ? existing : newCounter;
        }
        counter.increment();
    }

    /**
     * Decrements a counter metric by 1.
     *
     * @param name the counter name
     */
    public void decrementCounter(String name) {
        if (name == null || name.isBlank()) {
            return;
        }
        
        LongAdder counter = counters.get(name);
        if (counter == null) {
            if (counters.size() >= MAX_METRIC_KEYS) {
                // Drop metric under pressure
                return;
            }
            LongAdder newCounter = new LongAdder();
            LongAdder existing = counters.putIfAbsent(name, newCounter);
            counter = existing != null ? existing : newCounter;
        }
        counter.decrement();
    }

    /**
     * Returns the current value of a counter.
     *
     * @param name the counter name
     * @return the counter value, or 0 if not found
     */
    public long getCounter(String name) {
        LongAdder counter = counters.get(name);
        return counter != null ? counter.sum() : 0L;
    }

    /**
     * Records a value in a histogram metric.
     * 
     * <p>Histograms track the distribution of values over time. Under
     * memory pressure, old values may be dropped to make room for new ones.
     *
     * @param name the histogram name
     * @param value the value to record
     */
    public void recordHistogram(String name, long value) {
        if (name == null || name.isBlank()) {
            return;
        }
        
        Histogram histogram = histograms.get(name);
        if (histogram == null) {
            if (histograms.size() >= MAX_METRIC_KEYS) {
                // Drop metric under pressure
                return;
            }
            Histogram newHistogram = new Histogram(HISTOGRAM_MAX_VALUES);
            Histogram existing = histograms.putIfAbsent(name, newHistogram);
            histogram = existing != null ? existing : newHistogram;
        }
        histogram.record(value);
    }

    /**
     * Returns a snapshot of histogram statistics.
     *
     * @param name the histogram name
     * @return a snapshot of the histogram, or an empty snapshot if not found
     */
    public HistogramSnapshot getHistogramSnapshot(String name) {
        Histogram histogram = histograms.get(name);
        return histogram != null ? histogram.snapshot() : HistogramSnapshot.empty();
    }

    /**
     * Sets a gauge to a specific value.
     * 
     * <p>Gauges represent point-in-time values that can go up and down.
     *
     * @param name the gauge name
     * @param value the value to set
     */
    public void setGauge(String name, long value) {
        if (name == null || name.isBlank()) {
            return;
        }
        
        AtomicLong gauge = gauges.get(name);
        if (gauge == null) {
            if (gauges.size() >= MAX_METRIC_KEYS) {
                // Drop metric under pressure
                return;
            }
            AtomicLong newGauge = new AtomicLong(value);
            AtomicLong existing = gauges.putIfAbsent(name, newGauge);
            if (existing != null) {
                existing.set(value);
            }
        } else {
            gauge.set(value);
        }
    }

    /**
     * Returns the current value of a gauge.
     *
     * @param name the gauge name
     * @return the gauge value, or 0 if not found
     */
    public long getGauge(String name) {
        AtomicLong gauge = gauges.get(name);
        return gauge != null ? gauge.get() : 0L;
    }

    /**
     * Clears all metrics from the registry.
     */
    public void clear() {
        counters.clear();
        histograms.clear();
        gauges.clear();
    }

    /**
     * Internal histogram implementation with bounded storage.
     */
    private static class Histogram {
        private final long[] values;
        private final AtomicLong index;
        private final AtomicLong count;

        Histogram(int capacity) {
            this.values = new long[capacity];
            this.index = new AtomicLong(0);
            this.count = new AtomicLong(0);
        }

        void record(long value) {
            long currentCount = count.incrementAndGet();
            long idx = index.getAndIncrement() % values.length;
            values[(int) idx] = value;
            
            // If we've wrapped around, maintain accurate count
            if (currentCount > values.length) {
                count.set(values.length);
            }
        }

        HistogramSnapshot snapshot() {
            long currentCount = Math.min(count.get(), values.length);
            if (currentCount == 0) {
                return HistogramSnapshot.empty();
            }

            long[] snapshotValues = new long[(int) currentCount];
            long startIdx = Math.max(0, index.get() - currentCount);
            
            for (int i = 0; i < currentCount; i++) {
                long idx = (startIdx + i) % values.length;
                snapshotValues[i] = values[(int) idx];
            }

            return new HistogramSnapshot(snapshotValues);
        }
    }
}

/**
 * Immutable snapshot of histogram statistics.
 *
 * @since 1.7.0
 */
class HistogramSnapshot {
    private final long count;
    private final long min;
    private final long max;
    private final double mean;
    private final long[] values;

    /**
     * Creates a histogram snapshot from recorded values.
     *
     * @param values the recorded values
     */
    HistogramSnapshot(long[] values) {
        this.values = values.clone();
        this.count = values.length;
        
        if (count == 0) {
            this.min = 0;
            this.max = 0;
            this.mean = 0.0;
        } else {
            long sum = 0;
            long minVal = values[0];
            long maxVal = values[0];
            
            for (long value : values) {
                sum += value;
                if (value < minVal) minVal = value;
                if (value > maxVal) maxVal = value;
            }
            
            this.min = minVal;
            this.max = maxVal;
            this.mean = (double) sum / count;
        }
    }

    private HistogramSnapshot() {
        this.values = new long[0];
        this.count = 0;
        this.min = 0;
        this.max = 0;
        this.mean = 0.0;
    }

    /**
     * Returns an empty snapshot.
     *
     * @return empty histogram snapshot
     */
    static HistogramSnapshot empty() {
        return new HistogramSnapshot();
    }

    /**
     * Returns the number of values in the histogram.
     *
     * @return the count
     */
    public long count() {
        return count;
    }

    /**
     * Returns the minimum value.
     *
     * @return the minimum
     */
    public long min() {
        return min;
    }

    /**
     * Returns the maximum value.
     *
     * @return the maximum
     */
    public long max() {
        return max;
    }

    /**
     * Returns the arithmetic mean.
     *
     * @return the mean
     */
    public double mean() {
        return mean;
    }

    /**
     * Returns a copy of the recorded values.
     *
     * @return the values array
     */
    public long[] values() {
        return values.clone();
    }
}
