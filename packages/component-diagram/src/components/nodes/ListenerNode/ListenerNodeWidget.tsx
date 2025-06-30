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
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { ListenerNodeModel } from "./ListenerNodeModel";
import {
    NODE_BORDER_WIDTH,
    LISTENER_NODE_WIDTH,
    AUTOMATION_LISTENER,
    LISTENER_NODE_HEIGHT,
} from "../../../resources/constants";
import { Button, Item, MenuItem, Menu, Popover, ThemeColors } from "@wso2/ui-toolkit";
import { ClockIcon, ListenIcon } from "../../../resources";
import { useDiagramContext } from "../../DiagramContext";
import { CDListener } from "@wso2/ballerina-core";
import { MoreVertIcon } from "../../../resources/icons/nodes/MoreVertIcon";

type NodeStyleProp = {
    hovered: boolean;
    inactive?: boolean;
};
const Node = styled.div<NodeStyleProp>`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    height: ${LISTENER_NODE_HEIGHT}px;
    width: ${LISTENER_NODE_WIDTH}px;
    color: ${ThemeColors.ON_SURFACE};
    cursor: pointer;
`;

const Row = styled.div<NodeStyleProp>`
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    gap: 12px;
`;

const Header = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
`;

const Circle = styled.div<NodeStyleProp>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: ${LISTENER_NODE_HEIGHT}px;
    height: ${LISTENER_NODE_HEIGHT}px;
    border: ${NODE_BORDER_WIDTH}px solid
        ${(props: NodeStyleProp) => (props.hovered ? ThemeColors.HIGHLIGHT : ThemeColors.OUTLINE_VARIANT)};
    border-radius: 50%;
    background-color: ${ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
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

const Icon = styled.div`
    padding: 4px;
    svg {
        fill: ${ThemeColors.ON_SURFACE};
    }
`;

const MenuButton = styled(Button)`
    border-radius: 5px;      
`;

const Title = styled(StyledText) <NodeStyleProp>`
    max-width: ${LISTENER_NODE_WIDTH - LISTENER_NODE_HEIGHT}px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: "GilmerMedium";
    color: ${(props: NodeStyleProp) => (props.hovered ? ThemeColors.HIGHLIGHT : ThemeColors.ON_SURFACE)};
    opacity: ${(props: NodeStyleProp) => (props.inactive && !props.hovered ? 0.7 : 1)};
`;

const Description = styled(StyledText)`
    font-size: 12px;
    max-width: ${LISTENER_NODE_WIDTH - LISTENER_NODE_HEIGHT}px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: monospace;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.7;
`;

interface ListenerNodeWidgetProps {
    model: ListenerNodeModel;
    engine: DiagramEngine;
}

export interface NodeWidgetProps extends Omit<ListenerNodeWidgetProps, "children"> { }

export function ListenerNodeWidget(props: ListenerNodeWidgetProps) {
    const { model, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const { onListenerSelect, onDeleteComponent } = useDiagramContext();
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isMenuOpen = Boolean(menuAnchorEl);


    const handleOnClick = () => {
        onListenerSelect(model.node as CDListener);
    };

    const getNodeIcon = () => {
        if (model.node.type === AUTOMATION_LISTENER) {
            return <ClockIcon />;
        }
        return <ListenIcon />;
    };

    const getNodeTitle = () => {
        if (model.node.symbol === "ANON") {
            return "";
        }
        return model.node.symbol;
    };

    const getNodeDescription = () => {
        if (model.node?.type === AUTOMATION_LISTENER) {
            return "Schedule";
        }
        if (model.node.type) {
            return model.node.type;
        }
        return "Listener";
    };

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
    };

    const handleOnMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const menuItems: Item[] = [
        { id: "edit", label: "Edit", onClick: () => handleOnClick() },

        ...((!model.node.attachedServices || model.node.attachedServices.length === 0)
            ? [{ id: "delete", label: "Delete", onClick: () => onDeleteComponent(model.node) }]
            : [])
    ];

    return (
        <Node
            hovered={isHovered}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleOnClick}
        >
            <Row hovered={isHovered}>
                <Circle hovered={isHovered}>
                    <LeftPortWidget port={model.getPort("in")!} engine={engine} />
                    <Icon>{getNodeIcon()}</Icon>

                    <RightPortWidget port={model.getPort("out")!} engine={engine} />
                </Circle>
                <MenuButton appearance="icon" onClick={handleOnMenuClick}>
                    <MoreVertIcon />
                </MenuButton>
                <Header>
                    <Title hovered={isHovered}>{getNodeTitle()}</Title>
                    <Description>{getNodeDescription()}</Description>
                </Header>
            </Row>

            <Popover
                open={isMenuOpen}
                anchorEl={menuAnchorEl}
                handleClose={handleOnMenuClose}
                sx={{
                    padding: 0,
                    borderRadius: 0,
                }}
            >
                <Menu>
                    {menuItems.map((item) => (
                        <MenuItem key={item.id} item={item} />
                    ))}
                </Menu>
            </Popover>
        </Node>
    );
}
