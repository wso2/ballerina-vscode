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
import { AvailableNode, FlowNode, LineRange, NodeProperties } from "@wso2/ballerina-core";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { convertConfig } from "../../../utils/bi";
import ConfigForm from "./ConfigForm";
import { cloneDeep } from "lodash";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { getAiModuleOrg, getNodeTemplate } from "./utils";
import { AI, AI_COMPONENT_PROGRESS_MESSAGE, AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT, BALLERINA, GET_DEFAULT_MODEL_PROVIDER, LOADING_MESSAGE } from "../../../constants";
import { LoaderContainer } from "../../../components/RelativeLoader/styles";

const Container = styled.div`
    padding: 16px;
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
    const [formFields, setFormFields] = useState<FormField[]>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);
    const [progressMessage, setProgressMessage] = useState<string>(LOADING_MESSAGE);

    const projectPath = useRef<string>("");
    const aiModuleOrg = useRef<string>("");
    const modelNodes = useRef<AvailableNode[]>([]);

    useEffect(() => {
        initPanel();
    }, []);

    const initPanel = async () => {
        setLoading(true);
        // get project path
        const filePath = await rpcClient.getVisualizerLocation();
        projectPath.current = filePath.projectUri;
        // get agent org
        aiModuleOrg.current = await getAiModuleOrg(rpcClient);
        // fetch agent node
        await fetchAgentNode();
        setLoading(false);
    };

    useEffect(() => {
        if (agentNode) {
            configureFormFields();
        }
    }, [agentNode]);

    const fetchAgentNode = async () => {
        // Search for agent node using search API
        const agentSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
            filePath: projectPath.current,
            queryMap: { orgName: aiModuleOrg.current },
            searchKind: "AGENT"
        });
        console.log(">>> agentSearchResponse", agentSearchResponse);

        // Validate search response structure
        if (!agentSearchResponse?.categories?.[0]?.items?.length) {
            console.log(">>> no agents found");
            return;
        }
        const agentCodeData = (agentSearchResponse.categories[0].items[0] as AvailableNode).codedata;
        // get agent node template
        const agentNodeTemplate = await getNodeTemplate(rpcClient, agentCodeData, projectPath.current);
        setAgentNode(agentNodeTemplate);

        // hack: fetching from Central to build module dependency map in LSP may take time
        setTimeout(() => {
            setProgressMessage(AI_COMPONENT_PROGRESS_MESSAGE);
        }, AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT);

        // Search for model providers using search API
        const modelProviderSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
            filePath: projectPath.current,
            queryMap: { q: aiModuleOrg.current === BALLERINA ? "ai" : "OpenAiProvider" },
            searchKind: aiModuleOrg.current === BALLERINA ? "MODEL_PROVIDER" : "CLASS_INIT"
        });
        console.log(">>> modelProviderSearchResponse", modelProviderSearchResponse);

        modelNodes.current = modelProviderSearchResponse.categories[0].items as AvailableNode[];
    };

    const configureFormFields = () => {
        if (!(agentNode && agentCallNode)) {
            return;
        }
        // overwrite the agent call node properties
        agentCallNode.codedata.org = aiModuleOrg.current;

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

        // get openai model
        const defaultModelNode = modelNodes.current.find((model) =>
            model.codedata.object === "OpenAiProvider" || (model.codedata.org === BALLERINA && model.codedata.module === AI)
        );
        const defaultModel = defaultModelNode?.codedata;
        if (!defaultModel) {
            console.log(">>> no default model found");
            return;
        }
        // get model node template
        const defaultModelNodeTemplate = await getNodeTemplate(rpcClient, defaultModel, projectPath.current);

        // save model node
        const modelResponse = await rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({ filePath: projectPath.current, flowNode: defaultModelNodeTemplate });
        console.log(">>> modelResponse getSourceCode", { modelResponse });
        const modelVarName = defaultModelNodeTemplate.properties.variable.value as string;

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
        if ("agentType" in rawData) {
            updatedAgentNode.properties.agentType.value = rawData["agentType"];
        }

        const agentResponse = await rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({ filePath: projectPath.current, flowNode: updatedAgentNode });
        console.log(">>> agentResponse getSourceCode", { agentResponse });
        const agentVarName = agentNode.properties.variable.value as string;

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

        // If the selected model is the default WSO2 model provider, configure it
        if (defaultModelNode?.codedata?.symbol === GET_DEFAULT_MODEL_PROVIDER) {
            await rpcClient.getAIAgentRpcClient().configureDefaultModelProvider();
        }

        onSave?.();
        setSavingForm(false);
    };

    return (
        <Container>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader message={progressMessage} />
                </LoaderContainer>
            )}
            {!loading && (
                <ConfigForm
                    fileName={projectPath.current}
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
