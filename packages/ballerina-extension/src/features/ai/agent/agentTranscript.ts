// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * Pure, dependency-free reconstruction of exactly what the chat window shows, in plain
 * text, from the agent's ChatNotify event stream: interleaved assistant text, tool
 * calls (name + input), tool results (output), and notable markers (diagnostics,
 * error, abort), in arrival order. Consecutive text deltas merge into one run, exactly
 * as the chat renders them.
 *
 * Used by the headless CLI (test/headless/index.ts) to write agent_exact_output.txt.
 * Deliberately free of vscode / AI-SDK imports so it is fully unit-testable in
 * isolation. A .txt cannot reproduce the webview's visual rendering (markdown → styled
 * HTML, collapsible tool cards); it reproduces the exact textual content and order.
 */

/** The subset of ChatNotify fields this builder reads. Structurally compatible with
 * ChatNotify, so `chatNotifyEvent as unknown as TranscriptEvent` is safe. */
export interface TranscriptEvent {
    type: string;
    content?: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    toolCallId?: string;
    failed?: boolean;
    diagnostics?: unknown[];
}

type Part =
    | { kind: "text"; text: string }
    | { kind: "tool_call"; name: string; input: unknown }
    | { kind: "tool_result"; name: string; output: unknown; failed?: boolean }
    | { kind: "note"; text: string };

/** A payload → display string: string passes through; anything else is pretty JSON;
 * nullish becomes "". Never throws (circular refs fall back to String()). */
export function stringifyPayload(v: unknown): string {
    if (v === undefined || v === null) {
        return "";
    }
    if (typeof v === "string") {
        return v;
    }
    try {
        return JSON.stringify(v, null, 2);
    } catch {
        return String(v);
    }
}

/** Accumulates chat events in arrival order and renders the plain-text transcript. */
export class AgentTranscript {
    private readonly parts: Part[] = [];

    private appendText(text: string): void {
        if (!text) {
            return;
        }
        const last = this.parts[this.parts.length - 1];
        if (last && last.kind === "text") {
            last.text += text;
        } else {
            this.parts.push({ kind: "text", text });
        }
    }

    /** Fold one event into the transcript. Unknown/non-content events are ignored. */
    add(event: TranscriptEvent): void {
        switch (event.type) {
            case "content_block":
                this.appendText(typeof event.content === "string" ? event.content : "");
                break;
            case "content_replace": {
                // Replaces the trailing text run (rare in agent/edit mode).
                const text = typeof event.content === "string" ? event.content : "";
                const last = this.parts[this.parts.length - 1];
                if (last && last.kind === "text") {
                    last.text = text;
                } else {
                    this.appendText(text);
                }
                break;
            }
            case "tool_call":
                this.parts.push({ kind: "tool_call", name: event.toolName ?? "", input: event.toolInput });
                break;
            case "tool_result":
                this.parts.push({
                    kind: "tool_result",
                    name: event.toolName ?? "",
                    output: event.toolOutput,
                    failed: event.failed
                });
                break;
            case "diagnostics": {
                const count = Array.isArray(event.diagnostics) ? event.diagnostics.length : 0;
                this.parts.push({ kind: "note", text: `diagnostics: ${count} issue(s)` });
                break;
            }
            case "error":
                this.parts.push({
                    kind: "note",
                    text: `error: ${typeof event.content === "string" ? event.content : "unknown error"}`
                });
                break;
            case "abort":
                this.parts.push({ kind: "note", text: "aborted" });
                break;
            default:
                // start / stop / usage_metrics / intermediary_state / compaction / … are
                // not chat text content, so they never enter the transcript.
                break;
        }
    }

    /** True until the first content/tool/marker event has been folded in. */
    isEmpty(): boolean {
        return this.parts.length === 0;
    }

    /** The plain-text transcript, in arrival order. */
    render(): string {
        let out = "";
        for (const p of this.parts) {
            if (p.kind === "text") {
                out += p.text;
            } else if (p.kind === "tool_call") {
                out += `\n\n[tool call] ${p.name}\ninput: ${stringifyPayload(p.input)}\n`;
            } else if (p.kind === "tool_result") {
                out += `[tool result] ${p.name}${p.failed ? " (failed)" : ""}\noutput: ${stringifyPayload(p.output)}\n`;
            } else {
                out += `\n[${p.text}]\n`;
            }
        }
        return out;
    }
}

/** Build the transcript string from a full event array in one call. */
export function buildAgentTranscript(events: TranscriptEvent[]): string {
    const t = new AgentTranscript();
    for (const e of events) {
        t.add(e);
    }
    return t.render();
}
