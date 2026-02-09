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
import { TypeDiagram } from "../Diagram";
import { Type } from "@wso2/ballerina-core";

// Import sample data
import typeModel from "../stories/type-model.json";

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
    ordered.forEach((hash, i) => map.set(`css-${hash}`, `css-${i}`));
    return map;
}

function applyHashMap(content: string, hashMap: Map<string, string>): string {
    let result = content;
    for (const [original, stable] of hashMap) {
        result = result.split(original).join(stable);
    }
    return result;
}

function buildSnapshot(container: HTMLElement, prettyDom: string, attrPattern: RegExp): string {
    const emotionStyles = getEmotionStyles(container);
    const hashMap = buildHashMap(prettyDom);

    let sanitizedDom = prettyDom
        .replaceAll(attrPattern, "")
        .replaceAll(/<vscode-button\s+>/g, "<vscode-button>");

    sanitizedDom = applyHashMap(sanitizedDom, hashMap);
    const normalizedStyles = applyHashMap(emotionStyles, hashMap);

    return normalizedStyles.trim()
        ? `/* Emotion Styles */\n${normalizedStyles}\n\n/* DOM */\n${sanitizedDom}`
        : sanitizedDom;
}

async function renderAndCheckSnapshot(types: Type[], testName: string) {
    const mockProps = {
        goToSource: jest.fn(),
        onTypeEdit: jest.fn(),
        onTypeDelete: jest.fn(),
        verifyTypeDelete: jest.fn().mockResolvedValue(true),
    };

    const dom = render(
        <TypeDiagram typeModel={types} {...mockProps} />
    );

    // Wait for diagram to render
    await waitFor(
        () => {
            const diagramElements = dom.container.querySelectorAll('[class*="diagram"], svg, canvas, [data-testid="type-diagram"]');
            expect(diagramElements.length).toBeGreaterThan(0);
        },
        { timeout: 10000 }
    );

    const prettyDom = prettyDOM(dom.container, 1000000, {
        highlight: false,
        filterNode(_node) {
            return true;
        },
    });

    expect(prettyDom).toBeTruthy();

    const snapshot = buildSnapshot(
        dom.container,
        prettyDom as string,
        /\s+(marker-end|id|data-linkid|data-nodeid|appearance|aria-label|current-value)="[^"]*"/g
    );
    expect(snapshot).toMatchSnapshot(testName);
}

describe("Type Diagram - Snapshot Tests", () => {
    const allTypes = (typeModel as any).types as Type[];

    test("renders all types correctly", async () => {
        await renderAndCheckSnapshot(allTypes, "all-types");
    }, 15000);

    // Test with individual type categories
    test("renders record types correctly", async () => {
        const recordTypes = allTypes.filter((t: any) => t.codedata?.node === "RECORD");
        if (recordTypes.length > 0) {
            await renderAndCheckSnapshot(recordTypes, "record-types");
        }
    }, 15000);

    test("renders class types correctly", async () => {
        const classTypes = allTypes.filter((t: any) => t.codedata?.node === "CLASS");
        if (classTypes.length > 0) {
            await renderAndCheckSnapshot(classTypes, "class-types");
        }
    }, 15000);

    test("renders single type correctly", async () => {
        if (allTypes.length > 0) {
            await renderAndCheckSnapshot([allTypes[0]], "single-type");
        }
    }, 15000);

    test("renders empty type list correctly", async () => {
        const dom = render(
            <TypeDiagram
                typeModel={[]}
                goToSource={jest.fn()}
                onTypeEdit={jest.fn()}
                onTypeDelete={jest.fn()}
                verifyTypeDelete={jest.fn().mockResolvedValue(true)}
            />
        );

        // Wait for some rendering
        await waitFor(
            () => {
                expect(dom.container).toBeTruthy();
            },
            { timeout: 5000 }
        );

        const prettyDom = prettyDOM(dom.container, 1000000, {
            highlight: false,
            filterNode(_node) {
                return true;
            },
        });

        expect(prettyDom).toBeTruthy();

        const snapshot = buildSnapshot(
            dom.container,
            prettyDom as string,
            /\s+(marker-end|id|data-linkid|data-nodeid|appearance|aria-label|current-value)="[^"]*"/g
        );
        expect(snapshot).toMatchSnapshot("empty-types");
    }, 15000);
});
