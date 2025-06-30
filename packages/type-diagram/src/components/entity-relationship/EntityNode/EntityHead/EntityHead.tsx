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
import { Button, Item, Menu, MenuItem, Popover } from '@wso2/ui-toolkit';
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

// const EditIconContainer = styled.div`
//     z-index: 1000;
//     cursor: pointer;
// `;

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

export function EntityHeadWidget(props: ServiceHeadProps) {
    const { engine, node, isSelected } = props;
    const { setFocusedNodeId, onEditNode, goToSource } = useContext(DiagramContext);

    const displayName: string = node.getID()?.slice(node.getID()?.lastIndexOf(':') + 1);

    const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isMenuOpen = Boolean(anchorEl);

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const onNodeEdit = () => {
        if (onEditNode) {
            if (node.isGraphqlRoot) {
                onEditNode(node.getID(), true);
            } else {
                onEditNode(node.getID());
            }
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

    const menuItems: Item[] = [
        {
            id: "edit",
            label: "Edit",
            onClick: () => onNodeEdit(),
        },
        { id: "goToSource", label: "Source", onClick: () => onGoToSource() },
        { id: "focusView", label: "Focused View", onClick: () => onFocusedView() }
    ];

    const isClickable = true;


    return (
        <CtrlClickGo2Source node={node.entityObject}>
            <EntityHead
                isSelected={isSelected}
                data-testid={`entity-head-${displayName}`}
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
                            isClickable={isClickable}
                            onClick={onNodeEdit}
                            onDoubleClick={onFocusedView}
                        >
                            {displayName}
                        </EntityName>
                    </EntityNameContainer>
                    <HeaderButtonsContainer>
                        {/* {selectedNodeId === node.getID() && (
                            <EditIconContainer>
                                <Button
                                    appearance="icon"
                                    tooltip="Edit Type">
                                    <Icon
                                        name="editIcon"
                                        sx={{ height: "14px", width: "14px" }}
                                        onClick={onNodeEdit}
                                        iconSx={{ color: ThemeColors.PRIMARY }}
                                    />
                                </Button>
                            </EditIconContainer>
                        )} */}
                        <MenuButton appearance="icon" onClick={handleOnMenuClick}>
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
                    </Menu>
                </Popover>
            </EntityHead>
        </CtrlClickGo2Source>
    )
}
