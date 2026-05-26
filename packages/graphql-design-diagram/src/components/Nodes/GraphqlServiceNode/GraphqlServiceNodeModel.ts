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
import { Service } from "../../resources/model";
import { GraphqlDesignNode } from "../BaseNode/GraphqlDesignNode";

export const GRAPHQL_SERVICE_NODE = "graphqlServiceNode";

export class GraphqlServiceNodeModel extends GraphqlDesignNode {
    readonly serviceObject: Service;

    constructor(serviceObject: Service) {
        const serviceName: string = serviceObject.serviceName ? serviceObject.serviceName : "/root";
        super(GRAPHQL_SERVICE_NODE, serviceName);
        this.serviceObject = serviceObject;

        this.addPort(new GraphqlNodeBasePort(serviceName, PortModelAlignment.LEFT));
        this.addPort(new GraphqlNodeBasePort(serviceName, PortModelAlignment.RIGHT));
        this.addPort(new GraphqlNodeBasePort(serviceName, PortModelAlignment.TOP));

        this.serviceObject.resourceFunctions?.forEach(resource => {
            this.addPort(new GraphqlNodeBasePort(resource.identifier, PortModelAlignment.LEFT));
            this.addPort(new GraphqlNodeBasePort(resource.identifier, PortModelAlignment.RIGHT));
        });

        this.serviceObject.remoteFunctions?.forEach(remoteFunc => {
            this.addPort(new GraphqlNodeBasePort(remoteFunc.identifier, PortModelAlignment.LEFT));
            this.addPort(new GraphqlNodeBasePort(remoteFunc.identifier, PortModelAlignment.RIGHT));
        });
    }
}
