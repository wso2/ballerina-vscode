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
import { BasePositionModelOptions } from "@projectstorm/react-canvas-core";

export class BaseNodeModel extends NodeModel {
    protected portLeft: NodePortModel;
    protected portRight: NodePortModel;

    constructor(options: BasePositionModelOptions) {
        super(options);
        this.addLeftPort("left");
        this.addRightPort("right");
        this.setLocked(true);
    }

    addPort<T extends NodePortModel>(port: T): T {
        super.addPort(port);
        if (port.getOptions().in) {
            this.portLeft = port;
        } else {
            this.portRight = port;
        }
        return port;
    }

    addLeftPort(label: string): NodePortModel {
        const p = new NodePortModel(true, label);
        return this.addPort(p);
    }

    addRightPort(label: string): NodePortModel {
        const p = new NodePortModel(false, label);
        return this.addPort(p);
    }

    getLeftPort(): NodePortModel {
        return this.portLeft;
    }

    getRightPort(): NodePortModel {
        return this.portRight;
    }

    getHeight(): number {
        return this.height;
    }
}
