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

import { getPrimaryInputType, LineRange, ParameterModel } from '@wso2/ballerina-core';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { FormField, FormImports } from '@wso2/ballerina-side-panel';
import { Divider, Typography } from '@wso2/ui-toolkit';
import { useEffect, useState } from 'react';
import { getImportsForProperty } from '../../../../../../utils/bi';
import FormGeneratorNew from '../../../../Forms/FormGeneratorNew';
import { EditorContainer } from '../../../styles';

export interface ParamProps {
    param: ParameterModel;
    onChange: (param: ParameterModel) => void;
    onSave?: (param: ParameterModel) => void;
    onCancel?: (param?: ParameterModel) => void;
    payloadFieldName?: string;
}

export function ParamEditor(props: ParamProps) {
    const { param, onChange, onSave, onCancel, payloadFieldName = "Payload" } = props;

    const { rpcClient } = useRpcContext();
    const [currentFields, setCurrentFields] = useState<FormField[]>([]);
    const [filePath, setFilePath] = useState<string>('');
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();

    const handleOnCancel = () => {
        onCancel(param);
    };

    useEffect(() => {
        rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: ['main.bal'] }).then((response) => {
            setFilePath(response.filePath);
        });
        updateFormFields();
    }, []);

    const updateFormFields = () => {
        const fields: FormField[] = [];

        // Add type field for payload
        fields.push({
            key: `type`,
            label: 'Type',
            type: getPrimaryInputType(param.type.types)?.fieldType,
            optional: false,
            editable: true,
            documentation: '',
            enabled: param.type?.enabled,
            value: param.type.value || "json",
            defaultValue: "json",
            types: [{fieldType: getPrimaryInputType(param.type.types)?.fieldType, selected: false}],
        });

        setCurrentFields(fields);
    };

    useEffect(() => {
        updateFormFields();
    }, [param.type]);

    const onParameterSubmit = (dataValues: any, formImports: FormImports) => {
        const updatedParam = {
            ...param,
            type: {
                ...param.type,
                value: dataValues['type'] ?? param.type.value,
                imports: getImportsForProperty('type', formImports)
            }
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
            <Typography sx={{ marginBlockEnd: 10 }} variant="h4">{payloadFieldName} Configuration</Typography>
            <Divider />
            {filePath && targetLineRange && (
                <FormGeneratorNew
                    fileName={filePath}
                    targetLineRange={targetLineRange}
                    fields={currentFields}
                    onBack={handleOnCancel}
                    onSubmit={onParameterSubmit}
                    submitText={param.type.value ? "Save" : "Add"}
                    nestedForm={true}
                    helperPaneSide='left'
                    preserveFieldOrder={true}
                />
            )}
        </EditorContainer>
    );
}
