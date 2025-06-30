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
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { ThemeColors } from "@wso2/ui-toolkit";
import { PointNodeModel } from "./PointNodeModel";
import { BORDER_WIDTH, EMPTY_NODE_WIDTH } from "../../../resources/constants";

namespace PointNodeStyles {
    export const Node = styled.div`
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    export type CircleStyleProp = {
        show: boolean;
    };
    export const Circle = styled.div<CircleStyleProp>`
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        width: ${EMPTY_NODE_WIDTH}px;
        height: ${EMPTY_NODE_WIDTH}px;
        border-radius: 50%;
        border: ${BORDER_WIDTH}px solid ${(props: CircleStyleProp) => (props.show ? ThemeColors.PRIMARY : "transparent")};
        background-color: ${(props: CircleStyleProp) => (props.show ? ThemeColors.PRIMARY_CONTAINER : "transparent")};
    `;

    export const TopPortWidget = styled(PortWidget)``;

    export const BottomPortWidget = styled(PortWidget)``;
}

interface PointNodeWidgetProps {
    node: PointNodeModel;
    engine: DiagramEngine;
}

export function PointNodeWidget(props: PointNodeWidgetProps) {
    const { node, engine } = props;

    return (
        <PointNodeStyles.Node>
            <PointNodeStyles.Circle show={node.isVisible()}>
                <PointNodeStyles.TopPortWidget port={node.getLeftPort()!} engine={engine} />
                <PointNodeStyles.BottomPortWidget port={node.getRightPort()!} engine={engine} />
            </PointNodeStyles.Circle>
        </PointNodeStyles.Node>
    );
}
