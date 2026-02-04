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

import { startCase } from "lodash";
import { FormField } from "../Form/types";
import { ExpressionProperty } from "@wso2/ballerina-core";
import { InputMode } from "../..";
import { EditorMode } from "./ExpandedEditor";
import { EXPANDABLE_MODES } from "./ExpandedEditor/modes/types";

export function isDropdownField(field: FormField) {
    return field.type === "MULTIPLE_SELECT" || field.type === "SINGLE_SELECT" || field.type?.toUpperCase() === "ENUM";
}

export function getValueForDropdown(field: FormField, multiSelectIndex: number = 0) {
    if (field.type === "MULTIPLE_SELECT") {
        // For multiple select, check if field.value is an array with values
        if (Array.isArray(field.value) && field.value.length > 0 && field.value[multiSelectIndex]) {
            return field.value[multiSelectIndex];
        }
        // Return first item as default if available
        return field.items && field.items.length > 0 ? field.items[0] : undefined;
    }
    // For single select, return the value if it exists and is not empty, otherwise return first item
    if (field.value && field.value !== "") {
        return field.value;
    }
    return field.items && field.items.length > 0 ? field.items[0] : undefined;
}

export function getValueFromArrayField(field: FormField, valueIndex: number = 0) {
    if (field.type !== "EXPRESSION_SET" && field.type !== "TEXT_SET") {
        return undefined;
    }
    return Array.isArray(field.value) && field.value.length > 0 ? field.value[valueIndex] : field.items?.[0];
}

export function capitalize(str: string) {
    if (!str) {
        return '';
    }
    return startCase(str);
}

export function sanitizeType(type: string) {
    if (type.includes('{') || type.includes('}') || (type.match(/:/g) || []).length > 1) {
        return type;
    }
    return type.includes(':') ? type.split(':').pop() : type;
}

export function getPropertyFromFormField(field: FormField): ExpressionProperty {
    return {
        metadata: field.metadata,
        value: field.value as string,
        optional: field.optional,
        editable: field.editable,
        advanced: field.advanced,
        placeholder: field.placeholder,
        types: field.types,
        codedata: field.codedata,
        imports: field.imports,
        diagnostics: {
            hasDiagnostics: field.diagnostics?.length > 0 ? true : false,
            diagnostics: field.diagnostics
        }
    }
}

export const getFieldKeyForAdvanceProp = (fieldKey: string, advancePropKey: string) => {
    // Get the parent key for the advance prop
    let parentKeyForAdvanceProp = advancePropKey;
    const splitedAdvanceProp = advancePropKey.split('.advanceProperties.');
    if (splitedAdvanceProp.length > 1) {
        parentKeyForAdvanceProp = splitedAdvanceProp.slice(0, -1).join('.advanceProperties.');
    }
    
    if (parentKeyForAdvanceProp === fieldKey) {
        return advancePropKey;
    }

    return `${fieldKey}.advanceProperties.${advancePropKey}`;
}


export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
};

export const getValueForTextModeEditor = (value: string | any[] | Record<string, unknown>) => {
    if (isRecord(value)) return null;
    if (Array.isArray(value)) return value.at(0);
    if (value) {
        // Only remove starting and ending double quotes, preserve quotes within the string
        if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
            return value.slice(1, -1);
        }
        return value;
    }
    return value;
}

export function isExpandableMode(mode: InputMode): mode is EditorMode {
    return EXPANDABLE_MODES.includes(mode as EditorMode);
}

export function toEditorMode(mode: InputMode): EditorMode | undefined {
    return isExpandableMode(mode) ? mode : undefined;
}
