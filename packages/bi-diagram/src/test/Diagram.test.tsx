/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from "react";
import { prettyDOM, waitFor } from "@testing-library/dom";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Diagram } from "../components/Diagram";
import { Flow } from "../utils/types";

// Import sample data
import model1 from "../stories/1-start.json";
import model2 from "../stories/2-error-handle.json";
import model3 from "../stories/3-suggestions.json";
import model4 from "../stories/4-with-diagnostics.json";
import model5 from "../stories/5-complex-1.json";
import model6 from "../stories/6-ai-agent.json";
import model7 from "../stories/7-all-nodes.json";

// --- Emotion Style Snapshot Helpers ---

/**
 * Extract Emotion CSS rules from <style data-emotion> tags in the document,
 * filtered to only include rules for classes actually used in the given container.
 */
function getEmotionStyles(container: HTMLElement): string {
    const domContent = container.innerHTML;
    const usedHashes = new Set<string>();
    const hashRegex = /css-([a-z0-9]+)/g;
    let match: RegExpExecArray | null;
    while ((match = hashRegex.exec(domContent)) !== null) {
        usedHashes.add(match[1]);
    }

    // Emotion uses insertRule (speedy mode) so CSS is in styleSheets.cssRules, not textContent
    const relevantRules: string[] = [];
    const styleTags = document.querySelectorAll("style[data-emotion]");
    styleTags.forEach((tag) => {
        if (tag instanceof HTMLStyleElement && tag.sheet) {
            try {
                Array.from(tag.sheet.cssRules).forEach((rule) => {
                    const ruleText = rule.cssText;
                    const ruleHashMatch = /\.css-([a-z0-9]+)/.exec(ruleText);
                    if (ruleHashMatch && usedHashes.has(ruleHashMatch[1])) {
                        relevantRules.push(ruleText);
                    }
                });
            } catch (e) {
                // CORS may block access to cssRules
            }
        }
    });
    return relevantRules.sort().join("\n");
}

/**
 * Build a deterministic mapping from Emotion CSS hashes to stable indices
 * based on order of first appearance in the content.
 */
function buildHashMap(content: string): Map<string, string> {
    const hashRegex = /css-([a-z0-9]+)/g;
    const seen = new Set<string>();
    const ordered: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = hashRegex.exec(content)) !== null) {
        if (!seen.has(match[1])) {
            seen.add(match[1]);
            ordered.push(match[1]);
        }
    }
    const map = new Map<string, string>();
    ordered.forEach((hash, i) => { map.set(`css-${hash}`, `css-${i}`); });
    return map;
}

/**
 * Apply hash mapping to normalize Emotion class names in content.
 */
function applyHashMap(content: string, hashMap: Map<string, string>): string {
    if (hashMap.size === 0) return content;
    const pattern = new RegExp(
        [...hashMap.keys()].sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
        'g'
    );
    return content.replace(pattern, (m) => hashMap.get(m) ?? m);
}

async function renderAndCheckSnapshot(model: Flow, testName: string, overrides?: Partial<React.ComponentProps<typeof Diagram>>) {
    const mockProps = {
        onAddNode: jest.fn(),
        onAddNodePrompt: jest.fn(),
        onDeleteNode: jest.fn(),
        onAddComment: jest.fn(),
        onNodeSelect: jest.fn(),
        onNodeSave: jest.fn(),
        addBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        onConnectionSelect: jest.fn(),
        goToSource: jest.fn(),
        openView: jest.fn(),
    };

    const dom = render(<Diagram model={model} {...mockProps} {...overrides} />);

    // Wait for diagram to render
    await waitFor(
        () => {
            const diagramElements = dom.container.querySelectorAll('[class*="diagram"], svg, canvas');
            expect(diagramElements.length).toBeGreaterThan(0);
        },
        { timeout: 10000 }
    );

    // Extract Emotion CSS styles relevant to this render
    const emotionStyles = getEmotionStyles(dom.container);

    const prettyDom = prettyDOM(dom.container, 1000000, {
        filterNode(node) {
            return true;
        },
    });

    expect(prettyDom).toBeTruthy();

    // Remove ANSI color codes from prettyDOM output
    let cleanDom = (prettyDom as string).replace(/\x1b\[\d+m/g, "");

    // Build deterministic hash mapping from DOM (order of first appearance)
    const hashMap = buildHashMap(cleanDom);

    // Sanitization: remove dynamic IDs and non-deterministic attributes
    let sanitizedDom = cleanDom
        .replaceAll(/\s+(marker-end|id|data-linkid|data-nodeid)="[^"]*"/g, "")
        .replaceAll(/\s+(appearance|aria-label|current-value)="[^"]*"/g, "")
        // Normalize vscode-button tag formatting
        .replaceAll(/<vscode-button\s+>/g, "<vscode-button>");

    // Apply deterministic hash normalization to both DOM and styles
    sanitizedDom = applyHashMap(sanitizedDom, hashMap);
    const normalizedStyles = applyHashMap(emotionStyles, hashMap);

    // Combine styles + DOM for comprehensive snapshot that captures both structure and styling
    const snapshot = normalizedStyles.trim()
        ? `/* Emotion Styles */\n${normalizedStyles}\n\n/* DOM */\n${sanitizedDom}`
        : sanitizedDom;
    expect(snapshot).toMatchSnapshot(testName);
}

describe("BI Diagram - Snapshot Tests", () => {
    test("renders start flow correctly", async () => {
        await renderAndCheckSnapshot(model1 as unknown as Flow, "start-flow");
    }, 15000);

    test("renders flow with error handler correctly", async () => {
        await renderAndCheckSnapshot(model2 as Flow, "flow-with-error");
    }, 15000);

    test("renders flow with suggestions correctly", async () => {
        await renderAndCheckSnapshot(model3 as Flow, "flow-with-suggestions");
    }, 15000);

    test("renders flow with diagnostics correctly", async () => {
        await renderAndCheckSnapshot(model4 as unknown as Flow, "flow-with-diagnostics");
    }, 15000);

    test("renders complex flow correctly", async () => {
        await renderAndCheckSnapshot(model5 as unknown as Flow, "complex-flow");
    }, 15000);

    test("renders AI agent flow correctly", async () => {
        await renderAndCheckSnapshot(model6 as unknown as Flow, "ai-agent-flow");
    }, 15000);

    test("renders all nodes flow correctly", async () => {
        await renderAndCheckSnapshot(model7 as unknown as Flow, "all-nodes-flow", {
            project: { org: "gayanka", path: "/tmp" },
        });
    }, 15000);
});
