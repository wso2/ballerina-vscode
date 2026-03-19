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

import React, { ReactNode, useEffect, useState } from "react";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { Item, Menu, MenuItem, Popover, ThemeColors } from "@wso2/ui-toolkit";
import { SendDataNodeModel } from "./SendDataNodeModel";
import { FlowNode } from "../../../utils/types";
import { MoreVertIcon } from "../../../resources";
import NodeIcon from "../../NodeIcon";
import { useDiagramContext } from "../../DiagramContext";
import { DiagnosticsPopUp } from "../../DiagnosticsPopUp";
import { getNodeTitle, nodeHasError } from "../../../utils/node";
import { BreakpointMenu } from "../../BreakNodeMenu/BreakNodeMenu";
import { NodeStyles } from "../ApiCallNode/ApiCallNodeWidget";
import {
    LABEL_HEIGHT,
    NODE_GAP_X,
    NODE_HEIGHT,
} from "../../../resources/constants";

// External dot dimensions (matching WaitDataNode's input dot)
const DOT_RADIUS = 5;
const DOT_STROKE = 2.5;

interface SendDataNodeWidgetProps {
    model: SendDataNodeModel;
    engine: DiagramEngine;
    onClick?: (node: FlowNode) => void;
}

export function SendDataNodeWidget(props: SendDataNodeWidgetProps) {
    const { model, engine, onClick } = props;
    const { onNodeSelect, onConnectionSelect, goToSource, onDeleteNode, removeBreakpoint, addBreakpoint, readOnly, selectedNodeId } =
        useDiagramContext();

    const isSelected = selectedNodeId === model.node.id;

    const [isBoxHovered, setIsBoxHovered] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const [menuButtonElement, setMenuButtonElement] = useState<HTMLElement | null>(null);
    const isMenuOpen = Boolean(anchorEl);
    const hasBreakpoint = model.hasBreakpoint();
    const isActiveBreakpoint = model.isActiveBreakpoint();

    const connectionProperty = model.node.properties?.connection;
    const processFunctionProperty = (model.node.properties as any)?.processFunction;
    const connectionValue = connectionProperty?.value as string | undefined;
    const fallbackEndpointValue = processFunctionProperty?.value as string | undefined;
    const endpointLabel = connectionValue ?? fallbackEndpointValue ?? "";

    useEffect(() => {
        if (model.node.suggested) {
            model.setAroundLinksDisabled(model.node.suggested === true);
        }
    }, [model.node.suggested]);

    useEffect(() => {
        model.setSelected(isSelected);
    }, [isSelected]);

    const handleOnClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) {
            return;
        }
        if (event.metaKey) {
            onGoToSource();
        } else {
            onNodeClick();
        }
    };

    const onNodeClick = () => {
        onClick && onClick(model.node);
        onNodeSelect && onNodeSelect(model.node);
        setAnchorEl(null);
    };

    const onConnectionClick = () => {
        if (readOnly) {
            return;
        }
        if (connectionValue && onConnectionSelect) {
            onConnectionSelect(connectionValue);
        } else {
            onNodeClick();
        }
        setAnchorEl(null);
    };

    const onGoToSource = () => {
        goToSource && goToSource(model.node);
        setAnchorEl(null);
    };

    const deleteNode = () => {
        onDeleteNode && onDeleteNode(model.node);
        setAnchorEl(null);
    };

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        if (readOnly) {
            return;
        }
        setAnchorEl(event.currentTarget);
    };

    const handleOnContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        setAnchorEl(menuButtonElement || event.currentTarget);
    };

    const handleOnMenuClose = () => {
        setAnchorEl(null);
        setIsBoxHovered(false);
    };

    const onAddBreakpoint = () => {
        addBreakpoint && addBreakpoint(model.node);
        setAnchorEl(null);
    };

    const onRemoveBreakpoint = () => {
        removeBreakpoint && removeBreakpoint(model.node);
        setAnchorEl(null);
    };

    const menuItems: Item[] = [
        {
            id: "edit",
            label: "Edit",
            onClick: () => onNodeClick(),
        },
        { id: "goToSource", label: "Source", onClick: () => onGoToSource() },
        { id: "delete", label: "Delete", onClick: () => deleteNode() },
    ];

    const disabled = model.node.suggested;
    const nodeTitle = getNodeTitle(model.node);
    const hasError = nodeHasError(model.node);

    const arrowColor =
        disabled || readOnly ? ThemeColors.ON_SURFACE : isBoxHovered ? ThemeColors.SECONDARY : ThemeColors.ON_SURFACE;

    // SVG layout: dashed arrow → small open circle + label below
    const SEND_ARROW_LENGTH = 60;
    const svgWidth = NODE_GAP_X + NODE_HEIGHT + LABEL_HEIGHT;
    const svgHeight = NODE_HEIGHT + LABEL_HEIGHT;
    const dotCx = SEND_ARROW_LENGTH + DOT_RADIUS + DOT_STROKE;
    const lineY = 25;
    const lineEndX = dotCx - DOT_RADIUS - 4;

    return (
        <NodeStyles.Node readOnly={readOnly}>
            <NodeStyles.Box
                disabled={disabled}
                hovered={isBoxHovered}
                hasError={hasError}
                readOnly={readOnly}
                isActiveBreakpoint={isActiveBreakpoint}
                isSelected={isSelected}
                onMouseEnter={() => setIsBoxHovered(true)}
                onMouseLeave={() => setIsBoxHovered(false)}
                onContextMenu={!readOnly ? handleOnContextMenu : undefined}
            >
                {hasBreakpoint && (
                    <div
                        style={{
                            position: "absolute",
                            left: -5,
                            width: 15,
                            height: 15,
                            borderRadius: "50%",
                            backgroundColor: "red",
                        }}
                    />
                )}
                <NodeStyles.TopPortWidget port={model.getPort("in")!} engine={engine} />
                <NodeStyles.Row>
                    <NodeStyles.Icon onClick={handleOnClick}>
                        <NodeIcon type={model.node.codedata.node} size={24} />
                    </NodeStyles.Icon>
                    <NodeStyles.Row>
                        <NodeStyles.Header onClick={handleOnClick}>
                            <NodeStyles.Title>{nodeTitle}</NodeStyles.Title>
                            <NodeStyles.Description>
                                {model.node.properties.variable?.value as ReactNode}
                            </NodeStyles.Description>
                        </NodeStyles.Header>
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
                    </NodeStyles.Row>
                    <Popover
                        open={isMenuOpen}
                        anchorEl={anchorEl}
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
                </NodeStyles.Row>
                <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
            </NodeStyles.Box>

            <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                onClick={onConnectionClick}
                style={{ cursor: readOnly ? "default" : "pointer" }}
            >
                {/* Dashed arrow line */}
                <line
                    x1="0"
                    y1={lineY}
                    x2={lineEndX}
                    y2={lineY}
                    stroke={arrowColor}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    markerEnd={`url(#${model.node.id}-send-arrow)`}
                />
                {/* Small open circle (matching WaitData input dot) */}
                <circle
                    cx={dotCx}
                    cy={lineY}
                    r={DOT_RADIUS}
                    fill="none"
                    stroke={arrowColor}
                    strokeWidth={DOT_STROKE}
                />
                {/* Endpoint label below */}
                <text
                    x={dotCx}
                    y={svgHeight - 2}
                    textAnchor="middle"
                    fill={ThemeColors.ON_SURFACE}
                    fontSize="14px"
                    fontFamily="GilmerRegular"
                >
                    {endpointLabel.length > 16 ? `${endpointLabel.slice(0, 16)}...` : endpointLabel}
                </text>
                <defs>
                    <marker
                        id={`${model.node.id}-send-arrow`}
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
        </NodeStyles.Node>
    );
}
