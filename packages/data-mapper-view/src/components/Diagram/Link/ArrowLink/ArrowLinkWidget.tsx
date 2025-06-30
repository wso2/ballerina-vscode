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
import React from "react";

import { ArrowLinkModel } from "./ArrowLinkModel";

interface ArrowLinkWidgetProps {
    link: ArrowLinkModel;
}
  
export function ArrowLinkWidget(props: ArrowLinkWidgetProps) {
    const { link } = props;

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
                stroke={"var(--vscode-editorBracketMatch-border)"}
                strokeWidth={2}
                strokeDasharray={"0"}
                markerEnd="url(#arrowhead)"
            />
            <defs>
                <marker
                    markerWidth="4"
                    markerHeight="4"
                    refX="3"
                    refY="2"
                    viewBox="0 0 4 4"
                    orient="auto"
                    id="arrowhead"
                >
                    <polygon
                        points="0,4 0,0 4,2"
                        fill={"var(--vscode-editorBracketMatch-border)"}
                    ></polygon>
                </marker>
            </defs>
        </g>
    );
};
