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
import { NODE_LOCKED, NodeTypes } from "../../../resources/constants";
import { EntryPoint, EntryPointType } from "../../../utils/types";
import { CDFunction, CDResourceFunction, CDService } from "@wso2/ballerina-core";
import { getEntryNodeFunctionPortName } from "../../../utils/diagram";

export const VIEW_ALL_RESOURCES_PORT_NAME = "view-all-resources";

export class EntryNodeModel extends NodeModel {
    readonly node: EntryPoint;
    readonly type: EntryPointType;
    protected inPort: NodePortModel;
    protected outPorts: NodePortModel[];

    constructor(node: EntryPoint, type: EntryPointType) {
        super({
            id: node.uuid,
            type: NodeTypes.ENTRY_NODE,
            locked: NODE_LOCKED,
        });
        this.node = node;
        this.type = type || "service";

        this.outPorts = [];
        this.addInPort("in");
        this.addOutPort("out");
        
        const serviceFunctions = [
            ...(node as CDService).remoteFunctions ?? [],
            ...(node as CDService).resourceFunctions ?? []
        ];
        
        // Add function ports
        serviceFunctions.forEach((func) => {
            this.addOutPort(getEntryNodeFunctionPortName(func));
        });
        
        // Add view all resources port if there are more than 3 functions
        if (serviceFunctions.length > 3) {
            this.addOutPort(VIEW_ALL_RESOURCES_PORT_NAME);
        }
    }

    addPort<T extends NodePortModel>(port: T): T {
        super.addPort(port);
        if (port.getOptions().in) {
            this.inPort = port;
        } else {
            this.outPorts.push(port);
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
        return this.inPort;
    }

    getOutPort(): NodePortModel {
        return this.outPorts.find((port) => port.getOptions().name === "out");
    }

    getOutPorts(): NodePortModel[] {
        return this.outPorts;
    }

    getFunctionPort(func: CDFunction | CDResourceFunction): NodePortModel | undefined {
        return this.outPorts.find((port) => port.getOptions().name === getEntryNodeFunctionPortName(func));
    }

    getViewAllResourcesPort(): NodePortModel | undefined {
        return this.outPorts.find((port) => port.getOptions().name === VIEW_ALL_RESOURCES_PORT_NAME);
    }

    getHeight(): number {
        return this.height;
    }
}
