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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { CodeData, FlowNode, NodeMetadata, NodeProperties, UpdatedArtifactsResponse } from "@wso2/ballerina-core";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { convertConfig } from "../../../utils/bi";
import ConfigForm from "./ConfigForm";
import { Dropdown } from "@wso2/ui-toolkit";
import { cloneDeep } from "lodash";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { getAgentFilePath, getAiModuleOrg, getNodeTemplate, getNPFilePath } from "./utils";
import { BALLERINA, BALLERINAX, GET_DEFAULT_MODEL_PROVIDER, WSO2_MODEL_PROVIDER, PROVIDER_NAME_MAP } from "../../../constants";

const Container = styled.div`
    padding: 16px;
    height: 100%;
`;

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
`;

const InfoBox = styled.div`
    font-size: 13px;
    color: var(--vscode-foreground);
    padding: 12px;
    margin-bottom: 16px;
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    border-radius: 4px;

    strong {
        font-weight: 600;
    }

    .description {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
    }

    .command-wrapper {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
    }
`;

const CodeBlock = styled.code`
    font-size: 11px;
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family);
    background-color: var(--vscode-textCodeBlock-background);
    padding: 2px 4px;
    border-radius: 3px;
    border: 1px solid var(--vscode-widget-border);
    margin-top: 6px;
    display: inline-block;
`;

interface ModelConfigProps {
    agentCallNode: FlowNode;
    onSave?: (response?: UpdatedArtifactsResponse) => void;
}

export function ModelConfig(props: ModelConfigProps): JSX.Element {
    const { agentCallNode, onSave } = props;

    const { rpcClient } = useRpcContext();
    // use selected model
    const [modelsCodeData, setModelsCodeData] = useState<CodeData[]>([]);
    const [selectedModelCodeData, setSelectedModelCodeData] = useState<CodeData>();
    // already assigned model
    const [selectedModel, setSelectedModel] = useState<FlowNode>();
    const [selectedModelFields, setSelectedModelFields] = useState<FormField[]>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const agentFilePath = useRef<string>("");
    const aiModuleOrg = useRef<string>("");
    const moduleConnectionNodes = useRef<FlowNode[]>([]);
    const selectedModelFlowNode = useRef<FlowNode>();

    useEffect(() => {
        initPanel();
    }, []);

    useEffect(() => {
        if (modelsCodeData.length > 0 && selectedModel && !selectedModelCodeData) {
            // Find the initial modelCodeData that matches selectedModel
            let initialModelCodeData: CodeData | undefined;
            if (aiModuleOrg.current === BALLERINA) {
                initialModelCodeData = modelsCodeData.find((model) => model.module === selectedModel.codedata.module);
            } else if (aiModuleOrg.current === BALLERINAX) {
                initialModelCodeData = modelsCodeData.find((model) => model.object === selectedModel.codedata.object);
            } else {
                initialModelCodeData = modelsCodeData.find((model) => model.module === selectedModel.codedata.module);
            }
            if (initialModelCodeData) {
                setSelectedModelCodeData(initialModelCodeData);
                fetchModelNodeTemplate(initialModelCodeData);
            } else {
                fetchModelNodeTemplate(selectedModel.codedata);
            }
        }
    }, [modelsCodeData, selectedModel]);

    const initPanel = async () => {
        setLoading(true);
        if (agentCallNode?.codedata?.node === "NP_FUNCTION") {
            agentFilePath.current = await getNPFilePath(rpcClient);
        } else {
            agentFilePath.current = await getAgentFilePath(rpcClient);
        }

        if (agentCallNode?.codedata?.node === "NP_FUNCTION") {
            aiModuleOrg.current = "ballerina"
        } else {
            aiModuleOrg.current = await getAiModuleOrg(rpcClient);
        }

        // fetch all models
        await fetchModels();
        // fetch selected agent model
        await fetchSelectedAgentModel();
        setLoading(false);
    };

    // Helper to get provider name from modelCodeData
    const getProviderName = (model: CodeData, useMappedName: boolean = false) => {
        if (!model) return "";
        if (aiModuleOrg.current === BALLERINA) {
            if (useMappedName) {
                return PROVIDER_NAME_MAP[model.module] || model.module;
            }
            return model.module;
        } else if (aiModuleOrg.current === BALLERINAX) {
            return model.object;
        }
        // fallback
        return model.module || model.object;
    };

    const fetchModels = async () => {
        console.log(">>> agent call node", agentCallNode);
        let agentName;
        if (agentCallNode?.codedata?.node === "NP_FUNCTION") {
            agentName = agentCallNode.properties?.modelProvider?.value;
        } else {
            agentName = agentCallNode?.properties.connection.value;
        }
        if (!agentName) {
            console.error("Agent name not found", agentCallNode);
            return;
        }
        const models = await rpcClient
            .getAIAgentRpcClient()
            .getAllModels({ agent: agentName, filePath: agentFilePath.current, orgName: aiModuleOrg.current });
        console.log(">>> all models", models);
        setModelsCodeData(models.models);
    };

    const fetchSelectedAgentModel = async () => {
        // get module nodes
        const moduleNodes = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
        console.log(">>> module nodes", moduleNodes);
        if (moduleNodes.flowModel.connections.length > 0) {
            moduleConnectionNodes.current = moduleNodes.flowModel.connections;
        }
        // get agent name
        let agentName;
        if (agentCallNode?.codedata?.node === "NP_FUNCTION") {
            agentName = agentCallNode.properties?.modelProvider?.value;
        } else {
            agentName = agentCallNode.properties.connection.value;
        }
        // get agent node
        const agentNode = moduleConnectionNodes.current.find((node) => node.properties.variable.value === agentName);
        console.log(">>> agent node", agentNode);
        if (!agentNode) {
            console.error("Agent node not found", agentCallNode);
            return;
        }
        // get model name
        const modelName = agentNode?.properties?.model?.value || agentNode?.properties?.variable?.value;
        console.log(">>> model name", modelName);
        // get model node
        const modelNode = moduleConnectionNodes.current.find((node) => node.properties.variable.value === modelName);
        setSelectedModel(modelNode);
        console.log(">>> selected model node", modelNode);
    };

    // fetch selected model code data - node template
    const fetchModelNodeTemplate = async (modelCodeData: CodeData) => {
        setLoading(true);
        let nodeProperties: NodeProperties = {};
        // Determine provider match for both aiModuleOrg cases
        let isProviderMatch = false;
        if (aiModuleOrg.current === BALLERINA) {
            isProviderMatch = selectedModel?.codedata.module === modelCodeData.module;
        } else if (aiModuleOrg.current === BALLERINAX) {
            isProviderMatch = selectedModel?.codedata.object === modelCodeData.object;
        } else {
            isProviderMatch = selectedModel?.codedata.module === modelCodeData.module;
        }
        if (isProviderMatch) {
            // use selected model properties
            selectedModelFlowNode.current = cloneDeep(selectedModel);
            nodeProperties = selectedModel?.properties;
        } else {
            const modelNodeTemplate = await getNodeTemplate(rpcClient, modelCodeData, agentFilePath.current);
            console.log(">>> selected model node template", { modelNodeTemplate, modelCodeData });
            selectedModelFlowNode.current = cloneDeep(modelNodeTemplate);
            nodeProperties = modelNodeTemplate.properties;
        }
        console.log(">>> node properties", nodeProperties);
        // use same variable name for model fields
        if (selectedModel?.properties.variable) {
            nodeProperties.variable.value = selectedModel?.properties.variable.value;
            nodeProperties.variable.hidden = true;
        } else {
            console.error("Already assigned model node variable not found", selectedModel);
        }

        const modelFields = convertConfig(nodeProperties);
        setSelectedModelFields(modelFields);
        setLoading(false);
    };

    const handleOnSave = async (data: FormField[], rawData: FormValues) => {
        console.log(">>> save value", { data, rawData });
        setSavingForm(true);
        const nodeTemplate = selectedModelFlowNode.current;
        data.forEach((field) => {
            if (field.editable) {
                nodeTemplate.properties[field.key as keyof typeof nodeTemplate.properties].value = field.value;
            }
        });
        // update codedata range with already assigned model range (override)
        nodeTemplate.codedata.lineRange = selectedModel?.codedata.lineRange;
        // update isNew to false
        nodeTemplate.codedata.isNew = false;
        // update model name
        nodeTemplate.properties.variable.value = selectedModel?.properties.variable.value;
        console.log(">>> request getSourceCode with template ", { nodeTemplate });
        // update source
        const response = await rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({ filePath: agentFilePath.current, flowNode: nodeTemplate });
        console.log(">>> response getSourceCode with template ", { response });

        // If the selected model is the default WSO2 model provider, configure it
        if (selectedModelCodeData?.symbol === GET_DEFAULT_MODEL_PROVIDER) {
            await rpcClient.getAIAgentRpcClient().configureDefaultModelProvider();
        }

        onSave?.(response);
        setSavingForm(false);
    };

    return (
        <Container>
            {modelsCodeData.length > 0 && (
                <>
                    <Row>
                        <Dropdown
                            isRequired
                            errorMsg=""
                            id="agent-model-dropdown"
                            items={[
                                { value: "Select a provider...", content: "Select a provider..." },
                                ...[...modelsCodeData]
                                    .sort((a, b) => (b.symbol === GET_DEFAULT_MODEL_PROVIDER ? 1 : 0) - (a.symbol === GET_DEFAULT_MODEL_PROVIDER ? 1 : 0))
                                    .map((model) => ({
                                        value: getProviderName(model),
                                        content: model.symbol === GET_DEFAULT_MODEL_PROVIDER ? WSO2_MODEL_PROVIDER : getProviderName(model, true)
                                    })),
                            ]}
                            label="Select Model Provider"
                            description={"Available Providers"}
                            onValueChange={(value) => {
                                if (value === "Select a provider...") {
                                    return; // Skip the init option
                                }
                                const selectedModelCodeData = modelsCodeData.find((model) => getProviderName(model) === value);
                                console.log("Selected Model Code Data: ", selectedModelCodeData);
                                setSelectedModelCodeData(selectedModelCodeData);
                                fetchModelNodeTemplate(selectedModelCodeData);
                            }}
                            value={
                                selectedModelCodeData
                                    ? getProviderName(selectedModelCodeData)
                                    : ((agentCallNode?.metadata.data as NodeMetadata)?.model?.type as string)
                            }
                            containerSx={{ width: "100%" }}
                        />
                    </Row>
                    {selectedModelCodeData?.symbol === GET_DEFAULT_MODEL_PROVIDER && (
                        <Row>
                            <InfoBox>
                                <div className="command-wrapper">
                                    <span>
                                        Using the default WSO2 Model Provider will automatically add the necessary configuration values to <strong>Config.toml</strong>.
                                    </span>
                                </div>
                                <div className="description">
                                    This can also be done using the VSCode command palette command: <br />
                                    <CodeBlock>
                                        {">"} Ballerina: Configure default WSO2 model provider
                                    </CodeBlock>
                                </div>
                            </InfoBox>
                        </Row>
                    )}
                </>
            )}
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && selectedModelFields?.length > 0 && selectedModel?.codedata?.lineRange && (
                <ConfigForm
                    fileName={agentFilePath.current}
                    formFields={selectedModelFields}
                    targetLineRange={selectedModel?.codedata.lineRange}
                    onSubmit={handleOnSave}
                    disableSaveButton={savingForm}
                    isSaving={savingForm}
                />
            )}
        </Container>
    );
}
