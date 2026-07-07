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

// L3 (contract) exemplar — rpc-manager request/response shapes.
//
// Instantiate the REAL rpc-manager, MOCK the LS client (via StateMachine), and assert
// the request shape it sends to the LS and how it handles the response. Fast: node env,
// no VSCode, no real LS — runs in the PR gate. This is the template for the other thin
// managers; god-managers (bi-diagram) can't be imported (their graph pulls the whole
// extension) and are covered via captured fixtures (L2) instead.

import * as path from "path";

// `mock`-prefixed so the hoisted jest.mock factory may reference it; lets the test
// assert on the calls the manager makes to the LS client.
const mockLangClient = {
    convertJsonToRecord: jest.fn(),
    convertXMLToRecord: jest.fn(),
    convertJsonToRecordType: jest.fn(),
    convertXmlToRecordType: jest.fn(),
};

jest.mock("../../stateMachine", () => ({
    StateMachine: {
        langClient: () => mockLangClient,
        context: () => ({ projectPath: "/proj" }),
    },
}));

import { RecordCreatorRpcManager } from "../../rpc-managers/record-creator/rpc-manager";

describe("RecordCreatorRpcManager — RPC contract", () => {
    let manager: RecordCreatorRpcManager;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new RecordCreatorRpcManager();
    });

    it("convertJsonToRecord forwards the request unchanged and returns the LS response", async () => {
        const params = { jsonString: "{}", recordName: "Person", isRecordTypeDesc: false, isClosed: false };
        const lsResponse = { codeBlock: "type Person record {||};", diagnostics: [] };
        mockLangClient.convertJsonToRecord.mockResolvedValue(lsResponse);

        const result = await manager.convertJsonToRecord(params as any);

        expect(mockLangClient.convertJsonToRecord).toHaveBeenCalledTimes(1);
        expect(mockLangClient.convertJsonToRecord).toHaveBeenCalledWith(params);
        expect(result).toBe(lsResponse);
    });

    it("INVARIANT: convertJsonToRecordType injects filePathUri = <projectPath>/types.bal into the request", async () => {
        const params = { jsonString: "{}", recordName: "Person", isRecordTypeDesc: false, isClosed: false };
        mockLangClient.convertJsonToRecordType.mockResolvedValue({ types: [], refs: [] });

        await manager.convertJsonToRecordType(params as any);

        expect(mockLangClient.convertJsonToRecordType).toHaveBeenCalledWith(
            expect.objectContaining({
                ...params,
                filePathUri: path.join("/proj", "types.bal"),
            })
        );
    });

    it("INVARIANT: convertXmlToRecordType injects filePath = <projectPath>/types.bal into the request", async () => {
        const params = { xmlValue: "<a/>", recordName: "Root", isRecordTypeDesc: false, isClosed: false };
        mockLangClient.convertXmlToRecordType.mockResolvedValue({ types: [], refs: [] });

        await manager.convertXmlToRecordType(params as any);

        expect(mockLangClient.convertXmlToRecordType).toHaveBeenCalledWith(
            expect.objectContaining({
                ...params,
                filePath: path.join("/proj", "types.bal"),
            })
        );
    });

    it("convertXMLToRecord forwards the request unchanged and returns the LS response", async () => {
        const params = { xmlValue: "<a/>", recordName: "Root", isRecordTypeDesc: false, isClosed: false };
        const lsResponse = { codeBlock: "type Root record {||};" };
        mockLangClient.convertXMLToRecord.mockResolvedValue(lsResponse);

        const result = await manager.convertXMLToRecord(params as any);

        expect(mockLangClient.convertXMLToRecord).toHaveBeenCalledWith(params);
        expect(result).toBe(lsResponse);
    });
});
