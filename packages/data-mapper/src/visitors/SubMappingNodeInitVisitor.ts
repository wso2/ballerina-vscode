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
import { DataMapperNodeModel } from "../components/Diagram/Node/commons/DataMapperNode";
import { DataMapperContext } from "../utils/DataMapperContext/DataMapperContext";
import { IOType } from "@wso2/ballerina-core";
import { BaseVisitor } from "./BaseVisitor";
import { DMSubMapping, SubMappingNode } from "../components/Diagram/Node/SubMapping/SubMappingNode";

export class SubMappingNodeInitVisitor implements BaseVisitor {
    private subMappingNode: DataMapperNodeModel;
    private subMappings: DMSubMapping[] = [];

    constructor(private context: DataMapperContext){}

    beginVisitSubMappingType(node: IOType): void {
        this.subMappings.push({
            name: node.id,
            type: node
        });
    }

    getNode() {
        this.subMappingNode = new SubMappingNode(this.context, this.subMappings);
        return this.subMappingNode;
    }
}
