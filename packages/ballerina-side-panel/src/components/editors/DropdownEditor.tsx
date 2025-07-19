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

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";

import { Dropdown, Button, CheckBox, ThemeColors } from "@wso2/ui-toolkit";

import { FormField } from "../Form/types";
import { capitalize, getValueForDropdown } from "./utils";
import { useFormContext } from "../../context";
import { SubPanel, SubPanelView } from "@wso2/ballerina-core";

// Styled components for tools selection
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

interface Tool {
    name: string;
    description?: string;
}

interface DropdownEditorProps {
    field: FormField;
    openSubPanel?: (subPanel: SubPanel) => void;
    // Additional props for MCP tools functionality
    serviceUrl?: string;
    configs?: object;
    rpcClient?: any;
    onToolsChange?: (selectedTools: string[]) => void;
}

export function DropdownEditor(props: DropdownEditorProps) {
    console.log(">>> DropdownEditor", props);
    const { field, openSubPanel, serviceUrl, configs, rpcClient, onToolsChange } = props;
    const { form } = useFormContext();
    const { register, setValue, watch } = form;
    
    // Watch the current value of this dropdown
    const currentValue = watch(field.key);
    
    // State for MCP tools functionality
    const [mcpTools, setMcpTools] = useState<Tool[]>([]);
    const [selectedMcpTools, setSelectedMcpTools] = useState<Set<string>>(new Set());
    const [loadingMcpTools, setLoadingMcpTools] = useState(false);
    const [mcpToolsError, setMcpToolsError] = useState<string>("");

    // HACK: create values for Scope field
    if (field.key === "scope") {
        field.items = ["All", "Selected"];
    }

    // Effect to fetch MCP tools when scope is "Selected" and serviceUrl is available
    useEffect(() => {
        if (field.key === "scope" && currentValue === "Selected" && serviceUrl?.trim()) {
            fetchMcpTools();
        } else {
            // Clear tools when not in selected mode or no URL
            setMcpTools([]);
            setSelectedMcpTools(new Set());
            setMcpToolsError("");
        }
    }, [currentValue, serviceUrl, field.key]);

    // Notify parent component when selected tools change
    useEffect(() => {
        if (onToolsChange) {
            onToolsChange(Array.from(selectedMcpTools));
        }
    }, [selectedMcpTools, onToolsChange]);

    const fetchMcpTools = async () => {
        if (!serviceUrl?.trim() || !rpcClient) {
            return;
        }

        setLoadingMcpTools(true);
        setMcpToolsError("");
        setMcpTools([]);
        setSelectedMcpTools(new Set());

        try {
            const languageServerClient = rpcClient.getAIAgentRpcClient();
            
            if (typeof languageServerClient.getMcpTools === 'function') {
                console.log(">>> Fetching MCP tools from server");
                const response = await languageServerClient.getMcpTools({ 
                    serviceUrl: serviceUrl.trim(),
                    configs: configs || {}
                });
                
                console.log(">>> MCP tools response", response);
                
                if (response.tools && Array.isArray(response.tools)) {
                    setMcpTools(response.tools);
                } else {
                    setMcpToolsError("No tools found in MCP server response");
                }
            }
        } catch (error) {
            console.error(">>> Error fetching MCP tools", error);
            setMcpToolsError(`Failed to fetch tools from MCP server: ${error || 'Unknown error'}`);
        } finally {
            setLoadingMcpTools(false);
        }
    };

    const handleToolSelectionChange = (toolName: string, isSelected: boolean) => {
        const newSelectedTools = new Set(selectedMcpTools);
        if (isSelected) {
            newSelectedTools.add(toolName);
        } else {
            newSelectedTools.delete(toolName);
        }
        setSelectedMcpTools(newSelectedTools);
    };

    const handleSelectAllTools = () => {
        if (selectedMcpTools.size === mcpTools.length) {
            // Deselect all
            setSelectedMcpTools(new Set());
        } else {
            // Select all
            setSelectedMcpTools(new Set(mcpTools.map(tool => tool.name)));
        }
    };

    const renderToolsSelection = () => {
        if (field.key !== "scope" || currentValue !== "Selected") {
            return null;
        }

        return (
            <ToolsContainer>
                <ToolsHeader>
                    <ToolsTitle>Available Tools</ToolsTitle>
                    {mcpTools.length > 0 && (
                        <Button
                            onClick={handleSelectAllTools}
                            disabled={loadingMcpTools}
                        >
                            {selectedMcpTools.size === mcpTools.length ? "Deselect All" : "Select All"}
                        </Button>
                    )}
                </ToolsHeader>
                
                {loadingMcpTools && (
                    <LoadingMessage>
                        Loading tools from MCP server...
                    </LoadingMessage>
                )}

                {mcpToolsError && (
                    <ErrorMessage>{mcpToolsError}</ErrorMessage>
                )}

                {mcpTools.length > 0 && (
                    <ToolCheckboxContainer>
                        {mcpTools.map((tool) => (
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

                {!loadingMcpTools && !mcpToolsError && mcpTools.length === 0 && serviceUrl?.trim() && (
                    <div style={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: '12px' }}>
                        No tools available from this MCP server
                    </div>
                )}
            </ToolsContainer>
        );
    };

    return (
        <>
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

            {renderToolsSelection()}
        </>
    );
}
