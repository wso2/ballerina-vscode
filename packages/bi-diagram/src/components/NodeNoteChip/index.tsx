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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Button, Item, Menu, MenuItem, Popover } from "@wso2/ui-toolkit";
import { FlowNode } from "../../utils/types";
import { useDiagramContext } from "../DiagramContext";
import { MoreVertIcon } from "../../resources";

const ChipButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border-radius: 10px;
    font-size: 11px;
    padding: 2px 7px 2px 5px;
    height: 20px;
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border: none;
    cursor: pointer;
    opacity: 0.85;
    white-space: nowrap;
    &:hover {
        opacity: 1;
    }
    svg {
        fill: currentColor;
        flex-shrink: 0;
    }
`;

const ChipLabel = styled.span`
    font-size: 11px;
    font-family: "GilmerMedium";
    line-height: 1;
`;

const NotePopoverContent = styled.div`
    padding: 10px 4px 10px 12px;
    max-width: 280px;
    min-width: 180px;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6px;
`;

const NoteText = styled.p`
    font-size: 13px;
    font-family: monospace;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    opacity: 0.85;
    flex: 1;
    padding-top: 2px;
`;

const MenuButton = styled(Button)`
    border-radius: 5px;
    flex-shrink: 0;
`;

interface NodeNoteChipProps {
    commentNode: FlowNode;
    onOpen?: () => void;
    onClose?: () => void;
}

export function NodeNoteChip({ commentNode, onOpen, onClose }: NodeNoteChipProps) {
    const { onNodeSelect, onDeleteNode, goToSource, readOnly } = useDiagramContext();
    const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement>(null);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | SVGSVGElement>(null);

    const commentText =
        commentNode.metadata?.description ||
        (commentNode.properties as any)?.comment?.value ||
        "";

    const handleChipClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setPopoverAnchor(e.currentTarget);
        onOpen?.();
    };

    const handlePopoverClose = () => {
        setPopoverAnchor(null);
        onClose?.();
    };

    const handleMenuOpen = (e: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleEdit = () => {
        onNodeSelect && onNodeSelect(commentNode);
        setMenuAnchor(null);
        setPopoverAnchor(null);
    };

    const handleGoToSource = () => {
        goToSource && goToSource(commentNode);
        setMenuAnchor(null);
        setPopoverAnchor(null);
    };

    const handleDelete = () => {
        onDeleteNode && onDeleteNode(commentNode);
        setMenuAnchor(null);
        setPopoverAnchor(null);
    };

    const menuItems: Item[] = [
        { id: "edit", label: "Edit", onClick: handleEdit },
        { id: "goToSource", label: "Source", onClick: handleGoToSource },
        { id: "delete", label: "Delete", onClick: handleDelete },
    ];

    return (
        <>
            <ChipButton onClick={handleChipClick}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                    <path d="m6 18l-2.3 2.3q-.475.475-1.088.213T2 19.575V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-.85-2H20V4H4v13.125zM4 16V4zm3-2h6q.425 0 .713-.288T14 13t-.288-.712T13 12H7q-.425 0-.712.288T6 13t.288.713T7 14m0-3h10q.425 0 .713-.288T18 10t-.288-.712T17 9H7q-.425 0-.712.288T6 10t.288.713T7 11m0-3h10q.425 0 .713-.288T18 7t-.288-.712T17 6H7q-.425 0-.712.288T6 7t.288.713T7 8" />
                </svg>
                <ChipLabel>Note</ChipLabel>
            </ChipButton>

            {/* Note content popup */}
            <Popover
                open={Boolean(popoverAnchor)}
                anchorEl={popoverAnchor}
                handleClose={handlePopoverClose}
                sx={{ padding: 0, borderRadius: "6px" }}
            >
                <NotePopoverContent>
                    <NoteText>{commentText || "..."}</NoteText>
                    {!readOnly && (
                        <>
                            <MenuButton appearance="icon" onClick={handleMenuOpen}>
                                <MoreVertIcon />
                            </MenuButton>
                            <Popover
                                open={Boolean(menuAnchor)}
                                anchorEl={menuAnchor}
                                handleClose={handleMenuClose}
                                sx={{ padding: 0, borderRadius: 0 }}
                            >
                                <Menu>
                                    {menuItems.map((item) => (
                                        <MenuItem key={item.id} item={item} />
                                    ))}
                                </Menu>
                            </Popover>
                        </>
                    )}
                </NotePopoverContent>
            </Popover>
        </>
    );
}
