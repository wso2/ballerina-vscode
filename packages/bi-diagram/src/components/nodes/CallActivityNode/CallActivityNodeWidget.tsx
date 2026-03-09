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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { ThemeColors } from "@wso2/ui-toolkit";
import { BaseNodeWidget } from "../BaseNode";
import { CallActivityNodeModel } from "./CallActivityNodeModel";
import { FlowNode } from "../../../utils/types";
import { NODE_BORDER_WIDTH, NODE_WIDTH } from "../../../resources/constants";
import { useDiagramContext } from "../../DiagramContext";
import { nodeHasError } from "../../../utils/node";

namespace CallActivityStyles {
    export const Wrapper = styled.div`
        position: relative;
        width: ${NODE_WIDTH}px;
    `;

    export const Stripe = styled.div<{ side: "left" | "right"; color: string }>`
        position: absolute;
        top: 3px;
        bottom: 3px;
        width: ${NODE_BORDER_WIDTH}px;
        background-color: ${({ color }) => color};
        pointer-events: none;
        z-index: 1;
        ${({ side }) => (side === "left" ? "left: 8px;" : "right: 8px;")}
    `;
}

interface CallActivityNodeWidgetProps {
    model: CallActivityNodeModel;
    engine: DiagramEngine;
    onClick?: (node: FlowNode) => void;
}

export function CallActivityNodeWidget(props: CallActivityNodeWidgetProps) {
    const { model } = props;
    const { selectedNodeId, readOnly } = useDiagramContext();
    const [isHovered, setIsHovered] = useState(false);
    const isSelected = selectedNodeId === model.node.id;
    const isDisabled = model.node.suggested;
    const hasError = nodeHasError(model.node);

    const stripeColor = hasError
        ? ThemeColors.ERROR
        : isSelected && !isDisabled
            ? ThemeColors.SECONDARY
            : isHovered && !isDisabled && !readOnly
                ? ThemeColors.SECONDARY
                : ThemeColors.OUTLINE_VARIANT;

    return (
        <CallActivityStyles.Wrapper onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <BaseNodeWidget {...props} />
            <CallActivityStyles.Stripe side="left" color={stripeColor} />
            <CallActivityStyles.Stripe side="right" color={stripeColor} />
        </CallActivityStyles.Wrapper>
    );
}
