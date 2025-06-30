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
/** @jsxImportSource @emotion/react */
import React, { ReactNode, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { AgentCallNodeModel } from "./AgentCallNodeModel";
import {
    AGENT_NODE_ADD_TOOL_BUTTON_WIDTH,
    AGENT_NODE_TOOL_GAP,
    AGENT_NODE_TOOL_SECTION_GAP,
    DRAFT_NODE_BORDER_WIDTH,
    LABEL_HEIGHT,
    LABEL_WIDTH,
    NODE_BORDER_WIDTH,
    NODE_GAP_X,
    NODE_HEIGHT,
    NODE_PADDING,
    NODE_WIDTH,
} from "../../../resources/constants";
import { Button, Icon, Item, Menu, MenuItem, Popover, ThemeColors, Tooltip } from "@wso2/ui-toolkit";
import {
    MoreVertIcon,
    OpenAiIcon,
    AzureOpenAiIcon,
    AnthropicIcon,
    OllamaIcon,
    DefaultLlmIcon,
    MistralAIIcon,
    DeepseekIcon
} from "../../../resources/icons";
import { AgentData, FlowNode, ToolData } from "../../../utils/types";
import NodeIcon from "../../NodeIcon";
import ConnectorIcon from "../../ConnectorIcon";
import { useDiagramContext } from "../../DiagramContext";
import { DiagnosticsPopUp } from "../../DiagnosticsPopUp";
import { nodeHasError } from "../../../utils/node";
import { css } from "@emotion/react";
import { BreakpointMenu } from "../../BreakNodeMenu/BreakNodeMenu";

export namespace NodeStyles {
    export const Node = styled.div`
        display: flex;
        flex-direction: row;
        align-items: flex-start;
    `;

    export type NodeStyleProp = {
        disabled: boolean;
        hovered: boolean;
        hasError: boolean;
        isActiveBreakpoint: boolean;
    };
    export const Box = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: ${NODE_WIDTH}px;
        min-height: ${NODE_HEIGHT}px;
        padding: 0 ${NODE_PADDING}px;
        opacity: ${(props: NodeStyleProp) => (props.disabled ? 0.7 : 1)};
        border: ${(props: NodeStyleProp) => (props.disabled ? DRAFT_NODE_BORDER_WIDTH : NODE_BORDER_WIDTH)}px;
        border-style: ${(props: NodeStyleProp) => (props.disabled ? "dashed" : "solid")};
        border-color: ${(props: NodeStyleProp) =>
            props.hasError
                ? ThemeColors.ERROR
                : props.hovered && !props.disabled
                ? ThemeColors.HIGHLIGHT
                : ThemeColors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: ${(props: NodeStyleProp) =>
            props?.isActiveBreakpoint ? ThemeColors.DEBUGGER_BREAKPOINT_BACKGROUND : ThemeColors.SURFACE_DIM};
        color: ${ThemeColors.ON_SURFACE};
    `;

    export const Header = styled.div<{}>`
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        gap: 2px;
        width: 100%;
        padding: 8px;
        margin-top: 2px;
    `;

    export const StyledButton = styled(Button)`
        border-radius: 5px;
        position: absolute;
        right: 136px;
    `;

    export const FullWidthButton = styled(Button)`
        width: 100%;
        ::part(vscode-button) {
            width: 100%;
        }
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
    `;

    export const StyledText = styled.div`
        font-size: 14px;
    `;

    export const Icon = styled.div`
        padding: 4px;
        svg {
            fill: ${ThemeColors.ON_SURFACE};
        }
    `;

    export const Title = styled(StyledText)`
        max-width: ${NODE_WIDTH - 80}px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: "GilmerMedium";
    `;

    export const Description = styled(StyledText)`
        font-size: 12px;
        max-width: ${NODE_WIDTH - 80}px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: monospace;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
    `;

    export const Role = styled(StyledText)`
        font-size: 12px;
        color: ${ThemeColors.PRIMARY};
        font-family: "GilmerMedium";
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
        padding: 0 4px;
    `;

    export const RolePlaceholder = styled(Role)`
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.5;
        font-style: italic;
    `;

    export const Instructions = styled(StyledText)`
        font-size: 12px;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        width: 100%;
        max-height: calc(100% - 5px);
        line-height: 1.4;
        padding: 0 4px 4px;
    `;

    export const InstructionsPlaceholder = styled(Instructions)`
        opacity: 0.5;
        font-style: italic;
    `;

    export const InstructionsRow = styled.div`
        flex: 1;
        overflow: hidden;
        align-items: flex-start;
        margin-bottom: 6px;
        cursor: pointer;
    `;

    export const Row = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        cursor: pointer;
    `;

    export const Column = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
        height: 100%;
        overflow: hidden;
    `;

    export const ActionButtonGroup = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;
        gap: 2px;
    `;

    export const MenuButton = styled(Button)`
        border-radius: 5px;
    `;

    export const ErrorIcon = styled.div`
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: ${ThemeColors.ERROR};
    `;

    export const Hr = styled.hr`
        width: 100%;
    `;

    export const Footer = styled(StyledText)`
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    export const MemoryButton = styled.div`
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin: 8px 0;
        padding: 8px 0;
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 4px;
        background-color: transparent;
        color: ${ThemeColors.ON_SURFACE};
        font-size: 14px;
        font-family: "GilmerRegular";
        cursor: pointer;
        &:hover {
            background-color: ${ThemeColors.SURFACE_BRIGHT};
            border-color: ${ThemeColors.HIGHLIGHT};
        }
    `;

    export const MemoryCard = styled.div`
        width: 100%;
        padding: 8px 6px 8px 12px;
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 4px;
        background-color: transparent;
        color: ${ThemeColors.ON_SURFACE};
        &:hover {
            border-color: ${ThemeColors.HIGHLIGHT};
        }
    `;

    export const MemoryContainer = styled.div`
        width: 100%;
        border-bottom: 1px dashed ${ThemeColors.OUTLINE_VARIANT};
        padding-bottom: 8px;
    `;

    export const MemoryTitle = styled.div`
        font-size: 14px;
        font-family: "GilmerMedium";
        font-weight: bold;
        margin-bottom: 4px;
    `;

    export const MemoryMeta = styled.div`
        font-size: 12px;
        font-family: monospace;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
    `;
}

interface AgentCallNodeWidgetProps {
    model: AgentCallNodeModel;
    engine: DiagramEngine;
    onClick?: (node: FlowNode) => void;
}

export interface NodeWidgetProps extends Omit<AgentCallNodeWidgetProps, "children"> {}

export function AgentCallNodeWidget(props: AgentCallNodeWidgetProps) {
    const { model, engine, onClick } = props;
    const { onNodeSelect, goToSource, onDeleteNode, removeBreakpoint, addBreakpoint, agentNode, readOnly } =
        useDiagramContext();

    const [isBoxHovered, setIsBoxHovered] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const [toolAnchorEl, setToolAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const [selectedTool, setSelectedTool] = useState<ToolData | null>(null);
    const [memoryMenuAnchorEl, setMemoryMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isMenuOpen = Boolean(anchorEl);
    const isToolMenuOpen = Boolean(toolAnchorEl);
    const isMemoryMenuOpen = Boolean(memoryMenuAnchorEl);
    const hasBreakpoint = model.hasBreakpoint();
    const isActiveBreakpoint = model.isActiveBreakpoint();

    useEffect(() => {
        if (model.node.suggested) {
            model.setAroundLinksDisabled(model.node.suggested === true);
        }
    }, [model.node.suggested]);

    const handleOnClick = (event: React.MouseEvent<HTMLDivElement>) => {
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

    const onModelEditClick = () => {
        console.log(">>> onModelEditClick", model.node);
        agentNode?.onModelSelect && agentNode.onModelSelect(model.node);
        setAnchorEl(null);
    };

    const onMemoryManagerClick = () => {
        console.log(">>> onMemoryManagerClick", model.node);
        agentNode?.onSelectMemoryManager && agentNode.onSelectMemoryManager(model.node);
        setMemoryMenuAnchorEl(null);
    };

    const onMemoryManagerDeleteClick = () => {
        console.log(">>> onMemoryManagerDeleteClick", model.node);
        agentNode?.onDeleteMemoryManager && agentNode.onDeleteMemoryManager(model.node);
        setMemoryMenuAnchorEl(null);
    };

    const onToolClick = (tool: ToolData) => {
        console.log(">>> onToolClick", tool);
        agentNode?.onSelectTool && agentNode.onSelectTool(tool, model.node);
        setAnchorEl(null);
    };

    const onAddToolClick = () => {
        console.log(">>> onAddToolClick", model.node);
        agentNode?.onAddTool && agentNode.onAddTool(model.node);
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
        setAnchorEl(event.currentTarget);
    };

    const handleOnMenuClose = () => {
        setAnchorEl(null);
    };

    const handleToolMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>, tool: ToolData) => {
        event.stopPropagation();
        setToolAnchorEl(event.currentTarget);
        setSelectedTool(tool);
    };

    const handleToolMenuClose = () => {
        setToolAnchorEl(null);
        setSelectedTool(null);
    };

    const onEditTool = (tool: ToolData) => {
        console.log(">>> onEditTool", tool);
        onToolClick(tool);
    };

    const onImplementTool = (tool: ToolData) => {
        console.log(">>> onImplementTool", tool);
        agentNode?.goToTool && agentNode.goToTool(tool, model.node);
        handleToolMenuClose();
    };

    const onDeleteTool = (tool: ToolData) => {
        console.log(">>> onDeleteTool", tool);
        agentNode?.onDeleteTool && agentNode.onDeleteTool(tool, model.node);
        handleToolMenuClose();
    };

    const onAddBreakpoint = () => {
        addBreakpoint && addBreakpoint(model.node);
        setAnchorEl(null);
    };

    const onRemoveBreakpoint = () => {
        removeBreakpoint && removeBreakpoint(model.node);
        setAnchorEl(null);
    };

    const handleOnMemoryMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        event.stopPropagation();
        setMemoryMenuAnchorEl(event.currentTarget);
    };

    const handleMemoryMenuClose = () => {
        setMemoryMenuAnchorEl(null);
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

    const toolMenuItems = (tool: ToolData): Item[] => [
        {
            id: "edit",
            label: "Edit",
            onClick: () => onToolClick(tool),
        },
        {
            id: "view",
            label: "View",
            onClick: () => onImplementTool(tool),
        },
        {
            id: "delete",
            label: "Delete",
            onClick: () => onDeleteTool(tool),
        },
    ];

    const memoryMenuItems: Item[] = [
        {
            id: "edit",
            label: "Edit",
            onClick: () => onMemoryManagerClick(),
        },
        { id: "delete", label: "Delete", onClick: () => onMemoryManagerDeleteClick() },
    ];

    const disabled = model.node.suggested;
    const nodeTitle = "AI Agent";
    const hasError = nodeHasError(model.node);
    const tools = model.node.metadata?.data?.tools || [];
    if (model.node.metadata.data?.agent) {
        model.node.metadata.data.agent = sanitizeAgentData(model.node.metadata.data.agent);
    }
    let containerHeight =
        NODE_HEIGHT + AGENT_NODE_TOOL_SECTION_GAP + AGENT_NODE_ADD_TOOL_BUTTON_WIDTH + AGENT_NODE_TOOL_GAP * 2;
    if (tools.length > 0) {
        containerHeight += tools.length * (NODE_HEIGHT + AGENT_NODE_TOOL_GAP);
    }

    return (
        <NodeStyles.Node>
            <NodeStyles.Box
                disabled={disabled}
                hovered={isBoxHovered}
                hasError={hasError}
                isActiveBreakpoint={isActiveBreakpoint}
                onMouseEnter={() => setIsBoxHovered(true)}
                onMouseLeave={() => setIsBoxHovered(false)}
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
                <NodeStyles.Column style={{ height: `${model.node.viewState?.ch}px` }}>
                    <NodeStyles.Row>
                        <NodeStyles.Icon onClick={handleOnClick}>
                            <NodeIcon type={model.node.codedata.node} size={24} />
                        </NodeStyles.Icon>
                        <NodeStyles.Row>
                            <NodeStyles.Header onClick={handleOnClick}>
                                <NodeStyles.Title>{nodeTitle}</NodeStyles.Title>
                                <NodeStyles.Description>{model.node.properties.variable?.value as ReactNode}</NodeStyles.Description>
                            </NodeStyles.Header>
                            <NodeStyles.ActionButtonGroup>
                                {hasError && <DiagnosticsPopUp node={model.node} />}
                                {!readOnly && (
                                    <NodeStyles.MenuButton appearance="icon" onClick={handleOnMenuClick}>
                                        <MoreVertIcon />
                                    </NodeStyles.MenuButton>
                                )}
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

                    <NodeStyles.MemoryContainer>
                        <NodeStyles.Row>
                            {model.node.metadata?.data.memory ? (
                                <NodeStyles.MemoryCard onClick={onMemoryManagerClick}>
                                    <NodeStyles.Row>
                                        <div style={{ flex: 1 }}>
                                            <NodeStyles.MemoryTitle>Memory</NodeStyles.MemoryTitle>
                                            <NodeStyles.MemoryMeta>
                                                {model.node.metadata.data.memory?.type ||
                                                    "MessageWindowChatMemory"}
                                            </NodeStyles.MemoryMeta>
                                        </div>
                                        {!readOnly && (
                                            <NodeStyles.MenuButton appearance="icon" onClick={handleOnMemoryMenuClick}>
                                                <MoreVertIcon />
                                            </NodeStyles.MenuButton>
                                        )}
                                    </NodeStyles.Row>
                                </NodeStyles.MemoryCard>
                            ) : (
                                <NodeStyles.MemoryButton onClick={onMemoryManagerClick}>
                                    <Icon name="bi-plus" sx={{ fontSize: "16px", marginRight: "4px" }} />
                                    Add Memory
                                </NodeStyles.MemoryButton>
                            )}
                        </NodeStyles.Row>
                        <Popover
                            open={isMemoryMenuOpen}
                            anchorEl={memoryMenuAnchorEl}
                            handleClose={handleMemoryMenuClose}
                            sx={{
                                padding: 0,
                                borderRadius: 0,
                            }}
                        >
                            <Menu>
                                <>
                                    {memoryMenuItems.map((item) => (
                                        <MenuItem key={item.id} item={item} />
                                    ))}
                                </>
                            </Menu>
                        </Popover>
                    </NodeStyles.MemoryContainer>

                    {model.node.metadata.data?.agent?.role ? (
                        <NodeStyles.Row onClick={handleOnClick}>
                            <NodeStyles.Role>{model.node.metadata.data.agent.role}</NodeStyles.Role>
                        </NodeStyles.Row>
                    ) : (
                        <NodeStyles.Row onClick={handleOnClick}>
                            <NodeStyles.RolePlaceholder>Define agent's role</NodeStyles.RolePlaceholder>
                        </NodeStyles.Row>
                    )}

                    {model.node.metadata.data?.agent?.instructions ? (
                        <NodeStyles.InstructionsRow onClick={handleOnClick}>
                            <NodeStyles.Instructions>
                                {model.node.metadata.data.agent.instructions}
                            </NodeStyles.Instructions>
                        </NodeStyles.InstructionsRow>
                    ) : (
                        <NodeStyles.InstructionsRow onClick={handleOnClick}>
                            <NodeStyles.InstructionsPlaceholder>
                                Provide specific instructions on how the agent should behave.
                            </NodeStyles.InstructionsPlaceholder>
                        </NodeStyles.InstructionsRow>
                    )}
                </NodeStyles.Column>
                <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
            </NodeStyles.Box>

            <svg
                width={NODE_GAP_X + NODE_HEIGHT + LABEL_HEIGHT + LABEL_WIDTH + 10}
                height={model.node.viewState?.ch}
                viewBox={`0 0 300 ${containerHeight}`}
                style={{ marginLeft: "-10px" }}
            >
                {/* ai agent model circle */}
                <g>
                    <circle
                        cx="80"
                        cy="24"
                        r="22"
                        fill={ThemeColors.SURFACE_DIM}
                        stroke={ThemeColors.OUTLINE_VARIANT}
                        strokeWidth={1.5}
                        strokeDasharray={disabled ? "5 5" : "none"}
                        opacity={disabled ? 0.7 : 1}
                        onClick={onModelEditClick}
                        css={css`
                            cursor: pointer;
                            &:hover {
                                stroke: ${ThemeColors.HIGHLIGHT};
                            }
                        `}
                    />
                    <foreignObject
                        x="68"
                        y="12"
                        width="44"
                        height="44"
                        fill={ThemeColors.ON_SURFACE}
                        style={{ pointerEvents: "none" }}
                    >
                        {getLlmModelIcons(model.node.metadata.data.model?.type)}
                    </foreignObject>
                    <line
                        x1="0"
                        y1="25"
                        x2="57"
                        y2="25"
                        style={{
                            stroke: ThemeColors.ON_SURFACE,
                            strokeWidth: 1.5,
                            markerEnd: `url(#${model.node.id}-arrow-head)`,
                            markerStart: `url(#${model.node.id}-diamond-start)`,
                        }}
                    />
                </g>

                {/* circles for tools */}
                {tools.map((tool: ToolData, index: number) => (
                    <g
                        key={index}
                        transform={`translate(0, ${
                            (index + 1) * (NODE_HEIGHT + AGENT_NODE_TOOL_GAP) + AGENT_NODE_TOOL_SECTION_GAP
                        })`}
                        onClick={() => onToolClick(tool)}
                        css={css`
                            cursor: pointer;
                            &:hover circle {
                                stroke: ${ThemeColors.HIGHLIGHT};
                            }
                            &:hover foreignObject .connector-icon path {
                                fill: ${ThemeColors.HIGHLIGHT};
                            }
                            &:hover text {
                                fill: ${ThemeColors.HIGHLIGHT};
                            }
                            &:hover .tool-tooltip {
                                opacity: 1;
                                visibility: visible;
                            }
                            &:hover .tool-menu-button {
                                opacity: 1;
                                visibility: visible;
                            }
                        `}
                    >
                        <circle
                            cx="80"
                            cy="24"
                            r="22"
                            fill={ThemeColors.SURFACE_DIM}
                            stroke={ThemeColors.OUTLINE_VARIANT}
                            strokeWidth={1.5}
                            strokeDasharray={disabled ? "5 5" : "none"}
                            opacity={disabled ? 0.7 : 1}
                        />
                        <foreignObject
                            x="68"
                            y="12"
                            width="44"
                            height="44"
                            fill={ThemeColors.ON_SURFACE}
                            style={{ pointerEvents: "none" }}
                        >
                            <div className="connector-icon">
                                {tool.path && (
                                    <ConnectorIcon
                                        url={tool.path}
                                        style={{ width: 24, height: 24, fontSize: 24 }}
                                        fallbackIcon={<Icon name="bi-function" sx={{ fontSize: "24px" }} />}
                                    />
                                )}
                                {!tool.path && <Icon name="bi-function" sx={{ fontSize: "24px" }} />}
                            </div>
                        </foreignObject>
                        <text
                            x="110"
                            y="28"
                            textAnchor="start"
                            fill={ThemeColors.ON_SURFACE}
                            fontSize="14px"
                            fontFamily="GilmerRegular"
                            dominantBaseline="middle"
                        >
                            {tool.name.length > 20 ? `${tool.name.slice(0, 20)}...` : tool.name}
                            <title>{tool.name}</title>
                        </text>

                        {/* Tool menu button */}
                        {!readOnly && (
                            <>
                                {/* Transparent overlay for hover detection */}
                                <foreignObject
                                    x="60"
                                    y="0"
                                    width="220"
                                    height="48"
                                    css={css`
                                        pointer-events: all;
                                        &:hover + .tool-menu-button {
                                            opacity: 1;
                                            visibility: visible;
                                        }
                                    `}
                                >
                                    <div style={{ width: "100%", height: "100%" }} />
                                </foreignObject>
                                <foreignObject
                                    x={tool.name.length > 20 ? 240 : 110 + tool.name.length * 7}
                                    y="14"
                                    width="24"
                                    height="24"
                                    className="tool-menu-button"
                                    css={css`
                                        opacity: 0;
                                        visibility: hidden;
                                        transition: opacity 0.2s ease-in-out;
                                        pointer-events: all;
                                        &:hover {
                                            opacity: 1;
                                            visibility: visible;
                                        }
                                    `}
                                >
                                    <NodeStyles.MenuButton
                                        appearance="icon"
                                        onClick={(e) => handleToolMenuClick(e, tool)}
                                        css={css`
                                            padding: 2px;
                                            height: 24px;
                                            width: 24px;
                                            min-width: 24px;
                                        `}
                                    >
                                        <MoreVertIcon />
                                    </NodeStyles.MenuButton>
                                </foreignObject>
                            </>
                        )}

                        <line
                            x1="0"
                            y1="25"
                            x2="57"
                            y2="25"
                            style={{
                                stroke: ThemeColors.ON_SURFACE,
                                strokeWidth: 1.5,
                                markerEnd: `url(#${model.node.id}-arrow-head-tool-${tool.name})`,
                                strokeDasharray: "6 6",
                            }}
                        />

                        {/* Tool tooltip */}
                        <foreignObject
                            x="110"
                            y="-10"
                            width="150"
                            height="30"
                            className="tool-tooltip"
                            style={{ pointerEvents: "none" }}
                        >
                            <div
                                css={css`
                                    background-color: ${ThemeColors.SURFACE_BRIGHT};
                                    color: ${ThemeColors.ON_SURFACE};
                                    padding: 4px 8px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                                    opacity: 0;
                                    visibility: hidden;
                                    transition: opacity 0.2s ease-in-out;
                                    pointer-events: none;
                                    white-space: nowrap;
                                    font-family: "GilmerRegular";
                                `}
                            >
                                Click to edit {tool.name}
                            </div>
                        </foreignObject>
                    </g>
                ))}

                {/* Tool Menu Popover */}
                <Popover
                    open={isToolMenuOpen}
                    anchorEl={toolAnchorEl}
                    handleClose={handleToolMenuClose}
                    sx={{
                        padding: 0,
                        borderRadius: 0,
                    }}
                >
                    <Menu>
                        {selectedTool &&
                            toolMenuItems(selectedTool).map((item) => <MenuItem key={item.id} item={item} />)}
                    </Menu>
                </Popover>

                {/* Add "Add new tool" button below all tools */}
                <g
                    transform={`translate(-11, ${
                        tools.length > 0
                            ? (tools.length + 1) * (NODE_HEIGHT + AGENT_NODE_TOOL_GAP) + AGENT_NODE_TOOL_SECTION_GAP
                            : NODE_HEIGHT + AGENT_NODE_TOOL_SECTION_GAP
                    })`}
                    onClick={onAddToolClick}
                    style={{ cursor: "pointer" }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        css={css`
                            cursor: pointer;
                            &:hover path:last-of-type {
                                fill: ${ThemeColors.HIGHLIGHT};
                            }
                            &:hover + .custom-tooltip {
                                opacity: 1;
                                visibility: visible;
                            }
                        `}
                    >
                        <title>Add new tool</title>
                        <path
                            fill={ThemeColors.SURFACE_BRIGHT}
                            d="M12 0C5 0 0 5 0 12s5 12 12 12 12-5 12-12S19 0 12 0z"
                        />
                        <path
                            fill={ThemeColors.ON_SURFACE}
                            d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8m4-9h-3V8a1 1 0 0 0-2 0v3H8a1 1 0 0 0 0 2h3v3a1 1 0 0 0 2 0v-3h3a1 1 0 0 0 0-2"
                        />
                    </svg>

                    {/* Custom tooltip */}
                    <foreignObject x="25" y="-10" width="100" height="30" style={{ pointerEvents: "none" }}>
                        <div
                            className="custom-tooltip"
                            css={css`
                                background-color: ${ThemeColors.SURFACE_BRIGHT};
                                color: ${ThemeColors.ON_SURFACE};
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 12px;
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                                opacity: 0;
                                visibility: hidden;
                                transition: opacity 0.2s ease-in-out;
                                pointer-events: none;
                                white-space: nowrap;
                                font-family: "GilmerRegular";
                            `}
                        >
                            Add new tool
                        </div>
                    </foreignObject>
                </g>

                <defs>
                    <marker
                        id={`${model.node.id}-arrow-head`}
                        markerWidth="4"
                        markerHeight="4"
                        refX="3"
                        refY="2"
                        viewBox="0 0 4 4"
                        orient="auto"
                    >
                        <polygon points="0,4 0,0 4,2" fill={ThemeColors.ON_SURFACE}></polygon>
                    </marker>
                    <marker
                        id={`${model.node.id}-diamond-start`}
                        markerWidth="8"
                        markerHeight="8"
                        refX="4.5"
                        refY="4"
                        viewBox="0 0 8 8"
                        orient="auto"
                    >
                        <circle
                            cx="4"
                            cy="4"
                            r="3"
                            fill={ThemeColors.SURFACE_DIM}
                            stroke={ThemeColors.ON_SURFACE}
                            strokeWidth="1"
                        />
                    </marker>
                    {tools.map((tool: ToolData) => (
                        <marker
                            key={tool.name}
                            id={`${model.node.id}-arrow-head-tool-${tool.name}`}
                            markerWidth="4"
                            markerHeight="4"
                            refX="3"
                            refY="2"
                            viewBox="0 0 4 4"
                            orient="auto"
                        >
                            <polygon points="0,4 0,0 4,2" fill={ThemeColors.ON_SURFACE}></polygon>
                        </marker>
                    ))}
                </defs>
            </svg>
        </NodeStyles.Node>
    );
}

// sanitize agent instructions and role
// remove leading and trailing quotes
// remove suffix "string `" and prefix "`"
function sanitizeAgentData(data: AgentData) {
    if (data.role) {
        data.role = data.role.replace(/^['"]|['"]$/g, "").replace(/^string `|`$/g, "");
    }
    if (data.instructions) {
        data.instructions = data.instructions.replace(/^['"]|['"]$/g, "").replace(/^string `|`$/g, "");
    }
    return data;
}

// get llm model icons
// this should replace with CDN icons
function getLlmModelIcons(modelType: string) {
    switch (modelType) {
        case "OpenAiProvider":
            return <OpenAiIcon />;
        case "AzureOpenAiProvider":
            return <AzureOpenAiIcon />;
        case "AnthropicProvider":
            return <AnthropicIcon />;
        case "OllamaProvider":
            return <OllamaIcon />;
        case "MistralAiProvider":
            return <MistralAIIcon />;
        case "DeepseekProvider":
            return <DeepseekIcon />;
        default:
            return <DefaultLlmIcon />;
    }
}
