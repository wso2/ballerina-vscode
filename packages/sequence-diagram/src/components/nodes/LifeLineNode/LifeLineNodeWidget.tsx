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
import styled from "@emotion/styled";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { LifeLineNodeModel } from "./LifeLineNodeModel";
import { BORDER_WIDTH } from "../../../resources/constants";
import { ThemeColors } from "@wso2/ui-toolkit";
namespace LifeLineNodeStyles {
    export type BoxStyleProp = {
        width: number;
        height: number;
    };
    export const Box = styled.div<BoxStyleProp>`
        display: flex;
        justify-content: center;
        align-items: center;
        width: ${(props: BoxStyleProp) => props.width}px;
        height: ${(props: BoxStyleProp) => props.height}px;
    `;
}

interface LifeLineNodeWidgetProps {
    node: LifeLineNodeModel;
    engine: DiagramEngine;
}

export function LifeLineNodeWidget(props: LifeLineNodeWidgetProps) {
    const { node } = props;

    return (
        <LifeLineNodeStyles.Box width={node.width} height={node.height}>
            <svg width={node.width} height={node.height}>
                <rect
                    width={node.width}
                    height={node.height}
                    strokeWidth={BORDER_WIDTH}
                    fill={ThemeColors.OUTLINE_VARIANT}
                    rx="4"
                />
            </svg>
        </LifeLineNodeStyles.Box>
    );
}
