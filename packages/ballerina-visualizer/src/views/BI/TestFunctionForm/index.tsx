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
import { View, ViewContent } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FormField, FormImports, FormValues, Parameter } from "@wso2/ballerina-side-panel";
import { LineRange, FunctionParameter, TestFunction, ValueProperty, Annotation } from "@wso2/ballerina-core";
import { EVENT_TYPE } from "@wso2/ballerina-core";
import { TitleBar } from "../../../components/TitleBar";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { FormHeader } from "../../../components/FormHeader";
import FormGeneratorNew from "../Forms/FormGeneratorNew";
import { getImportsForProperty } from "../../../utils/bi";

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 600px;
    gap: 20px;
    margin-top: 20px;
`;

const Container = styled.div`
    display: "flex";
    flex-direction: "column";
    gap: 10;
    margin: 20px;
`;

interface TestFunctionDefProps {
    functionName?: string;
    filePath?: string;
    serviceType?: string;
}

export function TestFunctionForm(props: TestFunctionDefProps) {
    const { functionName, filePath, serviceType } = props;
    const { rpcClient } = useRpcContext();
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [testFunction, setTestFunction] = useState<TestFunction>();
    const [formTitle, setFormTitle] = useState<string>('Create New Test Case');
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();

    const updateTargetLineRange = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getEndOfFile({ filePath })
            .then((linePosition) => {
                setTargetLineRange({
                    startLine: linePosition,
                    endLine: linePosition
                });
            });
    }

    useEffect(() => {
        if (serviceType === 'UPDATE_TEST') {
            setFormTitle('Update Test Case');
            loadFunction();
        } else {
            setFormTitle('Create New Test Case');
            loadEmptyForm();
        }

        updateTargetLineRange();
    }, [functionName]);

    const loadFunction = async () => {
        const res = await rpcClient.getTestManagerRpcClient().getTestFunction({ functionName, filePath });
        console.log("Test Function: ", res);
        setTestFunction(res.function);
        let formFields = generateFormFields(res.function);
        setFormFields(formFields);
    }

    const loadEmptyForm = async () => {
        const emptyTestFunction = getEmptyTestFunctionModel();
        setTestFunction(emptyTestFunction);
        let formFields = generateFormFields(emptyTestFunction);
        setFormFields(formFields);
    }

    const onFormSubmit = async (data: FormValues, formImports: FormImports) => {
        console.log("Test Function Form Data: ", data);
        const updatedTestFunction = fillFunctionModel(data, formImports);
        console.log("Test Function: ", updatedTestFunction);
        if (serviceType === 'UPDATE_TEST') {
            await rpcClient.getTestManagerRpcClient().updateTestFunction({ function: updatedTestFunction, filePath });
        } else {
            await rpcClient.getTestManagerRpcClient().addTestFunction({ function: updatedTestFunction, filePath });
        }
        const res = await rpcClient.getTestManagerRpcClient().getTestFunction(
            { functionName: updatedTestFunction.functionName.value, filePath });
        const nodePosition = {
            startLine: res.function.codedata.lineRange.startLine.line,
            startColumn: res.function.codedata.lineRange.startLine.offset,
            endLine: res.function.codedata.lineRange.endLine.line,
            endColumn: res.function.codedata.lineRange.endLine.offset
        };
        console.log("Node Position: ", nodePosition);
        await rpcClient.getVisualizerRpcClient().openView(
            { type: EVENT_TYPE.OPEN_VIEW, location: { position: nodePosition, documentUri: filePath } })
    };

    // Helper function to modify and set the visual information
    const handleParamChange = (param: Parameter) => {
        const name = `${param.formValues['variable']}`;
        const type = `${param.formValues['type']}`;
        const defaultValue = Object.keys(param.formValues).indexOf('defaultable') > -1 && `${param.formValues['defaultable']}`;
        let value = `${type} ${name}`;
        if (defaultValue) {
            value += ` = ${defaultValue}`;
        }
        return {
            ...param,
            key: name,
            value: value
        }
    };

    const generateFormFields = (testFunction: TestFunction): FormField[] => {
        const fields: FormField[] = [];
        if (testFunction.functionName) {
            fields.push(generateFieldFromProperty('functionName', testFunction.functionName));
        }
        if (testFunction.parameters) {
            fields.push({
                key: `params`,
                label: 'Parameters',
                type: 'PARAM_MANAGER',
                optional: false,
                editable: true,
                enabled: true,
                advanced: true,
                documentation: '',
                value: '',
                paramManagerProps: {
                    paramValues: generateParamFields(testFunction.parameters),
                    formFields: paramFiels,
                    handleParameter: handleParamChange
                },
                valueTypeConstraint: ""
            });
        }
        if (testFunction.returnType) {
            fields.push(generateFieldFromProperty('returnType', testFunction.returnType));
        }
        if (testFunction.annotations) {
            const configAnnotation = getTestConfigAnnotation(testFunction.annotations);
            if (configAnnotation && configAnnotation.fields) {
                for (const field of configAnnotation.fields) {
                    fields.push(generateFieldFromProperty(field.originalName, field));
                }
            }
        }
        return fields;
    }

    const getTestConfigAnnotation = (annotations: Annotation[]): Annotation | undefined => {
        for (const annotation of annotations) {
            if (annotation.name === 'Config') {
                return annotation;
            }
        }
        return;
    }

    const generateParamFields = (parameters: FunctionParameter[]): Parameter[] => {
        const params: Parameter[] = [];
        let id = 0;
        for (const param of parameters) {
            const key = param.variable.value;
            const type = param.type.value;

            const value = `${type} ${key}`;
            params.push({
                id: id,
                formValues: {
                    variable: key,
                    type: type,
                    defaultable: param.defaultValue ? param.defaultValue.value : ''
                },
                key: key,
                value: value,
                icon: '',
                identifierEditable: param.variable?.editable,
                identifierRange: param.variable?.codedata?.lineRange
            });

            id++;
        }
        return params
    }

    const generateFieldFromProperty = (key: string, property: ValueProperty): FormField => {
        return {
            key: key,
            label: property.metadata.label,
            type: property.valueType,
            optional: property.optional,
            editable: property.editable,
            advanced: property.advanced,
            enabled: true,
            documentation: property.metadata.description,
            value: property.value,
            valueTypeConstraint: ""
        }
    }

    const fillFunctionModel = (formValues: FormValues, formImports: FormImports): TestFunction => {
        let tmpTestFunction = testFunction;
        if (!tmpTestFunction) {
            tmpTestFunction = {};
        }

        if (formValues['functionName']) {
            tmpTestFunction.functionName.value = formValues['functionName'];
        }

        if (formValues['returnType']) {
            tmpTestFunction.returnType.value = formValues['returnType'];
            tmpTestFunction.returnType.imports = getImportsForProperty('returnType', formImports);
        }

        if (formValues['params']) {
            const params = formValues['params'];
            const paramList: FunctionParameter[] = [];
            for (const param of params) {
                const paramFormValues = param.formValues;
                const variable = paramFormValues['variable'];
                const type = paramFormValues['type'];
                const typeImports = getImportsForProperty('params', formImports);
                const defaultValue = paramFormValues['defaultable'];
                let emptyParam = getEmptyParamModel();
                emptyParam.variable.value = variable;
                emptyParam.type.value = type;
                emptyParam.type.imports = typeImports;
                emptyParam.defaultValue.value = defaultValue;
                paramList.push(emptyParam);
            }
            tmpTestFunction.parameters = paramList;
        }

        let annots = tmpTestFunction.annotations;
        for (const annot of annots) {
            if (annot.name == 'Config') {
                let configAnnot = annot;
                let fields = configAnnot.fields;
                for (const field of fields) {
                    if (field.originalName == 'groups') {
                        field.value = formValues['groups'];
                    }
                    if (field.originalName == 'enabled') {
                        field.value = formValues['enabled'];
                    }
                }
            }
        }

        return tmpTestFunction;
    }

    const getEmptyParamModel = (): FunctionParameter => {
        return {
            type: {
                valueType: "TYPE",
                value: "string",
                optional: false,
                editable: true,
                advanced: false
            },
            variable: {
                valueType: "IDENTIFIER",
                value: "b",
                optional: false,
                editable: true,
                advanced: false
            },
            defaultValue: {
                valueType: "EXPRESSION",
                value: "\"default\"",
                optional: false,
                editable: true,
                advanced: false
            },
            optional: false,
            editable: true,
            advanced: false
        }

    }

    const getEmptyTestFunctionModel = (): TestFunction => {
        return {
            functionName: {
                metadata: {
                    label: "Test Function",
                    description: "Test function"
                },
                valueType: "IDENTIFIER",
                value: "",
                optional: false,
                editable: true,
                advanced: false
            },
            returnType: {
                metadata: {
                    label: "Return Type",
                    description: "Return type of the function"
                },
                valueType: "TYPE",
                optional: true,
                editable: true,
                advanced: true
            },
            parameters: [],
            annotations: [
                {
                    metadata: {
                        label: "Config",
                        description: "Test Function Configurations"
                    },
                    org: "ballerina",
                    module: "test",
                    name: "Config",
                    fields: [
                        {
                            metadata: {
                                label: "Groups",
                                description: "Groups to run"
                            },
                            valueType: "EXPRESSION_SET",
                            originalName: "groups",
                            value: [],
                            optional: true,
                            editable: true,
                            advanced: false
                        },
                        {
                            metadata: {
                                label: "Enabled",
                                description: "Enable/Disable the test"
                            },
                            valueType: "FLAG",
                            originalName: "enabled",
                            value: true,
                            optional: true,
                            editable: true,
                            advanced: false
                        }
                    ]
                }
            ],
            editable: true
        }
    }

    const paramFiels: FormField[] = [
        {
            key: `variable`,
            label: 'Name',
            type: 'string',
            optional: false,
            editable: true,
            enabled: true,
            documentation: '',
            value: '',
            valueTypeConstraint: ""
        },
        {
            key: `type`,
            label: 'Type',
            type: 'TYPE',
            optional: false,
            editable: true,
            enabled: true,
            documentation: '',
            value: '',
            valueTypeConstraint: ""
        },
        {
            key: `defaultable`,
            label: 'Default Value',
            type: 'string',
            optional: true,
            advanced: true,
            editable: true,
            enabled: true,
            documentation: '',
            value: '',
            valueTypeConstraint: ""
        }
    ];

    return (
        <View>
            <TopNavigationBar />
            <TitleBar title="Test" subtitle="Create a new test for your integration" />
            <ViewContent padding>
                <Container>
                    <FormHeader title={formTitle} />
                    <FormContainer>
                        {targetLineRange && (
                            <FormGeneratorNew
                                fileName={filePath}
                                fields={formFields}
                                targetLineRange={targetLineRange}
                                onSubmit={onFormSubmit}
                            />
                        )}
                    </FormContainer>
                </Container>
            </ViewContent>
        </View>
    );
}

