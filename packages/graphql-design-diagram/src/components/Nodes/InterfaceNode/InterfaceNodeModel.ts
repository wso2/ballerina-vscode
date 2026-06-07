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

import { PortModelAlignment } from "@projectstorm/react-diagrams";

import { GraphqlNodeBasePort } from "../../Port/GraphqlNodeBasePort";
import { InterfaceComponent } from "../../resources/model";
import { GraphqlDesignNode } from "../BaseNode/GraphqlDesignNode";

export const INTERFACE_NODE = "interfaceNode";

export class InterfaceNodeModel extends GraphqlDesignNode {
    readonly interfaceObject: InterfaceComponent;


    constructor(interfaceObject: InterfaceComponent) {
        super(INTERFACE_NODE, interfaceObject.name);
        this.interfaceObject = interfaceObject;

        this.addPort(new GraphqlNodeBasePort(this.interfaceObject.name, PortModelAlignment.LEFT));
        this.addPort(new GraphqlNodeBasePort(this.interfaceObject.name, PortModelAlignment.RIGHT));
        this.addPort(new GraphqlNodeBasePort(this.interfaceObject.name, PortModelAlignment.TOP));

        this.interfaceObject.resourceFunctions?.forEach(resourceFunction => {
            this.addPort(new GraphqlNodeBasePort(resourceFunction.identifier, PortModelAlignment.LEFT));
            this.addPort(new GraphqlNodeBasePort(resourceFunction.identifier, PortModelAlignment.RIGHT));
        });

        this.interfaceObject.possibleTypes.forEach(possibleType => {
            this.addPort(new GraphqlNodeBasePort(possibleType.componentName, PortModelAlignment.LEFT));
            this.addPort(new GraphqlNodeBasePort(possibleType.componentName, PortModelAlignment.RIGHT));
        });
    }
}
