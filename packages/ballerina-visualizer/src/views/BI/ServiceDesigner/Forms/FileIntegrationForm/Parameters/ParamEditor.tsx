/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com)
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

import React, { useEffect, useState } from 'react';
import { Divider, Typography } from '@wso2/ui-toolkit';
import { EditorContainer } from '../../../styles';
import { getPrimaryInputType, LineRange, ParameterModel } from '@wso2/ballerina-core';
import { FormField, FormImports } from '@wso2/ballerina-side-panel';
import FormGeneratorNew from '../../../../Forms/FormGeneratorNew';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { getImportsForProperty } from '../../../../../../utils/bi';

export interface ParamEditorProps {
    param: ParameterModel;
    onChange: (param: ParameterModel) => void;
    onSave?: (param: ParameterModel) => void;
    onCancel?: (param?: ParameterModel) => void;
}

export function ParamEditor(props: ParamEditorProps) {
    const { param, onChange, onSave, onCancel } = props;

    const { rpcClient } = useRpcContext();
    const [currentFields, setCurrentFields] = useState<FormField[]>([]);
    const [filePath, setFilePath] = useState<string>('');
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();

    const handleOnCancel = () => {
        onCancel?.(param);
    };

    useEffect(() => {
        rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: ['main.bal'] }).then((response) => {
            setFilePath(response.filePath);
        });
        updateFormFields();
    }, []);

    const updateFormFields = () => {
        const fields: FormField[] = [];
        const nameFieldType = getPrimaryInputType(param.name?.types)?.fieldType || "TEXT";
        const typeFieldType = getPrimaryInputType(param.type?.types)?.fieldType || "TEXT";

        // Add name field
        fields.push({
            key: `name`,
            label: 'Name',
            type: nameFieldType,
            optional: false,
            editable: true,
            documentation: '',
            enabled: param.name?.enabled ?? true,
            value: param.name?.value ?? '',
            types: [{ fieldType: nameFieldType, selected: false }]
        });

        // Add type field
        fields.push({
            key: `type`,
            label: 'Type',
            type: typeFieldType,
            optional: false,
            editable: true,
            documentation: param?.type?.metadata?.description || '',
            enabled: param.type?.enabled ?? true,
            value: param.type?.value || "json",
            defaultValue: "json",
            types: [{ fieldType: typeFieldType, selected: false }]
        });

        setCurrentFields(fields);
    };

    useEffect(() => {
        updateFormFields();
    }, [param.name, param.type]);

    const onParameterSubmit = (dataValues: Record<string, string>, formImports: FormImports) => {
        const updatedParam = {
            ...param,
            type: {
                ...param.type,
                value: dataValues['type'] ?? param.type?.value ?? "json",
                imports: getImportsForProperty('type', formImports)
            },
            name: { ...param.name, value: dataValues['name'] ?? param.name?.value ?? "" }
        };

        // Update the parent component's state first
        onChange(updatedParam);

        // Then call onSave if provided
        if (onSave) {
            onSave(updatedParam);
        }
    };

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
        <EditorContainer>
            <Typography sx={{ marginBlockEnd: 0, marginTop: 5 }} variant="h4">
                Content Schema
            </Typography>
            <Divider />
            <>
                {filePath && targetLineRange &&
                    <FormGeneratorNew
                        fileName={filePath}
                        targetLineRange={targetLineRange}
                        fields={currentFields}
                        onBack={handleOnCancel}
                        onSubmit={onParameterSubmit}
                        submitText="Save"
                        nestedForm={true}
                        helperPaneSide='left'
                        preserveFieldOrder={true}
                    />
                }
            </>
        </EditorContainer>
    );
}
