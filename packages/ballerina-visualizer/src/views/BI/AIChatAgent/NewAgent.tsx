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

import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { CodeData, FlowNode, LinePosition, LineRange, NodeProperties } from "@wso2/ballerina-core";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { convertConfig } from "../../../utils/bi";
import { URI, Utils } from "vscode-uri";
import ConfigForm from "./ConfigForm";
import { cloneDeep } from "lodash";
import { RelativeLoader } from "../../../components/RelativeLoader";

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

interface NewAgentProps {
    agentCallNode: FlowNode;
    fileName: string; // file name of the agent call node
    lineRange: LineRange;
    onSave?: () => void;
}

export function NewAgent(props: NewAgentProps): JSX.Element {
    const { agentCallNode, fileName, lineRange, onSave } = props;
    console.log(">>> NewAgent props", props);
    const { rpcClient } = useRpcContext();

    const [agentNode, setAgentNode] = useState<FlowNode | null>(null);
    const [defaultModelNode, setDefaultModelNode] = useState<FlowNode | null>(null);
    const [formFields, setFormFields] = useState<FormField[]>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const agentFilePath = useRef<string>("");
    const agentCallEndOfFile = useRef<LinePosition | null>(null);
    const agentEndOfFile = useRef<LinePosition | null>(null);

    useEffect(() => {
        initPanel();
    }, []);

    const initPanel = async () => {
        setLoading(true);
        // get agent file path
        const filePath = await rpcClient.getVisualizerLocation();
        agentFilePath.current = Utils.joinPath(URI.file(filePath.projectUri), "agents.bal").fsPath;
        // fetch agent node
        await fetchAgentNode();
        // get end of files
        // main.bal last line
        const endOfFile = await rpcClient.getBIDiagramRpcClient().getEndOfFile({ filePath: fileName });
        console.log(">>> endOfFile", endOfFile);
        agentCallEndOfFile.current = endOfFile;
        // agent.bal file last line
        const endOfAgentFile = await rpcClient
            .getBIDiagramRpcClient()
            .getEndOfFile({ filePath: agentFilePath.current });
        console.log(">>> endOfAgentFile", endOfAgentFile);
        agentEndOfFile.current = endOfAgentFile;
    };

    useEffect(() => {
        if (agentNode && defaultModelNode) {
            configureFormFields();
            setLoading(false);
        }
    }, [agentNode, defaultModelNode]);

    const fetchAgentNode = async () => {
        // get the agent node
        const allAgents = await rpcClient.getAIAgentRpcClient().getAllAgents({ filePath: agentFilePath.current });
        console.log(">>> allAgents", allAgents);
        if (!allAgents.agents.length) {
            console.log(">>> no agents found");
            return;
        }
        const agentCodeData = allAgents.agents.at(0);
        // get agent node template
        const agentNodeTemplate = await getNodeTemplate(agentCodeData, agentFilePath.current);
        setAgentNode(agentNodeTemplate);

        // get all llm models
        const allModels = await rpcClient
            .getAIAgentRpcClient()
            .getAllModels({ agent: agentCodeData.object, filePath: agentFilePath.current });
        console.log(">>> allModels", allModels);
        // get openai model
        const defaultModel = allModels.models.find((model) => model.object === "OpenAiProvider");
        if (!defaultModel) {
            console.log(">>> no default model found");
            return;
        }
        // get model node template
        const modelNodeTemplate = await getNodeTemplate(defaultModel, agentFilePath.current);
        setDefaultModelNode(modelNodeTemplate);

        // get agent call node template
    };

    const configureFormFields = () => {
        if (!(agentNode && agentCallNode)) {
            return;
        }
        const agentCallFormFields = convertConfig(agentCallNode.properties);
        const systemPromptProperty = agentNode.properties.systemPrompt;
        if (systemPromptProperty) {
            let roleValue = "";
            let instructionValue = "";
            if (systemPromptProperty.value) {
                const valueStr = systemPromptProperty.value.toString();
                const roleMatch = valueStr.match(/role:\s*"([^"]*)"/);
                if (roleMatch && roleMatch[1]) {
                    roleValue = roleMatch[1];
                }

                const instructionsMatch = valueStr.match(/instructions:\s*string\s*`([^`]*)`/);
                if (instructionsMatch && instructionsMatch[1]) {
                    instructionValue = instructionsMatch[1];
                }
            }

            const customFields: FormField[] = [
                {
                    key: "role",
                    label: "Role",
                    type: "STRING",
                    optional: true,
                    advanced: false,
                    placeholder: "e.g. Customer Support Assistant",
                    editable: true,
                    enabled: true,
                    documentation: "The role of the AI agent",
                    valueType: "STRING",
                    value: roleValue,
                    valueTypeConstraint: "string",
                    diagnostics: [],
                    metadata: {
                        label: "Role",
                        description: "The role of the AI agent",
                    },
                },
                {
                    key: "instruction",
                    label: "Instructions",
                    type: "TEXTAREA",
                    optional: false,
                    advanced: false,
                    placeholder: "Detailed instructions for the agent...",
                    editable: true,
                    enabled: true,
                    documentation: "Detailed instructions for the agent",
                    valueType: "STRING",
                    value: instructionValue,
                    valueTypeConstraint: "string",
                    diagnostics: [],
                    metadata: {
                        label: "Instructions",
                        description: "Detailed instructions for the agent",
                    },
                },
            ];
            const queryFieldIndex = agentCallFormFields.findIndex((field) => field.key === "query");
            if (queryFieldIndex !== -1) {
                agentCallFormFields.splice(queryFieldIndex, 0, ...customFields);
            } else {
                agentCallFormFields.push(...customFields);
            }
        }

        // add verbose, maxIter and agentType fields from agent node
        const otherAgentProperties: NodeProperties = {};
        if (agentNode.properties.verbose) {
            otherAgentProperties.verbose = cloneDeep(agentNode.properties.verbose);
        }
        if (agentNode.properties.maxIter) {
            otherAgentProperties.maxIter = cloneDeep(agentNode.properties.maxIter);
        }
        if (agentNode.properties.agentType) {
            otherAgentProperties.agentType = cloneDeep(agentNode.properties.agentType);
        }
        const otherAgentFormFields = convertConfig(otherAgentProperties);
        agentCallFormFields.push(...otherAgentFormFields);

        // let's hide connection field
        const connectionField = agentCallFormFields.find((field) => field.key === "connection");
        if (connectionField) {
            connectionField.enabled = false;
        }
        setFormFields(agentCallFormFields);
    };

    const handleOnSave = async (data: FormField[], rawData: FormValues) => {
        console.log(">>> save value", { data, rawData });
        setSavingForm(true);

        // save model node
        const modelResponse = await rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({ filePath: agentFilePath.current, flowNode: defaultModelNode });
        console.log(">>> modelResponse getSourceCode", { modelResponse });
        const modelVarName = defaultModelNode.properties.variable.value as string;

        // wait 2 seconds (wait until LS is updated)
        console.log(">>> wait 2 seconds");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // save the agent node
        const updatedAgentNode = cloneDeep(agentNode);
        const roleValue = (rawData["role"] || "").replace(/"/g, '\\"');
        const instructionValue = (rawData["instruction"] || "").replace(/"/g, '\\"');
        const systemPromptValue = `{role: "${roleValue}", instructions: string \`${instructionValue}\`}`;
        updatedAgentNode.properties.systemPrompt.value = systemPromptValue;
        updatedAgentNode.properties.model.value = modelVarName;
        updatedAgentNode.properties.tools.value = [];
        updatedAgentNode.properties.verbose.value = rawData["verbose"];
        updatedAgentNode.properties.maxIter.value = rawData["maxIter"];
        updatedAgentNode.properties.agentType.value = rawData["agentType"];

        const agentResponse = await rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({ filePath: agentFilePath.current, flowNode: updatedAgentNode });
        console.log(">>> agentResponse getSourceCode", { agentResponse });
        const agentVarName = agentNode.properties.variable.value as string;

        // wait 2 seconds (wait until LS is updated)
        console.log(">>> wait 2 seconds");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // update the agent call node
        const updatedAgentCallNode = cloneDeep(agentCallNode);
        updatedAgentCallNode.properties.variable.value = rawData["variable"];
        updatedAgentCallNode.properties.query.value = rawData["query"];
        updatedAgentCallNode.properties.sessionId.value = rawData["sessionId"];
        updatedAgentCallNode.properties.connection.value = agentVarName;
        updatedAgentCallNode.codedata.parentSymbol = agentVarName;
        // HACK: add line range
        updatedAgentCallNode.codedata.lineRange = {
            fileName: fileName,
            startLine: lineRange.startLine,
            endLine: lineRange.endLine,
        };
        console.log(">>> request getSourceCode", { filePath: fileName, flowNode: updatedAgentCallNode });
        const agentCallResponse = await rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({ filePath: fileName, flowNode: updatedAgentCallNode });
        console.log(">>> response getSourceCode with template ", { agentCallResponse });

        onSave?.();
        setSavingForm(false);
    };

    const getNodeTemplate = async (
        codeData: CodeData,
        filePath: string,
        position: LinePosition = { line: 0, offset: 0 }
    ) => {
        const response = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
            position: position,
            filePath: filePath,
            id: codeData,
        });
        console.log(">>> get node template response", response);
        return response?.flowNode;
    };

    return (
        <Container>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && (
                <ConfigForm
                    isSaving={savingForm}
                    formFields={formFields}
                    targetLineRange={{
                        fileName: fileName,
                        ...lineRange,
                    }}
                    onSubmit={handleOnSave}
                    disableSaveButton={savingForm}
                />
            )}
        </Container>
    );
}
