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
import { FormField, FormImports, FormValues } from "@wso2/ballerina-side-panel";
import { LineRange, Property, RecordTypeField, ServiceModel, SubPanel, SubPanelView } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { URI, Utils } from "vscode-uri";
import { FormGeneratorNew } from "../../Forms/FormGeneratorNew";
import { FormHeader } from "../../../../components/FormHeader";
import { getImportsForProperty } from "../../../../utils/bi";

const Container = styled.div`
    /* padding: 0 20px 20px; */
    max-width: 600px;
    height: 100%;
    > div:last-child {
        /* padding: 20px 0; */
        > div:last-child {
            justify-content: flex-start;
        }
    }
`;

const FormContainer = styled.div`
    /* padding-top: 15px; */
    padding-bottom: 15px;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    flex-direction: column;
`;

const ListenerBtn = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    margin-right: 15px;
`;



interface ServiceConfigFormProps {
    serviceModel: ServiceModel;
    onSubmit: (data: ServiceModel) => void;
    openListenerForm?: () => void;
    isSaving?: boolean;
    onBack?: () => void;
    formSubmitText?: string;
}

export function ServiceConfigForm(props: ServiceConfigFormProps) {
    const { rpcClient } = useRpcContext();

    const [serviceFields, setServiceFields] = useState<FormField[]>([]);
    const { serviceModel, onSubmit, onBack, openListenerForm, formSubmitText = "Next", isSaving } = props;
    const [filePath, setFilePath] = useState<string>('');
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [recordTypeFields, setRecordTypeFields] = useState<RecordTypeField[]>([]);

    const createTitle = `Provide the necessary configuration details for the ${serviceModel.displayAnnotation.label} to complete the setup.`;
    const editTitle = `Update the configuration details for the ${serviceModel.displayAnnotation.label} as needed.`

    useEffect(() => {
        // Check if the service is HTTP protocol and any properties with choices
        const hasPropertiesWithChoices = serviceModel?.listenerProtocol === "http" &&
            Object.values(serviceModel.properties).some(property => property.choices);

        if (hasPropertiesWithChoices) {
            const choiceRecordTypeFields = Object.entries(serviceModel.properties)
                .filter(([_, property]) => property.choices)
                .flatMap(([parentKey, property]) =>
                    Object.entries(property.choices).flatMap(([choiceKey, choice]) =>
                        Object.entries(choice.properties || {})
                            .filter(([_, choiceProperty]) =>
                                choiceProperty.typeMembers &&
                                choiceProperty.typeMembers.some(member => member.kind === "RECORD_TYPE")
                            )
                            .map(([choicePropertyKey, choiceProperty]) => ({
                                key: choicePropertyKey,
                                property: {
                                    ...choiceProperty,
                                    metadata: {
                                        label: choiceProperty.metadata?.label || choicePropertyKey,
                                        description: choiceProperty.metadata?.description || ''
                                    },
                                    valueType: choiceProperty?.valueType || 'string',
                                    diagnostics: {
                                        hasDiagnostics: choiceProperty.diagnostics && choiceProperty.diagnostics.length > 0,
                                        diagnostics: choiceProperty.diagnostics
                                    }
                                } as Property,
                                recordTypeMembers: choiceProperty.typeMembers.filter(member => member.kind === "RECORD_TYPE")
                            }))
                    )
                );
            console.log(">>> recordTypeFields of http serviceModel", choiceRecordTypeFields);

            setRecordTypeFields(choiceRecordTypeFields);
        } else {
            const recordTypeFields: RecordTypeField[] = Object.entries(serviceModel.properties)
                .filter(([_, property]) =>
                    property.typeMembers &&
                    property.typeMembers.some(member => member.kind === "RECORD_TYPE")
                )
                .map(([key, property]) => ({
                    key,
                    property: {
                        ...property,
                        metadata: {
                            label: property.metadata?.label || key,
                            description: property.metadata?.description || ''
                        },
                        valueType: property?.valueType || 'string',
                        diagnostics: {
                            hasDiagnostics: property.diagnostics && property.diagnostics.length > 0,
                            diagnostics: property.diagnostics
                        }
                    } as Property,
                    recordTypeMembers: property.typeMembers.filter(member => member.kind === "RECORD_TYPE")
                }));
            console.log(">>> recordTypeFields of serviceModel", recordTypeFields);

            setRecordTypeFields(recordTypeFields);
        }

        serviceModel && setServiceFields(convertConfig(serviceModel));
        rpcClient.getVisualizerLocation().then(res => { setFilePath(Utils.joinPath(URI.file(res.projectUri), 'main.bal').fsPath) });
    }, [serviceModel]);

    const handleServiceSubmit = async (data: FormValues, formImports: FormImports) => {
        serviceFields.forEach(val => {
            if (val.type === "CHOICE") {
                val.choices.forEach((choice, index) => {
                    choice.enabled = false;
                    if (data[val.key] === index) {
                        choice.enabled = true;
                        for (const key in choice.properties) {
                            choice.properties[key].value = data[key];
                        }
                    }
                })
            } else if (data[val.key]) {
                val.value = data[val.key];
            }
            val.imports = getImportsForProperty(val.key, formImports);
        })
        const response = updateConfig(serviceFields, serviceModel);
        onSubmit(response);
    };

    const handleListenerForm = (panel: SubPanel) => {
        if (panel.view === SubPanelView.ADD_NEW_FORM) {
            openListenerForm && openListenerForm();
        }
    }

    useEffect(() => {
        if (filePath && rpcClient) {
            rpcClient
                .getBIDiagramRpcClient()
                .getEndOfFile({ filePath })
                .then((res) => {
                    setTargetLineRange({
                        startLine: res,
                        endLine: res,
                    });
                });
        }
    }, [filePath, rpcClient]);

    return (
        <Container>
            {serviceModel &&
                <>
                    {serviceFields.length > 0 &&
                        <FormContainer>
                            <FormHeader title={`${serviceModel.displayAnnotation.label} Configuration`} />
                            {filePath && targetLineRange &&
                                <FormGeneratorNew
                                    fileName={filePath}
                                    targetLineRange={targetLineRange}
                                    fields={serviceFields}
                                    onBack={onBack}
                                    isSaving={isSaving}
                                    openSubPanel={handleListenerForm}
                                    onSubmit={handleServiceSubmit}
                                    submitText={formSubmitText}
                                    recordTypeFields={recordTypeFields}
                                />
                            }
                        </FormContainer>
                    }
                </>
            }
        </Container>
    );
}

export default ServiceConfigForm;

function convertConfig(listener: ServiceModel): FormField[] {
    const formFields: FormField[] = [];
    for (const key in listener.properties) {
        const expression = listener.properties[key];
        const formField: FormField = {
            key: key,
            label: expression?.metadata.label || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()),
            type: expression.valueType,
            documentation: expression?.metadata.description || "",
            valueType: expression.valueTypeConstraint,
            editable: true,
            enabled: expression.enabled ?? true,
            optional: expression.optional,
            value: expression.valueType === "MULTIPLE_SELECT" ? (expression.value ? [expression.value] : [expression.items[0]]) : expression.value,
            valueTypeConstraint: expression.valueTypeConstraint,
            advanced: expression.advanced,
            diagnostics: [],
            items: expression.items,
            choices: expression.choices,
            placeholder: expression.placeholder,
            addNewButton: expression.addNewButton,
            lineRange: expression?.codedata?.lineRange
        }

        formFields.push(formField);
    }
    return formFields;
}

function updateConfig(formFields: FormField[], listener: ServiceModel): ServiceModel {
    formFields.forEach(field => {
        const value = field.value;
        if (field.type === "MULTIPLE_SELECT" || field.type === "EXPRESSION_SET") {
            listener.properties[field.key].values = value as string[];
        } else {
            listener.properties[field.key].value = value as string;
        }
        if (value && value.length > 0) {
            listener.properties[field.key].enabled = true;
        }
    })
    return listener;
}
