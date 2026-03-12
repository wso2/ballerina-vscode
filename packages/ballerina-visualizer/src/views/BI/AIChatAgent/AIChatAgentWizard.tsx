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
import { AvailableNode, CDModel, CodeData, EVENT_TYPE } from '@wso2/ballerina-core';
import { View, ViewContent, TextField, Button, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { TitleBar } from '../../../components/TitleBar';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import { RelativeLoader } from '../../../components/RelativeLoader';
import { FormHeader } from '../../../components/FormHeader';
import { getAiModuleOrg, getNodeTemplate } from './utils';
import { AI, AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT, BALLERINA, GET_DEFAULT_MODEL_PROVIDER } from '../../../constants';

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

const LISTENER = "Listener";
const MODEL = "Model";

const OPEN_AI_PROVIDER = "OpenAiProvider";
const MODEL_PROVIDER = "MODEL_PROVIDER";
const CLASS_INIT = "CLASS_INIT";

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
    }

    useEffect(() => {
        init();
    }, []);

    const validateName = (name: string): boolean => {
        if (!name) {
            setNameError("Name is required");
            return false;
        }
        if (/^[0-9]/.test(name)) {
            setNameError("Name cannot start with a number");
            return false;
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            setNameError("Name can only contain letters, numbers, and underscores");
            return false;
        }
        if (designModelRef.current) {
            const isNameExists = designModelRef.current.services.some(
                service => service.absolutePath?.trim() === `/${name}`
            );
            if (isNameExists) {
                setNameError("An AI Chat Agent with this name already exists. Please choose a different name.");
                return false;
            }
        }
        setNameError("");
        return true;
    };

    const handleCreateService = async () => {
        if (!validateName(agentName)) {
            return;
        }
        setIsCreating(true);
        try {
            // Initialize wizard data when user clicks create
            setCurrentStep(0);

            // Get AI module organization
            aiModuleOrg.current = await getAiModuleOrg(rpcClient);

            const visualizerLocation = await rpcClient.getVisualizerLocation();
            projectPath.current = visualizerLocation.projectPath;

            // hack: fetching from Central to build module dependency map in LS may take time
            progressTimeoutRef.current = setTimeout(() => {
                setCurrentStep(2);
                progressTimeoutRef.current = null;
            }, AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT);

            setCurrentStep(1);

            // Search for model providers
            const modelProviderSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
                filePath: projectPath.current,
                queryMap: { q: aiModuleOrg.current === BALLERINA ? AI : OPEN_AI_PROVIDER },
                searchKind: aiModuleOrg.current === BALLERINA ? MODEL_PROVIDER : CLASS_INIT
            });
            const modelNodes = modelProviderSearchResponse.categories[0].items as AvailableNode[];

            // Get default model provider
            const defaultModelNode = modelNodes.find((model) =>
                model.codedata.object === OPEN_AI_PROVIDER || (model.codedata.org === BALLERINA && model.codedata.module === AI)
            );
            if (!defaultModelNode) {
                console.log(">>> no default model found");
                throw new Error("No default model found");
            }

            // Get model node template
            const modelNodeTemplate = await getNodeTemplate(rpcClient, defaultModelNode.codedata, projectPath.current);

            // Generate source code for model provider
            const modelVarName = `${agentName}` + MODEL;
            modelNodeTemplate.properties.variable.value = modelVarName;
            await rpcClient.getBIDiagramRpcClient().getSourceCode({ filePath: projectPath.current, flowNode: modelNodeTemplate });

            // hack: Generate agent at module level for Ballerina versions under 2201.13.0
            let ballerinaVersion: string | undefined;
            try {
                const versionResponse = await rpcClient.getLangClientRpcClient().getBallerinaVersion();
                ballerinaVersion = versionResponse?.version;
            } catch (error) {
                console.warn("Unable to resolve Ballerina version; falling back to legacy agent generation.", error);
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
            const systemPromptValue = `{role: string \`\`, instructions: string \`\`}`;
            const agentVarName = `${agentName}Agent`;
            agentNodeTemplate.properties.systemPrompt.value = systemPromptValue;
            agentNodeTemplate.properties.model.value = modelVarName;
            agentNodeTemplate.properties.tools.value = "[]";
            agentNodeTemplate.properties.variable.value = agentVarName;

            await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: projectPath.current, flowNode: agentNodeTemplate });

            setCurrentStep(3);

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

            const listenerVariableName = agentName + LISTENER;
            const listenerResponse = await rpcClient.getServiceDesignerRpcClient().getListenerModel(payload);

            const listenerConfiguration = listenerResponse.listener;
            listenerConfiguration.properties['variableNameKey'].value = listenerVariableName;
            listenerConfiguration.properties['listenOn'].value = "check http:getDefaultListener()";

            await rpcClient.getServiceDesignerRpcClient().addListenerSourceCode({
                filePath: "",
                listener: listenerConfiguration
            });

            setCurrentStep(4);

            const serviceResponse = await rpcClient.getServiceDesignerRpcClient().getServiceModel({
                filePath: "",
                moduleName: type,
                listenerName: listenerVariableName,
                orgName: aiModuleOrg.current,
            });

            const serviceConfiguration = serviceResponse.service;
            serviceConfiguration.properties["listener"].editable = true;
            serviceConfiguration.properties["listener"].items = [listenerVariableName];
            serviceConfiguration.properties["listener"].value = listenerVariableName;
            serviceConfiguration.properties["basePath"].value = `/${agentName}`;
            serviceConfiguration.properties["agentName"].value = agentName;

            const serviceSourceCodeResult = await rpcClient.getServiceDesignerRpcClient().addServiceSourceCode({
                filePath: "",
                service: serviceConfiguration
            });

            const newServiceArtifact = serviceSourceCodeResult.artifacts.find(artifact => artifact.isNew);

            // If the selected model is the default WSO2 model provider, configure it
            if (defaultModelNode?.codedata?.symbol === GET_DEFAULT_MODEL_PROVIDER) {
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
                                description="Name of the agent"
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
