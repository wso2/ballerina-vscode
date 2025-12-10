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
import { PortWidget } from "@projectstorm/react-diagrams-core";
import { CDAutomation, CDService } from "@wso2/ballerina-core";
import { Item, Menu, MenuItem, Popover, ImageWithFallback, Icon } from "@wso2/ui-toolkit";
import { useDiagramContext } from "../../../DiagramContext";
import { HttpIcon, TaskIcon } from "../../../../resources";
import { MoreVertIcon } from "../../../../resources/icons/nodes/MoreVertIcon";
import { getEntryNodeFunctionPortName } from "../../../../utils/diagram";
import { PREVIEW_COUNT, SHOW_ALL_THRESHOLD } from "../../../Diagram";
import { VIEW_ALL_RESOURCES_PORT_NAME, BaseNodeWidgetProps, EntryNodeModel } from "../EntryNodeModel";
import { useClickWithDragTolerance } from "../../../../hooks/useClickWithDragTolerance";
import {
    Node,
    Box,
    ServiceBox,
    Header,
    Title,
    Description,
    IconWrapper,
    MenuButton,
    TopPortWidget,
    BottomPortWidget,
    ViewAllButton,
    ViewAllButtonWrapper,
    FunctionBoxWrapper,
    StyledServiceBox,
    ResourceAccessor,
    colors
} from "./styles";

const getNodeTitle = (model: EntryNodeModel) => {
    if (model.node.displayName) {
        return model.node.displayName;
    }
    if ((model.node as CDService).absolutePath) {
        return (model.node as CDService).absolutePath.replace(/\\/g, "");
    }
    return "";
};

const getNodeDescription = (model: EntryNodeModel) => {
    if (model.type === "automation") {
        return "Automation";
    }
    // Service
    if ((model.node as CDService).type) {
        return (model.node as CDService).type.replace(":Listener", ":Service");
    }
    return "Service";
};

function getColorByMethod(method: string) {
    switch (method.toUpperCase()) {
        case "GET":
            return colors.GET;
        case "PUT":
            return colors.PUT;
        case "POST":
            return colors.POST;
        case "DELETE":
            return colors.DELETE;
        case "PATCH":
            return colors.PATCH;
        case "OPTIONS":
            return colors.OPTIONS;
        case "HEAD":
            return colors.HEAD;
        default:
            return '#876036'; // Default color
    }
}

function getCustomEntryNodeIcon(type: string) {
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
        case "mcp":
            return <Icon name="bi-mcp" />;
        case "solace":
            return <Icon name="bi-solace" sx={{ color: "#00C895" }}/>;
        default:
            return null;
    }
}

function FunctionBox(props: { func: any; model: EntryNodeModel; engine: any }) {
    const { func, model, engine } = props;
    const [isHovered, setIsHovered] = useState(false);
    const { onFunctionSelect } = useDiagramContext();

    const handleOnClick = () => {
        onFunctionSelect(func);
    };

    return (
        <FunctionBoxWrapper>
            <StyledServiceBox
                hovered={isHovered}
                onClick={() => handleOnClick()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {func.accessor && (
                    <ResourceAccessor color={getColorByMethod(func.accessor)}>
                        {func.accessor}
                    </ResourceAccessor>
                )}
                {func.path && (
                    <Title hovered={isHovered}>
                        {`/${func.path.replace(/\\/g, "")}`}
                    </Title>
                )}
                {func.name && <Title hovered={isHovered}>{func.name}</Title>}
            </StyledServiceBox>
            <PortWidget port={model.getPort(getEntryNodeFunctionPortName(func))!} engine={engine} />
        </FunctionBoxWrapper>
    );
}

export function GeneralServiceWidget({ model, engine }: BaseNodeWidgetProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);

    const {
        onServiceSelect,
        onAutomationSelect,
        onDeleteComponent,
        expandedNodes,
        onToggleNodeExpansion
    } = useDiagramContext();

    const isMenuOpen = Boolean(menuAnchorEl);

    const handleOnClick = () => {
        if (model.type === "service") {
            onServiceSelect(model.node as CDService);
        } else {
            onAutomationSelect(model.node as CDAutomation);
        }
    };

    const { handleMouseDown, handleMouseUp } = useClickWithDragTolerance(handleOnClick);

    const handleToggleExpansion = (event: React.MouseEvent) => {
        event.stopPropagation();
        onToggleNodeExpansion(model.node.uuid);
    };

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
    };

    const handleOnMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleMenuMouseDown = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    const handleMenuMouseUp = (event: React.MouseEvent) => {
        event.stopPropagation();
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
    if (serviceFunctions.length <= SHOW_ALL_THRESHOLD || isExpanded) {
        visibleFunctions = serviceFunctions;
    } else {
        visibleFunctions = serviceFunctions.slice(0, PREVIEW_COUNT);
    }

    const nodeIcon = (() => {
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
    })();

    return (
        <Node>
            <TopPortWidget port={model.getPort("in")!} engine={engine} />
            <Box hovered={isHovered}>
                <ServiceBox
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                >
                    <IconWrapper>{nodeIcon}</IconWrapper>
                    <Header hovered={isHovered}>
                        <Title hovered={isHovered}>{getNodeTitle(model)}</Title>
                        <Description>{getNodeDescription(model)}</Description>
                    </Header>
                    <MenuButton 
                        appearance="icon" 
                        onClick={handleOnMenuClick}
                        onMouseDown={handleMenuMouseDown}
                        onMouseUp={handleMenuMouseUp}
                    >
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
