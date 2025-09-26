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
import { FunctionModel, VisualizerLocation, LineRange, ParameterModel, ConfigProperties, PropertyModel, RecordTypeField, Property, PropertyTypeMemberInfo } from '@wso2/ballerina-core';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { FormField, FormImports, FormValues, Parameter } from '@wso2/ballerina-side-panel';
import { FormGeneratorNew } from '../Forms/FormGeneratorNew';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import { TitleBar } from '../../../components/TitleBar';
import { getImportsForProperty } from '../../../utils/bi';
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

    const [model, setFunctionModel] = useState<FunctionModel | null>(null);
    const [saving, setSaving] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [fields, setFields] = useState<FormField[]>([]);
    const [location, setLocation] = useState<VisualizerLocation | null>(null);
    const [recordTypeFields, setRecordTypeFields] = useState<RecordTypeField[]>([]);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    

        const handleParamChange = (param: Parameter) => {
            const name = `${param.formValues['variable']}`;
            const type = `${param.formValues['type']}`;
            const hasDefaultValue = Object.keys(param.formValues).includes('defaultable') &&
                param.formValues['defaultable'] !== undefined &&
                param.formValues['defaultable'] !== '';
    
            const defaultValue = hasDefaultValue ? `${param.formValues['defaultable']}`.trim() : '';
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

    const handleClosePopup = () => {
        // Close the popup - implement your close logic here
        console.log('Closing ServiceFunctionForm');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // TODO: Implement save functionality
            console.log('Saving function:', model);
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
                setLocation(location);
                console.log('>>> ServiceFunctionForm - Retrieved location:', location);

                // Check if we have CodeData from the flow diagram
                if (location.dataMapperMetadata?.codeData) {
                    const codeData = location.dataMapperMetadata.codeData;
                    console.log('>>> ServiceFunctionForm - Found CodeData from flow diagram:', codeData);

                    const functionModel = await rpcClient.getServiceDesignerRpcClient().getFunctionFromSource({
                        filePath: location.documentUri ,
                        codedata: codeData
                    });
                    setFunctionModel(functionModel.function);
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

            if (model?.properties) {
                const recordTypeFields: RecordTypeField[] = Object.entries(model?.properties)
                    .filter(([_, property]) =>
                        property.typeMembers &&
                        property.typeMembers.some((member: PropertyTypeMemberInfo) => member.kind === "RECORD_TYPE")
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
                        recordTypeMembers: property.typeMembers.filter((member: PropertyTypeMemberInfo) => member.kind === "RECORD_TYPE")
                    }));
                console.log(">>> recordTypeFields of model.advanceProperties", recordTypeFields);
    
                setRecordTypeFields(recordTypeFields);
            }
    

    const getFunctionParametersList = (params: Parameter[]) => {
            const paramList: ParameterModel[] = [];
            if (!model) {
                return paramList;
            }
            const paramFields = convertSchemaToFormFields(model.schema);
    
            params.forEach(param => {
                // Find matching field configurations from schema
                const typeField = paramFields.find(field => field.key === 'type');
                const nameField = paramFields.find(field => field.key === 'variable');
                const defaultField = paramFields.find(field => field.key === 'defaultable');
    
                paramList.push({
                    kind: 'REQUIRED',
                    enabled: typeField?.enabled ?? true,
                    editable: typeField?.editable ?? true,
                    advanced: typeField?.advanced ?? false,
                    optional: typeField?.optional ?? false,
                    type: {
                        value: param.formValues['type'] as string,
                        valueType: typeField?.valueType,
                        isType: true,
                        optional: typeField?.optional,
                        advanced: typeField?.advanced,
                        addNewButton: false,
                        enabled: typeField?.enabled,
                        editable: typeField?.editable,
                        imports: param?.imports || {}
                    },
                    name: {
                        value: param.formValues['variable'] as string,
                        valueType: nameField?.valueType,
                        isType: false,
                        optional: nameField?.optional,
                        advanced: nameField?.advanced,
                        addNewButton: false,
                        enabled: nameField?.enabled,
                        editable: nameField?.editable
                    },
                    defaultValue: {
                        value: param.formValues['defaultable'],
                        valueType: defaultField?.valueType || 'string',
                        isType: false,
                        optional: defaultField?.optional,
                        advanced: defaultField?.advanced,
                        addNewButton: false,
                        enabled: defaultField?.enabled,
                        editable: defaultField?.editable
                    }
                });
            });
            return paramList;
        }
    
        // Initialize form fields
    useEffect(() => {
        if (!model) {
            return;
        }

        const initialFields: FormField[] = [
            {
                key: 'name',
                label: model.name.metadata?.label || 'Operation Name',
                type: 'IDENTIFIER',
                optional: model.name.optional,
                editable: model.name.editable,
                advanced: model.name.advanced,
                enabled: model.name.enabled,
                documentation: model.name.metadata?.description || '',
                value: model.name.value,
                valueType: model.name.valueType,
                valueTypeConstraint: model.name.valueTypeConstraint || '',
                lineRange: model?.name?.codedata?.lineRange,
            },
            {
                key: 'parameters',
                label: 'Parameters',
                type: 'PARAM_MANAGER',
                optional: true,
                editable: true,
                enabled: true,
                documentation: '',
                value: model.parameters.map((param, index) => convertParameterToParamValue(param, index)),
                paramManagerProps: {
                    paramValues: model.parameters.map((param, index) => convertParameterToParamValue(param, index)),
                    formFields: convertSchemaToFormFields(model.schema),
                    handleParameter: handleParamChange
                },
                valueTypeConstraint: ''
            },
            {
                key: 'returnType',
                label: model.returnType.metadata?.label || 'Return Type',
                type: 'TYPE',
                optional: model.returnType.optional,
                enabled: model.returnType.enabled,
                editable: model.returnType.editable,
                advanced: model.returnType.advanced,
                documentation: model.returnType.metadata?.description || '',
                value: model.returnType.value,
                valueType: model.returnType.valueType,
                valueTypeConstraint: model.returnType.valueTypeConstraint || ''
            }
        ];
        setFields(initialFields);
    }, [model]);

    const onClose = () => {
        handleClosePopup();
    }
    const handleFunctionCreate = (data: FormValues, formImports: FormImports) => {
        if (!model) {
            return;
        }
        const updatedFunctionModel: FunctionModel = {
            ...model,
            name: {
                ...model.name,
                value: data.name
            },
            parameters: getFunctionParametersList(data.parameters as Parameter[]),
            returnType: {
                ...model.returnType,
                value: data.returnType,
            }
        };
        setFunctionModel(updatedFunctionModel);
        console.log('Function Create: ', updatedFunctionModel);
    }

    const handleFunctionSave = async (updatedFunction: FunctionModel) => {
        try {
            setIsSaving(true);
            let artifacts;
            const currentFilePath = await rpcClient.getVisualizerRpcClient().joinProjectPath(model.codedata.lineRange.fileName);
            
            artifacts = await rpcClient.getServiceDesignerRpcClient().updateResourceSourceCode({
                filePath: currentFilePath,
                codedata: {
                    lineRange: {
                        startLine: {
                            line: model.codedata.lineRange.startLine.line,
                            offset: model.codedata.lineRange.startLine.offset
                        },
                        endLine: {
                            line: model.codedata.lineRange.endLine.line,
                            offset: model.codedata.lineRange.endLine.offset
                        }
                    }
                },
                function: updatedFunction
            });
        } catch (error) {
            console.error('Error updating function:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFunctionCreate1 = (data: FormValues, formImports: FormImports) => {
        console.log("Function create with data:", data);
        const { name, returnType, parameters: params } = data;
        const paramList = params ? getFunctionParametersList(params) : [];
        const newFunctionModel = { ...model };
        newFunctionModel.name.value = name;
        newFunctionModel.returnType.value = returnType;
        newFunctionModel.parameters = paramList;
        newFunctionModel.returnType.imports = getImportsForProperty('returnType', formImports);
        Object.entries(data).forEach(([key, value]) => {
            if (newFunctionModel?.properties?.[key]) {
                newFunctionModel.properties[key].value = value as string;
            }
        });
        handleFunctionSave(newFunctionModel);
    };

    return (
        <>
            <TopNavigationBar />
            <TitleBar
                title="Service Function"
                subtitle="Build reusable custom flows"
            />
                {fields.length > 0 && (
                    <FormGeneratorNew
                        fileName={location?.documentUri || ''}
                        targetLineRange={model.codedata?.lineRange as LineRange}
                        fields={fields}
                        onSubmit={handleFunctionCreate1}
                        onBack={onClose}
                        submitText={ "Save"}
                        helperPaneSide="left"
                        isSaving={isSaving}
                        preserveFieldOrder={true}
                        recordTypeFields={recordTypeFields}
                    />
                )}
            </>
    );
}

export function convertSchemaToFormFields(schema: ConfigProperties): FormField[] {
    const formFields: FormField[] = [];

    // Get the parameter configuration if it exists
    const parameterConfig = schema["parameter"] as ConfigProperties;
    if (parameterConfig) {
        // Iterate over each parameter field in the parameter config
        for (const key in parameterConfig) {
            if (parameterConfig.hasOwnProperty(key)) {
                const parameter = parameterConfig[key];
                if (parameter.metadata && parameter.metadata.label) {
                    const formField = convertParameterToFormField(key, parameter as ParameterModel);
                    console.log("Form Field: ", formField);
                    formFields.push(formField);
                }
            }
        }
    }

    return formFields;
}

export function convertParameterToFormField(key: string, param: ParameterModel): FormField {
    return {
        key: key === "defaultValue" ? "defaultable" : key === "name" ? "variable" : key,
        label: param.metadata?.label,
        type: param.valueType || 'string',
        optional: param.optional || false,
        editable: param.editable || false,
        advanced: key === "defaultValue" ? true : param.advanced,
        documentation: param.metadata?.description || '',
        value: param.value || '',
        valueType: param.valueType,
        valueTypeConstraint: param?.valueTypeConstraint || '',
        enabled: param.enabled ?? true,
        lineRange: param?.codedata?.lineRange
    };
}


function convertParameterToParamValue(param: ParameterModel, index: number) {
    return {
        id: index,
        key: param.name.value,
        value: `${param.type.value} ${param.name.value}${(param.defaultValue as PropertyModel)?.value ? ` = ${(param.defaultValue as PropertyModel)?.value}` : ''}`,
        formValues: {
            variable: param.name.value,
            type: param.type.value,
            defaultable: (param.defaultValue as PropertyModel)?.value || ''
        },
        icon: 'symbol-variable',
        identifierEditable: param.name?.editable,
        identifierRange: param.name.codedata?.lineRange,
        hidden: param.hidden ?? false,
        imports: param.type?.imports || {}
    };
}
