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

import { Divider, OptionProps, Typography } from '@wso2/ui-toolkit';
import { EditorContainer, EditorContent } from '../../../styles';
import { LineRange, PropertyModel, ResponseCode, StatusCodeResponse } from '@wso2/ballerina-core';
import { getDefaultResponse, getTitleFromStatusCodeAndType, HTTP_METHOD } from '../../../utils';
import { FormField, FormImports, FormValues } from '@wso2/ballerina-side-panel';
import FormGeneratorNew from '../../../../Forms/FormGeneratorNew';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { URI, Utils } from 'vscode-uri';
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
    const [responseCodes, setResponseCodes] = useState<ResponseCode[]>([]);

    const [targetLineRange, setTargetLineRange] = useState<LineRange>();

    const [newFields, setNewFields] = useState<FormField[]>([]);

    useEffect(() => {
        rpcClient.getServiceDesignerRpcClient().getResourceReturnTypes({ filePath: undefined, context: "HTTP_STATUS_CODE" }).then((res) => {
            const mappedResponseCodes: ResponseCode[] = res.map((item: any) => ({
                category: item.labelDetails?.description || "",
                label: item.label || "",
                type: item.detail || "",
                statusCode: item.labelDetails?.detail || "",
                hasBody: !["http:Response", "http:NoContent", "error"].includes(item.detail)
            }));
            setResponseCodes(mappedResponseCodes);
            rpcClient.getVisualizerRpcClient().joinProjectPath('main.bal').then((filePath) => {
                setFilePath(filePath);
            });
        });
    }, []);

    const handleOnCancel = () => {
        onCancel(index);
    };

    const convertPropertyToFormField = (property: PropertyModel, items?: string[]) => {
        const converted: FormField = {
            key: "",
            label: property.metadata.label,
            type: property.valueType,
            optional: property.optional,
            editable: property.editable,
            enabled: property.enabled,
            advanced: property.advanced,
            documentation: property.metadata.description,
            value: property.value,
            items: property.items || items,
            diagnostics: property.diagnostics,
            valueTypeConstraint: property.valueTypeConstraint,
        }
        return converted;
    }

    const updateNewFields = (res: StatusCodeResponse, hasBody: boolean = true) => {
        const NO_BODY_TYPES = ["http:Response", "http:NoContent", "error"];
        const defaultItems = [
            "",
            "string",
            "int",
            "boolean",
            "string[]",
            "int[]",
            "boolean[]"
        ];

        // Special Condition to check http:Response to re-direct to Dynamic Status code
        if (NO_BODY_TYPES.includes(res.type.value)) {
            res.statusCode.value = "";
            // Handle the error type to set the default status code to 500
            if (res.type.value === "error") {
                res.statusCode.value = "500";
            }
            hasBody = false;
        }

        const fields: FormField[] = [
            {
                ...convertPropertyToFormField(res.statusCode),
                key: `statusCode`,
                value: getTitleFromStatusCodeAndType(responseCodes, res.statusCode.value, res.type.value),
                itemOptions: getCategorizedOptions(responseCodes),
                onValueChange: (value: string) => {
                    const responseCodeData = responseCodes.find(code => getTitleFromStatusCodeAndType(responseCodes, code.statusCode, code.type) === value);
                    res.statusCode.value = responseCodeData.statusCode;
                    res.type.value = responseCodeData.type;
                    if (NO_BODY_TYPES.includes(responseCodeData.type)) {
                        updateNewFields(res, false);
                    } else {
                        updateNewFields(res, true);
                    }
                }
            }
        ];

        if (hasBody) {
            fields.push({
                ...convertPropertyToFormField(res.body),
                key: `body`,
            });
            fields.push({
                ...convertPropertyToFormField(res.name),
                key: `name`,
            },);
            fields.push({
                ...convertPropertyToFormField(res.headers, defaultItems),
                key: `headers`,
            });
        }

        setNewFields(fields);
    };

    useEffect(() => {
        if (responseCodes.length > 0) {
            updateNewFields(response);
        }
    }, [response, responseCodes]);


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
        const code = responseCodes.find(code => getTitleFromStatusCodeAndType(responseCodes, code.statusCode, code.type) === dataValues['statusCode']).statusCode;
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
            const code = responseCodes.find(code => getTitleFromStatusCodeAndType(responseCodes, code.statusCode, code.type) === dataValues['statusCode']).statusCode;
            response.statusCode.value = String(code);
            response.body.value = dataValues['body'];
            response.name.value = dataValues['name'];
            response.headers.values = dataValues['headers'];
            response.body.imports = getImportsForProperty('body', formImports);
            onSave(response, index);
        }
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

    // Helper to create a header option (non-selectable)
    const createHeaderOption = (label: string, marginBlockEnd: number = 3): OptionProps => ({
        id: `header-${label}`,
        content: (
            <Typography sx={{ marginBlockEnd, marginTop: marginBlockEnd === 0 ? 0 : 16 }} variant="caption">{label}</Typography>
        ),
        value: `header-${label}`,
        disabled: true, // Make header non-selectable
    });

    // Helper to create a regular option
    const createOption = (item: ResponseCode): OptionProps => ({
        id: `${item.statusCode}-${item.type}`,
        content: (
            <span style={{ padding: "4px" }}>
                {item.statusCode !== "Dynamic" ? `${item.statusCode} ` : "Dynamic"} - {item.label}
            </span>
        ),
        value: `${item.statusCode} - ${item.label}`,
    });

    // Main function to categorize and flatten the list
    function getCategorizedOptions(responseCodes: ResponseCode[]): OptionProps[] {
        const dynamic = responseCodes.filter(i => i.type === "http:Response");
        const error = responseCodes.filter(i => i.type === "error");
        const userDefined = responseCodes.filter(i => i.category === "User Defined");
        const preBuilt = responseCodes.filter(i =>
            ["1XX", "2XX", "3XX", "4XX", "5XX"].includes(i.category)
        );
        let options: OptionProps[] = [];

        if (userDefined.length) {
            options.push(createHeaderOption("User Defined Responses", 0));
            options = options.concat(userDefined.map(createOption));
        }
        if (preBuilt.filter(i => i.category === "2XX").length > 0) {
            options.push(createHeaderOption("2XX - Success", userDefined.length > 0 ? 3 : 0));
            options = options.concat(preBuilt.filter(i => i.category === "2XX").map(createOption));
        }
        if (preBuilt.filter(i => i.category === "1XX").length > 0) {
            options.push(createHeaderOption("1XX - Informational"));
            options = options.concat(preBuilt.filter(i => i.category === "1XX").map(createOption));
        }
        if (preBuilt.filter(i => i.category === "3XX").length > 0) {
            options.push(createHeaderOption("3XX - Redirection"));
            options = options.concat(preBuilt.filter(i => i.category === "3XX").map(createOption));
        }
        if (preBuilt.filter(i => i.category === "4XX").length > 0) {
            options.push(createHeaderOption("4XX - Client Error"));
            options = options.concat(preBuilt.filter(i => i.category === "4XX").map(createOption));
        }
        if (preBuilt.filter(i => i.category === "5XX").length > 0) {
            options.push(createHeaderOption("5XX - Server Error"));
            options = options.concat(preBuilt.filter(i => i.category === "5XX").map(createOption));
        }
        if (error.length) {
            options.push(createHeaderOption("Error Response"));
            options = options.concat(error.map(createOption));
        }
        if (dynamic.length) {
            options.push(createHeaderOption("Infer from Response"));
            options = options.concat(dynamic.map(createOption));
        }
        return options;
    }

    return (
        <EditorContainer>
            <EditorContent>
                <Typography sx={{ marginBlockEnd: 10 }} variant="h4">Response Configuration</Typography>
            </EditorContent>
            <Divider />
            {filePath && targetLineRange &&
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
                </div>
            }
        </EditorContainer >
    );
}
