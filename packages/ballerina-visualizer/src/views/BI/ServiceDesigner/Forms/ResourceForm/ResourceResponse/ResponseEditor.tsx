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

import { useEffect, useState } from 'react';

import { CheckBox, Divider, Tabs, Typography } from '@wso2/ui-toolkit';
import { EditorContainer, EditorContent } from '../../../styles';
import { LineRange, PropertyModel, StatusCodeResponse, responseCodes } from '@wso2/ballerina-core';
import { getDefaultResponse, getTitleFromResponseCode, HTTP_METHOD } from '../../../utils';
import { FormField, FormImports, FormValues } from '@wso2/ballerina-side-panel';
import FormGeneratorNew from '../../../../Forms/FormGeneratorNew';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { URI, Utils } from 'vscode-uri';
import { VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import { getImportsForProperty } from '../../../../../../utils/bi';


enum Views {
    NEW = "NEW",
    EXISTING = "EXISTING",
}

export interface ParamProps {
    index: number;
    method: HTTP_METHOD;
    response: StatusCodeResponse;
    isEdit: boolean;
    onSave: (param: StatusCodeResponse, index: number) => void;
    onCancel?: (id?: number) => void;
}

export function ResponseEditor(props: ParamProps) {
    const { method, index, response, isEdit, onSave, onCancel } = props;

    const { rpcClient } = useRpcContext();

    const [filePath, setFilePath] = useState<string>('');
    const [currentView, setCurrentView] = useState(response.type.value ? Views.EXISTING : Views.NEW);

    const [targetLineRange, setTargetLineRange] = useState<LineRange>();

    const [newFields, setNewFields] = useState<FormField[]>([]);

    useEffect(() => {
        rpcClient.getVisualizerLocation().then(res => { setFilePath(Utils.joinPath(URI.file(res.projectUri), 'main.bal').fsPath) });
    }, []);

    const handleOnCancel = () => {
        onCancel(index);
    };

    const convertPropertyToFormField = (property: PropertyModel, isArray?: boolean, items?: string[]) => {
        const converted: FormField = {
            key: "",
            label: property.metadata.label,
            type: property.valueType,
            optional: property.optional,
            editable: property.editable,
            enabled: property.enabled,
            documentation: property.metadata.description,
            value: isArray ? property.values || [] : property.value,
            items: property.items || items,
            diagnostics: property.diagnostics,
            valueTypeConstraint: property.valueTypeConstraint,
        }
        return converted;
    }

    const updateNewFields = (res: StatusCodeResponse) => {
        const defaultItems = [
            "",
            "string",
            "int",
            "boolean",
            "string[]",
            "int[]",
            "boolean[]"
        ];
        const fields = [
            {
                ...convertPropertyToFormField(res.statusCode),
                key: `statusCode`,
                value: getTitleFromResponseCode(Number(res.statusCode.value)),
                items: responseCodes.map(code => code.title),
            },
            {
                ...convertPropertyToFormField(res.body),
                key: `body`,
            },
            {
                ...convertPropertyToFormField(res.name),
                key: `name`,
            },
            {
                ...convertPropertyToFormField(res.headers, true, defaultItems),
                key: `headers`,
            }
        ];
        setNewFields(fields);
    };

    useEffect(() => {
        updateNewFields(response);
    }, [response]);


    const existingFields: FormField[] = [
        {
            ...convertPropertyToFormField(response.type),
            key: `type`,
        }
    ];


    const isValidResponse = (dataValues: FormValues) => {
        if (dataValues['name']) {
            return true;
        }
        const code = responseCodes.find(code => code.title === dataValues['statusCode']).code;
        const defaultCode = getDefaultResponse(method);

        // Set optional false for the response name
        response.name.optional = false;
        response.name.diagnostics = [{ severity: "ERROR", message: "Response Name Required" }]

        // Set all the other values
        response.statusCode.value = String(code);
        response.body.value = dataValues['body'];
        response.name.value = dataValues['name'];
        response.headers.values = dataValues['headers'];

        if (code === defaultCode) { // Case 1: Use select the default response success for the accessor
            // If the user add a header type then user should fill the name field as well
            if (dataValues['headers'] && dataValues['headers'].length > 0) {
                updateNewFields({ ...response });
                return false;
            }
        } else { // Case 2: User select a response other than the default success response
            // If user add a body or header values then user must add a name.
            if (dataValues['body'] || (dataValues['headers'] && dataValues['headers'].length > 0)) {
                updateNewFields({ ...response });
                return false;
            }
        }
        return true;
    }


    const handleOnNewSubmit = (dataValues: FormValues, formImports: FormImports) => {
        console.log("Add New Response: ", dataValues);
        if (isValidResponse(dataValues)) {
            // Set the values
            const code = responseCodes.find(code => code.title === dataValues['statusCode']).code;
            response.statusCode.value = String(code);
            response.body.value = dataValues['body'];
            response.name.value = dataValues['name'];
            response.headers.values = dataValues['headers'];
            response.body.imports = getImportsForProperty('body', formImports);
            onSave(response, index);
        }
    }

    const handleOnExistingSubmit = (dataValues: FormValues, formImports: FormImports) => {
        console.log("Add Existing Type: ", dataValues);
        response.type.value = dataValues['type'];
        response.type.imports = getImportsForProperty('type', formImports);
        response.statusCode.value = '';
        response.body.value = '';
        response.name.value = '';
        response.headers.values = [];
        onSave(response, index);
    }

    useEffect(() => {
        if (rpcClient) {
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

    const handleCheckChange = (view: string) => {
        if (currentView === Views.EXISTING) {
            setCurrentView(Views.NEW);
        } else {
            setCurrentView(Views.EXISTING);
        }
    };

    return (
        <EditorContainer>
            <EditorContent>
                <Typography sx={{ marginBlockEnd: 10 }} variant="h4">Response Configuration</Typography>
                <VSCodeCheckbox checked={currentView === Views.EXISTING} onChange={handleCheckChange} id="is-req-checkbox">
                    Use Existing
                </VSCodeCheckbox>
            </EditorContent>
            <Divider />
            {currentView === Views.NEW && filePath && targetLineRange &&
                <div>
                    <FormGeneratorNew
                        fileName={filePath}
                        targetLineRange={targetLineRange}
                        fields={newFields}
                        onBack={handleOnCancel}
                        onSubmit={handleOnNewSubmit}
                        submitText={isEdit ? "Save" : "Add"}
                        nestedForm={true}
                        helperPaneSide='left'
                    />
                </div>}
            {currentView === Views.EXISTING && filePath && targetLineRange &&
                <div>
                    <FormGeneratorNew
                        fileName={filePath}
                        targetLineRange={targetLineRange}
                        fields={existingFields}
                        onBack={handleOnCancel}
                        onSubmit={handleOnExistingSubmit}
                        submitText={isEdit ? "Save" : "Add"}
                        nestedForm={true}
                        helperPaneSide='left'
                    />
                </div>
            }
        </EditorContainer >
    );
}
