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

async function renderAndCheckSnapshot(model: Flow, testName: string) {
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
        highlight: false,
        filterNode(node) {
            return true;
        },
    });

    expect(prettyDom).toBeTruthy();

    // Sanitization: remove dynamic IDs and non-deterministic attributes
    const sanitizedDom = (prettyDom as string)
        .replaceAll(/\s+(marker-end|id|data-linkid|data-nodeid)="[^"]*"/g, "")
        .replaceAll(/\s+(appearance|aria-label|current-value)="[^"]*"/g, "")
        // Normalize vscode-button tag formatting
        .replaceAll(/<vscode-button\s+>/g, "<vscode-button>");
    expect(sanitizedDom).toMatchSnapshot(testName);
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
});
