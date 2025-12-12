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

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { Button, ThemeColors, SearchBox, Codicon, Divider, Typography, TextField, Stepper, Dropdown } from "@wso2/ui-toolkit";
import type { OptionProps } from "@wso2/ui-toolkit";
import type { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";
import {
    ToolsList,
    formatErrorMessage,
    ModalContainer,
    ModalBox,
    ModalHeaderSection,
    ModalContent,
    SearchContainer,
    ErrorMessage,
    LoadingMessage,
    InlineSpinner,
    ToolsHeader,
    InfoMessage
} from "./McpToolsSelection";
import { cleanServerUrl } from "../formUtils";

// McpTool interface (same as in McpToolsSelection)
interface McpTool {
    name: string;
    description?: string;
}

interface DiscoverToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onToolsSelected: (tools: McpTool[], selectedToolNames: Set<string>) => void;
    rpcClient: BallerinaRpcClient;
    existingToolNames?: Set<string>;
}

// Unique styled components for DiscoverToolsModal
const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 16px;
`;

const ButtonContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 8px 16px;
    gap: 8px;
`;

const BackArrow = styled.div`
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 4px;
    margin-right: 8px;
    &:hover {
        opacity: 0.7;
    }
`;

const StyledModalContent = styled(ModalContent)`
    .mcp-stepper {
        margin: 8px 0;
    }
`;

const isValidUrl = (url: string): boolean => {
    if (!url || !url.trim()) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
        return false;
    }
};

export const DiscoverToolsModal: React.FC<DiscoverToolsModalProps> = ({
    isOpen,
    onClose,
    onToolsSelected,
    rpcClient,
    existingToolNames
}) => {
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [manualServerUrl, setManualServerUrl] = useState("");
    const [authType, setAuthType] = useState<"none" | "bearer">("none");
    const [authToken, setAuthToken] = useState("");
    const [discoveredTools, setDiscoveredTools] = useState<McpTool[]>([]);
    const [selectedDiscoveredTools, setSelectedDiscoveredTools] = useState<Set<string>>(new Set());
    const [loadingDiscovery, setLoadingDiscovery] = useState(false);
    const [discoveryError, setDiscoveryError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [urlError, setUrlError] = useState("");

    const formattedError = useMemo(() => formatErrorMessage(discoveryError), [discoveryError]);

    const authOptions: OptionProps[] = [
        { id: "none", content: "None", value: "none" },
        { id: "bearer", content: "Bearer Auth", value: "bearer" }
    ];

    const handleFetchTools = useCallback(async () => {
        // Validate URL
        const trimmedUrl = manualServerUrl.trim();
        if (!trimmedUrl) {
            setUrlError("Server URL is required");
            return;
        }

        const cleanUrl = cleanServerUrl(trimmedUrl);
        if (!isValidUrl(cleanUrl)) {
            setUrlError("Please enter a valid HTTP or HTTPS URL");
            return;
        }

        setUrlError("");
        setDiscoveryError("");
        setLoadingDiscovery(true);
        setDiscoveredTools([]);
        setSelectedDiscoveredTools(new Set());

        try {
            // Use token directly if Bearer Auth is selected
            const accessToken = authType === "bearer" && authToken.trim()
                ? authToken.trim()
                : "";

            // Fetch tools from MCP server
            const response = await rpcClient.getAIAgentRpcClient().getMcpTools({
                serviceUrl: cleanUrl,
                accessToken
            });

            if (response.errorMsg) {
                setDiscoveryError(response.errorMsg);
            } else if (response.tools && response.tools.length > 0) {
                setDiscoveredTools(response.tools);

                // Check if any tools match existing selections
                const matchingTools = response.tools
                    .filter(t => existingToolNames?.has(t.name))
                    .map(t => t.name);

                if (matchingTools.length > 0) {
                    // Pre-select matching tools
                    setSelectedDiscoveredTools(new Set(matchingTools));
                } else {
                    // No matches, select all (fallback to original behavior)
                    setSelectedDiscoveredTools(new Set(response.tools.map(t => t.name)));
                }

                // Move to step 2 on successful fetch
                setCurrentStep(2);
            } else {
                setDiscoveredTools([]);
            }
        } catch (error) {
            setDiscoveryError(`Failed to fetch tools: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setLoadingDiscovery(false);
        }
    }, [manualServerUrl, authToken, authType, rpcClient, existingToolNames]);

    const handleToolSelectionChange = useCallback((toolName: string, isSelected: boolean) => {
        setSelectedDiscoveredTools(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(toolName);
            } else {
                newSet.delete(toolName);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedDiscoveredTools.size === discoveredTools.length) {
            // Deselect all
            setSelectedDiscoveredTools(new Set());
        } else {
            // Select all
            setSelectedDiscoveredTools(new Set(discoveredTools.map(t => t.name)));
        }
    }, [discoveredTools, selectedDiscoveredTools.size]);

    const handleBack = useCallback(() => {
        setCurrentStep(1);
        setDiscoveryError("");
        setSearchQuery("");
    }, []);

    const handleAddSelectedTools = useCallback(() => {
        if (selectedDiscoveredTools.size === 0) {
            setDiscoveryError("Please select at least one tool to continue");
            return;
        }
        onToolsSelected(discoveredTools, selectedDiscoveredTools);
        // Reset state
        setCurrentStep(1);
        setManualServerUrl("");
        setAuthType("none");
        setAuthToken("");
        setDiscoveredTools([]);
        setSelectedDiscoveredTools(new Set());
        setDiscoveryError("");
        setSearchQuery("");
        setUrlError("");
    }, [discoveredTools, selectedDiscoveredTools, onToolsSelected]);

    const handleClose = useCallback(() => {
        // Reset state when closing
        setCurrentStep(1);
        setManualServerUrl("");
        setAuthType("none");
        setAuthToken("");
        setDiscoveredTools([]);
        setSelectedDiscoveredTools(new Set());
        setDiscoveryError("");
        setSearchQuery("");
        setUrlError("");
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    return createPortal(
        <ModalContainer onClick={handleClose}>
            <ModalBox maxHeight="85vh" onClick={(e) => e.stopPropagation()}>
                <ModalHeaderSection>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        {currentStep === 2 && (
                            <BackArrow onClick={handleBack}>
                                <Codicon name="arrow-left" />
                            </BackArrow>
                        )}
                        <Typography>
                            Discover MCP Tools
                        </Typography>
                    </div>
                    <div onClick={handleClose} style={{ cursor: 'pointer' }}>
                        <Codicon name="close" />
                    </div>
                </ModalHeaderSection>
                <Divider sx={{ margin: 0 }} />

                <StyledModalContent marginTop="8px">
                    <Stepper
                        steps={["Configure", "Select"]}
                        currentStep={currentStep - 1}
                        alignment="flex-start"
                        className="mcp-stepper"
                    />
                    {currentStep === 1 ? (
                        <>
                            <FormSection>
                                <InfoMessage padding="8px 0">
                                    Enter server details to discover available tools. This URL is for discovery only and won't update the Server URL field.
                                </InfoMessage>

                                <TextField
                                    label="Server URL"
                                    placeholder="http://localhost:8000"
                                    value={manualServerUrl}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setManualServerUrl(e.target.value);
                                        setUrlError("");
                                    }}
                                    disabled={loadingDiscovery}
                                    errorMsg={urlError}
                                    required
                                />

                                <Dropdown
                                    id="auth-type-dropdown"
                                    label="Authentication"
                                    items={authOptions}
                                    value={authType}
                                    onValueChange={(value: string) => {
                                        const newAuthType = value as "none" | "bearer";
                                        setAuthType(newAuthType);
                                        if (newAuthType === "none") {
                                            setAuthToken("");
                                        }
                                    }}
                                    disabled={loadingDiscovery}
                                    containerSx={{ width: "100%" }}
                                />

                                {authType === "bearer" && (
                                    <TextField
                                        label="Token"
                                        value={authToken}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthToken(e.target.value)}
                                        disabled={loadingDiscovery}
                                        description="Enter your bearer token for authentication"
                                    />
                                )}
                            </FormSection>

                            {loadingDiscovery && (
                                <LoadingMessage padding="12px 0">
                                    <InlineSpinner />
                                    Fetching tools from MCP server...
                                </LoadingMessage>
                            )}

                            {discoveryError && !loadingDiscovery && (
                                <ErrorMessage padding="8px 0">{formattedError}</ErrorMessage>
                            )}
                        </>
                    ) : (
                        <>
                            <InfoMessage padding="8px 0">
                                Select the tools you want to add. You can search and filter the available tools below.
                            </InfoMessage>

                            <SearchContainer padding="12px 0">
                                <SearchBox
                                    placeholder="Search tools..."
                                    onChange={(val: string) => setSearchQuery(val)}
                                    value={searchQuery}
                                    iconPosition="end"
                                    aria-label="search-tools"
                                    sx={{ width: '100%' }}
                                />
                            </SearchContainer>

                            <ToolsHeader style={{ marginBottom: '12px' }} padding="12px 0 6px 0">
                                <InfoMessage padding="0" style={{ margin: 0 }}>
                                    {selectedDiscoveredTools.size} of {discoveredTools.length} selected
                                </InfoMessage>
                                <Button
                                    onClick={handleSelectAll}
                                    disabled={loadingDiscovery}
                                >
                                    {selectedDiscoveredTools.size === discoveredTools.length ? "Deselect All" : "Select All"}
                                </Button>
                            </ToolsHeader>

                            <ToolsList
                                tools={discoveredTools}
                                selectedTools={selectedDiscoveredTools}
                                loading={loadingDiscovery}
                                onToolSelectionChange={handleToolSelectionChange}
                                searchQuery={searchQuery}
                                maxHeight="40vh"
                            />

                            {discoveryError && (
                                <ErrorMessage padding="8px 0">{formattedError}</ErrorMessage>
                            )}
                        </>
                    )}
                </StyledModalContent>

                <ButtonContainer>
                    {currentStep === 1 ? (
                        <Button
                            onClick={handleFetchTools}
                            disabled={loadingDiscovery || !manualServerUrl.trim()}
                        >
                            {loadingDiscovery ? "Fetching..." : "Fetch Tools"}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleAddSelectedTools}
                            disabled={selectedDiscoveredTools.size === 0}
                        >
                            Add Selected Tools
                        </Button>
                    )}
                </ButtonContainer>
            </ModalBox>
        </ModalContainer>,
        document.body
    );
};
