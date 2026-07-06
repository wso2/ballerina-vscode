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

// L2 (P0): bi-diagram render SEMANTICS (docs/TEST_BACKLOG.md L2-07/L2-08).
// The existing Diagram.test.tsx guards pixel/DOM drift via snapshots; these assert
// meaning instead — rules over the whole story-model corpus, not one case:
//   - every flow model renders without throwing (the #1794/#586/#803/#896 "diagram
//     crashes on this control-flow shape" class; model7 alone exercises 18 node kinds)
//   - structural anchors that must always hold (start node, add-node affordance)
//   - node-kind → widget correspondence (AGENT_CALL ⇒ agent widget)
// Adding a new fixture to MODELS extends every rule to it automatically.

import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Diagram } from "../components/Diagram";
import { Flow } from "../utils/types";

import model1 from "../stories/1-start.json";
import model2 from "../stories/2-error-handle.json";
import model3 from "../stories/3-suggestions.json";
import model4 from "../stories/4-with-diagnostics.json";
import model5 from "../stories/5-complex-1.json";
import model6 from "../stories/6-ai-agent.json";
import model7 from "../stories/7-all-nodes.json";

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

// Recursively count the FlowNodes in a model (nodes + every branch's children),
// and tally node kinds — used to derive expectations from the fixture itself.
function nodeKinds(model: any): Record<string, number> {
    const counts: Record<string, number> = {};
    const walk = (nodes: any[] = []) => {
        for (const n of nodes) {
            const kind = n?.codedata?.node ?? "?";
            counts[kind] = (counts[kind] ?? 0) + 1;
            if (Array.isArray(n?.branches)) {
                for (const b of n.branches) walk(b?.children ?? b?.nodes ?? []);
            }
        }
    };
    walk(model?.nodes ?? []);
    return counts;
}

interface Fixture {
    name: string;
    model: Flow;
    overrides?: Partial<React.ComponentProps<typeof Diagram>>;
}

const MODELS: Fixture[] = [
    { name: "start", model: model1 as unknown as Flow },
    { name: "error-handle", model: model2 as unknown as Flow },
    { name: "suggestions", model: model3 as unknown as Flow },
    { name: "with-diagnostics", model: model4 as unknown as Flow },
    { name: "complex", model: model5 as unknown as Flow },
    { name: "ai-agent", model: model6 as unknown as Flow },
    { name: "all-nodes", model: model7 as unknown as Flow, overrides: { project: { org: "test", path: "/tmp" } } },
];

async function renderDiagram(model: Flow, overrides?: Partial<React.ComponentProps<typeof Diagram>>) {
    const dom = render(<Diagram model={model} {...mockProps} {...overrides} />);
    await waitFor(
        () => {
            expect(dom.container.querySelector('[data-testid="bi-diagram-canvas"]')).toBeInTheDocument();
        },
        { timeout: 10000 }
    );
    return dom;
}

describe("BI Diagram — render semantics", () => {
    describe.each(MODELS.map((f) => [f.name, f] as [string, Fixture]))("%s", (_name, fixture) => {
        it("renders the canvas without throwing (control-flow shape is handled)", async () => {
            const { container } = await renderDiagram(fixture.model, fixture.overrides);
            expect(container.querySelectorAll('[data-testid="bi-diagram-canvas"]').length).toBeGreaterThan(0);
        }, 15000);

        it("renders a start node (every flow has an entry point)", async () => {
            const { queryAllByTestId } = await renderDiagram(fixture.model, fixture.overrides);
            expect(queryAllByTestId("start-node").length).toBeGreaterThan(0);
        }, 15000);

        it("renders an agent-call widget iff the model contains AGENT_CALL nodes", async () => {
            const { queryAllByTestId } = await renderDiagram(fixture.model, fixture.overrides);
            const modelHasAgent = (nodeKinds(fixture.model as any).AGENT_CALL ?? 0) > 0;
            expect(queryAllByTestId("agent-call-node").length > 0).toBe(modelHasAgent);
        }, 15000);
    });

    it("multi-node flows render node links and an add-node affordance", async () => {
        // the complex flow has 11 nodes → links between them and add-node buttons
        const { container } = await renderDiagram(model5 as unknown as Flow);
        expect(container.querySelectorAll('[data-testid^="diagram-link-"]').length).toBeGreaterThan(0);
        expect(container.querySelectorAll('[data-testid^="link-add-button-"]').length).toBeGreaterThan(0);
    }, 15000);
});
