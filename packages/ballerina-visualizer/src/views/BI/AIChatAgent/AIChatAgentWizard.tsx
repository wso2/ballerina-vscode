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

import { useEffect, useRef, useState } from 'react';
import { AvailableNode, CDModel, CodeData, EVENT_TYPE, NodeKind } from '@wso2/ballerina-core';
import { View, ViewContent, TextField, Button, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { TitleBar } from '../../../components/TitleBar';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import { RelativeLoader } from '../../../components/RelativeLoader';
import { FormHeader } from '../../../components/FormHeader';
import { getAiModuleOrg, getNodeTemplate } from './utils';
import { AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT, BALLERINA, GET_DEFAULT_MODEL_PROVIDER } from '../../../constants';

const WSO2_MODEL_PROVIDER_CODEDATA: CodeData = {
    node: "MODEL_PROVIDER",
    org: "ballerina",
    module: "ai",
    packageName: "ai",
    symbol: "getDefaultModelProvider",
};

const OPENAI_PROVIDER_CODEDATA: CodeData = {
    node: "CLASS_INIT",
    org: "ballerinax",
    module: "ai",
    packageName: "ai",
    object: "OpenAiProvider",
    symbol: "init",
};

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 600px;
    gap: 20px;
`;

const Container = styled.div`
    display: "flex";
    flex-direction: "column";
    gap: 10;
`;


const ButtonContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 10px;
    justify-content: flex-end;
`;

const FormFields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
`;

export interface AIChatAgentWizardProps {
}

const AI_CHAT_AGENT_LISTENER = "chatAgentListener";
const AI_WSO2_MODEL_PROVIDER = "wso2ModelProvider";
const MODEL = "Model";
const KNOWN_SUFFIXES = ["agent", "model"];

function toCamelCase(name: string): string {
    // Split on spaces/underscores, convert to camelCase
    const words = name.trim().split(/[\s_]+/).filter(Boolean);
    if (words.length === 0) return "";
    const firstWord = words[0];
    // Lowercase leading acronyms: "HR" -> "hr", "HTMLParser" -> "htmlParser"
    const leadingUpper = firstWord.match(/^[A-Z]+/);
    let lowerFirst: string;
    if (leadingUpper && leadingUpper[0].length === firstWord.length) {
        // Entire word is uppercase: "HR" -> "hr"
        lowerFirst = firstWord.toLowerCase();
    } else if (leadingUpper && leadingUpper[0].length > 1) {
        // Acronym followed by more chars: "HRPolicy" -> "hrPolicy"
        lowerFirst = leadingUpper[0].slice(0, -1).toLowerCase() + firstWord.slice(leadingUpper[0].length - 1);
    } else {
        lowerFirst = firstWord.charAt(0).toLowerCase() + firstWord.slice(1);
    }
    return lowerFirst
        + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

function toBaseName(name: string): string {
    const camel = toCamelCase(name);
    // Strip known suffixes to avoid e.g. "salesAgentAgent"
    const lower = camel.toLowerCase();
    for (const suffix of KNOWN_SUFFIXES) {
        if (lower.endsWith(suffix) && lower.length > suffix.length) {
            return camel.slice(0, -suffix.length);
        }
    }
    return camel;
}


export function AIChatAgentWizard(props: AIChatAgentWizardProps) {
    // module name for ai agent
    const type = "ai";
    const { rpcClient } = useRpcContext();
    const [agentName, setAgentName] = useState<string>("");
    const [nameError, setNameError] = useState<string>("");
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const steps = [
        { label: "Creating Agent", description: "Creating the AI chat agent" },
        { label: "Creating Model Provider", description: "Creating the model provider for the AI chat agent" },
        { label: "Pulling Modules", description: "Pulling the required modules. This may take a few moments." },
        { label: "Creating Listener", description: "Configuring the service listener" },
        { label: "Creating Service", description: "Setting up the AI chat service" },
        { label: "Completing", description: "Finalizing the agent setup" }
    ];

    const projectPath = useRef<string>("");
    const aiModuleOrg = useRef<string>("");
    const progressTimeoutRef = useRef<number | null>(null);
    const designModelRef = useRef<CDModel>(null);

    const init = async () => {
        const designModelResponse = await rpcClient.getBIDiagramRpcClient().getDesignModel({});
        designModelRef.current = designModelResponse.designModel;
        aiModuleOrg.current = await getAiModuleOrg(rpcClient);
    }

    useEffect(() => {
        init();
    }, []);

    const validateName = (name: string): boolean => {
        if (!name) {
            setNameError("Name is required");
            return false;
        }
        if (/^\s/.test(name) || /^[0-9]/.test(name.trim())) {
            setNameError("Name must start with a letter");
            return false;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9\s_]*$/.test(name)) {
            setNameError("Name can only contain letters, numbers, spaces, and underscores");
            return false;
        }
        const base = toBaseName(name);
        const camel = toCamelCase(name);
        if (!base) {
            setNameError("Name is required");
            return false;
        }
        if (designModelRef.current) {
            const basePath = `/${camel}`;
            const isServiceExists = designModelRef.current.services.some(
                service => service.absolutePath?.trim().toLowerCase() === basePath.toLowerCase()
            );
            if (isServiceExists) {
                setNameError("An AI Chat Agent with this name already exists. Please choose a different name.");
                return false;
            }
            const agentConnectionName = `${base}Agent`;
            const isConnectionExists = designModelRef.current.connections.some(
                connection => connection.symbol.toLowerCase() === agentConnectionName.toLowerCase()
            );
            if (isConnectionExists) {
                setNameError(`"${agentConnectionName}" already exists. Please choose a different name.`);
                return false;
            }
            if (aiModuleOrg.current !== BALLERINA) {
                const modelName = `${base}Model`;
                const isModelExists = designModelRef.current.connections.some(
                    connection => connection.symbol.toLowerCase() === modelName.toLowerCase()
                );
                if (isModelExists) {
                    setNameError(`"${modelName}" already exists. Please choose a different name.`);
                    return false;
                }
            }
        }
        setNameError("");
        return true;
    };

    const handleCreateService = async () => {
        if (!validateName(agentName)) {
            return;
        }
        const baseName = toBaseName(agentName);
        const servicePath = toCamelCase(agentName);
        setIsCreating(true);
        try {
            // Initialize wizard data when user clicks create
            setCurrentStep(0);

            // Get AI module organization
            aiModuleOrg.current = aiModuleOrg.current || await getAiModuleOrg(rpcClient);

            const visualizerLocation = await rpcClient.getVisualizerLocation();
            projectPath.current = visualizerLocation.projectPath;

            // hack: fetching from Central to build module dependency map in LS may take time
            progressTimeoutRef.current = setTimeout(() => {
                setCurrentStep(2);
                progressTimeoutRef.current = null;
            }, AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT);

            setCurrentStep(1);

            // Select model provider based on org
            const modelProviderCodedata = aiModuleOrg.current === BALLERINA
                ? WSO2_MODEL_PROVIDER_CODEDATA
                : OPENAI_PROVIDER_CODEDATA;

            let modelVarName: string;

            // For WSO2 model provider, reuse shared "aiWso2ModelProvider" if it already exists
            if (aiModuleOrg.current === BALLERINA) {
                modelVarName = AI_WSO2_MODEL_PROVIDER;
                const existingModelProviders = await rpcClient.getBIDiagramRpcClient().searchNodes({
                    filePath: projectPath.current,
                    queryMap: { kind: "MODEL_PROVIDER" as NodeKind }
                });
                const existingProvider = existingModelProviders?.output?.find(
                    node => String(node.properties?.variable?.value) === AI_WSO2_MODEL_PROVIDER
                );

                if (!existingProvider) {
                    const modelNodeTemplate = await getNodeTemplate(rpcClient, modelProviderCodedata, projectPath.current);
                    modelNodeTemplate.properties.variable.value = modelVarName;
                    await rpcClient.getBIDiagramRpcClient().getSourceCode({ filePath: projectPath.current, flowNode: modelNodeTemplate });
                }
            } else {
                modelVarName = `${baseName}` + MODEL;
                const modelNodeTemplate = await getNodeTemplate(rpcClient, modelProviderCodedata, projectPath.current);
                modelNodeTemplate.properties.variable.value = modelVarName;
                await rpcClient.getBIDiagramRpcClient().getSourceCode({ filePath: projectPath.current, flowNode: modelNodeTemplate });
            }

            // Search for agent node in the current file
            const agentSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
                filePath: projectPath.current,
                queryMap: { orgName: aiModuleOrg.current },
                searchKind: "AGENT"
            });

            // Validate search response structure
            if (!agentSearchResponse?.categories?.[0]?.items?.[0]) {
                throw new Error('No agent node found in search response');
            }

            const agentNode = agentSearchResponse.categories[0].items[0] as AvailableNode;
            console.log(">>> agentNode", agentNode);

            // Generate template from agent node
            const agentNodeTemplate = await getNodeTemplate(rpcClient, agentNode.codedata, projectPath.current);

            // save the agent node
            const systemPromptValue = `{role: string \`${agentName}\`, instructions: string \`\`}`;
            const agentVarName = `${baseName}Agent`;
            agentNodeTemplate.properties.systemPrompt.value = systemPromptValue;
            agentNodeTemplate.properties.model.value = modelVarName;
            agentNodeTemplate.properties.tools.value = "[]";
            agentNodeTemplate.properties.variable.value = agentVarName;

            await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: projectPath.current, flowNode: agentNodeTemplate });

            setCurrentStep(3);

            // Check if the shared listener already exists
            const listenerExists = designModelRef.current?.listeners.some(
                listener => listener.symbol.toLowerCase() === AI_CHAT_AGENT_LISTENER.toLowerCase()
            );

            if (!listenerExists) {
                const mainBalFile = `${projectPath.current}/main.bal`;

                const payload = {
                    codedata: {
                        orgName: "ballerina",
                        packageName: "ai",
                        moduleName: "ai",
                        version: "1.0.0",
                    },
                    filePath: mainBalFile
                };

                const listenerResponse = await rpcClient.getServiceDesignerRpcClient().getListenerModel(payload);

                const listenerConfiguration = listenerResponse.listener;
                listenerConfiguration.properties['variableNameKey'].value = AI_CHAT_AGENT_LISTENER;
                listenerConfiguration.properties['listenOn'].value = "check http:getDefaultListener()";

                await rpcClient.getServiceDesignerRpcClient().addListenerSourceCode({
                    filePath: "",
                    listener: listenerConfiguration
                });
            }

            setCurrentStep(4);

            const serviceResponse = await rpcClient.getServiceDesignerRpcClient().getServiceModel({
                filePath: "",
                moduleName: type,
                listenerName: AI_CHAT_AGENT_LISTENER,
                orgName: aiModuleOrg.current,
            });

            const serviceConfiguration = serviceResponse.service;
            serviceConfiguration.properties["listener"].editable = true;
            serviceConfiguration.properties["listener"].items = [AI_CHAT_AGENT_LISTENER];
            serviceConfiguration.properties["listener"].value = AI_CHAT_AGENT_LISTENER;
            serviceConfiguration.properties["basePath"].value = `/${servicePath}`;
            serviceConfiguration.properties["agentName"].value = baseName;

            const serviceSourceCodeResult = await rpcClient.getServiceDesignerRpcClient().addServiceSourceCode({
                filePath: "",
                service: serviceConfiguration
            });

            const newServiceArtifact = serviceSourceCodeResult.artifacts.find(artifact => artifact.isNew);

            // If the selected model is the default WSO2 model provider, configure it
            if (modelProviderCodedata.symbol === GET_DEFAULT_MODEL_PROVIDER) {
                await rpcClient.getAIAgentRpcClient().configureDefaultModelProvider();
            }

            if (newServiceArtifact) {
                setCurrentStep(5);
                rpcClient.getVisualizerRpcClient().openView({
                    type: EVENT_TYPE.OPEN_VIEW,
                    location: { documentUri: newServiceArtifact.path, position: newServiceArtifact.position }
                });
            }
        } catch (error) {
            console.error("Error creating AI Chat Agent:", error);
            setIsCreating(false);
            setCurrentStep(0);
        } finally {
            if (progressTimeoutRef.current) {
                clearTimeout(progressTimeoutRef.current);
                progressTimeoutRef.current = null;
            }
        }
    }

    return (
        <View>
            <TopNavigationBar projectPath={projectPath.current} />
            <TitleBar
                title="AI Chat Agent"
                subtitle="Create a chattable AI agent using an LLM, prompts and tools."
            />
            <ViewContent padding>
                <Container>
                    <FormHeader
                        title="Create AI Chat Agent"
                    />
                    <FormContainer>
                        <FormFields>
                            <TextField
                                label="Name"
                                description="Name of the agent (e.g. 'Customer Support Assistant', 'Sales Advisor', 'Data Analyst')"
                                value={agentName}
                                disabled={isCreating}
                                onChange={(e) => {
                                    setAgentName(e.target.value);
                                    validateName(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isCreating && !nameError && agentName) {
                                        handleCreateService();
                                    }
                                }}
                                errorMsg={nameError}
                                autoFocus
                            />
                            <ButtonContainer>
                                <Button
                                    appearance="primary"
                                    onClick={handleCreateService}
                                    disabled={isCreating || !!nameError || !agentName}
                                >
                                    {isCreating ? <Typography variant="progress">Creating...</Typography> : 'Create'}
                                </Button>
                            </ButtonContainer>
                            {isCreating && <RelativeLoader message={steps[currentStep].description} />}
                        </FormFields>
                    </FormContainer>
                </Container>
            </ViewContent>
        </View>
    );
};
