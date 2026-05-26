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
import { ServiceClassComponent } from "../../resources/model";
import { GraphqlDesignNode } from "../BaseNode/GraphqlDesignNode";

export const SERVICE_CLASS_NODE = "serviceClassNode";

export class ServiceClassNodeModel extends GraphqlDesignNode {
    readonly classObject: ServiceClassComponent;


    constructor(classObject: ServiceClassComponent) {
        super(SERVICE_CLASS_NODE, classObject.serviceName);
        this.classObject = classObject;

        this.addPort(new GraphqlNodeBasePort(this.classObject.serviceName, PortModelAlignment.LEFT));
        this.addPort(new GraphqlNodeBasePort(this.classObject.serviceName, PortModelAlignment.RIGHT));
        this.addPort(new GraphqlNodeBasePort(this.classObject.serviceName, PortModelAlignment.TOP));

        this.classObject.functions?.forEach(classFunction => {
            this.addPort(new GraphqlNodeBasePort(classFunction.identifier, PortModelAlignment.LEFT));
            this.addPort(new GraphqlNodeBasePort(classFunction.identifier, PortModelAlignment.RIGHT));
        });
    }
}
