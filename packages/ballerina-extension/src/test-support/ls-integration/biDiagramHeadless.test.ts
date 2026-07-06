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

// Headless host for the bi-diagram getFlowModel handler.
//
// The bi-diagram rpc-manager is a "god module": its ~26 imports transitively pull the
// whole extension activation graph (core/extension.ts, ai/tracing/debugger features),
// so it CANNOT be loaded headlessly by mocking without stubbing essentially the entire
// extension. The fix is decoupling, not mocking: getFlowModel now lives in the
// narrow-import module rpc-managers/bi-diagram/flowModel.ts (StateMachine + vscode Uri
// only), which the manager delegates to. So the REAL handler runs against the REAL LS
// with a single mock — the same clean shape as the record-creator PoC. This is the
// template for decoupling the manager's other LS-facing handlers.
//
// L4-tier: spawns the LS (Java + distro); auto-skips otherwise; not in the fast PR job.

import * as fs from "fs";
import * as path from "path";
import { LsHarness, resolveBalCommand } from "./lsHarness";

const mockHost: { harness: LsHarness | null } = { harness: null };

jest.mock("../../stateMachine", () => ({
    StateMachine: {
        langClient: () => ({
            getFlowModel: (req: any) => mockHost.harness!.request("flowDesignService/getFlowModel", req),
        }),
        context: () => ({}),
    },
}));

// Imported AFTER the mock. flowModel.ts's only other imports are vscode (mapped to the
// mock by this config) and @wso2/ballerina-core types (elided) — no god-manager graph.
import { getFlowModel } from "../../rpc-managers/bi-diagram/flowModel";

const bal = resolveBalCommand();
const projectRoot = path.join(__dirname, "fixtures", "hello");
const mainBal = path.join(projectRoot, "main.bal");

(bal ? describe : describe.skip)("headless host — bi-diagram getFlowModel against the real LS", () => {
    beforeAll(async () => {
        const harness = new LsHarness(bal as string, { timeoutMs: 60_000 });
        harness.start();
        await harness.initialize(projectRoot);
        harness.didOpen(mainBal, fs.readFileSync(mainBal, "utf8"));
        await new Promise((r) => setTimeout(r, 1500));
        mockHost.harness = harness;
    }, 120_000);

    afterAll(async () => {
        await mockHost.harness?.shutdown();
    });

    it("runs the real getFlowModel handler end-to-end against the LS", async () => {
        // main() body range in hello/main.bal (0-indexed lines 2..4)
        const response: any = await getFlowModel({
            filePath: mainBal,
            startLine: { line: 2, offset: 0 },
            endLine: { line: 4, offset: 1 },
        } as any);

        expect(response).toBeTruthy();
        const flow = response.flowModel ?? response;
        expect(Array.isArray(flow.nodes)).toBe(true);
        // every main() flow begins with an event-start node
        const kinds = flow.nodes.map((n: any) => n?.codedata?.node);
        expect(kinds).toContain("EVENT_START");
    }, 60_000);
});
