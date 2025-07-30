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

import React from "react";
import styled from "@emotion/styled";
import { Button, CheckBox, ThemeColors } from "@wso2/ui-toolkit";

// Types for MCP tools
export interface McpTool {
    name: string;
    description?: string;
}

interface McpToolsSelectionProps {
    tools: McpTool[];
    selectedTools: Set<string>;
    loading: boolean;
    error: string;
    onToolSelectionChange: (toolName: string, isSelected: boolean) => void;
    onSelectAll: () => void;
    serviceUrl?: string;
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

export const McpToolsSelection: React.FC<McpToolsSelectionProps> = ({
    tools,
    selectedTools,
    loading,
    error,
    onToolSelectionChange,
    onSelectAll,
    serviceUrl
}) => {
    return (
        <ToolsContainer>
            <ToolsHeader>
                <ToolsTitle>Available Tools</ToolsTitle>
                {tools.length > 0 && (
                    <Button
                        onClick={onSelectAll}
                        disabled={loading}
                    >
                        {selectedTools.size === tools.length ? "Deselect All" : "Select All"}
                    </Button>
                )}
            </ToolsHeader>
            {loading && (
                <LoadingMessage>
                    <InlineSpinner />
                    Loading tools from MCP server...
                </LoadingMessage>
            )}
            {error && (
                <ErrorMessage>{error}</ErrorMessage>
            )}
            {tools.length > 0 && (
                <ToolCheckboxContainer>
                    {tools.map((tool) => (
                        <ToolCheckboxItem key={tool.name}>
                            <CheckBox
                                label=""
                                checked={selectedTools.has(tool.name)}
                                disabled={loading}
                                onChange={() => !loading && onToolSelectionChange(tool.name, !selectedTools.has(tool.name))}
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
            {!loading && !error && tools.length === 0 && serviceUrl?.trim() && (
                <div style={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: '12px' }}>
                    No tools available from this MCP server
                </div>
            )}
        </ToolsContainer>
    );
}; 
