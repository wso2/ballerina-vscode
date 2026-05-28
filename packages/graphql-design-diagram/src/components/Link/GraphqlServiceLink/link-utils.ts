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

import { PortModel } from "@projectstorm/react-diagrams";

import { GraphqlServiceNodeModel } from "../../Nodes/GraphqlServiceNode/GraphqlServiceNodeModel";
import { RemoteFunction, ResourceFunction } from "../../resources/model";

export function findCallingFunction(targetPort: PortModel): RemoteFunction | ResourceFunction | undefined {
    const targetService: GraphqlServiceNodeModel = targetPort.getNode() as GraphqlServiceNodeModel;
    let targetFunc: ResourceFunction | RemoteFunction | undefined;

    if (targetService.serviceObject.resourceFunctions.length > 0) {
        targetFunc = targetService.serviceObject.resourceFunctions.find(resource =>
            resource.identifier ===
            targetPort.getID().split(`${targetPort.getOptions().alignment}-`)[1]
        );
    }
    if (!targetFunc && targetService.serviceObject.remoteFunctions.length > 0) {
        targetFunc = targetService.serviceObject.remoteFunctions.find(remoteFunc =>
            remoteFunc.identifier === targetPort.getID().split(`${targetPort.getOptions().alignment}-`)[1]);
    }
    return targetFunc;
}
