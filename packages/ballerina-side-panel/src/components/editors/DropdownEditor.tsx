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
import { McpToolsSelection, McpTool } from "./McpToolsSelection";

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
    const [mcpTools, setMcpTools] = useState<{ name: string; description?: string }[]>(props.mcpTools || []);

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
    }, [selectedMcpTools]);

    const showScopeControls = field.key === "toolsToInclude";

    // HACK: create values for Scope field
    if (field.key === "scope") {
        field.items = ["Global", "Local"];
    }

    if (showScopeControls) {
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
                <DropdownSpacer />
                {toolSelection === "Selected" && (
                    <McpToolsSelection
                        tools={props.mcpTools ?? mcpTools}
                        selectedTools={selectedMcpTools}
                        loading={loadingMcpTools}
                        error={mcpToolsError}
                        onToolSelectionChange={handleToolSelectionChange}
                        onSelectAll={handleSelectAllTools}
                        serviceUrl={localServiceUrl}
                    />
                )}
            </DropdownStack>
        );
    }

    return (
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
    );
}
