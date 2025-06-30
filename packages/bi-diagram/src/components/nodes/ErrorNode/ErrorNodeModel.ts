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
import { getNodeIdFromModel } from "../../../utils/node";
import { NodeTypes, WHILE_NODE_WIDTH } from "../../../resources/constants";
import { FlowNode, Branch } from "../../../utils/types";
import _ from "lodash";
import { NodeLinkModel } from "../../NodeLink";

export class ErrorNodeModel extends NodeModel {
    readonly node: FlowNode;
    protected portIn: NodePortModel;
    protected portOut: NodePortModel;

    constructor(node: FlowNode, branch: Branch) {
        super({
            id: getNodeIdFromModel(node),
            type: NodeTypes.ERROR_NODE,
            locked: true,
        });
        this.node = node;
        this.setPosition(
            branch.viewState.x + branch.viewState.clw - WHILE_NODE_WIDTH / 2,
            branch.viewState.y + branch.viewState.ch
        );
        this.addInPort("in");
        this.addOutPort("out");
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

    getHeight(): number {
        return this.height;
    }

    hasBreakpoint(): boolean {
        return this.node.hasBreakpoint;
    }

    isActiveBreakpoint(): boolean {
        return this.node.isActiveBreakpoint;
    }

    setAroundLinksDisabled(disabled: boolean): void {
        _.forEach(this.ports, (port) => {
            _.forEach(port.getLinks(), (link) => {
                (link as NodeLinkModel).setDisabled(disabled);
                (link as NodeLinkModel).setBrokenLine(disabled);
            });
        });
    }
}
