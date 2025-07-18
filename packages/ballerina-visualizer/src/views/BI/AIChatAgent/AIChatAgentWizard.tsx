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
import { CodeData, EVENT_TYPE, FlowNode, LinePosition, ListenerModel } from '@wso2/ballerina-core';
import { View, ViewContent, TextField, Button, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { URI, Utils } from "vscode-uri";
import { LoadingContainer } from '../../styles';
import { TitleBar } from '../../../components/TitleBar';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import { RelativeLoader } from '../../../components/RelativeLoader';
import { FormHeader } from '../../../components/FormHeader';
import { getAgentOrg } from './utils';
import { cloneDeep } from 'lodash';

const FORM_WIDTH = 600;

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

export function AIChatAgentWizard(props: AIChatAgentWizardProps) {
    // module name for ai agent
    const type = "ai";
    const { rpcClient } = useRpcContext();
    const [agentName, setAgentName] = useState<string>("");
    const [nameError, setNameError] = useState<string>("");
    const [listenerModel, setListenerModel] = useState<ListenerModel>(undefined);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [agentNode, setAgentNode] = useState<FlowNode | null>(null);
    const [defaultModelNode, setDefaultModelNode] = useState<FlowNode | null>(null);
    const steps = [
        { label: "Creating Agent", description: "Creating the AI chat agent" },
        { label: "Initializing", description: "Setting up the agent configuration" },
        { label: "Pulling Modules", description: "Pulling the required modules" },
        { label: "Creating Listener", description: "Configuring the service listener" },
        { label: "Creating Service", description: "Setting up the AI chat service" },
        { label: "Completing", description: "Finalizing the agent setup" }
    ];

    const agentFilePath = useRef<string>("");
    const agentOrg = useRef<string>("");
    const agentCallEndOfFile = useRef<LinePosition | null>(null);
    const agentEndOfFile = useRef<LinePosition | null>(null);
    const mainFilePath = useRef<string>("");

    const initWizard = async () => {
        // get agent file path
        const filePath = await rpcClient.getVisualizerLocation();
        agentFilePath.current = Utils.joinPath(URI.file(filePath.projectUri), "agents.bal").fsPath;
        // get agent org
        agentOrg.current = await getAgentOrg(rpcClient);
        // fetch agent node
        await fetchAgentNode();
        // get end of files
        // main.bal last line
        mainFilePath.current = Utils.joinPath(URI.file(filePath.projectUri), "main.bal").fsPath;
        const endOfFile = await rpcClient.getBIDiagramRpcClient().getEndOfFile({ filePath: mainFilePath.current });
        console.log(">>> endOfFile", endOfFile);
        agentCallEndOfFile.current = endOfFile;
        // agent.bal file last line
        const endOfAgentFile = await rpcClient
            .getBIDiagramRpcClient()
            .getEndOfFile({ filePath: agentFilePath.current });
        console.log(">>> endOfAgentFile", endOfAgentFile);
        agentEndOfFile.current = endOfAgentFile;
    }

    useEffect(() => {
        initWizard().then(() => {
            rpcClient.getServiceDesignerRpcClient().getListenerModel({ moduleName: type, orgName: agentOrg.current }).then(res => {
                setListenerModel(res.listener);
            });
        }).catch(error => {
            console.error("Error initializing AI Chat Agent Wizard:", error);
            setNameError("Failed to initialize the wizard. Please try again.");
        });
    }, []);

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

    const fetchAgentNode = async () => {
        // get the agent node
        const allAgents = await rpcClient.getAIAgentRpcClient().getAllAgents({ filePath: agentFilePath.current, orgName: agentOrg.current });
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
            .getAllModels({ agent: agentCodeData.object, filePath: agentFilePath.current, orgName: agentOrg.current });
        console.log(">>> allModels", allModels);
        // get openai model
        const defaultModel = allModels.models.find((model) => model.object === "OpenAiProvider" || (model.org === "ballerina" && model.module === "ai"));
        if (!defaultModel) {
            console.log(">>> no default model found");
            return;
        }
        // get model node template
        const modelNodeTemplate = await getNodeTemplate(defaultModel, agentFilePath.current);
        setDefaultModelNode(modelNodeTemplate);
    };

    const validateName = (name: string): boolean => {
        if (!name) {
            setNameError("Name is required");
            return false;
        }
        if (/^[0-9]/.test(name)) {
            setNameError("Name cannot start with a number");
            return false;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
            setNameError("Name can only contain letters, numbers, and underscores");
            return false;
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
            setCurrentStep(0);
            // Update the listener name and create the listener
            const listener = listenerModel;
            const listenerName = agentName + "Listener";
            listener.properties['name'].value = listenerName;
            listener.properties['listenOn'].value = "check http:getDefaultListener()";

            setCurrentStep(1);
            // Set a timeout to show step 2 after 3 seconds
            const timeoutId = setTimeout(() => {
                setCurrentStep(2);
            }, 3000);
            await rpcClient.getServiceDesignerRpcClient().addListenerSourceCode({ filePath: "", listener });
            // Clear the timeout if the operation completed before 3 seconds
            clearTimeout(timeoutId);

            setCurrentStep(3);
            // Update the service name and create the service
            await rpcClient.getServiceDesignerRpcClient().getServiceModel({
                filePath: "",
                moduleName: type,
                listenerName: listenerName,
                orgName: agentOrg.current,
            }).then(res => {
                const serviceModel = res.service;
                console.log("Service Model: ", serviceModel);
                serviceModel.properties["listener"].editable = true;
                serviceModel.properties["listener"].items = [listenerName];
                serviceModel.properties["listener"].values = [listenerName];
                serviceModel.properties["basePath"].value = `/${agentName}`;
                rpcClient.getServiceDesignerRpcClient().addServiceSourceCode({
                    filePath: "",
                    service: res.service
                }).then(async (sourceCode) => {
                    setCurrentStep(4);
                    const newArtifact = sourceCode.artifacts.find(res => res.isNew);
                    console.log(">>> agent service sourceCode", sourceCode);
                    console.log(">>> newArtifact", newArtifact);
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
                    const systemPromptValue = `{role: "", instructions: string \`\`}`;
                    const agentVarName = `_${agentName}Agent`;
                    updatedAgentNode.properties.systemPrompt.value = systemPromptValue;
                    updatedAgentNode.properties.model.value = modelVarName;
                    updatedAgentNode.properties.tools.value = [];
                    updatedAgentNode.properties.verbose.value = "false";
                    updatedAgentNode.properties.maxIter.value = "0";
                    updatedAgentNode.properties.variable.value = agentVarName;

                    const agentResponse = await rpcClient
                        .getBIDiagramRpcClient()
                        .getSourceCode({ filePath: agentFilePath.current, flowNode: updatedAgentNode });
                    console.log(">>> agentResponse getSourceCode", { agentResponse });

                    // wait 2 seconds (wait until LS is updated)
                    console.log(">>> wait 2 seconds");
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    if (newArtifact) {
                        setCurrentStep(5);
                        rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri: newArtifact.path, position: newArtifact.position } });
                        return;
                    }
                });
            });
        } catch (error) {
            console.error("Error creating AI Chat Agent:", error);
            setIsCreating(false);
            setCurrentStep(0);
        } finally {

        }
    }

    return (
        <View>
            <TopNavigationBar />
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
