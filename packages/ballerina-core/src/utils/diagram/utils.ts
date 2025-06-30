/* eslint-disable no-useless-escape */
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

import { FormField, PrimitiveBalType } from "../../interfaces/config-spec";
import { keywords } from "../modification-utils";


export function getFieldName(fieldName: string): string {
    return keywords.includes(fieldName) ? "'" + fieldName : fieldName;
}

// get field name of the union record
export function getUnionFormFieldName(field: FormField): string {
    let name = field.name;
    if (!name) {
        name = field.typeInfo?.name;
    }
    if (!name) {
        name = field.typeName;
    }
    return name;
}

const isAllFieldsEmpty = (recordFields: FormField[]): boolean => recordFields?.every(field => ((field.value ?? "") === "") || (field.fields && isAllFieldsEmpty(field.fields)));

export function getParams(formFields: FormField[], depth = 1): string[] {
    const paramStrings: string[] = [];
    formFields.forEach(formField => {
        const skipDefaultValue =
            (!formField.value &&
                formField.typeName !== "record" &&
                formField.typeName !== "inclusion" &&
                formField.defaultable) ||
            (formField.value && formField.defaultValue && formField.defaultValue === formField.value);
        let paramString: string = "";
        if (!skipDefaultValue) {
            if (formField.defaultable &&
                ((formField.typeName !== "record" && formField.value) ||
                    (formField.typeName === "record" && !isAllFieldsEmpty(formField.fields)))) {
                paramString += `${getFieldName(formField.name)} = `;
            }
            if (formField.typeName === "string" && (formField.value || formField.defaultValue)) {
                paramString += formField.value || formField.defaultValue;
            } else if (formField.typeName === "object" && (formField.value || formField.defaultValue)) {
                paramString += formField.value || formField.defaultValue;
            }
            else if (formField.typeName === "array" && !formField.hide && (formField.value || formField.defaultValue)) {
                paramString += formField.value.toString() || formField.defaultValue;
            } else if (formField.typeName === "map" && (formField.value || formField.defaultValue)) {
                paramString += formField.value || formField.defaultValue;
            } else if ((formField.typeName === "int" || formField.typeName === "boolean" || formField.typeName === "float" || formField.typeName === "decimal" ||
                formField.typeName === "json" || formField.typeName === "httpRequest") && (formField.value || formField.defaultValue)) {
                paramString += formField.value || formField.defaultValue;
            } else if ((formField.typeName === "enum") && (formField.value || formField.defaultValue)) {
                paramString += `"${formField.value || formField.defaultValue}"`;
            } else if (formField.typeName === "record" && formField.fields && formField.fields.length > 0 && !formField.isReference) {
                let recordFieldsString: string = "";
                let firstRecordField = false;

                formField.fields.forEach(field => {
                    // Skip default values if no changes
                    if (field.defaultValue && field.defaultValue === field.value) {
                        return;
                    }
                    if (field.typeName === "string" && field.value) {
                        if (firstRecordField) {
                            recordFieldsString += ", ";
                        } else {
                            firstRecordField = true;
                        }
                        recordFieldsString += getFieldName(field.name) + ": " + field.value;
                    }
                    else if ((field.typeName === "int" || field.typeName === "boolean" || field.typeName === "float" || field.typeName === "decimal") && field.value) {
                        if (firstRecordField) {
                            recordFieldsString += ", ";
                        } else {
                            firstRecordField = true;
                        }
                        recordFieldsString += getFieldName(field.name) + ": " + field.value;
                    } else if (field.typeName === "map" && field.value) {
                        if (firstRecordField) {
                            recordFieldsString += ", ";
                        } else {
                            firstRecordField = true;
                        }
                        // HACK:    current map type will render by expression-editor component.
                        //          expression-editor component will set value property directly.
                        //          need to implement fetch inner field's values of map object.
                        recordFieldsString += getFieldName(field.name) + ": " + field.value;
                    } else if (field.typeName === "array" && !field.hide && field.value) {
                        if (firstRecordField) {
                            recordFieldsString += ", ";
                        } else {
                            firstRecordField = true;
                        }
                        recordFieldsString += getFieldName(field.name) + ": " + field.value;
                    } else if (field.typeName === "union" && !field.hide) {
                        const name = getFieldName(field.name ? field.name : field.typeInfo.name);
                        if (name) {
                            const selectedField: FormField = field.members?.find((subField: FormField) => {
                                const fieldName = getUnionFormFieldName(subField);
                                return fieldName !== undefined && fieldName === field.selectedDataType;
                            });
                            if (selectedField) {
                                const params = getParams([selectedField], depth + 1);
                                if (params && params.length > 0) {
                                    if (firstRecordField) {
                                        recordFieldsString += ", ";
                                    } else {
                                        firstRecordField = true;
                                    }
                                    recordFieldsString += name + ": " + params;
                                }
                            } else if (field.value) {
                                if (firstRecordField) {
                                    recordFieldsString += ", ";
                                } else {
                                    firstRecordField = true;
                                }
                                recordFieldsString += name + ": " + field.value;
                            }
                        }
                    } else if (field.typeName === "enum" && !field.hide && field.value) {
                        const name = getFieldName(field.name ? field.name : field.typeInfo.name);
                        if (firstRecordField) {
                            recordFieldsString += ", ";
                        } else {
                            firstRecordField = true;
                        }
                        recordFieldsString += `${name} : "${field.value}"`;
                    } else if (field.typeName === "record" && !field.hide && !field.isReference) {
                        const name = getFieldName(field.name ? field.name : field.typeInfo.name);
                        if (name) {
                            const fieldArray: FormField[] = [
                                {
                                    typeName: PrimitiveBalType.Record,
                                    fields: field.fields,
                                },
                            ];
                            const params = getParams(fieldArray, depth + 1);
                            if (params && params.length > 0) {
                                if (firstRecordField) {
                                    recordFieldsString += ", ";
                                } else {
                                    firstRecordField = true;
                                }
                                recordFieldsString += name + ": " + params;
                            }
                        }
                    }
                });
                if (recordFieldsString !== "" && recordFieldsString !== "{}" && recordFieldsString !== undefined) {
                    paramString += "{" + recordFieldsString + "}";
                } else if (recordFieldsString === "" && !formField.optional && depth === 1) {
                    paramString += "{}";
                }
                // HACK: OAuth2RefreshTokenGrantConfig record contains *oauth2:RefreshTokenGrantConfig
                //      code generation doesn't need another record inside OAuth2RefreshTokenGrantConfig
                //      here skip that RefreshTokenGrantConfig record form code string
                if (paramString.includes("RefreshTokenGrantConfig")) {
                    paramString = paramString.replace("{RefreshTokenGrantConfig: ", "").replace("}", "");
                }
            } else if (formField.typeName === PrimitiveBalType.Union && formField.value) {
                paramString += formField.value;
            } else if (formField.typeName === PrimitiveBalType.Nil) {
                paramString += "()";
            } else if (formField.typeName === PrimitiveBalType.Xml && formField.value) {
                const xmlRegex = /^xml\ `(.*)`$/g;
                if (xmlRegex.test(formField.value)) {
                    paramString = formField.value;
                } else {
                    paramString += formField.value;
                }
            } else if (formField.typeName === "inclusion" && formField.inclusionType) {
                const params = getParams([formField.inclusionType], depth + 1);
                paramString += params;
            } else if (formField.typeName === "handle" && formField.value) {
                paramString += formField.value;
            } else if (paramString === "" && formField.typeName !== "" && formField.value) {
                paramString += formField.value; // Default case
            }

            if (paramString !== "") {
                paramStrings.push(paramString);
            }
        }
    });

    return paramStrings;
}

