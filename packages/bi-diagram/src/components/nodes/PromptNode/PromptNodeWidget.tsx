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

import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import {
    DRAFT_NODE_BORDER_WIDTH,
    NODE_BORDER_WIDTH,
    NODE_PADDING,
    PROMPT_NODE_HEIGHT,
    PROMPT_NODE_WIDTH,
} from "../../../resources/constants";
import { Button, CompletionItem, FormExpressionEditor, FormExpressionEditorRef, Icon, Item, ThemeColors } from "@wso2/ui-toolkit";
import NodeIcon from "../../NodeIcon";
import { useDiagramContext } from "../../DiagramContext";
import { PromptNodeModel } from "./PromptNodeModel";
import { ELineRange, ExpressionProperty } from "@wso2/ballerina-core";
import { DiagnosticsPopUp } from "../../DiagnosticsPopUp";
import { getRawTemplate, nodeHasError } from "../../../utils/node";
import { cloneDeep } from "lodash";

export namespace NodeStyles {
    export type NodeStyleProp = {
        disabled: boolean;
        hovered: boolean;
        hasError: boolean;
        isActiveBreakpoint?: boolean;
    };
    export const Node = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        width: ${PROMPT_NODE_WIDTH}px;
        min-height: ${PROMPT_NODE_HEIGHT}px;
        padding: ${NODE_PADDING}px;
        background-color: ${(props: NodeStyleProp) =>
            props?.isActiveBreakpoint ? ThemeColors.DEBUGGER_BREAKPOINT_BACKGROUND : ThemeColors.SURFACE_DIM};
        color: ${ThemeColors.ON_SURFACE};
        opacity: ${(props: NodeStyleProp) => (props.disabled ? 0.7 : 1)};
        border: ${(props: NodeStyleProp) => (props.disabled ? DRAFT_NODE_BORDER_WIDTH : NODE_BORDER_WIDTH)}px;
        border-style: ${(props: NodeStyleProp) => (props.disabled ? "dashed" : "solid")};
        border-color: ${(props: NodeStyleProp) =>
            props.hasError ? ThemeColors.ERROR : props.hovered && !props.disabled ? ThemeColors.HIGHLIGHT : ThemeColors.OUTLINE_VARIANT};
        border-radius: 10px;
    `;

    export const Header = styled.div<{}>`
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        gap: 2px;
        width: 100%;
        padding: 8px;
        cursor: pointer;
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
        max-width: ${PROMPT_NODE_WIDTH - 80}px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: "GilmerMedium";
    `;

    export const Description = styled(StyledText)`
        max-width: ${PROMPT_NODE_WIDTH - 80}px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: monospace;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
        white-space: normal;
        font-size: 12px;
        line-height: 14px;
        max-height: 28px;
    `;

    export const Row = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    `;

    export const Body = styled.div`
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        width: 100%;
    `;

    export const ButtonGroup = styled.div`
        display: flex;
        width: 100%;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
    `;

    export const Editor = styled.div`
        width: 100%;
        flex-grow: 1;
        color: ${ThemeColors.ON_SURFACE};
        background-color: ${ThemeColors.SURFACE};
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 10px;
        padding: ${NODE_PADDING}px;
        cursor: not-allowed;
    `;

    export const Hr = styled.hr`
        width: 100%;
    `;

    export const Footer = styled(StyledText)`
        display: flex;
        align-items: center;
        gap: 8px;
    `;
}

const FETCH_COMPLETIONS_STATE = {
    IDLE: "IDLE",
    FETCHING: "FETCHING",
    DONE: "DONE"
} as const;

type FetchCompletionsState = typeof FETCH_COMPLETIONS_STATE[keyof typeof FETCH_COMPLETIONS_STATE];

export interface PromptNodeWidgetProps {
    model: PromptNodeModel;
    engine: DiagramEngine;
}

export interface NodeWidgetProps extends Omit<PromptNodeWidgetProps, "children"> {}

export function PromptNodeWidget(props: PromptNodeWidgetProps) {
    const { model, engine } = props;
    const {
        projectPath,
        goToSource,
        openView,
        onNodeSave,
        expressionContext
    } = useDiagramContext();
    const {
        completions,
        triggerCharacters,
        retrieveCompletions,
        onCompletionItemSelect,
        onFocus,
        onBlur,
        onCancel
    } = expressionContext;

    const [isHovered, setIsHovered] = useState(false);
    const [editable, setEditable] = useState(false);
    const [bodyTextTemplate, setBodyTextTemplate] = useState("");
    const hasBreakpoint = model.hasBreakpoint();
    const isActiveBreakpoint = model.isActiveBreakpoint();

    const exprRef = useRef<FormExpressionEditorRef>(null);
    const anchorRef = useRef<HTMLDivElement>(null);
    const cursorPositionRef = useRef<number | undefined>(undefined);
    const fetchingStateRef = useRef<FetchCompletionsState>(FETCH_COMPLETIONS_STATE.IDLE);
    const invalidateCacheRef = useRef<boolean>(false);
    const field: ExpressionProperty = useMemo(() => model.node.properties['prompt'], [model]);

    const handleOnClick = async (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.metaKey) {
            // Handle action when cmd key is pressed
            onGoToSource();
        }
    };

    const handleSave = () => {
        const clonedNode = cloneDeep(model.node);
        clonedNode.properties['prompt'].value = bodyTextTemplate;
        clonedNode.codedata.node = "NP_FUNCTION_DEFINITION";
        onNodeSave?.(clonedNode);
        toggleEditable();
    };

    const onGoToSource = () => {
        goToSource?.(model.node);
    };

    const openDataMapper = () => {
        if (!model.node.properties?.view?.value) {
            return;
        }
        const { fileName, startLine, endLine } = model.node.properties.view.value as ELineRange;
        openView &&
            openView(projectPath + "/" + fileName, {
                startLine: startLine.line,
                startColumn: startLine.offset,
                endLine: endLine.line,
                endColumn: endLine.offset,
            });
    };

    const viewFunction = () => {
        if (!model.node.properties?.view?.value) {
            return;
        }
        const { fileName, startLine, endLine } = model.node.properties.view.value as ELineRange;
        openView &&
            openView(projectPath + "/" + fileName, {
                startLine: startLine.line,
                startColumn: startLine.offset,
                endLine: endLine.line,
                endColumn: endLine.offset,
            });
    };

    const toggleEditable = () => {
        setEditable(!editable);
    };

    const handleBodyTextChange = (value: string) => {
        setBodyTextTemplate(value);
    };

    const menuItems: Item[] = [
        { id: "goToSource", label: "Source", onClick: () => onGoToSource() },
    ];

    if (model.node.codedata.node === "DATA_MAPPER_DEFINITION") {
        menuItems.splice(1, 0, {
            id: "openDataMapper",
            label: "View",
            onClick: () => {
                openDataMapper();
            },
        });
    }

    if (model.node.codedata.node === "FUNCTION_CALL") {
        menuItems.splice(1, 0, {
            id: "viewFunction",
            label: "View",
            onClick: () => {
                viewFunction();
            },
        });
    }

    const hasError = nodeHasError(model.node);

    useEffect(() => {
        const prompt = model.node.properties?.['prompt']?.value as string;
        if (!prompt) {
            handleBodyTextChange("");
        } else {
            const promptWithoutQuotes = prompt.replace(/^`|`$/g, "");
            handleBodyTextChange(promptWithoutQuotes);
        }
    }, [model.node.properties]);

    const handleCompletionSelect = async (value: string, item: CompletionItem) => {
        // Trigger actions on completion select
        await onCompletionItemSelect?.(value, item.additionalTextEdits);

        // Set cursor position
        const cursorPosition = exprRef.current?.shadowRoot?.querySelector('textarea')?.selectionStart;
        cursorPositionRef.current = cursorPosition;
    };

    const handleFocus = async () => {
        // Retrive completions
        const cursorPosition = exprRef.current?.shadowRoot?.querySelector('textarea')?.selectionStart;
        cursorPositionRef.current = cursorPosition;
        const triggerCharacter =
            cursorPosition > 0 ? triggerCharacters.find((char) => bodyTextTemplate[cursorPosition - 1] === char) : undefined;
        if (triggerCharacter) {
            await retrieveCompletions(
                bodyTextTemplate,
                field,
                cursorPosition + 1,
                true,
                triggerCharacter
            );
        } else {
            await retrieveCompletions(
                bodyTextTemplate,
                field,
                cursorPosition + 1,
                true
            );
        }

        // Trigger actions on focus
        await onFocus?.();
    };

    const handleBlur = async () => {
        // Trigger actions on blur
        await onBlur?.();

        // Clean up memory
        cursorPositionRef.current = undefined;
    };

    const handleChange = async (newValue: string, updatedCursorPosition: number) => {
        handleBodyTextChange(newValue);
        cursorPositionRef.current = updatedCursorPosition;

        // Check state to invalidate completion cache
        if (
            fetchingStateRef.current === FETCH_COMPLETIONS_STATE.IDLE &&
            isExpression(newValue, updatedCursorPosition)
        ) {
            invalidateCacheRef.current = true;
            fetchingStateRef.current = FETCH_COMPLETIONS_STATE.FETCHING;
        } else if (
            fetchingStateRef.current === FETCH_COMPLETIONS_STATE.FETCHING &&
            isExpression(newValue, updatedCursorPosition)
        ) {
            invalidateCacheRef.current = false;
            fetchingStateRef.current = FETCH_COMPLETIONS_STATE.DONE;
        } else if (
            fetchingStateRef.current === FETCH_COMPLETIONS_STATE.DONE &&
            !isExpression(newValue, updatedCursorPosition)
        ) {
            fetchingStateRef.current = FETCH_COMPLETIONS_STATE.IDLE;
        }

        // Check if the current character is a trigger character
        const triggerCharacter =
            updatedCursorPosition > 0
                ? triggerCharacters.find((char) => newValue[updatedCursorPosition - 1] === char)
                : undefined;
        if (triggerCharacter) {
            await retrieveCompletions(
                newValue,
                field,
                updatedCursorPosition + 1,
                invalidateCacheRef.current,
                triggerCharacter
            );
        } else {
            await retrieveCompletions(
                newValue,
                field,
                updatedCursorPosition + 1,
                invalidateCacheRef.current
            );
        }
    }

    return (
        <NodeStyles.Node
            hovered={isHovered}
            disabled={model.node.suggested}
            hasError={hasError}
            isActiveBreakpoint={isActiveBreakpoint}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
                        <NodeStyles.Title>Prompt</NodeStyles.Title>
                    </NodeStyles.Header>
                    <NodeStyles.ActionButtonGroup>
                        {hasError && <DiagnosticsPopUp node={model.node} />}
                    </NodeStyles.ActionButtonGroup>
                </NodeStyles.Row>
                {!editable && (
                    <NodeStyles.Icon>
                        <Icon
                            name="bi-edit"
                            onClick={toggleEditable}
                            sx={{
                                fontSize: 20,
                                width: 20,
                                height: 20
                            }}
                        />
                    </NodeStyles.Icon>
                )}
            </NodeStyles.Row>
            <NodeStyles.Body>
                <FormExpressionEditor
                    ref={exprRef}
                    anchorRef={anchorRef}
                    completions={completions}
                    value={bodyTextTemplate}
                    placeholder="Enter your prompt here..."
                    onChange={handleChange}
                    onCompletionSelect={handleCompletionSelect}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onCancel={onCancel}
                    growRange={{ start: 12, offset: 0 }}
                    disabled={!editable}
                    resize="disabled"
                    sx={{ paddingInline: '0' }}
                    completionSx={{ width: '331px' }}
                />
            </NodeStyles.Body>
            {editable && (
                <NodeStyles.ButtonGroup>
                    <Button appearance="secondary" onClick={toggleEditable}>
                        Cancel
                    </Button>
                    <Button appearance="primary" onClick={handleSave}>
                        Save
                    </Button>
                </NodeStyles.ButtonGroup>
            )}
            <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
        </NodeStyles.Node>
    );
}

function isExpression(value: string, cursorPosition: number) {
    let suffixMatch: boolean = false;
    let prefixMatch: boolean = false;

    if (cursorPosition === 0) {
        return false;
    }

    for (let i = cursorPosition; i < value.length; i++) {
        const index = i;
        if (value[index] === "}") {
            console.log("suffixMatch", index);
            suffixMatch = true;
            break;
        } else if (value[index] === "{") {
            break;
        }
    }

    for (let i = cursorPosition; i > 0; i--) {
        const index = i - 1;
        if (value[index] === "{") {
            console.log("prefixMatch", index);
            prefixMatch = true;
            break;
        } else if (value[index] === "}") {
            break;
        }
    }

    return prefixMatch && suffixMatch;
}
