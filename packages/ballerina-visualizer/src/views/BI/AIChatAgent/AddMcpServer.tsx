/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { FlowNode, LineRange } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { debounce } from "lodash";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RelativeLoader } from "../../../components/RelativeLoader";
import FormGenerator from "../Forms/FormGenerator";
import { McpToolsSelection } from "./McpToolsSelection";
import { cleanServerUrl } from "./formUtils";
import { Container, LoaderContainer } from "./styles";
import { extractAccessToken, findAgentNodeFromAgentCallNode, getAgentFilePath, getEndOfFileLineRange, parseToolsString, resolveVariableValue, resolveAuthConfig } from "./utils";

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

    const agentFilePathRef = useRef<string>("");
    const agentFileEndLineRangeRef = useRef<LineRange | null>(null);
    const formRef = useRef<any>(null);
    const moduleVariablesRef = useRef<FlowNode[]>([]);
    const projectPathUriRef = useRef<string>("");

    const fetchAgentNode = async () => {
        agentNodeRef.current = await findAgentNodeFromAgentCallNode(agentCallNode, rpcClient);
    };

    const fetchMcpToolKitTemplate = async () => {
        const response = await rpcClient
            .getBIDiagramRpcClient()
            .getNodeTemplate({
                position: { line: agentFileEndLineRangeRef.current.endLine.line, offset: agentFileEndLineRangeRef.current.endLine.offset },
                filePath: agentFilePathRef.current,
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

        agentFilePathRef.current = await getAgentFilePath(rpcClient);
        const endLineRange = await getEndOfFileLineRange("agents.bal", rpcClient);
        agentFileEndLineRangeRef.current = endLineRange;

        // Get project path URI
        const visualizerLocation = await rpcClient.getVisualizerLocation();
        projectPathUriRef.current = visualizerLocation.projectPath;

        const moduleNodes = await fetchModuleNodes();
        // Store module variables for later use
        moduleVariablesRef.current = moduleNodes.flowModel.variables || [];

        await fetchAgentNode();
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
        // Resolve the URL variable if needed
        const resolvedUrl = await resolveVariableValue(
            url,
            moduleVariablesRef.current,
            rpcClient,
            projectPathUriRef.current
        );

        const cleanUrl = cleanServerUrl(resolvedUrl);
        if (!cleanUrl) {
            return [];
        }

        // Reset state
        setAvailableMcpTools([]);
        setSelectedMcpTools(new Set());
        setLoadingMcpTools(true);
        setMcpToolsError("");

        // Resolve auth config variables if needed
        const resolvedAuthValue = await resolveAuthConfig(
            authValue,
            moduleVariablesRef.current,
            rpcClient,
            projectPathUriRef.current
        );

        const accessToken = extractAccessToken(resolvedAuthValue);

        try {
            const response = await rpcClient.getAIAgentRpcClient().getMcpTools({
                serviceUrl: cleanUrl,
                accessToken
            });

            if (response.errorMsg) {
                const errorMessage = `Failed to fetch tools from MCP server: ${response.errorMsg}`;
                console.error(errorMessage);
                setMcpToolsError(response.errorMsg);
                setLoadingMcpTools(false);
                return [];
            }

            if (!response.tools || !Array.isArray(response.tools)) {
                setLoadingMcpTools(false);
                return [];
            }

            setAvailableMcpTools(response.tools);

            // Restore previously selected tools if in edit mode and URL matches
            const shouldRestoreTools = editMode && url === mcpToolKitNodeRef.current?.properties?.serverUrl?.value;
            const permittedToolsValue = mcpToolKitNodeRef.current?.properties?.permittedTools?.value;
            if (shouldRestoreTools && permittedToolsValue) {
                const permittedTools = parseToolsString(permittedToolsValue as string, true);
                setSelectedMcpTools(new Set(permittedTools));
            } else {
                // Select all tools by default when not in edit mode or when URL changed
                setSelectedMcpTools(new Set(response.tools.map(tool => tool.name)));
            }

            setLoadingMcpTools(false);
            return response.tools;
        } catch (error) {
            console.error(`Failed to fetch tools from MCP server: ${error || 'Unknown error'}`);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setMcpToolsError(errorMessage);
            setLoadingMcpTools(false);
            return [];
        }
    }, [editMode, rpcClient]);

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

    const isSaveDisabled = useMemo(() => {
        return availableMcpTools.length > 0 && selectedMcpTools.size === 0;
    }, [availableMcpTools.length, selectedMcpTools.size]);

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
                    showValidationError={isSaveDisabled}
                />
            ),
            index: 1
        }];
    }, [availableMcpTools, selectedMcpTools, loadingMcpTools, mcpToolsError, serverUrl, handleToolSelectionChange, handleSelectAllTools, isSaveDisabled]);

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
                    fileName={mcpToolKitNodeRef.current?.codedata?.lineRange?.fileName ? mcpToolKitNodeRef.current.codedata.lineRange?.fileName : agentFileEndLineRangeRef.current?.fileName}
                    targetLineRange={mcpToolKitNodeRef.current?.codedata?.lineRange ? mcpToolKitNodeRef.current.codedata.lineRange : agentFileEndLineRangeRef.current}
                    nodeFormTemplate={mcpToolKitNodeTemplateRef.current}
                    submitText={"Save"}
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
                    disableSaveButton={isSaveDisabled}
                    injectedComponents={injectedComponents}
                    fieldPriority={{ auth: 1 }}
                />
            )}
        </Container>
    );
}
