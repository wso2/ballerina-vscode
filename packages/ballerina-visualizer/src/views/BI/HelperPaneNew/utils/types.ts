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

import { CompletionItem } from "@wso2/ui-toolkit";

export const DEFAULT_VALUE_MAP: Record<string, string> = {
    "struct": "{}",
    "array": "[]",
    "map": "{}",
    "int": "0",
    "float": "0.0",
    "boolean": "false",
    "any": "null",
    "decimal": "0.0",
    "byte": "0"
}

export const getDefaultValue = (type: string) => {
    //TODO: handle this using API
    return DEFAULT_VALUE_MAP[type] || "";
}

export const isPrimitiveType = (typeDetail: string): boolean => {
    if (!typeDetail) return true;

    const cleanType = typeDetail.trim().toLowerCase();

    const primitiveTypes = [
        'string',
        'int',
        'boolean',
        'float',
        'decimal',
        'byte',
        'json',
        'xml',
        'any',
        'anydata',
        'never',
        'nil',
        '()',
        'error'
    ];

    // Check if it's a direct primitive type
    if (primitiveTypes.includes(cleanType)) {
        return true;
    }

    // Check if it's an array of primitive types (e.g., "string[]", "int[]")
    const arrayMatch = cleanType.match(/^(\w+)\[\]$/);
    if (arrayMatch) {
        const baseType = arrayMatch[1];
        return primitiveTypes.includes(baseType);
    }

    // Check if it's a map of primitive types (e.g., "map<string>", "map<int>")
    const mapMatch = cleanType.match(/^map<(\w+)>$/);
    if (mapMatch) {
        const valueType = mapMatch[1];
        return primitiveTypes.includes(valueType);
    }

    // Check if it's a union of primitive types (e.g., "string|int", "int?")
    if (cleanType.includes('|') || cleanType.endsWith('?')) {
        const unionTypes = cleanType.replace('?', '|nil').split('|');
        return unionTypes.every(type => primitiveTypes.includes(type.trim()));
    }

    return false;
};

// Determines if a completion item should show the navigation arrow
export const shouldShowNavigationArrow = (item: CompletionItem): boolean => {
    const typeDetail = item?.labelDetails?.detail || item?.description;
    return !isPrimitiveType(typeDetail) || item?.labelDetails?.description === "Record";
};

// Determines if a type is an array of non-primitive (object) types
export const isArrayOfObjectsType = (typeDetail: string): boolean => {
    if (!typeDetail) return false;
    const normalized = typeDetail.trim().replace(/\?$/, '');
    const baseType = normalized.split('&')[0].trim();
    if (!baseType.endsWith('[]')) return false;
    const elementType = baseType.slice(0, -2);
    return !isPrimitiveType(elementType);
};
