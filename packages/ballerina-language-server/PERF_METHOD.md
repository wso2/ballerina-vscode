# Performance Debugging and Optimization Methodology

This document outlines the systematic approach used to identify, analyze, and resolve performance bottlenecks in the Ballerina Language Server, specifically focusing on the transition from the legacy workspace management to the new asynchronous, event-driven architecture.

## 1. Methodology

### A. Data Collection (Running with JFR)
To capture high-fidelity performance data without modifying the build script, we use a **Gradle Initialization Script** (`init-jfr.gradle`). This allows us to inject JVM arguments into the test process dynamically.

**Execution Command:**
```bash
./gradlew :langserver-core:test --tests "org.ballerinalang.langserver.codeaction.*" --init-script init-jfr.gradle
```

**Init Script Content:**
```gradle
allprojects {
    tasks.withType(Test) {
        jvmArgs '-XX:StartFlightRecording=filename=recording.jfr,settings=profile'
    }
}
```

### B. Analysis Strategy
We use the `jfr` CLI tool to perform "surgical" analysis of the recording:

1.  **CPU Hotspots:** Using `jdk.ExecutionSample` to find methods frequently on the stack when the thread is in `STATE_RUNNABLE`.
    *   *Derived Action:* Identify if the hot path is a local logic inefficiency (e.g., recursive file walks) or a core library bottleneck.
2.  **Memory Churn:** Using `jdk.ObjectAllocationSample` to identify high-frequency allocations.
    *   *Derived Action:* Look for redundant object creations (e.g., `Map.copyOf` in a loop) or excessive URI/Path conversions.
3.  **Latency & Blocking:** Using `jdk.ThreadSleep` and `jdk.ThreadPark`.
    *   *Derived Action:* If `ThreadSleep` is high, find the polling loop. If `ThreadPark` is high, investigate lock contention or thread pool saturation.
4.  **GC Impact:** Correlating "Emergency heap pressure" logs with `jdk.GCPhaseParallel` events to see if CPU is being stolen by the garbage collector.

### C. Deriving Actions
The "Next Action" is derived by mapping JFR samples back to the source code:
*   **Case 1: Frequent I/O in logic.** Solution: Implement memoization/caching.
*   **Case 2: Persistent Polling.** Solution: Replace with reactive listeners or `CompletableFuture` chaining.
*   **Case 3: Concurrent Contention.** Solution: Optimize synchronization or reduce the number of concurrent tasks (permits).

---

## 2. Analysis of Previous Behavior (feat5)

The `feat5` branch represents the "Legacy" architecture:
*   **Synchronous Execution:** Most operations (file opening, compilation) happened synchronously on the request thread.
*   **Direct Access:** The `WorkspaceManager` directly managed projects without an intermediate event bus or debouncing layer.
*   **Lower Latency:** Tests ran in ~2m 01s because they didn't pay the "async tax" (debouncing, context switching, event queuing).
*   **Simple Lifecycle:** Projects were rarely evicted, and background work was minimal, leading to lower thread contention.

---

## 3. Summary of Current Changes & Progress

The `claude1` branch introduced a modern, robust async architecture, but initially suffered from several "death by a thousand cuts" performance issues.

### Phase 1: Local Optimizations (The "Easy" Wins)
*   **`resolveSourceRoot` Caching:** Discovered via JFR that the system was walking the directory tree to find `Ballerina.toml` for every request. Introduced `rootCache` to memoize this.
*   **Trie Efficiency:** Optimized `TrieNode` to use immutable `Map.of` and removed redundant `Map.copyOf` calls during recursive updates.
*   **Cache Capacity:** Increased `DEFAULT_MAX_PROJECTS` from 32 to 128 to stop the "LRU Thrashing" cycle in large test suites.
*   **Result:** Reduced `workspace.workspacemanager` package allocations by **~95%**.

### Phase 2: Eliminating Async Polling
*   **Polling Removal:** Found `Thread.sleep` loops in `CompilationServiceImpl` used to wait for async events.
*   **Debounce Bypassing:** Introduced `forceCompilation()` to allow synchronous requests (like tests) to bypass the 150ms debounce window.
*   **Result:** Eliminated thousands of idle `ThreadSleep` events.

### Phase 3: Architectural Contention & Integrity
*   **Redundant Work:** Found that `TestUtil` was calling `didOpen` twice and manually triggering compilation, causing the background engine to do the work twice.
*   **Compiler Interruptibility:** Discovered that the Ballerina Compiler ignores `Thread.interrupt()`. Introduced aggressive manual cancellation checks in `CompilationActionImpl` to stop "zombie" background compilations from hogging CPU after a project is closed.
*   **Event Bus Saturation:** Fixed a critical bug where `forceCompilation` combined with delayed async events caused duplicate tasks that saturated the `EventBus` critical queue.

### Current Status
We have moved from a system that was CPU-bound by I/O and memory-bound by map churn to a lean, event-driven system. The current focus is on balancing concurrency (compilation permits) with the throughput requirements of the test suite.
