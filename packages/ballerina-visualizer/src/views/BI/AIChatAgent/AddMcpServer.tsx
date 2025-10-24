/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { FlowNode } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { debounce } from "lodash";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RelativeLoader } from "../../../components/RelativeLoader";
import FormGenerator from "../Forms/FormGenerator";
import { McpToolsSelection } from "./McpToolsSelection";
import { cleanServerUrl } from "./formUtils";
import { Container, LoaderContainer } from "./styles";
import { findAgentNodeFromAgentCallNode, getAgentFilePath } from "./utils";

interface Tool {
    name: string;
    description?: string;
}

interface AddMcpServerProps {
    editMode?: boolean;
    name?: string;
    agentCallNode: FlowNode;
    onSave?: () => void;
    onBack?: () => void;
}

const SERVER_URL_FIELD_KEY = "serverUrl";
const AUTH_FIELD_KEY = "auth";

export function AddMcpServer(props: AddMcpServerProps): JSX.Element {
    const { agentCallNode, onSave, editMode = false } = props;
    const { rpcClient } = useRpcContext();

    const [serverUrl, setServerUrl] = useState("");
    const [auth, setAuth] = useState("");

    const [availableMcpTools, setAvailableMcpTools] = useState<Tool[]>([]);
    const [selectedMcpTools, setSelectedMcpTools] = useState<Set<string>>(new Set());
    const [loadingMcpTools, setLoadingMcpTools] = useState<boolean>(false);
    const [mcpToolsError, setMcpToolsError] = useState<string>("");

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const mcpToolKitNodeTemplateRef = useRef<FlowNode>(null);
    const mcpToolKitNodeRef = useRef<FlowNode>(null);
    const agentNodeRef = useRef<FlowNode>(null);

    const projectPathRef = useRef<string>("");
    const agentFilePathRef = useRef<string>("");
    const formRef = useRef<any>(null);

    const fetchAgentNode = async (connections: FlowNode[]) => {
        agentNodeRef.current = await findAgentNodeFromAgentCallNode(agentCallNode, rpcClient, connections);
    };

    const fetchMcpToolKitTemplate = async () => {
        const response = await rpcClient
            .getBIDiagramRpcClient()
            .getNodeTemplate({
                position: { line: 0, offset: 0 },
                filePath: projectPathRef.current,
                id: {
                    node: "MCP_TOOL_KIT",
                }
            });
        return response.flowNode;
    };

    const fetchModuleNodes = async () => {
        const moduleNodes = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
        return moduleNodes;
    };

    const setupEditMode = (variables: FlowNode[]) => {
        const mcpToolKitVariable = variables?.find(
            (v) => v.codedata?.node === "MCP_TOOL_KIT" && v.properties.variable?.value === props.name
        );
        if (!mcpToolKitVariable) return;
        mcpToolKitNodeRef.current = mcpToolKitVariable;
    };

    const initPanel = useCallback(async () => {
        setIsLoading(true);

        const visualizerLocation = await rpcClient.getVisualizerLocation();
        projectPathRef.current = visualizerLocation.projectUri;
        agentFilePathRef.current = await getAgentFilePath(rpcClient);

        const moduleNodes = await fetchModuleNodes();
        await fetchAgentNode(moduleNodes.flowModel.connections);
        const template = await fetchMcpToolKitTemplate();

        mcpToolKitNodeTemplateRef.current = template;

        if (editMode) {
            setupEditMode(moduleNodes.flowModel.variables);
        } else {
            mcpToolKitNodeRef.current = template;
        }

        setIsLoading(false);
    }, [editMode, rpcClient]);

    const fetchToolListFromMcpServer = useCallback(async (url: string, authValue: string = "") => {
        const cleanUrl = cleanServerUrl(url);
        if (!cleanUrl) {
            return [];
        }
        setAvailableMcpTools([]);
        setSelectedMcpTools(new Set());
        setLoadingMcpTools(true);
        setMcpToolsError("");

        // Extract token from auth value if it's in the format {token: "..."}
        let accessToken = "";
        if (authValue) {
            try {
                const tokenMatch = authValue.match(/token:\s*"([^"]*)"/);
                if (tokenMatch && tokenMatch[1]) {
                    accessToken = tokenMatch[1];
                }
            } catch (error) {
                console.error("Failed to parse auth token:", error);
            }
        }

        try {
            const response = await rpcClient.getAIAgentRpcClient().getMcpTools({
                serviceUrl: cleanUrl,
                accessToken: accessToken
            });

            if (response.errorMsg) {
                console.error(`Failed to fetch tools from MCP server: ${response.errorMsg}`);
                setMcpToolsError(response.errorMsg);
                throw new Error(response.errorMsg);
            }

            if (response.tools && Array.isArray(response.tools)) {
                setAvailableMcpTools(response.tools);
                const shouldRestoreTools = editMode && url === mcpToolKitNodeRef.current?.properties?.serverUrl?.value;
                const permittedTools = shouldRestoreTools
                    ? (mcpToolKitNodeRef.current?.properties?.permittedTools?.value || [])
                    : [];
                setSelectedMcpTools(new Set(permittedTools as string[]));
                setLoadingMcpTools(false);
                return response.tools;
            } else {
                setAvailableMcpTools([]);
                setSelectedMcpTools(new Set());
                setLoadingMcpTools(false);
                return [];
            }
        } catch (error) {
            console.error(`Failed to fetch tools from MCP server: ${error || 'Unknown error'}`);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setMcpToolsError(errorMessage);
            setLoadingMcpTools(false);
            throw error;
        }
    }, [rpcClient]);

    useEffect(() => {
        initPanel();
    }, [initPanel]);

    const debouncedFetchTools = useMemo(
        () => debounce((url: string, authValue: string) => {
            if (url.trim()) {
                fetchToolListFromMcpServer(url, authValue);
            } else {
                setAvailableMcpTools([]);
                setSelectedMcpTools(new Set());
                setLoadingMcpTools(false);
                setMcpToolsError("");
            }
        }, 500),
        [fetchToolListFromMcpServer]
    );

    useEffect(() => {
        debouncedFetchTools(serverUrl, auth);
    }, [serverUrl, auth, debouncedFetchTools]);

    const handleToolSelectionChange = useCallback((toolName: string, isSelected: boolean) => {
        setSelectedMcpTools(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(toolName);
            } else {
                newSet.delete(toolName);
            }
            return newSet;
        });
    }, []);

    const handleSelectAllTools = useCallback(() => {
        if (selectedMcpTools.size === availableMcpTools.length) {
            setSelectedMcpTools(new Set());
        } else {
            setSelectedMcpTools(new Set(availableMcpTools.map(t => t.name)));
        }
    }, [selectedMcpTools.size, availableMcpTools]);

    const handleSave = async (node?: FlowNode) => {
        setIsSaving(true);
        try {
            await rpcClient.getAIAgentRpcClient().updateMCPToolKit({
                agentFlowNode: agentNodeRef.current,
                selectedTools: Array.from(selectedMcpTools),
                updatedNode: node,
            });
            onSave?.();
        } catch (error) {
            console.error("Error saving MCP server:", error);
            rpcClient.getCommonRpcClient().showErrorMessage({
                message: "Failed to save MCP server configuration. Please try again."
            });
        } finally {
            setIsSaving(false);
        }
    };

    const injectedComponents = useMemo(() => {
        return [{
            component: (
                <McpToolsSelection
                    key="mcp-tools-selection"
                    tools={availableMcpTools}
                    selectedTools={selectedMcpTools}
                    loading={loadingMcpTools}
                    error={mcpToolsError}
                    onToolSelectionChange={handleToolSelectionChange}
                    onSelectAll={handleSelectAllTools}
                    serviceUrl={serverUrl}
                />
            ),
            index: 2
        }];
    }, [availableMcpTools, selectedMcpTools, loadingMcpTools, mcpToolsError, serverUrl, handleToolSelectionChange, handleSelectAllTools]);

    return (
        <Container>
            {isLoading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}

            {mcpToolKitNodeTemplateRef && (
                <FormGenerator
                    ref={formRef}
                    fileName={mcpToolKitNodeRef.current?.codedata?.lineRange?.fileName ? mcpToolKitNodeRef.current.codedata.lineRange?.fileName : agentFilePathRef.current}
                    targetLineRange={mcpToolKitNodeRef.current?.codedata?.lineRange ? mcpToolKitNodeRef.current.codedata.lineRange : agentCallNode.codedata?.lineRange}
                    nodeFormTemplate={mcpToolKitNodeTemplateRef.current}
                    submitText={"Save Tool"}
                    node={mcpToolKitNodeRef.current}
                    onSubmit={handleSave}
                    onChange={(fieldKey, value) => {
                        if (fieldKey === SERVER_URL_FIELD_KEY) {
                            setServerUrl(value);
                        }
                        if (fieldKey === AUTH_FIELD_KEY) {
                            setAuth(value);
                        }
                    }}
                    showProgressIndicator={isSaving}
                    injectedComponents={injectedComponents}
                />
            )}
        </Container>
    );
}
