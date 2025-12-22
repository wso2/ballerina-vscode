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
import { CDService } from "@wso2/ballerina-core";
import { Item, Menu, MenuItem, Popover, Icon } from "@wso2/ui-toolkit";
import { useDiagramContext } from "../../../DiagramContext";
import { MoreVertIcon } from "../../../../resources/icons/nodes/MoreVertIcon";
import { getEntryNodeFunctionPortName } from "../../../../utils/diagram";
import { BaseNodeWidgetProps, EntryNodeModel } from "../EntryNodeModel";
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
    BottomPortWidget
} from "./styles";

// Utility functions specific to AI Service
const getNodeTitle = (model: EntryNodeModel) => {
    const serviceName = (model.node as any)?.serviceName ||
        (model.node as any)?.name ||
        "AI Service";
    return serviceName.replace(/^\//, '');
};

const getNodeDescription = (model: EntryNodeModel) => {
    return (model.node as any)?.description || "";
};

export function AIServiceWidget({ model, engine }: BaseNodeWidgetProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);

    const { onFunctionSelect, onDeleteComponent, readonly } = useDiagramContext();
    const isMenuOpen = Boolean(menuAnchorEl);

    const serviceFunctions = [];
    if ((model.node as CDService).remoteFunctions?.length > 0) {
        serviceFunctions.push(...(model.node as CDService).remoteFunctions);
    }
    if ((model.node as CDService).resourceFunctions?.length > 0) {
        serviceFunctions.push(...(model.node as CDService).resourceFunctions);
    }

    const handleOnClick = () => {
        if (serviceFunctions.length > 0) {
            onFunctionSelect(serviceFunctions[0]);
        }
    };

    const { handleMouseDown, handleMouseUp } = useClickWithDragTolerance(handleOnClick);

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

    return (
        <Node>
            <TopPortWidget port={model.getPort("in")!} engine={engine} />
            <Box hovered={isHovered}>
                <ServiceBox
                    onMouseEnter={() => !readonly && setIsHovered(true)}
                    onMouseLeave={() => !readonly && setIsHovered(false)}
                    onMouseDown={!readonly ? handleMouseDown : undefined}
                    onMouseUp={!readonly ? handleMouseUp : undefined}
                    readonly={readonly}
                >
                    <IconWrapper><Icon name="bi-ai-agent" /></IconWrapper>
                    <Header hovered={isHovered} inactive={readonly}>
                        <Title hovered={isHovered}>{getNodeTitle(model)}</Title>
                        <Description>{getNodeDescription(model)}</Description>
                    </Header>
                    <MenuButton 
                        appearance="icon" 
                        onClick={!readonly ? handleOnMenuClick : undefined}
                        onMouseDown={!readonly ? handleMenuMouseDown : undefined}
                        onMouseUp={!readonly ? handleMenuMouseUp : undefined}
                        disabled={readonly}
                    >
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
            {serviceFunctions.length > 0 && (
                <BottomPortWidget
                    port={model.getPort(getEntryNodeFunctionPortName(serviceFunctions[0]))!}
                    engine={engine}
                />
            )}
        </Node>
    );
}
