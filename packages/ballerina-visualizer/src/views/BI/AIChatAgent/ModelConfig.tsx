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
import { CodeData, FlowNode, NodeProperties } from "@wso2/ballerina-core";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { convertConfig } from "../../../utils/bi";
import ConfigForm from "./ConfigForm";
import { Dropdown } from "@wso2/ui-toolkit";
import { cloneDeep } from "lodash";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { getAgentFilePath } from "./utils";

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

interface ModelConfigProps {
    agentCallNode: FlowNode;
    onSave?: () => void;
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
    const moduleConnectionNodes = useRef<FlowNode[]>([]);
    const selectedModelFlowNode = useRef<FlowNode>();

    useEffect(() => {
        initPanel();
    }, []);

    useEffect(() => {
        if (modelsCodeData.length > 0 && selectedModel && !selectedModelCodeData) {
            fetchModelNodeTemplate(selectedModel.codedata);
        }
    }, [modelsCodeData, selectedModel]);

    const initPanel = async () => {
        setLoading(true);
        agentFilePath.current = await getAgentFilePath(rpcClient);
        // fetch all models
        await fetchModels();
        // fetch selected agent model
        await fetchSelectedAgentModel();
        setLoading(false);
    };

    const fetchModels = async () => {
        console.log(">>> agent call node", agentCallNode);
        const agentName = agentCallNode?.properties.connection.value;
        if (!agentName) {
            console.error("Agent name not found", agentCallNode);
            return;
        }
        const models = await rpcClient
            .getAIAgentRpcClient()
            .getAllModels({ agent: agentName, filePath: agentFilePath.current });
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
        const agentName = agentCallNode.properties.connection.value;
        // get agent node
        const agentNode = moduleConnectionNodes.current.find((node) => node.properties.variable.value === agentName);
        console.log(">>> agent node", agentNode);
        if (!agentNode) {
            console.error("Agent node not found", agentCallNode);
            return;
        }
        // get model name
        const modelName = agentNode?.properties.model.value;
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
        if (selectedModel?.codedata.object === modelCodeData.object) {
            // use selected model properties
            selectedModelFlowNode.current = cloneDeep(selectedModel);
            nodeProperties = selectedModel?.properties;
        } else {
            const modelNodeTemplate = await getNodeTemplate(modelCodeData, agentFilePath.current);
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

    const getNodeTemplate = async (codeData: CodeData, filePath: string) => {
        const response = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
            position: { line: 0, offset: 0 },
            filePath: filePath,
            id: codeData,
        });
        console.log(">>> get node template response", response);
        return response?.flowNode;
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
        onSave?.();
        setSavingForm(false);
    };

    return (
        <Container>
            {modelsCodeData.length > 0 && (
                <Row>
                    <Dropdown
                        isRequired
                        errorMsg=""
                        id="agent-model-dropdown"
                        items={[
                            { value: "Select a provider...", content: "Select a provider..." },
                            ...modelsCodeData.map((model) => ({ value: model.object, content: model.object })),
                        ]}
                        label="Select Model Provider"
                        description={"Available Providers"}
                        onValueChange={(value) => {
                            if (value === "Select a provider...") {
                                return; // Skip the init option
                            }
                            const selectedModelCodeData = modelsCodeData.find((model) => model.object === value);
                            setSelectedModelCodeData(selectedModelCodeData);
                            fetchModelNodeTemplate(selectedModelCodeData);
                        }}
                        value={selectedModelCodeData?.object || (agentCallNode?.metadata.data?.model?.type as string)}
                        containerSx={{ width: "100%" }}
                    />
                </Row>
            )}
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && selectedModelFields?.length > 0 && selectedModel?.codedata?.lineRange && (
                <ConfigForm
                    formFields={selectedModelFields}
                    targetLineRange={selectedModel?.codedata.lineRange}
                    onSubmit={handleOnSave}
                    disableSaveButton={savingForm}
                />
            )}
        </Container>
    );
}
