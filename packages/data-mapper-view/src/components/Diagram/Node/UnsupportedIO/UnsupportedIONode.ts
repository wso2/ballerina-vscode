/*
 * Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
import { Point } from "@projectstorm/geometry";
import { STNode } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperNodeModel } from "../commons/DataMapperNode";

export const UNSUPPORTED_IO_NODE_TYPE = "data-mapper-node-unsupported-io";
const NODE_ID = "unsupported-io-node";

export enum UnsupportedExprNodeKind {
    Input,
    Output
}

export class UnsupportedIONode extends DataMapperNodeModel {

    public filePath: string;
    public x: number;
    public y: number;

    constructor(
        public context: IDataMapperContext,
        public kind: UnsupportedExprNodeKind,
        public message?: string,
        public unsupportedExpr?: STNode
    ) {
        super(
            `${NODE_ID}-${kind}`,
            context,
            UNSUPPORTED_IO_NODE_TYPE
        );
        this.filePath = this.context.filePath;
    }

    initPorts() {
        // Ports are not needed
    }

    initLinks(): void {
        // Links are not needed
    }

    public updatePosition() {
        this.setPosition(this.position.x, this.position.y);
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
