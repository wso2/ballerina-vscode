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

export function isDropdownField(field: FormField) {
    return field.type === "MULTIPLE_SELECT" || field.type === "SINGLE_SELECT" || field.type?.toUpperCase() === "ENUM";
}

export function getValueForDropdown(field: FormField, multiSelectIndex: number = 0) {
    if (field.type === "MULTIPLE_SELECT") {
        return field.value?.length > 0 ? field.value[multiSelectIndex] : field.items[0];
    }
    return field.value !== "" ? field.value : field.items[0];
}

export function getValueFromArrayField(field: FormField, valueIndex: number = 0) {
    if (field.type !== "EXPRESSION_SET") {
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
        valueType: field.valueType,
        value: field.value as string,
        optional: field.optional,
        editable: field.editable,
        advanced: field.advanced,
        placeholder: field.placeholder,
        valueTypeConstraint: field.valueTypeConstraint,
        codedata: field.codedata,
        imports: field.imports
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
