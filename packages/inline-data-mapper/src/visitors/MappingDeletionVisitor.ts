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
import { Mapping } from "@wso2/ballerina-core";
import { BaseVisitor } from "./BaseVisitor";

export class MappingDeletionVisitor implements BaseVisitor {
    private currentMappings: Mapping[] = [];
    private mappingStack: Mapping[][] = [];
    private isWithinFieldToBeDeleted: boolean = false;

    constructor(
        private targetIdToDelete: string
    ){}

    beginVisitMapping(node: Mapping): void {
        if (node.elements && node.elements.length > 0) {
            // Push current mappings to stack before processing nested elements
            this.mappingStack.push(this.currentMappings);
            this.currentMappings = [];
            
            if (node.output.startsWith(this.targetIdToDelete)) {
                this.isWithinFieldToBeDeleted = true;
            } else {
                // Create a copy of the node without elements
                const nodeCopy: Mapping = { ...node, elements: [] };
                this.mappingStack[this.mappingStack.length - 1].push(nodeCopy);
            }
        } else if (!node.output.startsWith(this.targetIdToDelete) && !this.isWithinFieldToBeDeleted) {
            this.currentMappings.push(node);
        }
    }

    endVisitMapping(node: Mapping): void {
        if (node.elements && node.elements.length > 0) {
            if (!this.isWithinFieldToBeDeleted) {
                // Add the processed elements back to the parent node
                const parentMappings = this.mappingStack[this.mappingStack.length - 1];
                const lastParentMapping = parentMappings[parentMappings.length - 1];
                if (this.currentMappings.length > 0) {
                    lastParentMapping.elements = [{ mappings: this.currentMappings }];
                }
            }
            
            // Restore the parent mappings
            this.currentMappings = this.mappingStack.pop() || [];
            
            if (node.output.startsWith(this.targetIdToDelete)) {
                this.isWithinFieldToBeDeleted = false;
            }
        }
    }

    getRemainingMappings(): Mapping[] {
        return this.currentMappings;
    }
}
