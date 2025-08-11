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

import React, { useContext, useState } from 'react';
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { EntityPortWidget } from '../../EntityPort/EntityPortWidget';
import { EntityModel } from '../EntityModel';
import { EntityHead, EntityName } from '../styles';
import { CtrlClickGo2Source } from '../../../common/CtrlClickHandler/CtrlClickGo2Source';
import { DiagramContext } from '../../../common';
import styled from '@emotion/styled';
import { Button, Confirm, Item, Menu, MenuItem, Popover, ThemeColors, Tooltip } from '@wso2/ui-toolkit';
import { MoreVertIcon } from '../../../../resources';
import { GraphQLIcon } from '../../../../resources/assets/icons/GraphqlIcon';

interface ServiceHeadProps {
    engine: DiagramEngine;
    node: EntityModel;
    isSelected: boolean;
}

const MenuButton = styled(Button)`
    border-radius: 5px;
`;

const HeaderButtonsContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-left: auto;
    justify-content: flex-end;
    width: 45px;
`;

const EntityNameContainer = styled.div`
    flex: 1;
    justify-content: flex-start;
    display: flex;
    align-items: center;
    padding: 8px;
`;

const HeaderWrapper = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
`;

const ImportedLabel = styled.span`
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    border-radius: 3px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-family: GilmerRegular;
    font-size: 10px;
    height: 20px;
    line-height: 20px;
    padding: 0 6px;
    margin-left: 8px;
    white-space: nowrap;
`;

interface Origin {
    vertical: "top" | "center" | "bottom";
    horizontal: "left" | "center" | "right";
}

export function EntityHeadWidget(props: ServiceHeadProps) {
    const { engine, node, isSelected } = props;
    const { setFocusedNodeId, onEditNode, goToSource, onNodeDelete } = useContext(DiagramContext);

    const displayName: string = node.getID()?.slice(node.getID()?.lastIndexOf(':') + 1);
    const isImported = !node?.entityObject?.editable;

    const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isMenuOpen = Boolean(anchorEl);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false); // Change setConfirmOpen to setIsConfirmOpen
    const [confirmEl, setConfirmEl] = React.useState<HTMLElement | SVGSVGElement | null>(null);
    const [anchorOrigin, setAnchorOrigin] = useState<Origin>({ vertical: "bottom", horizontal: "left" });
    const [transformOrigin, setTransformOrigin] = useState<Origin>({ vertical: "top", horizontal: "right" });

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const onNodeEdit = () => {
        if (onEditNode && node?.entityObject?.editable) {
            if (node.isGraphqlRoot) {
                onEditNode(node.getID(), true);
            } else {
                onEditNode(node.getID());
            }
        }
        setAnchorEl(null);
    };

    const onNodeDeleteWithConfirm = () => {
        // Filter only the directional ports (left, right, bottom, top)
        const directionalPorts = Object.entries(node.getPorts()).filter(([portKey, ]) => {
            return portKey === `left-${node.getID()}` ||
               portKey === `right-${node.getID()}` ||
               portKey === `bottom-${node.getID()}` ||
               portKey === `top-${node.getID()}`;
        });

        // Get all links from these directional ports
        const links = directionalPorts.flatMap(([, port]) => {
            return Object.values(port.getLinks());
        });

        // Check if there are any links
        if (links.length > 0) {
            console.log("Node has connections, cannot delete");

            // You can show a message to user or just return
            setAnchorEl(null);
            return;
        }

        // Proceed with deletion only if no links exist
        if (node?.entityObject?.editable && onNodeDelete) {
            onNodeDelete(node.getID());
        }
        setAnchorEl(null);
    };

    const onGoToSource = () => {
        goToSource(node.entityObject);
        setAnchorEl(null);
    };

    const onFocusedView = () => {
        setFocusedNodeId && setFocusedNodeId(node.getID());
        setAnchorEl(null);
    }

    const handleDeleteClick = () => {
        // Calculate position based on current anchorEl (menu button)
        if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            if (spaceBelow < 200 && spaceAbove > 200) {
                setAnchorOrigin({ vertical: "top", horizontal: "left" });
                setTransformOrigin({ vertical: "bottom", horizontal: "right" });
            } else {
                setAnchorOrigin({ vertical: "bottom", horizontal: "left" });
                setTransformOrigin({ vertical: "top", horizontal: "right" });
            }
            
            setConfirmEl(anchorEl); // Use the menu button as anchor
        }
        
        setAnchorEl(null); // Close the menu
        setIsConfirmOpen(true);
    };

    // Check if node has connections
    const hasConnections = () => {
        const directionalPorts = Object.entries(node.getPorts()).filter(([portKey, ]) => {
            return portKey === `left-${node.getID()}` ||
               portKey === `right-${node.getID()}` ||
               portKey === `bottom-${node.getID()}` ||
               portKey === `top-${node.getID()}`;
        });

        const links = directionalPorts.flatMap(([, port]) => {
            return Object.values(port.getLinks());
        });

        return links.length > 0;
    };

    const menuItems: Item[] = [
        ...(node?.entityObject?.editable ? [
            {
                id: "edit",
                label: "Edit",
                onClick: () => onNodeEdit(),
            },
            {
                id: "goToSource", 
                label: "Source", 
                onClick: () => onGoToSource()
            }
        ] : []),
        {
            id: "focusView", 
            label: "Focused View", 
            onClick: () => onFocusedView()
        }
    ];

    const renderDeleteMenuItem = () => {
        const isDisabled = hasConnections();

        if (isDisabled) {
            return (
                <Tooltip
                    key="delete"
                    content="This cannot be deleted unless this is unlinked"
                    position="right"
                >
                    <div style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                        <MenuItem
                            item={{
                                id: "delete",
                                label: "Delete",
                                onClick: () => {} // No-op, actual handler passed to MenuItem below
                            }}
                        />
                    </div>
                </Tooltip>
            );
        }

        return (
            <MenuItem
                key="delete"
                item={{
                id: "delete",
                label: "Delete",
                onClick: handleDeleteClick // Pass the handler here
                }}
            />
        );
    };

    const handleConfirm = (state) => {
        if (state)  {
        onNodeDeleteWithConfirm(); // Call the actual delete function
        }
        setIsConfirmOpen(false); // Close the confirmation dialog
        setConfirmEl(null);
    };

    const isClickable = true;

    return (
        <CtrlClickGo2Source node={node.entityObject}>
            <EntityHead
                isSelected={isSelected}
                data-testid={`type-node-${displayName}`}
            >
                <EntityPortWidget
                    port={node.getPort(`left-${node.getID()}`)}
                    engine={engine}
                />
                <HeaderWrapper>
                    <EntityNameContainer>
                        {node.isGraphqlRoot && (
                            <div style={{ marginRight: "5px", marginTop: "2px" }}>
                                <GraphQLIcon />
                            </div>
                        )}
                        <EntityName
                            isClickable={isClickable && !isImported}
                            onClick={onNodeEdit}
                            onDoubleClick={onFocusedView}
                        >
                            {displayName}
                        </EntityName>
                        {isImported && (
                            <ImportedLabel>
                                Imported Type
                            </ImportedLabel>
                        )}
                    </EntityNameContainer>
                    <HeaderButtonsContainer>
                        <MenuButton appearance="icon" onClick={handleOnMenuClick} data-testid={`type-node-${displayName}-menu`}>
                            <MoreVertIcon />
                        </MenuButton>
                    </HeaderButtonsContainer>
                </HeaderWrapper>
                <EntityPortWidget
                    port={node.getPort(`right-${node.getID()}`)}
                    engine={engine}
                />
                <Popover
                    open={isMenuOpen}
                    anchorEl={anchorEl}
                    handleClose={() => setAnchorEl(null)}
                    sx={{
                        padding: 0,
                        borderRadius: 0
                    }}
                >
                    <Menu>
                        {menuItems.map((item) => (
                            <MenuItem key={item.id} item={item} />
                        ))}
                        {node?.entityObject?.editable && !(node?.isGraphqlRoot) && renderDeleteMenuItem()}
                    </Menu>
                </Popover>
                <Confirm
                    isOpen={isConfirmOpen}
                    onConfirm={handleConfirm}
                    confirmText="Delete"
                    message="Are you sure you want to delete this?"
                    anchorEl={confirmEl}
                    anchorOrigin={anchorOrigin}
                    transformOrigin={transformOrigin}
                    sx={{ zIndex: 3002}}
                />
            </EntityHead>
        </CtrlClickGo2Source>
    )
}
