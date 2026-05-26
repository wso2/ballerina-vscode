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

import { DefaultLinkModel } from "@projectstorm/react-diagrams";
import { ThemeColors } from "@wso2/ui-toolkit";
import { NODE_LINK } from "../../resources/constants";
import { NodeModel } from "../../utils/types";

export const LINK_BOTTOM_OFFSET = 30;

export interface NodeLinkModelOptions {
    label?: string;
    variant?: boolean;
}

export class NodeLinkModel extends DefaultLinkModel {
    label: string;
    sourceNode: NodeModel;
    targetNode: NodeModel;
    // options
    variant = false;

    constructor(label?: string);
    constructor(options: NodeLinkModelOptions);
    constructor(options: NodeLinkModelOptions | string) {
        super({
            type: NODE_LINK,
            width: 10,
            color: ThemeColors.PRIMARY,
            selectedColor: ThemeColors.SECONDARY,
            curvyness: 0,
        });
        if (options) {
            if (typeof options === "string" && options.length > 0) {
                this.label = options;
            } else {
                if ((options as NodeLinkModelOptions).label) {
                    this.label = (options as NodeLinkModelOptions).label;
                }

                if ((options as NodeLinkModelOptions).variant === true) {
                    this.variant = (options as NodeLinkModelOptions).variant;
                }
            }
        }
    }

    setSourceNode(node: NodeModel) {
        this.sourceNode = node;
    }

    setTargetNode(node: NodeModel) {
        this.targetNode = node;
    }

    getSVGPath(): string {
        if (this.points.length != 2) {
            return "";
        }

        const source = this.getFirstPoint().getPosition();
        const target = this.getLastPoint().getPosition();
        let path = `M ${source.x} ${source.y} `;
        path += `L ${target.x} ${target.y}`;
        return path;
    }

    // show node arrow. default true. but target node is a EmptyNodeModel, then false
    showArrowToNode(): boolean {
        if (this.points.length != 2) {
            return false;
        }

        return true;
    }
}
