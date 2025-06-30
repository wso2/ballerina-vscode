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
import { EntryNodeModel, VIEW_ALL_RESOURCES_PORT_NAME } from "./EntryNodeModel";
import { NODE_BORDER_WIDTH, ENTRY_NODE_WIDTH, ENTRY_NODE_HEIGHT } from "../../../resources/constants";
import { Button, Item, Menu, MenuItem, Popover, ImageWithFallback, ThemeColors, Icon } from "@wso2/ui-toolkit";
import { useDiagramContext } from "../../DiagramContext";
import { HttpIcon, TaskIcon } from "../../../resources";
import { MoreVertIcon } from "../../../resources/icons/nodes/MoreVertIcon";
import { CDAutomation, CDFunction, CDService, CDResourceFunction } from "@wso2/ballerina-core";
import { getEntryNodeFunctionPortName } from "../../../utils/diagram";
type NodeStyleProp = {
    hovered: boolean;
    inactive?: boolean;
};
const Node = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    color: ${ThemeColors.ON_SURFACE};
`;

const Header = styled.div<NodeStyleProp>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: 6px;
    width: 100%;
    cursor: pointer;
`;

const TopPortWidget = styled(PortWidget)`
    margin-top: -3px;
`;

const BottomPortWidget = styled(PortWidget)`
    margin-bottom: -2px;
`;

const FunctionPortWidget = styled(PortWidget)`
`;

const StyledText = styled.div`
    font-size: 14px;
`;

const IconWrapper = styled.div`
    padding: 4px;
    max-width: 32px;
    svg {
        fill: ${ThemeColors.ON_SURFACE};
    }
    > div:first-child {
        width: 24px;
        height: 24px;
        font-size: 24px;
    }
`;

const Title = styled(StyledText) <NodeStyleProp>`
    max-width: ${ENTRY_NODE_WIDTH - 80}px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: "GilmerMedium";
    color: ${(props: NodeStyleProp) => (props.hovered ? ThemeColors.HIGHLIGHT : ThemeColors.ON_SURFACE)};
    opacity: ${(props: NodeStyleProp) => (props.inactive && !props.hovered ? 0.7 : 1)};
`;

const Accessor = styled(StyledText)`
    text-transform: uppercase;
    font-family: "GilmerBold";
`;

const Description = styled(StyledText)`
    font-size: 12px;
    max-width: ${ENTRY_NODE_WIDTH - 80}px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: monospace;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.7;
`;

const Box = styled.div<NodeStyleProp>`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    gap: 8px;
    width: 100%;

    border: ${NODE_BORDER_WIDTH}px solid
        ${(props: NodeStyleProp) => (props.hovered ? ThemeColors.HIGHLIGHT : ThemeColors.OUTLINE_VARIANT)};
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};

    padding: 0 8px 8px 8px;
`;

const ServiceBox = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
    width: ${ENTRY_NODE_WIDTH}px;
    height: ${ENTRY_NODE_HEIGHT}px;
    cursor: pointer;
`;

const FunctionBoxWrapper = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    color: ${ThemeColors.ON_SURFACE};
`;

const StyledServiceBox = styled(ServiceBox) <NodeStyleProp>`
    height: 40px;
    padding: 0 12px;

    border: ${NODE_BORDER_WIDTH}px solid
        ${(props: NodeStyleProp) => (props.hovered ? ThemeColors.HIGHLIGHT : ThemeColors.OUTLINE_VARIANT)};
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
`;

const MenuButton = styled(Button)`
    border-radius: 5px;
`;

const ViewAllButton = styled(FunctionBoxWrapper)`
    color: ${ThemeColors.PRIMARY};
    height: 40px;
    width: 100%;
    cursor: pointer;
    font-family: "GilmerMedium";
    font-size: 14px;
    &:hover {
        border: 1px solid ${ThemeColors.HIGHLIGHT};
        border-radius: 8px;
    }
`;

const ViewAllButtonWrapper = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    width: 100%;
`;

interface EntryNodeWidgetProps {
    model: EntryNodeModel;
    engine: DiagramEngine;
}

export interface NodeWidgetProps extends Omit<EntryNodeWidgetProps, "children"> { }

export function EntryNodeWidget(props: EntryNodeWidgetProps) {
    const { model, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const { 
        onServiceSelect, 
        onAutomationSelect, 
        onDeleteComponent, 
        onFunctionSelect, 
        expandedNodes,
        onToggleNodeExpansion 
    } = useDiagramContext();
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isMenuOpen = Boolean(menuAnchorEl);

    const handleOnClick = () => {
        if (model.type === "service") {
            onServiceSelect(model.node as CDService);
        } else {
            onAutomationSelect(model.node as CDAutomation);
        }
    };

    const handleToggleExpansion = (event: React.MouseEvent) => {
        event.stopPropagation();
        onToggleNodeExpansion(model.node.uuid);
    };

    const getNodeIcon = () => {
        switch (model.type) {
            case "automation":
                return <TaskIcon />;
            case "service":
                const serviceType = (model.node as CDService)?.type;
                const customIcon = getCustomEntryNodeIcon(serviceType);
                if (customIcon) {
                    return customIcon;
                }
                return <ImageWithFallback imageUrl={(model.node as CDService).icon} fallbackEl={<HttpIcon />} />;
            default:
                return <HttpIcon />;
        }
    };

    const getNodeTitle = () => {
        if (model.node.displayName) {
            return model.node.displayName;
        }
        if ((model.node as CDService).absolutePath) {
            return (model.node as CDService).absolutePath;
        }
        return "";
    };

    const getNodeDescription = () => {
        if (model.type === "automation") {
            return "Automation";
        }
        // Service
        if ((model.node as CDService).type) {
            return (model.node as CDService).type.replace(":Listener", ":Service");
        }
        return "Service";
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
        { id: "delete", label: "Delete", onClick: () => onDeleteComponent(model.node) },
    ];

    const serviceFunctions = [];
    if ((model.node as CDService).remoteFunctions?.length > 0) {
        serviceFunctions.push(...(model.node as CDService).remoteFunctions);
    }
    if ((model.node as CDService).resourceFunctions?.length > 0) {
        serviceFunctions.push(...(model.node as CDService).resourceFunctions);
    }

    const isExpanded = expandedNodes.has(model.node.uuid);
    const hasMoreFunctions = serviceFunctions.length > 3;
    
    let visibleFunctions;
    if (serviceFunctions.length <= 3 || isExpanded) {
        // Show all functions if ≤3 total or if expanded
        visibleFunctions = serviceFunctions;
    } else {
        // Show only first 2 functions when collapsed
        visibleFunctions = serviceFunctions.slice(0, 2);
    }

    if ((model.node as CDService)?.type === "ai:Service") {
        return (
            <Node>
                <TopPortWidget port={model.getPort("in")!} engine={engine} />
                <Box hovered={isHovered}>
                    <ServiceBox
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        onClick={() => { onFunctionSelect(serviceFunctions[0]) }}
                    >
                        <IconWrapper><Icon name="bi-ai-agent" /></IconWrapper>
                        <Header hovered={isHovered} onClick={() => { onFunctionSelect(serviceFunctions[0]) }}>
                            <Title hovered={isHovered}>{getNodeTitle().replace(/^\//, '')}</Title>
                            <Description>{getNodeDescription()}</Description>
                        </Header>
                        <MenuButton appearance="icon" onClick={handleOnMenuClick}>
                            <MoreVertIcon />
                        </MenuButton>
                    </ServiceBox>
                </Box>
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
                <BottomPortWidget port={model.getPort("out")!} engine={engine} />
                <BottomPortWidget port={model.getPort(getEntryNodeFunctionPortName(serviceFunctions[0]))!} engine={engine} />
            </Node>
        );
    }


    return (
        <Node>
            <TopPortWidget port={model.getPort("in")!} engine={engine} />
            <Box hovered={isHovered}>
                <ServiceBox
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={handleOnClick}
                >
                    <IconWrapper>{getNodeIcon()}</IconWrapper>
                    <Header hovered={isHovered} onClick={handleOnClick}>
                        <Title hovered={isHovered}>{getNodeTitle()}</Title>
                        <Description>{getNodeDescription()}</Description>
                    </Header>
                    <MenuButton appearance="icon" onClick={handleOnMenuClick}>
                        <MoreVertIcon />
                    </MenuButton>
                </ServiceBox>
                {visibleFunctions.map((serviceFunction) => (
                    <FunctionBox
                        key={getEntryNodeFunctionPortName(serviceFunction)}
                        func={serviceFunction}
                        model={model}
                        engine={engine}
                    />
                ))}
                {hasMoreFunctions && !isExpanded && (
                    <ViewAllButtonWrapper>
                        <ViewAllButton onClick={handleToggleExpansion}>
                            Show More Resources
                        </ViewAllButton>
                        <PortWidget port={model.getPort(VIEW_ALL_RESOURCES_PORT_NAME)!} engine={engine} />
                    </ViewAllButtonWrapper>
                )}
                {hasMoreFunctions && isExpanded && (
                    <ViewAllButton onClick={handleToggleExpansion}>
                        Show Fewer Resources
                    </ViewAllButton>
                )}
            </Box>
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
            <BottomPortWidget port={model.getPort("out")!} engine={engine} />
        </Node>
    );
}

function FunctionBox(props: { func: CDFunction | CDResourceFunction; model: EntryNodeModel; engine: DiagramEngine }) {
    const { func, model, engine } = props;
    const [isHovered, setIsHovered] = useState(false);
    const { onFunctionSelect } = useDiagramContext();
    const isGraphQL = (model.node as CDService)?.type === "graphql:Service";

    const handleOnClick = () => {
        onFunctionSelect(func);
    };

    const getAccessorDisplay = (accessor: string, isGraphQL: boolean): string => {
        if (!isGraphQL) {
            return accessor;
        }

        if (accessor === "get") return "Query";
        if (accessor === "subscribe") return "Subscription";
        return accessor;
    };

    return (
        <FunctionBoxWrapper>
            <StyledServiceBox
                hovered={isHovered}
                onClick={() => handleOnClick()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {(func as CDResourceFunction).accessor && (
                    <Accessor>{getAccessorDisplay((func as CDResourceFunction).accessor, isGraphQL)}</Accessor>
                )}
                {isGraphQL && !(func as CDResourceFunction).accessor && (func as CDFunction).name && (
                    <Accessor>Mutation</Accessor>
                )}
                {(func as CDResourceFunction).path && (
                    <Title hovered={isHovered}>/{(func as CDResourceFunction).path}</Title>
                )}
                {(func as CDFunction).name && <Title hovered={isHovered}>{(func as CDFunction).name}</Title>}
            </StyledServiceBox>
            <FunctionPortWidget port={model.getPort(getEntryNodeFunctionPortName(func))!} engine={engine} />
        </FunctionBoxWrapper>
    );
}

export function getCustomEntryNodeIcon(type: string) {
    let typePart = type;
    if (type && type.includes(":")) {
        const typeParts = type.split(":");
        typePart = typeParts.at(0);
    }

    switch (typePart) {
        case "tcp":
            return <Icon name="bi-tcp" />;
        case "kafka":
            return <Icon name="bi-kafka" />;
        case "rabbitmq":
            return <Icon name="bi-rabbitmq" sx={{ color: "#f60" }} />;
        case "nats":
            return <Icon name="bi-nats" />;
        case "mqtt":
            return <Icon name="bi-mqtt" sx={{ color: "#606" }} />;
        case "grpc":
            return <Icon name="bi-grpc" />;
        case "graphql":
            return <Icon name="bi-graphql" sx={{ color: "#e535ab" }} />;
        case "java.jms":
            return <Icon name="bi-java" />;
        case "trigger.github":
            return <Icon name="bi-github" />;
        case "http":
            return <Icon name="bi-globe" />;
        default:
            return null;
    }
}
