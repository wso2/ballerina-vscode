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
// tslint:disable: jsx-no-multiline-js

import React, { useEffect, useState } from 'react';

import { Divider, Dropdown, Typography } from '@wso2/ui-toolkit';
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { EditorContainer, EditorContent } from '../../../styles';
import { LineRange, ParameterModel, PropertyModel } from '@wso2/ballerina-core';
import { FormField, FormImports } from '@wso2/ballerina-side-panel';
import FormGeneratorNew from '../../../../Forms/FormGeneratorNew';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { URI, Utils } from 'vscode-uri';
import { getImportsForProperty } from '../../../../../../utils/bi';

const options = [{ id: "0", value: "QUERY" }, { id: "1", value: "Header" }];

export interface ParamProps {
    param: ParameterModel;
    hideType?: boolean;
    onChange: (param: ParameterModel) => void;
    onSave?: (param: ParameterModel) => void;
    onCancel?: (param?: ParameterModel) => void;
    isNewResource?: boolean;
    type?: "QUERY" | "HEADER" | "PAYLOAD" | "PATH";
}

export function ParamEditor(props: ParamProps) {
    const { param, hideType = false, onChange, onSave, onCancel, isNewResource, type } = props;

    const { rpcClient } = useRpcContext();
    const [currentFields, setCurrentFields] = useState<FormField[]>([]);

    const [filePath, setFilePath] = useState<string>('');

    const [targetLineRange, setTargetLineRange] = useState<LineRange>();

    const handleOnSelect = (value: string) => {
        onChange({ ...param, httpParamType: value as "QUERY" | "HEADER" | "PAYLOAD" });
    };

    const handleReqFieldChange = () => {
        if (param.kind === 'REQUIRED') {
            updateFormFields(true);
        } else {
            updateFormFields();
        }
        const kind = param.kind === 'REQUIRED' ? "OPTIONAL" : "REQUIRED";
        onChange({ ...param, kind });
    };

    const handleOnCancel = () => {
        onCancel(param);
    };

    useEffect(() => {
        rpcClient.getVisualizerRpcClient().joinProjectPath('main.bal').then((filePath) => {
            setFilePath(filePath);
        });
        updateFormFields();
    }, []);

    const updateFormFields = (enableDefault: boolean = false) => {
        const fields: FormField[] = [];

        // Add name field
        fields.push({
            key: `name`,
            label: 'Name',
            type: param.name.valueType,
            optional: false,
            editable: true,
            documentation: '',
            enabled: param.name?.enabled,
            value: param.name.value,
            valueTypeConstraint: ""
        });

        // // Add type field if not hidden
        // if (!hideType) {
        //     fields.push({
        //         key: `type`,
        //         label: 'Type',
        //         type: param.type.valueType,
        //         optional: false,
        //         editable: true,
        //         documentation: '',
        //         enabled: param.type?.enabled,
        //         value: param.type.value,
        //         defaultValue: "json",
        //         valueTypeConstraint: ""
        //     });
        // }

        switch (type) {
            case "QUERY":
            case "HEADER":
            case "PATH":
                fields.push({
                    key: `type`,
                    label: 'Type',
                    type: "ENUM",
                    advanced: true,
                    optional: false,
                    editable: true,
                    documentation: '',
                    enabled: true,
                    defaultValue: "string",
                    value: param.type.value,
                    items: ["string", "int", "float", "decimal", "boolean"],
                    valueTypeConstraint: ""
                });
                break;
            case "PAYLOAD":
                fields.push({
                    key: `type`,
                    label: 'Type',
                    type: param.type.valueType,
                    optional: false,
                    editable: true,
                    documentation: '',
                    enabled: param.type?.enabled,
                    value: param.type.value || "json",
                    defaultValue: "json",
                    valueTypeConstraint: ""
                });
                break;
        }

        // Add default value field if available
        if (param.defaultValue) {
            fields.push({
                key: `defaultValue`,
                label: 'Default Value',
                type: (param.defaultValue as PropertyModel).valueType,
                optional: true,
                advanced: true,
                editable: true,
                documentation: '',
                enabled: enableDefault || (param.defaultValue as PropertyModel)?.enabled,
                value: (param.defaultValue as PropertyModel)?.value,
                valueTypeConstraint: ""
            });
        }
        setCurrentFields(fields);
    };

    useEffect(() => {
        updateFormFields();
    }, [param.name, param.type, param.defaultValue, hideType]);

    const onParameterSubmit = (dataValues: any, formImports: FormImports) => {
        console.log('Param values', dataValues);
        const updatedParam = {
            ...param,
            type: {
                ...param.type,
                value: dataValues['type'] ?? param.type.value,
                imports: getImportsForProperty('type', formImports)
            },
            name: { ...param.name, value: dataValues['name'] ?? param.name.value },
            defaultValue: {
                ...(param.defaultValue as PropertyModel),
                value: dataValues['defaultValue'] ?? (param.defaultValue as PropertyModel)?.value,
                enabled: !!dataValues['defaultValue']
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
            {param.httpParamType && <Typography sx={{ marginBlockEnd: 10 }} variant="h4">{param.httpParamType === "PAYLOAD" ? "Payload" : "Parameter"} Configuration</Typography>}
            {!param.httpParamType && <Typography sx={{ marginBlockEnd: 10 }} variant="h4">{param.metadata.label} Configuration</Typography>}
            <Divider />
            {/* {param.httpParamType !== "PAYLOAD" && !isNewResource &&
                <EditorContent>
                    {param.httpParamType === "QUERY" && (
                        <VSCodeCheckbox checked={param.kind === "REQUIRED"} onChange={handleReqFieldChange} id="is-req-checkbox">
                            Is Required?
                        </VSCodeCheckbox>
                    )}
                </EditorContent>
            } */}
            <>
                {filePath && targetLineRange &&
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
                }

            </>
        </EditorContainer >
    );
}
