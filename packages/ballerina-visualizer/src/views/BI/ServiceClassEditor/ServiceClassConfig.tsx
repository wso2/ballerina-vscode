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

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ProgressRing, Typography, View, ViewContent } from "@wso2/ui-toolkit";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { ModelFromCodeRequest, NodePosition, PropertyModel, ServiceClassModel } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { URI, Utils } from "vscode-uri";
import { FormGeneratorNew } from "../Forms/FormGeneratorNew";
import { FormHeader } from "../../../components/FormHeader";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { TitleBar } from "../../../components/TitleBar";

const Container = styled.div`
    max-width: 600px;
    height: 100%;
    > div:last-child {
        > div:last-child {
            justify-content: flex-start;
        }
    }
`;

const FormContainer = styled.div`
    padding-bottom: 15px;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    flex-direction: column;
`;

interface ServiceClassConfigProps {
    fileName: string;
    position: NodePosition;
    projectUri: string;
}

// TODO: Need to support inclusion type configurable option
export function ServiceClassConfig(props: ServiceClassConfigProps) {
    const { fileName, position, projectUri } = props;
    const { rpcClient } = useRpcContext();
    const [serviceClassModel, setServiceClassModel] = useState<ServiceClassModel | null>(null);
    const [serviceClassFields, setServiceClassFields] = useState<FormField[]>([]);

    const editTitle = `Update the configuration details for the Service Class as needed.`

    useEffect(() => {
        getServiceClassModel();
    }, [fileName, position]);


    const getServiceClassModel = async () => {
        if (!fileName || !position) return;

        const currentFilePath = Utils.joinPath(URI.file(projectUri), fileName).fsPath;
        const serviceClassModelRequest: ModelFromCodeRequest = {
            filePath: currentFilePath,
            codedata: {
                lineRange: {
                    startLine: { line: position.startLine, offset: position.startColumn },
                    endLine: { line: position.endLine, offset: position.endColumn }
                }
            },
            context: "TYPE_DIAGRAM"
        }
        const serviceClassModelResponse = await rpcClient.getBIDiagramRpcClient().getServiceClassModel(serviceClassModelRequest);
        const property = serviceClassModelResponse.model.properties["name"];
        const serviceClassFields = convertToFormField(property);
        setServiceClassFields(serviceClassFields);
        setServiceClassModel(serviceClassModelResponse.model);
    }

    const convertToFormField = (property: PropertyModel): FormField[] => {
        const fields: FormField[] = [
            {
                key: 'name',
                label: property.metadata.label || 'Service Class Name',
                type: 'IDENTIFIER',
                optional: property.optional,
                editable: property.editable,
                advanced: property.advanced,
                enabled: property.enabled,
                documentation: property.metadata?.description,
                value: property.value || '',
                valueType: property?.valueType,
                valueTypeConstraint: property.valueTypeConstraint || '',
                lineRange: property.codedata?.lineRange
            }];
        return fields;
    }

    const handleOnSubmit = async (data: FormValues) => {
        rpcClient.getVisualizerRpcClient()?.goBack();
    }

    return (
        <View>
            <TopNavigationBar />
            <TitleBar title="Service Class" subtitle="Edit Service Class" />
            <ViewContent padding>
                {!serviceClassModel &&
                    <LoadingContainer>
                        <ProgressRing />
                        <Typography variant="h3" sx={{ marginTop: '16px' }}>Loading...</Typography>
                    </LoadingContainer>
                }
                {serviceClassModel &&
                    <Container>
                        {serviceClassModel && (
                            <>
                                {serviceClassFields?.length > 0 && (
                                    <FormContainer>
                                        <FormHeader title={`Service Class Configuration`} />
                                        {fileName &&
                                            <FormGeneratorNew
                                                fileName={Utils.joinPath(URI.file(projectUri), fileName).fsPath}
                                                targetLineRange={{
                                                    startLine: { line: position.startLine, offset: position.startColumn },
                                                    endLine: { line: position.endLine, offset: position.endColumn }
                                                }}
                                                fields={serviceClassFields}
                                                onSubmit={handleOnSubmit}
                                            />
                                        }
                                    </FormContainer>
                                )}
                            </>
                        )}
                    </Container>
                }
            </ViewContent>
        </View >
    );
}
