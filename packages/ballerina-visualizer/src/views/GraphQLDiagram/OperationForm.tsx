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

import React, { useState, useEffect } from 'react';
import { FunctionModel, LineRange, ParameterModel, ConfigProperties, Type, PropertyModel } from '@wso2/ballerina-core';
import { FormGeneratorNew } from '../BI/Forms/FormGeneratorNew';
import { FormField, FormImports, FormValues, Parameter } from '@wso2/ballerina-side-panel';
import { getImportsForProperty } from '../../utils/bi';

interface OperationFormProps {
    model: FunctionModel;
    filePath: string;
    lineRange: LineRange;
    isGraphqlView: boolean;
    isServiceClass?: boolean;
    onSave: (model: FunctionModel) => void;
    onClose: () => void;
    isSaving: boolean;
}

export function OperationForm(props: OperationFormProps) {
    console.log("OperationForm props: ", props);
    const { model, onSave, onClose, filePath, lineRange, isGraphqlView, isServiceClass, isSaving } = props;
    const [fields, setFields] = useState<FormField[]>([]);

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

    const getFunctionParametersList = (params: Parameter[]) => {
        const paramList: ParameterModel[] = [];
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
        const initialFields = [
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
                lineRange: model?.name?.codedata?.lineRange
            },
            {
                key: 'parameters',
                label: isServiceClass ? 'Parameters' : (isGraphqlView ? 'Arguments' : 'Parameters'),
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

    const handleFunctionCreate = (data: FormValues, formImports: FormImports) => {
        console.log("Function create with data:", data);
        const { name, returnType, parameters: params } = data;
        const paramList = params ? getFunctionParametersList(params) : [];
        const newFunctionModel = { ...model };
        newFunctionModel.name.value = name;
        newFunctionModel.returnType.value = returnType;
        newFunctionModel.parameters = paramList;
        newFunctionModel.returnType.imports = getImportsForProperty('returnType', formImports);
        onSave(newFunctionModel);
    };

    return (
        <>
            {fields.length > 0 && (
                <FormGeneratorNew
                    fileName={filePath}
                    targetLineRange={lineRange}
                    fields={fields}
                    onSubmit={handleFunctionCreate}
                    onBack={onClose}
                    submitText={isSaving ? "Saving..." : "Save"}
                    isGraphqlEditor={isGraphqlView}
                    helperPaneSide="left"
                    isSaving={isSaving}
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
        identifierRange: param.name.codedata?.lineRange
    };
}
