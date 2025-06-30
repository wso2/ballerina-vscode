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

import { NodeTypes } from "../../../resources/constants";
import { BaseNodeModel } from "../BaseNode";

export class ContainerNodeModel extends BaseNodeModel {
    protected visible: boolean;
    readonly breakpointPercent: number;
    readonly label: string;

    constructor(id: string, width?: number, height?: number, breakpointPercent?: number, label?: string) {
        super({
            id,
            type: NodeTypes.CONTAINER_NODE,
        });
        this.width = width;
        this.height = height;
        this.breakpointPercent = breakpointPercent || 0;
        this.label = label || "";
    }

    isVisible(): boolean {
        return this.visible;
    }
}
