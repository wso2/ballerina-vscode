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

import { FlowNode, CurrentBreakpointsResponse as BreakpointInfo } from "@wso2/ballerina-core";
import { BaseVisitor } from "./BaseVisitor";


export class BreakpointVisitor implements BaseVisitor {
    private breakpointInfo: BreakpointInfo;
    private skipChildrenVisit = false;

    constructor(breakpoints: BreakpointInfo) {
        this.breakpointInfo = breakpoints;
    }

    private setBreakpointData(node: FlowNode) {
        if (this.breakpointInfo.breakpoints && this.breakpointInfo.breakpoints.length > 0) {
            for (const breakpoint of this.breakpointInfo.breakpoints) {
                if (
                    breakpoint.line === node.codedata?.lineRange?.startLine?.line &&
                    (!breakpoint.column || breakpoint.column === node.codedata?.lineRange?.startLine?.offset)) {
                    node.hasBreakpoint = true;
                    break;
                }
            }

            
        }

        if (this.breakpointInfo?.activeBreakpoint &&
            this.breakpointInfo.activeBreakpoint.line === node.codedata?.lineRange?.startLine?.line &&
            (!this.breakpointInfo.activeBreakpoint.column ||
                this.breakpointInfo.activeBreakpoint.column === node.codedata?.lineRange?.startLine?.offset)) {
            node.isActiveBreakpoint = true;
        }
    }

    skipChildren(): boolean {
        return this.skipChildrenVisit;
    }

    beginVisitNode?(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }

    beginVisitIf?(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }

    beginVisitMatch?(node: FlowNode, parent?: FlowNode): void {
        this.beginVisitIf(node, parent);
    }

    beginVisitWhile?(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }

    beginVisitForeach?(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }

    beginVisitLock(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }

    beginVisitErrorHandler(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }

    beginVisitRemoteActionCall?(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }

    beginVisitResourceActionCall?(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }

    beginVisitReturn?(node: FlowNode, parent?: FlowNode): void {
        this.setBreakpointData(node);
    }
}
