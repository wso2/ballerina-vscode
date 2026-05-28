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
import { HierarchicalResourceComponent } from "../../resources/model";
import { GraphqlDesignNode } from "../BaseNode/GraphqlDesignNode";

export const HIERARCHICAL_NODE = "hierarchicalNode";

export class HierarchicalNodeModel extends GraphqlDesignNode {
    readonly resourceObject: HierarchicalResourceComponent;


    constructor(resourceObj: HierarchicalResourceComponent) {
        super(HIERARCHICAL_NODE, resourceObj.name);
        this.resourceObject = resourceObj;

        this.addPort(new GraphqlNodeBasePort(this.resourceObject.name, PortModelAlignment.LEFT));
        this.addPort(new GraphqlNodeBasePort(this.resourceObject.name, PortModelAlignment.RIGHT));
        this.addPort(new GraphqlNodeBasePort(this.resourceObject.name, PortModelAlignment.TOP));

        this.resourceObject.hierarchicalResources?.forEach(resource => {
            this.addPort(new GraphqlNodeBasePort(resource.identifier, PortModelAlignment.LEFT));
            this.addPort(new GraphqlNodeBasePort(resource.identifier, PortModelAlignment.RIGHT));
        });
    }
}
