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

import { traverseFlow } from "@wso2/ballerina-core";

import {
    NodeTypes,
    WAIT_DATA_ARROW_WIDTH,
    WAIT_DATA_CORE_HEIGHT,
    WAIT_DATA_CORE_WIDTH,
    WAIT_DATA_DETAILS_GAP,
    WAIT_DATA_DETAILS_WIDTH,
} from "../resources/constants";
import { NodeFactoryVisitor } from "../visitors/NodeFactoryVisitor";
import { SizingVisitor } from "../visitors/SizingVisitor";

type TestFlowNode = {
    id: string;
    codedata: { node: string };
    viewState: {
        x: number;
        y: number;
        lw: number;
        rw: number;
        h: number;
        clw: number;
        crw: number;
        ch: number;
    };
    properties: Record<string, unknown>;
    branches: unknown[];
};

const createFlowNode = (id: string, nodeKind: string): TestFlowNode => ({
    id,
    codedata: { node: nodeKind },
    viewState: {
        x: 0,
        y: 0,
        lw: 0,
        rw: 0,
        h: 0,
        clw: 0,
        crw: 0,
        ch: 0,
    },
    properties: {},
    branches: [],
});

const createFlow = (nodes: TestFlowNode[]) => ({ nodes } as any);

describe("Workflow Nodes", () => {
    it("maps workflow node kinds to workflow node types", () => {
        const flow = createFlow([
            createFlowNode("workflow-run", "WORKFLOW_RUN"),
            createFlowNode("send-data", "SEND_DATA"),
            createFlowNode("wait-data", "WAIT_DATA"),
        ]);

        const visitor = new NodeFactoryVisitor();
        traverseFlow(flow, visitor);
        const nodeTypeById = new Map(visitor.getNodes().map((node) => [node.getID(), node.getType()]));

        expect(nodeTypeById.get("workflow-run")).toBe(NodeTypes.WORKFLOW_RUN_NODE);
        expect(nodeTypeById.get("send-data")).toBe(NodeTypes.SEND_DATA_NODE);
        expect(nodeTypeById.get("wait-data")).toBe(NodeTypes.WAIT_DATA_NODE);
    });

    it("applies sizing for wait-data node kinds", () => {
        const flow = createFlow([createFlowNode("wait-data", "WAIT_DATA")]);

        const visitor = new SizingVisitor();
        traverseFlow(flow, visitor);

        const [waitDataNode] = flow.nodes as TestFlowNode[];
        const halfCircle = WAIT_DATA_CORE_WIDTH / 2;
        const expectedLeftWidth = halfCircle + WAIT_DATA_ARROW_WIDTH;
        const expectedRightWidth = halfCircle;
        const expectedContainerRightWidth = halfCircle + WAIT_DATA_DETAILS_GAP + WAIT_DATA_DETAILS_WIDTH;

        expect(waitDataNode.viewState.lw).toBe(expectedLeftWidth);
        expect(waitDataNode.viewState.rw).toBe(expectedRightWidth);
        expect(waitDataNode.viewState.ch).toBe(WAIT_DATA_CORE_HEIGHT);
        expect(waitDataNode.viewState.crw).toBe(expectedContainerRightWidth);

    });
});
