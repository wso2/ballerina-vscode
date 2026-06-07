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

/** @jsxImportSource @emotion/react */
import React from "react";
import { DiagramEngine } from "@projectstorm/react-diagrams";
import { NodeLinkModel } from "./NodeLinkModel";
import { ThemeColors } from "@wso2/ui-toolkit";
interface NodeLinkWidgetProps {
    link: NodeLinkModel;
    engine: DiagramEngine;
}

export const NodeLinkWidget: React.FC<NodeLinkWidgetProps> = ({ link, engine }) => {
    const start = link.getFirstPoint();
    const end = link.getLastPoint();
    const angle = (Math.atan2(end.getY() - start.getY(), end.getX() - start.getX()) * 180) / Math.PI;
    const upsideDown = angle > 90 || angle < -90;

    const linkColor = link.variant ? ThemeColors.PRIMARY : ThemeColors.PRIMARY;

    return (
        <g pointerEvents={"all"}>
            <path
                id={link.getID() + "-bg"}
                d={link.getSVGPath()}
                fill={"none"}
                stroke={"transparent"}
                strokeWidth={16}
            />
            <path
                id={link.getID()}
                d={link.getSVGPath()}
                fill={"none"}
                stroke={linkColor}
                strokeWidth={1.5}
                markerEnd={link.showArrowToNode() ? `url(#${link.getID()}-arrow-head)` : ""}
            />
            <defs>
                <marker
                    markerWidth="5"
                    markerHeight="5"
                    refX="7"  // Adjusted offset in x axis
                    refY="1.5"
                    viewBox="0 0 3 3"
                    orient="auto"
                    id={`${link.getID()}-arrow-head`}
                >
                    <polygon points="0,3 0,0 3,1.5" fill={linkColor}></polygon>
                </marker>
            </defs>
            <text
                fill={linkColor}
                textAnchor="middle"
                dy={-8}
                transform={upsideDown ? "scale(1, -1)" : ""}
                fontFamily="monospace"
            >
                <textPath href={`#${link.getID()}`} startOffset="50%">
                    {link.label}
                </textPath>
            </text>
        </g>
    );
};
