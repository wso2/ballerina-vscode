/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import functionCall1Model from "../stories/function_call1.json";
import functionCall2Model from "../stories/function_call2.json";
import functionCall3Model from "../stories/function_call3.json";
import ifNode1Model from "../stories/if_node1.json";
import ifNode4Model from "../stories/if_node4.json";
import ifNode5Model from "../stories/if_node5.json";
import ifNode8Model from "../stories/if_node8.json";
import whileNode1Model from "../stories/while_node1.json";
import endpointCall1Model from "../stories/endpoint_call1.json";
import sequenceModel from "../stories/sequence-model.json";

// --- Emotion Style Snapshot Helpers ---

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

function applyHashMap(content: string, hashMap: Map<string, string>): string {
    if (hashMap.size === 0) return content;
    const pattern = new RegExp(
        [...hashMap.keys()].sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
        'g'
    );
    return content.replace(pattern, (m) => hashMap.get(m) ?? m);
}

const SEQUENCE_ATTR_PATTERN = /\s+(marker-end|id|data-linkid|data-nodeid|appearance|aria-label|current-value|href)="[^"]*"/g;

function buildSnapshot(container: HTMLElement, prettyDom: string, attrPattern: RegExp): string {
    const emotionStyles = getEmotionStyles(container);
    // Remove ANSI color codes from prettyDOM output
    const cleanDom = prettyDom.replace(/\x1b\[\d+m/g, "");
    const hashMap = buildHashMap(cleanDom);

    let sanitizedDom = cleanDom
        .replaceAll(attrPattern, "")
        .replaceAll(/<vscode-button\s+>/g, "<vscode-button>");

    sanitizedDom = applyHashMap(sanitizedDom, hashMap);
    const normalizedStyles = applyHashMap(emotionStyles, hashMap);

    return normalizedStyles.trim()
        ? `/* Emotion Styles */\n${normalizedStyles}\n\n/* DOM */\n${sanitizedDom}`
        : sanitizedDom;
}

async function renderAndCheckSnapshot(model: Flow, testName: string) {
    const mockProps = {
        onClickParticipant: jest.fn(),
        onAddParticipant: jest.fn(),
        onReady: jest.fn(),
    };

    const dom = render(<Diagram model={model} {...mockProps} />);

    // Wait for diagram to render
    await waitFor(
        () => {
            const diagramElements = dom.container.querySelectorAll('[class*="diagram"], svg, canvas');
            expect(diagramElements.length).toBeGreaterThan(0);
        },
        { timeout: 10000 }
    );

    const prettyDom = prettyDOM(dom.container, 1000000, {
        filterNode(node) {
            return true;
        },
    });

    expect(prettyDom).toBeTruthy();

    const snapshot = buildSnapshot(dom.container, prettyDom as string, SEQUENCE_ATTR_PATTERN);
    expect(snapshot).toMatchSnapshot(testName);
}

describe("Sequence Diagram - Snapshot Tests", () => {
    test("renders function call 1 correctly", async () => {
        await renderAndCheckSnapshot(functionCall1Model as unknown as Flow, "function-call-1");
    }, 15000);

    test("renders function call 2 correctly", async () => {
        await renderAndCheckSnapshot(functionCall2Model as unknown as Flow, "function-call-2");
    }, 15000);

    test("renders function call 3 correctly", async () => {
        await renderAndCheckSnapshot(functionCall3Model as unknown as Flow, "function-call-3");
    }, 15000);

    test("renders if node 1 correctly", async () => {
        await renderAndCheckSnapshot(ifNode1Model as unknown as Flow, "if-node-1");
    }, 15000);

    test("renders if node 4 correctly", async () => {
        await renderAndCheckSnapshot(ifNode4Model as unknown as Flow, "if-node-4");
    }, 15000);

    test("renders if node 5 correctly", async () => {
        await renderAndCheckSnapshot(ifNode5Model as unknown as Flow, "if-node-5");
    }, 15000);

    test("renders if node 8 correctly", async () => {
        await renderAndCheckSnapshot(ifNode8Model as unknown as Flow, "if-node-8");
    }, 15000);

    test("renders while node 1 correctly", async () => {
        await renderAndCheckSnapshot(whileNode1Model as unknown as Flow, "while-node-1");
    }, 15000);

    test("renders endpoint call 1 correctly", async () => {
        await renderAndCheckSnapshot(endpointCall1Model as unknown as Flow, "endpoint-call-1");
    }, 15000);

    test("renders sequence model correctly", async () => {
        const flow = (sequenceModel as any).sequenceDiagram as Flow;
        await renderAndCheckSnapshot(flow, "sequence-model");
    }, 15000);

    test("renders empty participants correctly", async () => {
        const emptyModel: Flow = {
            participants: [],
            location: {
                fileName: "empty.bal",
                startLine: { line: 0, offset: 0 },
                endLine: { line: 0, offset: 0 },
            },
        };

        const dom = render(
            <Diagram
                model={emptyModel}
                onClickParticipant={jest.fn()}
                onAddParticipant={jest.fn()}
                onReady={jest.fn()}
            />
        );

        await waitFor(
            () => {
                expect(dom.container).toBeTruthy();
            },
            { timeout: 5000 }
        );

        const prettyDom = prettyDOM(dom.container, 1000000, {
            filterNode(node) {
                return true;
            },
        });

        expect(prettyDom).toBeTruthy();

        const snapshot = buildSnapshot(dom.container, prettyDom as string, SEQUENCE_ATTR_PATTERN);
        expect(snapshot).toMatchSnapshot("empty-participants");
    }, 15000);
});
