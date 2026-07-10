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

import * as assert from "assert";
import {
    AgentTranscript,
    buildAgentTranscript,
    stringifyPayload,
    TranscriptEvent
} from "../../../../src/features/ai/agent/agentTranscript";

suite("agentTranscript", () => {
    test("merges consecutive text deltas into one run and preserves the final text", () => {
        const out = buildAgentTranscript([
            { type: "start" },
            { type: "content_block", content: "Hello" },
            { type: "content_block", content: ", world" },
            { type: "stop" }
        ]);
        assert.strictEqual(out, "Hello, world");
    });

    test("captures tool calls (name + input) and results (output) in arrival order", () => {
        const events: TranscriptEvent[] = [
            { type: "content_block", content: "Let me look that up.\n" },
            { type: "tool_call", toolName: "get_libraries", toolInput: { query: "http client" }, toolCallId: "tc_1" },
            { type: "tool_result", toolName: "get_libraries", toolOutput: "ballerina/http", toolCallId: "tc_1" },
            { type: "content_block", content: "Done." }
        ];
        const out = buildAgentTranscript(events);
        // Ordering: text, then the tool call block, then the result, then the closing text.
        const iText1 = out.indexOf("Let me look that up.");
        const iCall = out.indexOf("[tool call] get_libraries");
        const iInput = out.indexOf('"query": "http client"');
        const iResult = out.indexOf("[tool result] get_libraries");
        const iOutput = out.indexOf("ballerina/http");
        const iText2 = out.indexOf("Done.");
        assert.ok(iText1 >= 0 && iCall > iText1, "call must follow first text");
        assert.ok(iInput > iCall, "input must appear in the call block");
        assert.ok(iResult > iInput, "result must follow the call");
        assert.ok(iOutput > iResult, "output must appear in the result block");
        assert.ok(iText2 > iOutput, "closing text must follow the result");
    });

    test("marks a failed tool result", () => {
        const out = buildAgentTranscript([
            { type: "tool_call", toolName: "write_file", toolInput: { path: "main.bal" }, toolCallId: "tc_2" },
            { type: "tool_result", toolName: "write_file", toolOutput: "permission denied", toolCallId: "tc_2", failed: true }
        ]);
        assert.ok(out.includes("[tool result] write_file (failed)"), "failed marker missing:\n" + out);
        assert.ok(out.includes("permission denied"));
    });

    test("content_replace replaces the trailing text run", () => {
        const out = buildAgentTranscript([
            { type: "content_block", content: "partial draft" },
            { type: "content_replace", content: "final answer" }
        ]);
        assert.strictEqual(out, "final answer");
    });

    test("renders diagnostics / error / abort markers and ignores non-content events", () => {
        const t = new AgentTranscript();
        assert.strictEqual(t.isEmpty(), true);
        t.add({ type: "usage_metrics" });      // ignored
        t.add({ type: "intermediary_state" }); // ignored
        assert.strictEqual(t.isEmpty(), true, "non-content events must not create parts");
        t.add({ type: "diagnostics", diagnostics: [{}, {}] });
        t.add({ type: "error", content: "boom" });
        t.add({ type: "abort" });
        const out = t.render();
        assert.ok(out.includes("[diagnostics: 2 issue(s)]"));
        assert.ok(out.includes("[error: boom]"));
        assert.ok(out.includes("[aborted]"));
    });

    test("stringifyPayload handles strings, objects, and nullish", () => {
        assert.strictEqual(stringifyPayload("raw"), "raw");
        assert.strictEqual(stringifyPayload(undefined), "");
        assert.strictEqual(stringifyPayload(null), "");
        assert.strictEqual(stringifyPayload({ a: 1 }), JSON.stringify({ a: 1 }, null, 2));
    });
});
