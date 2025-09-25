/* eslint-disable react-hooks/exhaustive-deps */
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

import { useEffect, useState } from 'react';
import { ActionButtons, View, ViewContent } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { FunctionModel, VisualizerLocation } from '@wso2/ballerina-core';
import { LoadingContainer } from '../ComponentListView/styles';
import { LoadingRing } from '../../../components/Loader';
import { FormHeader } from '../../../components/FormHeader';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import { TitleBar } from '../../../components/TitleBar';
import { BodyText } from '../../styles';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { Parameters } from './Paramters';
import { FunctionName } from '../ServiceDesigner/Forms/FunctionForm/FunctionName/FunctionName';
import { FunctionReturn } from '../ServiceDesigner/Forms/FunctionForm/Return/FunctionReturn';

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 600px;
    gap: 20px;
    padding: 20px;
`;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SaveButtonContainer = styled.div`
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-panel-border);
`;

export interface ResourceFormProps {
    // model: FunctionModel;
    // isSaving: boolean;
    // onSave: (functionModel: FunctionModel) => void;
    // onClose: () => void;
}

export function ServiceFunctionForm(props: ResourceFormProps) {
    console.log('>>> ServiceFunctionForm - Component rendered', props);

    const { rpcClient } = useRpcContext();
    console.log('>>> ServiceFunctionForm - rpcClient from context:', rpcClient);

    const [functionNode, setFunctionNode] = useState<FunctionModel>(undefined);
    const [saving, setSaving] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    const handleClosePopup = () => {
        // Close the popup - implement your close logic here
        console.log('Closing ServiceFunctionForm');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // TODO: Implement save functionality
            console.log('Saving function:', functionNode);
            // Add your save logic here
        } catch (error) {
            console.error('Error saving function:', error);
        } finally {
            setSaving(false);
        }
    };

    // Load project components and structure
    useEffect(() => {
        console.log('>>> ServiceFunctionForm - useEffect triggered');
        console.log('>>> ServiceFunctionForm - rpcClient:', rpcClient);

        const loadProjectData = async () => {
            setIsLoading(true);
            try {
                const location: VisualizerLocation = await rpcClient.getVisualizerLocation();
                
                console.log('>>> ServiceFunctionForm - Retrieved location:', location);

                // Check if we have CodeData from the flow diagram
                if (location.dataMapperMetadata?.codeData) {
                    const codeData = location.dataMapperMetadata.codeData;
                    console.log('>>> ServiceFunctionForm - Found CodeData from flow diagram:', codeData);

                    const functionModel = await rpcClient.getServiceDesignerRpcClient().getFunctionFromSource({
                        filePath: location.documentUri ,
                        codedata: codeData
                    });
                    setFunctionNode(functionModel.function);
                    console.log('>>> ServiceFunctionForm - Retrieved function model from source:', functionModel);
                }
            } catch (error) {
                console.error('>>> ServiceFunctionForm - Error loading project data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (rpcClient) {
            loadProjectData();
        } else {
            console.error('>>> ServiceFunctionForm - rpcClient is not available');
        }
    }, [rpcClient]);

    const functionName = functionNode?.name ? functionNode.name.value : "";

    return (
        <View>
            <TopNavigationBar />
            <TitleBar
                title="Service Function"
                subtitle="Build reusable custom flows"
            />
            <ViewContent padding>
                <Container>
                    <FormHeader
                        title={`${functionName ? 'Edit' : 'Create New'} Service Function`}
                        subtitle="Define a service function that can be used within your integration"
                    />
                    {isLoading && (
                        <LoadingContainer>
                            <LoadingRing />
                        </LoadingContainer>
                    )}
                    {functionNode && (
                        <FormContainer>
                            <FunctionName name={functionNode.name} onChange={() => { }} readonly={true} />
                            <Parameters functionNode={functionNode} />
                            <FunctionReturn returnType={functionNode.returnType} onChange={() => { }} readonly={false} />
                            <SaveButtonContainer>
                                <ActionButtons
                                    primaryButton={{
                                        text: saving ? "Saving..." : "Save",
                                        onClick: handleSave,
                                        disabled: saving
                                    }}
                                    secondaryButton={{
                                        text: "Cancel",
                                        onClick: handleClosePopup
                                    }}
                                />
                            </SaveButtonContainer>
                        </FormContainer>
                    )}
                    {!functionNode && !isLoading && (
                        <BodyText>No function data available to display.</BodyText>
                    )}
                </Container>
            </ViewContent>
        </View>
    );
}
