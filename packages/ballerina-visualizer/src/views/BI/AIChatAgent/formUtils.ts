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

import { ValueTypeConstraint, ToolParameters, getPrimaryInputType } from "@wso2/ballerina-core";
import { FormField, Parameter } from "@wso2/ballerina-side-panel";

export function createToolInputFields(filteredNodeParameterFields: FormField[]): FormField[] {
    const paramManagerValues = filteredNodeParameterFields
        .filter(field => !(field.optional && field.advanced))
        .map((field, idx) => ({
            id: idx,
            icon: "",
            key: field.key,
            value: `${getPrimaryInputType(field.types)?.fieldType} ${field.key}`,
            identifierEditable: true,
            identifierRange: {
                fileName: "functions.bal",
                startLine: { line: 0, offset: 0 },
                endLine: { line: 0, offset: 0 }
            },
            formValues: {
                variable: field.key,
                type: getPrimaryInputType(field.types)?.ballerinaType,
                parameterDescription: field.documentation || ""
            }
        }));

    const paramManagerFormFields: FormField[] = [
        {
            key: "type",
            label: "Type",
            type: "TYPE",
            optional: false,
            advanced: false,
            editable: true,
            enabled: true,
            hidden: false,
            documentation: "Type of the parameter",
            value: "",
            advanceProps: [],
            diagnostics: [],
            metadata: { label: "Type", description: "Type of the parameter" },
            types: [{ fieldType: "TYPE", selected: false }],
        },
        {
            key: "variable",
            label: "Name",
            type: "IDENTIFIER",
            optional: false,
            advanced: false,
            editable: true,
            enabled: true,
            hidden: false,
            documentation: "Name of the parameter",
            value: "",
            advanceProps: [],
            diagnostics: [],
            metadata: { label: "Name", description: "Name of the parameter" },
            types: [{ fieldType: "IDENTIFIER", selected: false }],
        },
        {
            key: "parameterDescription",
            label: "Description",
            type: "STRING",
            optional: true,
            advanced: false,
            editable: true,
            enabled: true,
            hidden: false,
            documentation: "Description of the parameter",
            value: "",
            advanceProps: [],
            diagnostics: [],
            metadata: { label: "Description", description: "Description of the parameter" },
            types: [{ fieldType: "STRING", selected: false }]
        }
    ];

    return [
        {
            key: "parameters",
            label: "Tool Inputs",
            type: "PARAM_MANAGER",
            optional: true,
            advanced: false,
            editable: false,
            enabled: true,
            hidden: false,
            documentation: "Define the inputs the agent must provide when invoking this tool.",
            value: paramManagerValues,
            advanceProps: [],
            diagnostics: [],
            types: [{ fieldType: "PARAM_MANAGER", selected: false }],
            paramManagerProps: {
                paramValues: paramManagerValues,
                formFields: paramManagerFormFields,
                handleParameter: function (parameter: Parameter): Parameter {
                    return parameter;
                }
            }
        }
    ];
}


export function createDefaultParameterValue({ value, parameterDescription, type }: { value: string, parameterDescription?: string, type?: string }): ValueTypeConstraint {
    const defaultMetadata = {
        label: "",
        description: "",
    };
    return {
        metadata: defaultMetadata,
        valueType: "",
        value: {
            variable: {
                value,
                metadata: defaultMetadata,
                valueType: "",
                optional: false,
                editable: false,
                advanced: false
            },
            parameterDescription: {
                value: parameterDescription || "",
                metadata: defaultMetadata,
                valueType: "",
                optional: false,
                editable: false,
                advanced: false
            },
            type: {
                value: type || "",
                metadata: defaultMetadata,
                valueType: "",
                optional: false,
                editable: false,
                advanced: false
            }
        },
        optional: false,
        editable: false,
        advanced: false
    };
}

export function createToolParameters(): ToolParameters {
    return {
        metadata: {
            label: "Tool Inputs",
            description: "Define the inputs the agent must provide when invoking this tool."
        },
        types: [
            {
                fieldType: "REPEATABLE_PROPERTY",
                selected: false,
                template: {
                    metadata: {
                        label: "Parameter",
                        description: "Function parameter"
                    },
                    types: [{ fieldType: "FIXED_PROPERTY", selected: false }],
                    value: {
                        type: {
                            metadata: {
                                label: "Type",
                                description: "Type of the parameter"
                            },
                            types: [{ fieldType: "TYPE", selected: false }],
                            value: "",
                            optional: false,
                            editable: true,
                            advanced: false,
                            hidden: false
                        },
                        variable: {
                            metadata: {
                                label: "Name",
                                description: "Name of the parameter"
                            },
                            types: [{ fieldType: "IDENTIFIER", selected: false }],
                            value: "",
                            optional: false,
                            editable: true,
                            advanced: false,
                            hidden: false
                        },
                        parameterDescription: {
                            metadata: {
                                label: "Description",
                                description: "Description of the parameter"
                            },
                            valueType: "STRING",
                            value: "",
                            optional: true,
                            editable: true,
                            advanced: false,
                            hidden: false
                        }
                    },
                    optional: false,
                    editable: false,
                    advanced: false,
                    hidden: false
                }
            }],
        value: {},
        optional: true,
        editable: false,
        advanced: false,
        hidden: false
    };
}

export const cleanServerUrl = (url: string): string | null => {
    if (url === null || url === undefined) return null;
    return url.replace(/^"|"$/g, '').trim();
};

export const HIDDEN_TOOL_NODE_PROPERTY_KEYS = ["type", "targetType", "variable", "checkError", "connection", "resourcePath"];
export const EMPTY_DEFAULT_TOOL_NODE_PROPERTY_KEYS = ["headers", "additionalValues"];

export function prepareToolInputFields(fields: FormField[]): FormField[] {
    const includedKeys: string[] = [];
    fields.forEach((field) => {
        if (HIDDEN_TOOL_NODE_PROPERTY_KEYS.includes(field.key)) {
            field.hidden = true;
            return;
        }
        if (field.optional == false) field.value = field.key;
        if (EMPTY_DEFAULT_TOOL_NODE_PROPERTY_KEYS.includes(field.key)) {
            field.value = "{}";
            return;
        }
        includedKeys.push(field.key);
    });
    return fields.filter(field => includedKeys.includes(field.key));
}
