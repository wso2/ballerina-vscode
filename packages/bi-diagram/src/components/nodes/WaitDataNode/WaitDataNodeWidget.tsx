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
import { Button, Icon, Item, Menu, MenuItem, Popover, ThemeColors, Tooltip } from "@wso2/ui-toolkit";
import { FlowNode } from "../../../utils/types";
import { MoreVertIcon } from "../../../resources";
import { useDiagramContext } from "../../DiagramContext";
import { BreakpointMenu } from "../../BreakNodeMenu/BreakNodeMenu";
import { DiagnosticsPopUp } from "../../DiagnosticsPopUp";
import { nodeHasError } from "../../../utils/node";
import { WaitDataNodeModel } from "./WaitDataNodeModel";
import {
    WAIT_DATA_ARROW_WIDTH,
    WAIT_DATA_CIRCLE_SIZE,
    WAIT_DATA_DETAILS_GAP,
    WAIT_DATA_DETAILS_WIDTH,
} from "../../../resources/constants";

const EXTERNAL_DOT_RADIUS = 4;
const EXTERNAL_DOT_STROKE = 2.5;

export namespace NodeStyles {
    export type NodeStyleProp = {
        hovered: boolean;
        hasError: boolean;
        readOnly: boolean;
        isSelected?: boolean;
        isActiveBreakpoint?: boolean;
    };

    export const Node = styled.div<{ readOnly: boolean }>`
        display: flex;
        flex-direction: row;
        align-items: center;
        color: ${ThemeColors.ON_SURFACE};
        cursor: ${(props: { readOnly: boolean }) => (props.readOnly ? "default" : "pointer")};
    `;

    export const CircleColumn = styled.div`
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
        position: relative;
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
    `;

    export const Circle = styled.div<NodeStyleProp>`
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${WAIT_DATA_CIRCLE_SIZE}px;
        height: ${WAIT_DATA_CIRCLE_SIZE}px;
        border-radius: 50%;
        border: 2px solid
            ${(props: NodeStyleProp) =>
                props.hasError
                    ? ThemeColors.ERROR
                    : props.isSelected && !props.readOnly
                    ? ThemeColors.SECONDARY
                    : props.hovered && !props.readOnly
                    ? ThemeColors.SECONDARY
                    : ThemeColors.OUTLINE_VARIANT};
        background-color: ${(props: NodeStyleProp) =>
            props.isActiveBreakpoint ? ThemeColors.DEBUGGER_BREAKPOINT_BACKGROUND : ThemeColors.SURFACE_DIM};
    `;

    export const Details = styled.div`
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: ${WAIT_DATA_DETAILS_WIDTH}px;
        height: ${WAIT_DATA_CIRCLE_SIZE}px;
        margin-left: ${WAIT_DATA_DETAILS_GAP}px;
        min-width: 0;
    `;

    export const TextGroup = styled.div`
        min-width: 0;
        flex: 1;
    `;

    export const Title = styled.div`
        font-size: 14px;
        font-family: "GilmerMedium";
        line-height: 16px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;

    export const Subtitle = styled.div`
        font-size: 12px;
        line-height: 14px;
        font-family: monospace;
        opacity: 0.7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;

    export const ActionButtonGroup = styled.div`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
    `;

    export const MenuButton = styled(Button)`
        border-radius: 5px;
    `;
}

interface WaitDataNodeWidgetProps {
    model: WaitDataNodeModel;
    engine: DiagramEngine;
    onClick?: (node: FlowNode) => void;
}

export function WaitDataNodeWidget(props: WaitDataNodeWidgetProps) {
    const { model, engine, onClick } = props;
    const { onNodeSelect, goToSource, onDeleteNode, removeBreakpoint, addBreakpoint, readOnly, selectedNodeId } =
        useDiagramContext();

    const [isHovered, setIsHovered] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const [menuButtonElement, setMenuButtonElement] = useState<HTMLElement | null>(null);
    const isMenuOpen = Boolean(menuAnchorEl);

    const isSelected = selectedNodeId === model.node.id;
    const hasBreakpoint = model.hasBreakpoint();
    const isActiveBreakpoint = model.isActiveBreakpoint();
    const hasError = nodeHasError(model.node);
    const nodeTitle = model.node.metadata.label || "Wait Data";
    const nodeSubtitle =
        (model.node.properties?.variable?.value as string) ||
        (model.node.properties?.type?.value as string) ||
        "";

    // Compute layout positions for the external arrow SVG
    const circleRadius = WAIT_DATA_CIRCLE_SIZE / 2;
    const svgWidth = model.node.viewState?.lw ? model.node.viewState.lw - circleRadius : WAIT_DATA_ARROW_WIDTH;
    const svgHeight = WAIT_DATA_CIRCLE_SIZE;
    const svgMidY = svgHeight / 2;
    const dotCx = EXTERNAL_DOT_RADIUS + EXTERNAL_DOT_STROKE;
    const lineX1 = dotCx + EXTERNAL_DOT_RADIUS + 4;
    const arrowColor = isHovered && !readOnly ? ThemeColors.SECONDARY : ThemeColors.ON_SURFACE;

    const selectNode = () => {
        onClick && onClick(model.node);
        onNodeSelect && onNodeSelect(model.node);
        setMenuAnchorEl(null);
    };

    const handleOnClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) {
            return;
        }
        if (event.metaKey) {
            goToSource && goToSource(model.node);
            return;
        }
        selectNode();
    };

    const deleteNode = () => {
        onDeleteNode && onDeleteNode(model.node);
        setMenuAnchorEl(null);
    };

    const onAddBreakpoint = () => {
        addBreakpoint && addBreakpoint(model.node);
        setMenuAnchorEl(null);
    };

    const onRemoveBreakpoint = () => {
        removeBreakpoint && removeBreakpoint(model.node);
        setMenuAnchorEl(null);
    };

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        event.stopPropagation();
        if (readOnly) {
            return;
        }
        setMenuAnchorEl(event.currentTarget);
    };

    const handleOnContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (readOnly) {
            return;
        }
        setMenuAnchorEl(menuButtonElement || event.currentTarget);
    };

    const handleOnMenuClose = () => {
        setMenuAnchorEl(null);
        setIsHovered(false);
    };

    const menuItems: Item[] = [
        {
            id: "edit",
            label: "Edit",
            onClick: () => selectNode(),
        },
        {
            id: "goToSource",
            label: "Source",
            onClick: () => {
                goToSource && goToSource(model.node);
                setMenuAnchorEl(null);
            },
        },
        { id: "delete", label: "Delete", onClick: () => deleteNode() },
    ];

    return (
        <NodeStyles.Node
            readOnly={readOnly}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onContextMenu={!readOnly ? handleOnContextMenu : undefined}
        >
            {/* Left: External input dot + dashed arrow (SVG) */}
            <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{ flexShrink: 0 }}
            >
                <circle
                    cx={dotCx}
                    cy={svgMidY}
                    r={EXTERNAL_DOT_RADIUS}
                    fill="none"
                    stroke={arrowColor}
                    strokeWidth={EXTERNAL_DOT_STROKE}
                />
                <line
                    x1={lineX1}
                    y1={svgMidY}
                    x2={svgWidth}
                    y2={svgMidY}
                    stroke={arrowColor}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    markerEnd={`url(#${model.node.id}-wait-arrow)`}
                />
                <defs>
                    <marker
                        id={`${model.node.id}-wait-arrow`}
                        markerWidth="4"
                        markerHeight="4"
                        refX="3"
                        refY="2"
                        viewBox="0 0 4 4"
                        orient="auto"
                    >
                        <polygon points="0,4 0,0 4,2" fill={arrowColor} />
                    </marker>
                </defs>
            </svg>

            {/* Center: Circle with ports above and below */}
            <NodeStyles.CircleColumn>
                <NodeStyles.TopPortWidget port={model.getPort("in")!} engine={engine} />
                {hasBreakpoint && (
                    <div
                        style={{
                            position: "absolute",
                            left: -10,
                            top: 0,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: "red",
                        }}
                    />
                )}
                <Tooltip content={nodeTitle}>
                    <NodeStyles.Circle
                        hovered={isHovered}
                        hasError={hasError}
                        readOnly={readOnly}
                        isSelected={isSelected}
                        isActiveBreakpoint={isActiveBreakpoint}
                        onClick={handleOnClick}
                    >
                        <Icon name="bi-pause" sx={{ fontSize: 32, width: 32, height: 32, color: ThemeColors.ON_SURFACE }} />
                    </NodeStyles.Circle>
                </Tooltip>
                <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
            </NodeStyles.CircleColumn>

            {/* Right: Title, subtitle, and action buttons */}
            <NodeStyles.Details onClick={handleOnClick}>
                <NodeStyles.TextGroup>
                    <NodeStyles.Title>{nodeTitle}</NodeStyles.Title>
                    <NodeStyles.Subtitle>{nodeSubtitle}</NodeStyles.Subtitle>
                </NodeStyles.TextGroup>
                <NodeStyles.ActionButtonGroup>
                    {hasError && <DiagnosticsPopUp node={model.node} />}
                    <NodeStyles.MenuButton
                        ref={setMenuButtonElement}
                        buttonSx={readOnly ? { cursor: "not-allowed" } : {}}
                        appearance="icon"
                        onClick={handleOnMenuClick}
                    >
                        <MoreVertIcon />
                    </NodeStyles.MenuButton>
                </NodeStyles.ActionButtonGroup>
            </NodeStyles.Details>

            {/* Context menu */}
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
                    <>
                        {menuItems.map((item) => (
                            <MenuItem key={item.id} item={item} />
                        ))}
                        <BreakpointMenu
                            hasBreakpoint={hasBreakpoint}
                            onAddBreakpoint={onAddBreakpoint}
                            onRemoveBreakpoint={onRemoveBreakpoint}
                        />
                    </>
                </Menu>
            </Popover>
        </NodeStyles.Node>
    );
}
