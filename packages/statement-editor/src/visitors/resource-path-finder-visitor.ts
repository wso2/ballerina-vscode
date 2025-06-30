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
import {
    ResourceAccessorDefinition,
    Visitor
} from "@wso2/syntax-tree";

interface MethodPath {
    method: string;
    path: string;
}

export class ResourcePathFinderVisitor implements Visitor {

    matchingPaths: MethodPath[] = [];
    isEditing: boolean;
    new: MethodPath;
    current: MethodPath;
    validPath: boolean;

    constructor(isEditing: boolean, newMethodPath: MethodPath, currentMethodPath: MethodPath) {
        this.new = newMethodPath;
        this.current = currentMethodPath;
        this.matchingPaths = [];
        this.isEditing = isEditing;
        this.validPath = false;
    }

    public beginVisitResourceAccessorDefinition(node: ResourceAccessorDefinition) {
        const method = node.functionName.value.toUpperCase();
        const path = node.relativeResourcePath.length > 0 ? node.relativeResourcePath[0].value : "";

        if (this.isEditing) {
            if ((this.current.method !== method && this.current.path !== path) && (this.new.method === method && this.new.path === path)) {
                this.matchingPaths.push(this.new);
            }
        } else {
            if (this.new.method === method && this.new.path === path) {
                this.matchingPaths.push(this.new);
            }
        }

    }

    getResourcePathValidity(): boolean {
        return this.matchingPaths.length === 0;
    }
}
