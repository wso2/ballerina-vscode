/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { Icon, View, ViewContent } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FormField, FormImports, FormValues, Parameter } from "@wso2/ballerina-side-panel";
import { LineRange, FunctionParameter, TestFunction, ValueProperty, Annotation, getPrimaryInputType, EvalsetItem } from "@wso2/ballerina-core";
import { EVENT_TYPE } from "@wso2/ballerina-core";
import { TitleBar } from "../../../components/TitleBar";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { FormHeader } from "../../../components/FormHeader";
import FormGeneratorNew from "../Forms/FormGeneratorNew";
import { getImportsForProperty } from "../../../utils/bi";
import { CardSelector } from "./CardSelector";

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 600px;
    margin-bottom: 20px;

    .side-panel-body {
        overflow: visible;
    }

    .radio-button-group {
        margin-top: 8px;
        margin-bottom: -12px;
    }

    .dropdown-container {
        margin-top: 12px;
    }
`;

const Container = styled.div`
    display: "flex";
    flex-direction: "column";
    gap: 10px;
`;

const FullHeightView = styled(View)`
    display: flex;
    flex-direction: column;
    height: 100vh;
`;

const FullHeightViewContent = styled(ViewContent)`
    display: flex;
    flex: 1;
`;

const UpgradeMessageContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    width: 100%;
    padding: 40px;
    text-align: center;
`;

const UpgradeTitle = styled.h2`
    color: var(--vscode-foreground);
    font-size: 18px;
    font-weight: 500;
    margin: 0 0 12px 0;
    line-height: 1.4;
`;

const UpgradeMessage = styled.p`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    margin: 0;
    max-width: 500px;
    line-height: 1.6;
`;

interface TestFunctionDefProps {
    projectPath: string;
    functionName?: string;
    filePath?: string;
    serviceType?: string;
    isVersionSupported?: boolean;
}

export function AIEvaluationForm(props: TestFunctionDefProps) {
    const { projectPath, functionName, filePath, serviceType, isVersionSupported = true } = props;
    const { rpcClient } = useRpcContext();
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [testFunction, setTestFunction] = useState<TestFunction>();
    const [formTitle, setFormTitle] = useState<string>('Create New AI Evaluation');
    const [formSubtitle, setFormSubtitle] = useState<string>('Create a new AI evaluation for your integration');
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [dataProviderMode, setDataProviderMode] = useState<string>('evalSet');
    const [evalsetOptions, setEvalsetOptions] = useState<Array<{ value: string; content: string }>>([]);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Helper function to apply field visibility rules based on data provider mode
    const applyFieldVisibility = (fields: FormField[], mode: string): FormField[] => {
        return fields.map(field => {
            if (field.key === 'dataProvider') {
                return { ...field, hidden: mode !== 'function' };
            }
            if (field.key === 'evalSetFile') {
                return { ...field, hidden: mode !== 'evalSet' };
            }
            if (field.key === 'runs') {
                return { ...field, hidden: mode === 'evalSet' };
            }
            return field;
        });
    };

    const handleFieldChange = (fieldKey: string, value: any) => {
        if (fieldKey === 'dataProviderMode') {
            setDataProviderMode(value);
            updateFieldVisibility(value);
        }
    };

    const updateFieldVisibility = (mode: string) => {
        setFormFields(prevFields => applyFieldVisibility(prevFields, mode));
    };

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
        loadEvalsets();
    }, []);

    useEffect(() => {
        if (serviceType === 'UPDATE_TEST') {
            setFormTitle('Update AI Evaluation');
            setFormSubtitle('Update an existing AI evaluation');
            loadFunction();
        } else {
            setFormTitle('Create New AI Evaluation');
            setFormSubtitle('Create a new AI evaluation for your integration');
            loadEmptyForm();
        }

        updateTargetLineRange();
    }, [functionName]);

    // Regenerate form fields when evalsetOptions changes
    useEffect(() => {
        if (testFunction && evalsetOptions.length > 0) {
            let formFields = generateFormFields(testFunction);

            // Get the dataProviderMode value to initialize field visibility
            const modeField = formFields.find(f => f.key === 'dataProviderMode');
            const mode = String(modeField?.value || 'evalSet');
            setDataProviderMode(mode);

            // Set field visibility based on mode
            formFields = applyFieldVisibility(formFields, mode);

            setFormFields(formFields);
        }
    }, [evalsetOptions]);

    const loadEvalsets = async () => {
        try {
            const res = await rpcClient.getTestManagerRpcClient().getEvalsets({ projectPath });
            const options = res.evalsets.map((evalset: EvalsetItem) => ({
                value: evalset.filePath,
                content: `${evalset.name}`
            }));
            setEvalsetOptions(options);
        } catch (error) {
            console.error('Failed to load evalsets:', error);
            setEvalsetOptions([]);
        }
    };

    const loadFunction = async () => {
        const res = await rpcClient.getTestManagerRpcClient().getTestFunction({ functionName, filePath });
        setTestFunction(res.function);
        let formFields = generateFormFields(res.function);

        // Get the dataProviderMode value to initialize field visibility
        const modeField = formFields.find(f => f.key === 'dataProviderMode');
        const mode = String(modeField?.value || 'evalSet');
        setDataProviderMode(mode);

        // Set initial field visibility
        formFields = applyFieldVisibility(formFields, mode);

        setFormFields(formFields);
    }

    const loadEmptyForm = async () => {
        const emptyTestFunction = getEmptyTestFunctionModel();
        setTestFunction(emptyTestFunction);
        let formFields = generateFormFields(emptyTestFunction);

        // Get the dataProviderMode value to initialize field visibility
        const modeField = formFields.find(f => f.key === 'dataProviderMode');
        const mode = String(modeField?.value || 'evalSet');
        setDataProviderMode(mode);

        // Set initial field visibility (default is 'evalSet' mode)
        formFields = applyFieldVisibility(formFields, mode);

        setFormFields(formFields);
    }

    const onFormSubmit = async (data: FormValues, formImports: FormImports) => {
        setIsSaving(true);
        const formData = {
            ...data,
            dataProviderMode: dataProviderMode
        };
        const updatedTestFunction = fillFunctionModel(formData, formImports);
        if (serviceType === 'UPDATE_TEST') {
            await rpcClient.getTestManagerRpcClient().updateTestFunction({ function: updatedTestFunction, filePath });
        } else {
            await rpcClient.getTestManagerRpcClient().addTestFunction({ function: updatedTestFunction, filePath });
        }
        try {
            const res = await rpcClient.getTestManagerRpcClient().getTestFunction(
                { functionName: updatedTestFunction.functionName.value, filePath });
            const nodePosition = {
                startLine: res.function.codedata.lineRange.startLine.line,
                startColumn: res.function.codedata.lineRange.startLine.offset,
                endLine: res.function.codedata.lineRange.endLine.line,
                endColumn: res.function.codedata.lineRange.endLine.offset
            };
            rpcClient.getVisualizerRpcClient().openView(
                { type: EVENT_TYPE.OPEN_VIEW, location: { position: nodePosition, documentUri: filePath } })
        }
        catch (error) {
            console.error('Failed to open function in diagram:', error);
            setIsSaving(false);
        }
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
                optional: true,
                editable: true,
                enabled: true,
                advanced: true,
                hidden: true,
                documentation: '',
                value: '',
                paramManagerProps: {
                    paramValues: generateParamFields(testFunction.parameters),
                    formFields: paramFields,
                    handleParameter: handleParamChange
                },
                types: [{ fieldType: "PARAM_MANAGER", selected: false }]
            });
        }
        if (testFunction.annotations) {
            const configAnnotation = getTestConfigAnnotation(testFunction.annotations);
            if (configAnnotation && configAnnotation.fields) {
                const minPassRateField = configAnnotation.fields.find(f => f.originalName === 'minPassRate');
                if (minPassRateField) {
                    const generatedField = generateFieldFromProperty('minPassRate', minPassRateField);
                    fields.push({
                        ...generatedField,
                        type: 'SLIDER',
                        types: [{ fieldType: 'SLIDER', selected: false }],
                        sliderProps: {
                            min: 0,
                            max: 100,
                            step: 1,
                            showValue: true,
                            showMarkers: true,
                            valueFormatter: (value: number) => `${value}%`
                        }
                    });
                }

                const evalSetFileField = configAnnotation.fields.find(f => f.originalName === 'evalSetFile');
                if (evalSetFileField) {
                    fields.push({
                        ...generateFieldFromProperty('evalSetFile', evalSetFileField),
                        type: 'SINGLE_SELECT',
                        types: [{ fieldType: 'SINGLE_SELECT', selected: false }],
                        itemOptions: evalsetOptions
                    });
                }

                for (const field of configAnnotation.fields) {
                    // Skip fields already processed
                    if (field.originalName === 'dataProviderMode' ||
                        field.originalName === 'minPassRate' ||
                        field.originalName === 'evalSetFile') {
                        continue;
                    }

                    // Special handling for groups and dependsOn - use EXPRESSION_SET
                    if (field.originalName === 'groups' || field.originalName === 'dependsOn') {
                        fields.push({
                            ...generateFieldFromProperty(field.originalName, field),
                            type: 'EXPRESSION_SET',
                            advanced: true,
                            types: [{ fieldType: 'EXPRESSION_SET', selected: false }]
                        });
                        continue;
                    }

                    // Special handling for expression fields - ensure they use EXPRESSION type
                    if (field.originalName === 'before' || field.originalName === 'after' ||
                        field.originalName === 'runs' || field.originalName === 'dataProvider') {
                        fields.push({
                            ...generateFieldFromProperty(field.originalName, field),
                            type: 'EXPRESSION',
                            advanced: true,
                            types: [{ fieldType: 'EXPRESSION', selected: false }]
                        });
                        continue;
                    }

                    // Special handling for enabled - use FLAG
                    if (field.originalName === 'enabled') {
                        fields.push({
                            ...generateFieldFromProperty(field.originalName, field),
                            type: 'FLAG',
                            advanced: true,
                            types: [{ fieldType: 'FLAG', selected: false }]
                        });
                        continue;
                    }

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
        const fieldType = getPrimaryInputType(property.types)?.fieldType;

        // Convert decimal (0-1) to percentage (0-100) for minPassRate display
        let displayValue = property.value;
        if (key === 'minPassRate') {
            const decimalValue = parseFloat(property.value);
            displayValue = String(Math.round((isNaN(decimalValue) ? 1 : decimalValue) * 100));
        }

        const baseField: FormField = {
            key: key,
            label: property.metadata.label,
            type: fieldType,
            optional: property.optional,
            editable: property.editable,
            advanced: property.advanced,
            enabled: true,
            documentation: property.metadata.description,
            value: displayValue,
            types: [{ fieldType: fieldType, selected: false }]
        };

        // Add slider-specific configuration for minPassRate
        if (key === 'minPassRate' && fieldType === 'SLIDER') {
            baseField.sliderProps = {
                min: 0,
                max: 100,
                step: 1,
                showValue: true,
                showMarkers: true,
                valueFormatter: (value: number) => `${value}%`
            };
        }

        return baseField;
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
                    if (field.originalName == 'dependsOn') {
                        field.value = formValues['dependsOn'] || [];
                    }
                    if (field.originalName == 'before') {
                        field.value = formValues['before'] || "";
                    }
                    if (field.originalName == 'after') {
                        field.value = formValues['after'] || "";
                    }
                    if (field.originalName == 'runs') {
                        field.value = formValues['runs'] || "1";
                    }
                    if (field.originalName == 'minPassRate') {
                        // Convert percentage (0-100) to decimal (0-1)
                        const percentageValue = formValues['minPassRate'] ?? 100;
                        field.value = String(Number(percentageValue) / 100);
                    }
                    if (field.originalName == 'dataProviderMode') {
                        field.value = formValues['dataProviderMode'] || "function";
                    }
                    if (field.originalName == 'dataProvider') {
                        if (formValues['dataProviderMode'] === 'function') {
                            field.value = formValues['dataProvider'] || "";
                        }
                        // Preserve existing dataProvider value when in evalSet mode
                        // (backend creates it from evalSetFile)
                    }
                    if (field.originalName == 'evalSetFile') {
                        if (formValues['dataProviderMode'] === 'evalSet') {
                            field.value = formValues['evalSetFile'] || "";
                        }
                        // Preserve existing evalSetFile value when in function mode
                    }
                }
            }
        }

        return tmpTestFunction;
    }

    const getEmptyParamModel = (): FunctionParameter => {
        return {
            type: {
                value: "string",
                optional: false,
                editable: true,
                advanced: false,
                types: [{ fieldType: "TYPE", selected: false }]
            },
            variable: {
                value: "b",
                optional: false,
                editable: true,
                advanced: false,
                types: [{ fieldType: "IDENTIFIER", selected: false }]
            },
            defaultValue: {
                value: "\"default\"",
                optional: false,
                editable: true,
                advanced: false,
                types: [{ fieldType: "EXPRESSION", selected: false }]
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
                    label: "AI Evaluation Name",
                    description: "Name of the AI evaluation"
                },
                value: "",
                optional: false,
                editable: true,
                advanced: false,
                types: [{ fieldType: "IDENTIFIER", selected: false }]
            },
            returnType: {
                metadata: {
                    label: "Return Type",
                    description: "Return type of the function"
                },
                optional: true,
                editable: true,
                advanced: true,
                types: [{ fieldType: "TYPE", selected: false }],
            },
            parameters: [],
            annotations: [
                {
                    metadata: {
                        label: "Config",
                        description: "AI Evaluation Configurations"
                    },
                    org: "ballerina",
                    module: "test",
                    name: "Config",
                    fields: [
                        {
                            metadata: {
                                label: "Enabled",
                                description: "Enable/Disable the evaluation"
                            },
                            originalName: "enabled",
                            value: true,
                            optional: true,
                            editable: true,
                            advanced: true,
                            types: [{ fieldType: "FLAG", selected: false }]
                        },
                        {
                            metadata: {
                                label: "Groups",
                                description: "Groups to run"
                            },
                            types: [{ fieldType: "EXPRESSION_SET", selected: false }],
                            originalName: "groups",
                            value: ["evaluations"],
                            optional: true,
                            editable: true,
                            advanced: true
                        },
                        {
                            metadata: {
                                label: "Depends On",
                                description: "List of test function names that this test depends on"
                            },
                            types: [{ fieldType: "EXPRESSION_SET", selected: false }],
                            originalName: "dependsOn",
                            value: [],
                            optional: true,
                            editable: true,
                            advanced: true
                        },
                        {
                            metadata: {
                                label: "Before Function",
                                description: "Function to execute before this test"
                            },
                            types: [{ fieldType: "EXPRESSION", selected: false }],
                            originalName: "before",
                            value: "",
                            optional: true,
                            editable: true,
                            advanced: true
                        },
                        {
                            metadata: {
                                label: "After Function",
                                description: "Function to execute after this test"
                            },
                            types: [{ fieldType: "EXPRESSION", selected: false }],
                            originalName: "after",
                            value: "",
                            optional: true,
                            editable: true,
                            advanced: true
                        },
                        {
                            metadata: {
                                label: "Runs",
                                description: "Number of times to execute this test"
                            },
                            types: [{ fieldType: "EXPRESSION", selected: false }],
                            originalName: "runs",
                            value: "1",
                            optional: true,
                            editable: true,
                            advanced: true
                        },
                        {
                            metadata: {
                                label: "Minimum Pass Rate (%)",
                                description: "Minimum percentage of runs that must pass (0-100)"
                            },
                            types: [{ fieldType: "SLIDER", selected: false }],
                            originalName: "minPassRate",
                            value: "1.0",
                            optional: true,
                            editable: true,
                            advanced: false
                        },
                        {
                            metadata: {
                                label: "",
                                description: "Choose how to provide test data"
                            },
                            types: [{ fieldType: "STRING", selected: false }],
                            originalName: "dataProviderMode",
                            value: "function",
                            optional: true,
                            editable: true,
                            advanced: true
                        },
                        {
                            metadata: {
                                label: "Data Provider",
                                description: "Function that provides test data"
                            },
                            types: [{ fieldType: "EXPRESSION", selected: false }],
                            originalName: "dataProvider",
                            value: "",
                            optional: true,
                            editable: true,
                            advanced: true
                        },
                        {
                            metadata: {
                                label: "Evalset File",
                                description: "Select an evalset for test data"
                            },
                            types: [{ fieldType: "STRING", selected: false }],
                            originalName: "evalSetFile",
                            value: "",
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

    const paramFields: FormField[] = [
        {
            key: `variable`,
            label: 'Name',
            type: 'string',
            optional: false,
            editable: true,
            enabled: true,
            documentation: '',
            value: '',
            types: [{ fieldType: "IDENTIFIER", selected: false }]
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
            types: [{ fieldType: "TYPE", selected: false }]
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
            types: [{ fieldType: "STRING", selected: false }]
        }
    ];

    const cardOptions = [
        {
            value: 'evalSet',
            title: 'From Evalset',
            description: 'Use conversation traces from an existing dataset to evaluate your agent.',
            icon: <Icon name="bi-data-table" sx={{ fontSize: "20px", width: "20px", height: "20px" }} />
        },
        {
            value: 'function',
            title: 'Standalone/Custom',
            description: 'Implement a fully custom logic to evaluate specific behaviors from scratch.',
            icon: <Icon name="bi-config" sx={{ fontSize: "20px", width: "20px", height: "20px" }} />
        }
    ];

    const handleCardSelectorChange = (value: string) => {
        setDataProviderMode(value);
        updateFieldVisibility(value);
    };

    // Show upgrade message if version is not supported
    if (isVersionSupported === false) {
        return (
            <FullHeightView>
                <TopNavigationBar projectPath={projectPath} />
                <TitleBar title="AI Evaluation" subtitle="Version upgrade required" />
                <FullHeightViewContent padding>
                    <UpgradeMessageContainer>
                        <UpgradeTitle>Please upgrade your Ballerina version</UpgradeTitle>
                        <UpgradeMessage>
                            AI Evaluation features require Ballerina version 2201.13.2 or higher.
                            Please upgrade your Ballerina installation to use this feature.
                        </UpgradeMessage>
                    </UpgradeMessageContainer>
                </FullHeightViewContent>
            </FullHeightView>
        );
    }

    return (
        <View>
            <TopNavigationBar projectPath={projectPath} />
            <TitleBar title="AI Evaluation" subtitle={formSubtitle} />
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
                                preserveFieldOrder={true}
                                onChange={handleFieldChange}
                                isSaving={isSaving}
                                injectedComponents={[
                                    {
                                        component: <CardSelector
                                            title="How would you like to build this evaluation?"
                                            options={cardOptions}
                                            value={dataProviderMode}
                                            onChange={handleCardSelectorChange}
                                        />,
                                        index: 2
                                    }
                                ]}
                            />
                        )}
                    </FormContainer>
                </Container>
            </ViewContent>
        </View>
    );
}

