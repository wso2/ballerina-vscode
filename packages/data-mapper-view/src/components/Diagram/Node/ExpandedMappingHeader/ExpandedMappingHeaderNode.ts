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
import { Point } from "@projectstorm/geometry";
import { DefaultPortModel, PortModel, PortModelGenerics } from "@projectstorm/react-diagrams";
import { QueryExpression } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { ArrowLinkModel } from "../../Link";

export const EXPANDED_MAPPING_HEADER_NODE_TYPE = "datamapper-node-expanded-mapping-header";
const NODE_ID = "expanded-mapping-header-node";

export class ExpandedMappingHeaderNode extends DataMapperNodeModel {

    public x: number;
    public y: number;
    public sourcePort: DefaultPortModel;
    public targetPorts: PortModel<PortModelGenerics>[];

    constructor(
        public context: IDataMapperContext,
        public queryExpr: QueryExpression
    ) {
        super(
            NODE_ID,
            context,
            EXPANDED_MAPPING_HEADER_NODE_TYPE
        );
    }

    initPorts() {
        this.sourcePort = new DefaultPortModel(false, EXPANDED_MAPPING_HEADER_NODE_TYPE)
        this.addPort(this.sourcePort);
    }

    initLinks() {
        for (const targetPort of this.targetPorts) {
            const link = new ArrowLinkModel();
            link.setSourcePort(this.sourcePort);
            link.setTargetPort(targetPort);
            this.getModel().addAll(link);
        }
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number') {
            if (!this.x || !this.y) {
                this.x = x;
                this.y = y;
            }
            super.setPosition(x, y);
        }
    }
}
