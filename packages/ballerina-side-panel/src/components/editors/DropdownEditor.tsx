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

import React, { useEffect, useState, useRef } from "react";
import styled from "@emotion/styled";

import { Dropdown, Button, CheckBox, ThemeColors, TextField } from "@wso2/ui-toolkit";

import { FormField } from "../Form/types";
import { capitalize, getValueForDropdown } from "./utils";
import { useFormContext } from "../../context";
import { SubPanel, SubPanelView } from "@wso2/ballerina-core";

interface DropdownEditorProps {
    field: FormField;
    openSubPanel?: (subPanel: SubPanel) => void;
    // Additional props for MCP tools functionality
    serviceUrl?: string;
    configs?: object;
    rpcClient?: any;
    onToolsChange?: (selectedTools: string[]) => void;
    renderToolsSelection?: () => React.ReactNode;
    newServerUrl?: string;
    mcpTools?: { name: string; description?: string }[]; // <-- add this line
}

const ToolsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    padding: 12px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 8px;
`;
const ToolsHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;
const ToolsTitle = styled.div`
    font-size: 14px;
    font-family: GilmerBold;
    color: ${ThemeColors.ON_SURFACE};
`;
const ToolCheckboxContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
`;
const ToolCheckboxItem = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
`;
const ErrorMessage = styled.div`
    color: ${ThemeColors.ERROR};
    font-size: 12px;
    margin-top: 4px;
`;
const LoadingMessage = styled.div`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
`;
// Simple inline spinner for loading state
const InlineSpinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid ${ThemeColors.ON_SURFACE_VARIANT};
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const DropdownStack = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

const DropdownSpacer = styled.div`
    height: 5px;
`;

export function DropdownEditor(props: DropdownEditorProps) {
    const { field, openSubPanel, serviceUrl, configs, rpcClient, onToolsChange, newServerUrl } = props;
    const { form } = useFormContext();
    const { register, setValue, watch } = form;

    console.log(">>> DropdownEditor props:", props);
    // MCP tools selection state (self-contained)
    const DUMMY_TOOLS = [
        { name: "single-greet", description: "Greet a user with a single message" },
        { name: "multi-greet", description: "Greet a user with multiple messages" }
    ];
    
    const [mcpTools, setMcpTools] = useState<{ name: string; description?: string }[]>(props.mcpTools || DUMMY_TOOLS);

    // Sync mcpTools state with props.mcpTools
    useEffect(() => {
        if (props.mcpTools) {
            setMcpTools(props.mcpTools);
        }
    }, [props.mcpTools]);
    const [selectedMcpTools, setSelectedMcpTools] = useState<Set<string>>(new Set());
    const [loadingMcpTools, setLoadingMcpTools] = useState(false);
    const [mcpToolsError, setMcpToolsError] = useState<string>("");
    const toolSelection = watch(field.key);
    const [localServiceUrl, setLocalServiceUrl] = useState<string>("");
    const [localConfigs, setLocalConfigs] = useState<any>({});
    const [editMode] = useState(false); // You can set this based on your logic if needed

    // Debounce logic for serverUrl input
    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    // useEffect(() => {
    //     if (field.key === "scope" && toolSelection === "Selected" && localServiceUrl.trim()) {
    //         if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    //         debounceTimeout.current = setTimeout(() => {
    //             fetchMcpTools();
    //         }, 500); // 500ms debounce
    //     } else {
    //         setMcpTools(mcpTools);
    //         setSelectedMcpTools(new Set());
    //         setMcpToolsError("");
    //     }
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [toolSelection, localServiceUrl]);

    useEffect(() => {
        if (newServerUrl && newServerUrl !== localServiceUrl) {
            setLocalServiceUrl(newServerUrl);
            console.log(">>> New server URL set:", newServerUrl);
        }
    }, [newServerUrl]);

    const handleToolSelectionChange = (toolName: string, isSelected: boolean) => {
        const newSelectedTools = new Set(selectedMcpTools);
        if (isSelected) {
            newSelectedTools.add(toolName);
        } else {
            newSelectedTools.delete(toolName);
        }
        setSelectedMcpTools(newSelectedTools);
        // Call the callback with the updated selection
        props.onToolsChange?.(Array.from(newSelectedTools));
    };

    const handleSelectAllTools = () => {
        let newSelectedTools: Set<string>;
        if (selectedMcpTools.size === mcpTools.length) {
            newSelectedTools = new Set();
        } else {
            newSelectedTools = new Set(mcpTools.map(tool => tool.name));
        }
        setSelectedMcpTools(newSelectedTools);
        // Call the callback with the updated selection
        props.onToolsChange?.(Array.from(newSelectedTools));
    };

    // Call onToolsChange whenever selectedMcpTools changes
    useEffect(() => {
        props.onToolsChange?.(Array.from(selectedMcpTools));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMcpTools]);

    // Update renderToolsSelection to use props.mcpTools if provided
    const renderToolsSelection = () => {
        const tools = props.mcpTools ?? mcpTools;
        if (toolSelection !== "Selected") {
            return null;
        }

        return (
            <ToolsContainer>
                <ToolsHeader>
                    <ToolsTitle>Available Tools</ToolsTitle>
                    {tools.length > 0 && (
                        <Button
                            onClick={handleSelectAllTools}
                            disabled={loadingMcpTools}
                        >
                            {selectedMcpTools.size === tools.length ? "Deselect All" : "Select All"}
                        </Button>
                    )}
                </ToolsHeader>
                {loadingMcpTools && (
                    <LoadingMessage>
                        <InlineSpinner />
                        Loading tools from MCP server...
                    </LoadingMessage>
                )}
                {mcpToolsError && (
                    <ErrorMessage>{mcpToolsError}</ErrorMessage>
                )}
                {tools.length > 0 && (
                    <ToolCheckboxContainer>
                        {tools.map((tool) => (
                            <ToolCheckboxItem key={tool.name}>
                                <CheckBox
                                    label=""
                                    checked={selectedMcpTools.has(tool.name)}
                                    disabled={loadingMcpTools}
                                    onChange={() => !loadingMcpTools && handleToolSelectionChange(tool.name, !selectedMcpTools.has(tool.name))}
                                >
                                </CheckBox>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{tool.name}</div>
                                    {tool.description && (
                                        <div style={{ fontSize: '12px', color: ThemeColors.ON_SURFACE_VARIANT }}>
                                            {tool.description}
                                        </div>
                                    )}
                                </div>
                            </ToolCheckboxItem>
                        ))}
                    </ToolCheckboxContainer>
                )}
                {!loadingMcpTools && !mcpToolsError && tools.length === 0 && localServiceUrl.trim() && (
                    <div style={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: '12px' }}>
                        No tools available from this MCP server
                    </div>
                )}
            </ToolsContainer>
        );
    };

    const showScopeControls = field.key === "toolsToInclude";

    return (
        <DropdownStack>
            <Dropdown
                id={field.key}
                description={field.documentation}
                {...register(field.key, { required: !field.optional, value: getValueForDropdown(field) })}
                label={capitalize(field.label)}
                items={field.itemOptions ? field.itemOptions : field.items?.map((item) => ({ id: item, content: item, value: item }))}
                required={!field.optional}
                disabled={!field.editable}
                onChange={(e) => {
                    setValue(field.key, e.target.value);
                    field.onValueChange?.(e.target.value);
                }}
                sx={{ width: "100%" }}
                containerSx={{ width: "100%" }}
                addNewBtnClick={field.addNewButton ? () => openSubPanel({ view: SubPanelView.ADD_NEW_FORM }) : undefined}
            />
            {showScopeControls && <DropdownSpacer />}
            {showScopeControls && renderToolsSelection()}
        </DropdownStack>
    );
}
