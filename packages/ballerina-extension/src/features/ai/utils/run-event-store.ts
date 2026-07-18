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

import { ChatNotify } from "@wso2/ballerina-core";

/**
 * In-memory per-run event buffer that powers **AI panel reconnection**.
 *
 * The agent run lives on the extension host independently of the webview (it is
 * tracked by the {@link chatStateStorage} singleton, keyed by
 * `(projectRootPath, threadId)`), so it keeps executing when the panel is
 * closed. But `ChatNotify` events are pushed to the webview fire-and-forget and
 * are silently dropped while no panel is registered. This store buffers every
 * emitted event (stamped with a monotonic `seq`) so that a panel which
 * (re)mounts can call `getRunStatus` and replay whatever it missed.
 *
 * This is the BI analogue of MI Copilot's `AgentEventHandler`.
 *
 * Scope/limitation: the buffer is in-memory only. It survives panel
 * close/reopen (the feature's requirement) but not an extension-host restart.
 */
export interface RunStatus {
    isRunning: boolean;
    events: ChatNotify[];
}

interface RunState {
    isRunning: boolean;
    /** Monotonic within the current run (reset on `beginRun`); stable under buffer eviction. */
    seqCounter: number;
    /** Events of the current run. Reset on `beginRun`, kept after `endRun`. */
    runBuffer: ChatNotify[];
    generationId?: string;
    /**
     * True when the run's terminal event (stop/abort/error) was emitted while no
     * panel existed to receive it. The next initial `getRunStatus` (no `sinceSeq`)
     * serves the full buffer once so the reopened panel can rebuild the finished
     * turn — replaying `save_chat` also persists the final `uiResponse` that the
     * closed panel never round-tripped. Cleared after being served (or on the
     * next `beginRun`) so later reopens fall back to persisted history without
     * duplication.
     */
    finishedUnseen: boolean;
}

/** Per-run buffer cap: beyond this, the oldest events are evicted (bounds memory on very long runs). */
const MAX_BUFFERED_EVENTS = 5000;
/** Retain buffers for at most this many distinct runs; evict the oldest beyond it. */
const MAX_RETAINED_RUNS = 20;

class RunEventStore {
    private runs = new Map<string, RunState>();
    /** The key of the run currently emitting events (set by `beginRun`, cleared by `endRun`). */
    private currentKey: string | undefined;

    private key(projectRootPath: string, threadId: string): string {
        return `${projectRootPath}::${threadId}`;
    }

    private getOrCreate(key: string): RunState {
        let state = this.runs.get(key);
        if (!state) {
            state = { isRunning: false, seqCounter: 0, runBuffer: [], finishedUnseen: false };
            this.runs.set(key, state);
        }
        return state;
    }

    /** Evict the oldest non-active runs so the store doesn't grow unbounded across many workspaces. */
    private evictStaleRuns(): void {
        // Map preserves insertion order; delete oldest entries that aren't the current run.
        for (const key of this.runs.keys()) {
            if (this.runs.size <= MAX_RETAINED_RUNS) {
                break;
            }
            if (key !== this.currentKey) {
                this.runs.delete(key);
            }
        }
    }

    /** Marks the start of a run and clears its previous buffer. */
    beginRun(projectRootPath: string, threadId: string, generationId: string): void {
        const key = this.key(projectRootPath, threadId);
        const state = this.getOrCreate(key);
        state.isRunning = true;
        state.seqCounter = 0;
        state.runBuffer = [];
        state.generationId = generationId;
        state.finishedUnseen = false;
        this.currentKey = key;
        this.evictStaleRuns();
    }

    /** Marks the end of a run. Keeps the buffer so an in-flight poll can still pick up a terminal event. */
    endRun(projectRootPath: string, threadId: string): void {
        const key = this.key(projectRootPath, threadId);
        const state = this.runs.get(key);
        if (state) {
            state.isRunning = false;
        }
        if (this.currentKey === key) {
            this.currentKey = undefined;
        }
    }

    /**
     * Stamps `seq`/`generationId` on an event about to be sent to the panel and
     * buffers it under the currently-running run. Called from the single
     * ai-panel send chokepoint (`sendAIPanelNotification`). Returns the same
     * (mutated) event so the caller can forward it. No-op (returns event
     * unchanged) when no run is active — e.g. notifications sent outside a run.
     *
     * @param panelOpen whether an AI panel currently exists to receive the event.
     *   When a terminal event is emitted with no panel open, the run is marked
     *   `finishedUnseen` so the next reconnect replays the whole turn.
     */
    stampCurrent(event: ChatNotify, panelOpen: boolean): ChatNotify {
        if (!this.currentKey) {
            return event;
        }
        const state = this.runs.get(this.currentKey);
        if (!state || !state.isRunning) {
            return event;
        }
        event.seq = ++state.seqCounter;
        if (state.generationId !== undefined && event.generationId === undefined) {
            event.generationId = state.generationId;
        }
        state.runBuffer.push(event);
        if (!panelOpen && (event.type === "stop" || event.type === "abort" || event.type === "error")) {
            state.finishedUnseen = true;
        }
        // Bound memory on pathologically long runs by dropping the oldest events.
        // `seq` stays monotonic (independent of array index), so polling still works;
        // only an initial reconnect to such a run loses its earliest transcript.
        if (state.runBuffer.length > MAX_BUFFERED_EVENTS) {
            state.runBuffer.shift();
        }
        return event;
    }

    /**
     * Returns the run status for a reconnecting panel.
     * - `sinceSeq` provided → polling mode: only events with `seq > sinceSeq`.
     *   Returned whether or not the run is still active, so a poll can pick up a
     *   terminal event that was dropped.
     * - `sinceSeq` omitted → initial reconnect: the full current-run buffer while
     *   the run is active, or — served exactly once — for a run that finished
     *   while no panel was open (`finishedUnseen`), so the reopened panel can
     *   rebuild the turn it never saw. Otherwise empty: a completed-and-seen
     *   turn is already in the persisted chat history, and returning the buffer
     *   again would duplicate it.
     */
    getRunStatus(projectRootPath: string, threadId: string, sinceSeq?: number): RunStatus {
        const state = this.runs.get(this.key(projectRootPath, threadId));
        if (!state) {
            return { isRunning: false, events: [] };
        }
        let events: ChatNotify[];
        if (sinceSeq !== undefined && sinceSeq >= 0) {
            events = state.runBuffer.filter(e => (e.seq ?? 0) > sinceSeq);
        } else if (state.isRunning || state.finishedUnseen) {
            events = [...state.runBuffer];
            // Serve the finished-unseen buffer only once — after this replay the
            // frontend re-fires save_chat, persisting the turn into chat history.
            state.finishedUnseen = false;
        } else {
            events = [];
        }
        return { isRunning: state.isRunning, events };
    }
}

export const runEventStore = new RunEventStore();
