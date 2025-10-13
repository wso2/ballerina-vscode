/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { AvailableNode, DataMapperDisplayMode, FlowNode, NodeMetadata } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, ThemeColors } from "@wso2/ui-toolkit";
import { RelativeLoader } from "../../../components/RelativeLoader";
import FormGenerator from "../Forms/FormGenerator";
import { findAgentNodeFromAgentCallNode, getAgentFilePath } from "./utils";
import { CheckBox } from '@wso2/ui-toolkit';
import { FormValues } from "@wso2/ballerina-side-panel";


export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
    box-sizing: border-box;
`;

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

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

interface AddToolProps {
    editMode?: boolean;
    name?: string;
    agentCallNode: FlowNode;
    onAddMcpServer: () => void;
    onSave?: () => void;
    onBack?: () => void;
}

export function AddMcpServer(props: AddToolProps): JSX.Element {
    const { agentCallNode, onAddMcpServer, onSave, editMode = false } = props;
    console.log(">>> Add Mcp Server props", props);
    const { rpcClient } = useRpcContext();
    const [mcpToolkitCount, setMcpToolkitCount] = useState<number>(0);
    const [agentNode, setAgentNode] = useState<FlowNode | null>(null);
    const [existingTools, setExistingTools] = useState<string[]>([]);
    const [toolsStringList, setToolsStringList] = useState<string>("");
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [urlError, setUrlError] = useState<string>("");
    const [nameError, setNameError] = useState<string>("");
    const [mcpToolResponse, setMcpToolResponse] = useState<FlowNode>(null);
    const [allVariables, setAllVariables] = useState<FlowNode[]>(null);

    const [serviceUrl, setServiceUrl] = useState("");
    const [pendingServiceUrl, setPendingServiceUrl] = useState("");
    const [errorInputs, setErrorInputs] = useState(false);
    const [configs, setConfigs] = useState({});
    const [toolSelection, setToolSelection] = useState("All");
    const [name, setName] = useState(props.name || "");
    const [hasUserTyped, setHasUserTyped] = useState(false);

    // New state for MCP server tools
    const [mcpTools, setMcpTools] = useState<Tool[]>([]);
    const [selectedMcpTools, setSelectedMcpTools] = useState<Set<string>>(new Set());
    const [loadingMcpTools, setLoadingMcpTools] = useState(false);
    const [mcpToolsError, setMcpToolsError] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const projectPath = useRef<string>("");
    const agentFilePath = useRef<string>("");
    const hasUpdatedToolsField = useRef(false);
    const formRef = useRef<any>(null);

    useEffect(() => {
        initPanel();
    }, [agentCallNode]);

    useEffect(() => {
        if (mcpToolResponse && !hasUpdatedToolsField.current) {
            console.log("Running updateMcpToolResponseWithToolsField", mcpToolResponse);
            updateMcpToolResponseWithToolsField();
            hasUpdatedToolsField.current = true;
        }
    }, [mcpToolResponse]);

    // Effect to fetch MCP tools when serviceUrl changes and toolSelection is "Selected"
    useEffect(() => {
        if (toolSelection === "Selected" && serviceUrl.trim()) {
            fetchMcpTools(serviceUrl);
        } else {
            // Clear tools when not in selected mode or no URL
            setMcpTools([]);
            setSelectedMcpTools(new Set());
            setMcpToolsError("");
        }
    }, [toolSelection, serviceUrl]);

    // Effect to fetch MCP tools when mcpToolResponse serviceUrl changes
    useEffect(() => {
        console.log(">>> mcpToolResponse serverUrl changed", (mcpToolResponse?.properties as any)?.['serverUrl']?.value);
        const serverUrlProp = (mcpToolResponse?.properties as any)?.['serverUrl']?.value;
        if (typeof serverUrlProp === "string" && serverUrlProp.trim() !== "") {
            fetchMcpTools(serverUrlProp);
        }
    }, [(mcpToolResponse?.properties as any)?.['serverUrl']?.value]);

    const fetchAgentNode = async () => {
        const agentNode = await findAgentNodeFromAgentCallNode(agentCallNode, rpcClient);
        setAgentNode(agentNode);

        const mcpToolResponse = await rpcClient
            .getBIDiagramRpcClient()
            .getNodeTemplate({
                position: { line: 0, offset: 0 },
                filePath: agentFilePath.current,
                id: {
                    node: "NEW_CONNECTION",
                    org: "ballerina",
                    module: "mcp",
                    "packageName": "mcp",
                    version: "0.9.1",
                    symbol: "init",
                    object: "Client"
                }
            });
        // Remove defaultValue from info if it exists
        removeDefaultValueFromInfo(mcpToolResponse.flowNode.properties);
        if (!editMode) {
            setMcpToolResponse(mcpToolResponse.flowNode);
        }
        console.log(">>> response getSourceCode with template ", { mcpToolResponse });
        console.log(">>> agent node ", { agentNode });
        const variableNodes = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
        console.log(">>> variableNodes", variableNodes);
        setAllVariables(variableNodes.flowModel.variables);
        if (editMode) {
            // Find the variable with type 'ai:McpToolKit'
            const mcpVariable = variableNodes.flowModel?.variables?.find(
                (v) => v.properties?.type?.value === "ai:McpToolKit" && v.properties.variable?.value === name
            );
            console.log(">>> mcpVariable", mcpVariable);
            // Properly add toolsToInclude to the properties object
            const updatedProperties = { ...(mcpVariable.properties || {}) };
            let permittedToolsValue = (mcpVariable.properties as any)?.permittedTools?.value;
            if (!permittedToolsValue) {
                fieldVal.value = "All";
            } else {
                fieldVal.value = permittedToolsValue === "()" ? "All" : "Selected";
            }
            (updatedProperties as any)["toolsToInclude"] = fieldVal;

            const updatedMcpToolResponse = {
                ...mcpVariable,
                properties: updatedProperties,
                codedata: mcpVariable.codedata,
            };
            removeDefaultValueFromInfo(updatedMcpToolResponse.properties);
            setMcpToolResponse(updatedMcpToolResponse);
        }
        if (agentNode?.properties?.tools?.value) {
            const toolsString = agentNode.properties.tools.value.toString();
            const mcpToolkits = extractMcpToolkits(toolsString);
            console.log(">>> toolsString", toolsString);
            console.log(">>> mcpToolkits", mcpToolkits);
            if (mcpToolkits.length > 0) {
                setMcpToolkitCount(mcpToolkits.length);
            }
            setToolsStringList(toolsString);

            if (name.trim() !== "") {
                const tools = (props.agentCallNode?.metadata?.data as NodeMetadata)?.tools || [];
                console.log(">>> tools", tools);
                if (tools.length > 0) {
                    const matchingTool = tools.find(tool => tool.name.includes(name));
                    console.log(">>> matching tool", matchingTool);
                    console.log(">>> existing mcp toolkit", toolsString);
                    
                    if (matchingTool) {
                        // Escape special regex characters in the tool name
                        const escapedToolName = matchingTool.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        
                        // Improved regex pattern to capture URL and permittedTools
                        const mcpToolkitPattern = `McpToolKit\\(\\s*"([^"]+)"\\s*,\\s*permittedTools\\s*=\\s*(\\([^)]*\\)|\\[[^\\]]*\\])\\s*,\\s*info\\s*=\\s*\\{[^}]*name:\\s*"${escapedToolName}[^"]*"`;
                        const mcpToolkitRegex = new RegExp(mcpToolkitPattern);
                        
                        const match = toolsString.match(mcpToolkitRegex);
                        console.log(">>> regex match", match);
                        
                        if (match) {
                            // Extract the URL (first capture group)
                            const url = match[1];
                            setServiceUrl(url);
                            
                            const permittedToolsStr = match[2];
                            if (permittedToolsStr && permittedToolsStr.trim() !== "()") {
                                setToolSelection("Selected");
                                const toolNames = permittedToolsStr
                                    .replace(/[\[\]()]/g, '')
                                    .split(',')
                                    .map(t => t.trim().replace(/"/g, ''))
                                    .filter(t => t !== '');
                                setSelectedMcpTools(new Set(toolNames));
                            } else {
                                setToolSelection("All");
                                setSelectedMcpTools(new Set());
                            }
                        }
                    }
                }
            }
        }
    };

    const initPanel = async () => {
        hasUpdatedToolsField.current = false; // Reset on panel init
        setLoading(true);
        // get project path
        const filePath = await rpcClient.getVisualizerLocation();
        projectPath.current = filePath.projectUri;
        // get agent file path
        agentFilePath.current = await getAgentFilePath(rpcClient);
        // fetch tools and agent node
        await fetchExistingTools();
        await fetchAgentNode();
        setLoading(false);
    };

    useEffect(() => {

    }, [name, (props.agentCallNode?.metadata?.data as NodeMetadata)?.tools, toolsStringList]);

    const extractMcpToolkits = (toolsString: string): string[] => {
        // Remove brackets and whitespace, then split by comma
        return toolsString
            .replace(/[\[\]\s]/g, '') // Remove [ ] and whitespace
            .split(',')
            .filter(Boolean); // Remove empty strings
    };
    
    const fetchExistingTools = async () => {
        const agentToolsSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
            filePath: projectPath.current,
            position: { startLine: { line: 0, offset: 0 }, endLine: { line: 0, offset: 0 } },
            searchKind: "AGENT_TOOL"
        });
        const existingToolsList = agentToolsSearchResponse.categories?.[0]?.items
            ? (agentToolsSearchResponse.categories[0].items as AvailableNode[]).map((item) => item.codedata.symbol)
            : [];
        console.log(">>> existing tools", existingToolsList);
        setExistingTools(existingToolsList);
    };

    const fetchMcpTools = async (url: string) => {
        // Remove leading/trailing double quotes if present
        const cleanUrl = url.replace(/^"|"$/g, '');
        if (!cleanUrl.trim()) {
            return;
        }
        setLoadingMcpTools(true);
        setMcpToolsError("");
        setMcpTools([]);
        if (!editMode) {
            setSelectedMcpTools(new Set());
        }
        try {
            const languageServerClient = rpcClient.getAIAgentRpcClient();
            if (typeof languageServerClient.getMcpTools === 'function') {
                const response = await languageServerClient.getMcpTools({ 
                    serviceUrl: cleanUrl.trim(),
                    configs: configs
                });
                if (response.tools && Array.isArray(response.tools)) {
                    setMcpTools(response.tools);
                } else {
                    setMcpToolsError("No tools found in MCP server response");
                }
            }
        } catch (error) {
            setMcpToolsError(`Failed to fetch tools from MCP server: ${error || 'Unknown error'}`);
        } finally {
            setLoadingMcpTools(false);
        }
    };

    // useEffect to fetch tools when pendingServiceUrl changes
    useEffect(() => {
        if (pendingServiceUrl.trim()) {
            fetchMcpTools(pendingServiceUrl);
        }
    }, [pendingServiceUrl]);

    const handleToolSelectionChange = (toolName: string, isSelected: boolean) => {
        const newSelectedTools = new Set(selectedMcpTools);
        if (isSelected) {
            newSelectedTools.add(toolName);
        } else {
            newSelectedTools.delete(toolName);
        }
        setSelectedMcpTools(newSelectedTools);
    };

    const extractMcpToolkitNames = (toolsString: string): string[] => {
        const names: string[] = [];
        
        // Regex to match McpToolKit with name in info object
        const mcpToolkitPattern = /McpToolKit\([^}]*info\s*=\s*\{[^}]*name:\s*"([^"]+)"/g;
        let match;
        
        while ((match = mcpToolkitPattern.exec(toolsString)) !== null) {
            names.push(match[1]);
        }
        
        return names;
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

    // Update handleOnSave to accept all submitted form values
    const handleOnSave = async (
        node?: FlowNode,
        dataMapperMode?: DataMapperDisplayMode,
        formImports?: any,
        rawFormValues?: FormValues
    ) => {
        console.log(">>> selected tools", selectedTools)
        console.log("All submitted form values:", rawFormValues);
        console.log("handle on save node:", node);

        // Use the same logic as the display to determine the name
        let finalName;
        if (name.trim() !== "") {
            finalName = name.trim();
        } else {
            finalName = mcpToolkitCount > 1 ? `MCP Server 0${mcpToolkitCount}` : "MCP Server";
        }

        const payload = {
            name: finalName,
            serviceUrl: serviceUrl.trim(),
            configs: configs,
            toolSelection,
            selectedTools: selectedTools,
            mcpTools
        };
        // Update node.properties so that each key is an object with a value property
        if (rawFormValues && node && node.properties) {
            const props = node.properties as Record<string, any>;
            Object.entries(rawFormValues).forEach(([key, value]) => {
                if (props[key] && typeof props[key] === "object" && "value" in props[key]) {
                    props[key].value = value;
                } else {
                    props[key] = { value };
                }
            });
            node.properties = props;
        }
        console.log(">>> Saving with payload:", payload);

        setSavingForm(true);
        try {
            await rpcClient.getAIAgentRpcClient().updateMCPToolKit({
                agentFlowNode: agentNode,
                serviceUrl: `"${payload.serviceUrl}"`,
                serverName: finalName,
                selectedTools: selectedTools,
                updatedNode: node,
                codedata: mcpToolResponse.codedata,
                mcpTools: payload.mcpTools
            });
            setServiceUrl(payload.serviceUrl);
            onSave?.();
        } catch (error) {
            console.error(">>> Error saving MCP server", error);
        } finally {
            setSavingForm(false);
        }
    };

    const existingMcpToolkits = extractMcpToolkitNames(toolsStringList);

    const generateUniqueValue = () => {
        if (hasUserTyped || editMode) {
            return name;
        }
        
        let counter = mcpToolkitCount;
        let candidateValue = counter > 1 ? `MCP Server 0${counter}` : "MCP Server";
        while (existingMcpToolkits.some(existingName => 
            existingName.toLowerCase() === candidateValue.trim().toLowerCase()
        )) {
            counter++;
            candidateValue = `MCP Server 0${counter}`;
        }
        
        return candidateValue;
    };

    // Refactored: Accept variables as parameter
    const generateUniqueVariable = (variables: FlowNode[] = allVariables) => {
        if (hasUserTyped || editMode) {
            return name;
        }

        let counter = mcpToolkitCount;
        let candidateValue = counter >= 1 ? `mcpServer${counter}` : "mcpServer";
        // Loop until candidateValue is unique among variables
        while ((variables || []).some(v => {
            const val = v.properties?.variable?.value;
            return typeof val === 'string' && val.trim().toLowerCase() === candidateValue.trim().toLowerCase();
        })) {
            counter++;
            candidateValue = `mcpServer${counter}`;
        }
        return candidateValue;
    };


    const hasExistingTools = existingTools.length > 0;
    const isToolSelected = selectedTool !== null;
    const canSave = serviceUrl.trim() && (toolSelection !== "Selected" || selectedMcpTools.size > 0);

    console.log(">>> rendering conditions", { hasExistingTools, isToolSelected, canSave, editMode });

    // Change renderToolsSelection to accept mcpTools as a parameter
    const renderToolsSelection = (tools = mcpTools) => {
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
                        <RelativeLoader />
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

                {!loadingMcpTools && !mcpToolsError && tools.length === 0 && serviceUrl.trim() && (
                    <div style={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: '12px' }}>
                        No tools available from this MCP server
                    </div>
                )}
            </ToolsContainer>
        );
    };
    console.log(">>> agentNode", agentCallNode);

    const fieldVal = {
        key: "scope",
        advanced: false,
        codedata: {
            kind: 'REQUIRED',
            originalName: 'scope',
        },
        editable: true,
        hidden: false,
        metadata: {
            label: "Tools to Include",
            description: "Select the tools to include in the MCP server."
        },
        optional: false,
        placeholder: "",
        valueType: "SINGLE_SELECT",
        valueTypeConstraint: "string",
        value: "All", // <-- add this line to fix the linter error
        typeMembers: [
            {
                type: "string",
                packageInfo: "",
                packageName: "",
                kind: "BASIC_TYPE",
                selected: false
            }
        ],
        imports: {},
        defaultValue: "All",
        itemOptions: [    {
        "id": "All",
        "content": "All",
        "value": "All"
    },
    {
        "id": "Selected",
        "content": "Selected",
        "value": "Selected"
    }]
    };

    function removeDefaultValueFromInfo(properties: any) {
        if (properties && properties.info && typeof properties.info === 'object' && 'defaultValue' in properties.info) {
            delete properties.info.defaultValue;
        }
    }

    // Refactor to accept variableName as parameter
    const updateMcpToolResponseWithToolsField = (variableName?: string) => {
        if (mcpToolResponse) {
            // Clone properties to avoid mutating state directly
            const updatedProperties = { ...(mcpToolResponse.properties || {}) };

            if (editMode) {
                if ("serverUrl" in updatedProperties && updatedProperties["serverUrl"]) {
                    (updatedProperties["serverUrl"] as { value: string }).value = serviceUrl;
                }
                // Only update 'info' if it exists in updatedProperties and has a 'value' property
                if ("info" in updatedProperties && typeof (updatedProperties["info"] as any)?.value === "string") {
                    (updatedProperties["info"] as { value: string }).value = ((mcpToolResponse.properties as any)?.info?.value) || "";
                }
            }

            if ("variable" in updatedProperties && updatedProperties["variable"]) {
                (updatedProperties["variable"] as { value: string }).value = variableName || generateUniqueVariable(allVariables);
            }
            let permittedToolsValue = (mcpToolResponse.properties as any)?.permittedTools?.value;
            if (!permittedToolsValue) {
                fieldVal.value = "All";
            } else {
                fieldVal.value = permittedToolsValue === "()" ? "All" : "Selected";
            }
            // Add fieldVal as a property named 'scope', wrapped as a Property object
            (updatedProperties as any)["toolsToInclude"] = fieldVal;

            const updatedMcpToolResponse = {
                ...mcpToolResponse,
                properties: updatedProperties,
            };
            removeDefaultValueFromInfo(updatedMcpToolResponse.properties);
            setMcpToolResponse(updatedMcpToolResponse);
        }
    };

    const [selectedTools, setSelectedTools] = useState<string[]>([]);

    const handleToolsChange = (tools: string[]) => {
        setSelectedTools(tools);
        // You can do other things here as needed
    };

    useEffect(() => {
        if (allVariables && Array.isArray(allVariables)) {
            const uniqueVar = generateUniqueVariable(allVariables);
            updateMcpToolResponseWithToolsField(uniqueVar);
            console.log('Generated unique variable:', uniqueVar);
        }
    }, [allVariables]);

    return (
        <Container>
            
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}

            {mcpToolResponse && (
                <FormGenerator
                    ref={formRef}
                    fileName={agentFilePath.current}
                    targetLineRange={{ startLine: { line: 0, offset: 0 }, endLine: { line: 0, offset: 0 } }}
                    nodeFormTemplate={mcpToolResponse}
                    submitText={"Save Tool"}
                    node={mcpToolResponse}
                    onSubmit={handleOnSave}
                    scopeFieldAddon={renderToolsSelection(mcpTools)}
                    newServerUrl={serviceUrl}
                    onChange={(fieldKey, value) => {
                        if (fieldKey === "serverUrl") {
                            setPendingServiceUrl(value);
                            setServiceUrl(value);
                        }
                    }}
                    mcpTools={mcpTools}
                    // Pass the handler to FormGenerator
                    onToolsChange={handleToolsChange}
                    showProgressIndicator={savingForm}
                />
            )}
        </Container>
    );
}

