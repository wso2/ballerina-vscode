/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { ActivityNodeModel } from "./ActivityNodeModel";
import { NODE_BORDER_WIDTH, ACTIVITY_NODE_WIDTH, ACTIVITY_NODE_HEIGHT } from "../../../resources/constants";
import { Icon, ThemeColors } from "@wso2/ui-toolkit";
import { useDiagramContext } from "../../DiagramContext";
import { useClickWithDragTolerance } from "../../../hooks/useClickWithDragTolerance";

type NodeStyleProp = {
    hovered: boolean;
};

const Node = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    height: ${ACTIVITY_NODE_HEIGHT}px;
    color: ${ThemeColors.ON_SURFACE};
`;

const ClickableArea = styled.div<{ readonly?: boolean }>`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
    width: 100%;
    cursor: ${(props) => (props.readonly ? "default" : "pointer")};
`;

const Header = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: 6px;
`;

const Box = styled.div<NodeStyleProp>`
    display: flex;
    justify-content: center;
    align-items: center;
    width: ${ACTIVITY_NODE_HEIGHT}px;
    height: ${ACTIVITY_NODE_HEIGHT}px;
    border: ${NODE_BORDER_WIDTH}px solid
        ${(props: NodeStyleProp) => (props.hovered ? ThemeColors.HIGHLIGHT : ThemeColors.OUTLINE_VARIANT)};
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
    aspect-ratio: 1 / 1;
`;

const LeftPortWidget = styled(PortWidget)`
    margin-top: -3px;
`;

const RightPortWidget = styled(PortWidget)`
    margin-bottom: -2px;
`;

const StyledText = styled.div`
    font-size: 14px;
`;

const Title = styled(StyledText)<NodeStyleProp>`
    max-width: ${ACTIVITY_NODE_WIDTH - 50}px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: "GilmerMedium";
    color: ${(props: NodeStyleProp) => (props.hovered ? ThemeColors.HIGHLIGHT : ThemeColors.ON_SURFACE)};
`;

const Description = styled(StyledText)`
    font-size: 12px;
    max-width: ${ACTIVITY_NODE_WIDTH - ACTIVITY_NODE_HEIGHT}px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: monospace;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.7;
`;

interface ActivityNodeWidgetProps {
    model: ActivityNodeModel;
    engine: DiagramEngine;
}

export function ActivityNodeWidget(props: ActivityNodeWidgetProps) {
    const { model, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const { onFunctionSelect, readonly } = useDiagramContext();

    const handleOnClick = () => {
        onFunctionSelect({ name: model.node.symbol, location: model.node.location });
    };

    const { handleMouseDown, handleMouseUp } = useClickWithDragTolerance(handleOnClick);

    return (
        <Node>
            <LeftPortWidget port={model.getPort("in")!} engine={engine} />
            <ClickableArea
                onMouseEnter={() => !readonly && setIsHovered(true)}
                onMouseLeave={() => !readonly && setIsHovered(false)}
                onMouseDown={!readonly ? handleMouseDown : undefined}
                onMouseUp={!readonly ? handleMouseUp : undefined}
                readonly={readonly}
            >
                <Box hovered={!readonly && isHovered}>
                    <Icon name="bi-task" sx={{ fontSize: 24, width: 24, height: 24 }} />
                </Box>
                <Header>
                    <Title hovered={!readonly && isHovered}>{model.node.symbol}</Title>
                    <Description>Activity</Description>
                </Header>
            </ClickableArea>
            <RightPortWidget port={model.getPort("out")!} engine={engine} />
        </Node>
    );
}
