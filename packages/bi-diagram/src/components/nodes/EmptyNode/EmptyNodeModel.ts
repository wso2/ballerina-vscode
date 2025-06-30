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

import { NodeModel } from "@projectstorm/react-diagrams";
import { NodePortModel } from "../../NodePort";
import { NodeTypes } from "../../../resources/constants";
import { Branch, FlowNode, LinePosition } from "@wso2/ballerina-core";

export class EmptyNodeModel extends NodeModel {
    protected portIn: NodePortModel;
    protected portOut: NodePortModel;
    protected visible: boolean;
    protected parentFlowNode: FlowNode;
    readonly showButton: boolean;
    topNode: FlowNode | Branch; // top statement node or parent block node
    target: LinePosition;

    constructor(id: string, visible = true, button = false) {
        super({
            id,
            type: NodeTypes.EMPTY_NODE,
            locked: true,
        });
        this.addInPort("in");
        this.addOutPort("out");
        this.visible = visible;
        this.showButton = button;
    }

    addPort<T extends NodePortModel>(port: T): T {
        super.addPort(port);
        if (port.getOptions().in) {
            this.portIn = port;
        } else {
            this.portOut = port;
        }
        return port;
    }

    addInPort(label: string): NodePortModel {
        const p = new NodePortModel(true, label);
        return this.addPort(p);
    }

    addOutPort(label: string): NodePortModel {
        const p = new NodePortModel(false, label);
        return this.addPort(p);
    }

    getInPort(): NodePortModel {
        return this.portIn;
    }

    getOutPort(): NodePortModel {
        return this.portOut;
    }

    setParentFlowNode(node: FlowNode): void {
        this.parentFlowNode = node;
    }

    getParentFlowNode(): FlowNode {
        return this.parentFlowNode;
    }

    isVisible(): boolean {
        return this.visible;
    }

    setTopNode(node: FlowNode | Branch) {
        this.topNode = node;
    }

    getTopNode(): FlowNode | Branch {
        return this.topNode;
    }

    setTarget(target: LinePosition) {
        this.target = target;
    }

    getTarget(): LinePosition {
        return this.target;
    }
}
