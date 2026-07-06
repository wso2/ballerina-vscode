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

// FULL-LOOP PROOF OF CONCEPT: view -> rpc-client -> real LS, in jsdom, no VSCode.
//
// This is the second half of the headless pattern (the first,
// ballerina-extension/.../headlessHost.test.ts, proved manager -> LS). Here a view
// reads the REAL `useRpcContext().rpcClient` and calls
// getRecordCreatorRpcClient().convertJsonToRecord — the exact path the real
// RecordFromJson view uses (see record-creator/src/utils convertJsonToRecordUtil). We
// provide an rpcClient whose method delegates to the L4 headless LS harness.
// record-creator's manager is a pure pass-through (proven in headlessHost.test.ts), so
// delegating straight to the LS is faithful.
//
// A minimal view is used rather than the full RecordFromJson component so the test
// exercises the DATA loop, not that view's textarea/button input widgets (jsdom
// web-component interaction, tracked separately). Swapping in the real view is the same
// harness + those interactions.

import React, { useEffect, useState } from "react";
import * as os from "os";
import { screen, waitFor } from "@testing-library/react";
import { useRpcContext } from "../../../ballerina-rpc-client/src/context/ballerina-web-context";
import { renderWithRpc } from "./rpcHarness";
// L4 harness lives with the LS-integration tests in ballerina-extension; reused here.
import { LsHarness, resolveBalCommand } from "../../../ballerina-extension/src/test-support/ls-integration/lsHarness";

function JsonToRecordView({ json }: { json: string }) {
    const { rpcClient } = useRpcContext();
    const [code, setCode] = useState<string>("(loading)");
    useEffect(() => {
        (rpcClient as any)
            .getRecordCreatorRpcClient()
            .convertJsonToRecord({ jsonString: json, recordName: "Person", isRecordTypeDesc: false, isClosed: false })
            .then((r: any) => setCode(r.codeBlock))
            .catch((e: any) => setCode("ERROR: " + e?.message));
    }, []);
    return <pre data-testid="record">{code}</pre>;
}

const bal = resolveBalCommand();

(bal ? describe : describe.skip)("headless view — JSON→record rendered from live LS data", () => {
    let harness: LsHarness;

    beforeAll(async () => {
        harness = new LsHarness(bal as string, { timeoutMs: 60_000 });
        harness.start();
        await harness.initialize(os.tmpdir());
    }, 120_000);

    afterAll(async () => {
        await harness?.shutdown();
    });

    it("renders a record the LS generated live (view → rpc-client → LS)", async () => {
        // fake rpc-client: the record-creator sub-client's convertJsonToRecord routes to
        // the real LS over the harness (pass-through manager → faithful).
        const rpcClient = {
            getRecordCreatorRpcClient: () => ({
                convertJsonToRecord: (p: any) => harness.request("jsonToRecord/convert", p),
            }),
        };

        renderWithRpc(<JsonToRecordView json={JSON.stringify({ id: 1, name: "Ballerina" })} />, rpcClient);

        await waitFor(() => expect(screen.getByTestId("record").textContent).toContain("Person"), {
            timeout: 30_000,
        });
        const text = screen.getByTestId("record").textContent ?? "";
        expect(text).toContain("record");
        expect(text).toContain("name");
    }, 60_000);
});
