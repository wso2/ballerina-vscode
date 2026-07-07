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

// A test that NEEDS real rpc data: it fetches a flow model LIVE from the real language
// server (flowDesignService/getFlowModel over the L4 harness) for a real .bal project,
// then renders the actual bi-diagram Diagram against it. Unlike the hand-authored story
// fixtures, this proves the Diagram renders the LS's ACTUAL output shape today — a real
// flow model's codedata/branches are impractical to hand-craft faithfully, and this
// catches drift between what the LS emits and what the Diagram can render.
//
// L4-tier: spawns the LS (needs Java + a Ballerina distribution); auto-skips otherwise;
// never runs in the fast PR job (filename is not jest.config.js).

import React from "react";
import * as fs from "fs";
import * as path from "path";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Diagram } from "../components/Diagram";
import { Flow } from "../utils/types";
// L4 headless-LS harness lives with the ls-integration tests in ballerina-extension.
import {
    LsHarness,
    resolveBalCommand,
} from "../../../ballerina-extension/src/test-support/ls-integration/lsHarness";

const bal = resolveBalCommand();
const projectRoot = path.join(__dirname, "fixtures", "realdata");
const mainBal = path.join(projectRoot, "main.bal");

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

function countNodes(flow: any): number {
    let n = 0;
    const walk = (nodes: any[] = []) => {
        for (const node of nodes) {
            n++;
            for (const b of node?.branches ?? []) walk(b?.children ?? b?.nodes ?? []);
        }
    };
    walk(flow?.nodes ?? []);
    return n;
}

(bal ? describe : describe.skip)("bi-diagram — renders a REAL flow model from the live LS", () => {
    let harness: LsHarness;
    let flow: any;

    beforeAll(async () => {
        harness = new LsHarness(bal as string, { timeoutMs: 60_000 });
        harness.start();
        await harness.initialize(projectRoot);
        harness.didOpen(mainBal, fs.readFileSync(mainBal, "utf8"));
        await new Promise((r) => setTimeout(r, 1500));
        // main() body spans lines 3..9 (1-indexed) → 0-indexed 2..8
        const resp: any = await harness.request("flowDesignService/getFlowModel", {
            filePath: mainBal,
            startLine: { line: 2, offset: 0 },
            endLine: { line: 8, offset: 1 },
        });
        flow = resp?.flowModel ?? resp;
    }, 120_000);

    afterAll(async () => {
        await harness?.shutdown();
    });

    it("the LS returned a real flow model (event-start + the source's statements)", () => {
        expect(Array.isArray(flow?.nodes)).toBe(true);
        const kinds = (flow.nodes as any[]).map((n) => n?.codedata?.node);
        expect(kinds).toContain("EVENT_START");
        // the source has a variable + an if — the real model has more than just the start
        expect(countNodes(flow)).toBeGreaterThan(1);
    });

    it("the Diagram renders that real model without throwing (canvas + start node)", async () => {
        const { container } = render(<Diagram model={flow as Flow} {...mockProps} />);
        await waitFor(
            () => expect(container.querySelector('[data-testid="bi-diagram-canvas"]')).toBeInTheDocument(),
            { timeout: 10_000 }
        );
        expect(container.querySelectorAll('[data-testid="start-node"]').length).toBeGreaterThan(0);
    }, 20_000);
});
