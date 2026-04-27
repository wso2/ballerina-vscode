/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

const TOML_STRING_PATTERN = /^"([^"\\\n\r]|\\(["\\bfnrt]|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}))*"$/;
const TOML_INTEGER_PATTERN = /^[+-]?(0|[1-9][0-9_]*|0x[0-9a-fA-F_]+|0o[0-7_]+|0b[01_]+)$/;
const TOML_FLOAT_PATTERN = /^[+-]?((\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d[\d_]*)?)|inf|nan)$/;
const TOML_BOOLEAN_PATTERN = /^(true|false)$/;

const getValidationTypeName = (type: string) => type.replace(/\?$/, '').trim();

export const getTomlPlaceholder = (type: string, defaultValue?: unknown): string => {
    if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
        return `Default: ${String(defaultValue)}`;
    }

    const trimmedType = getValidationTypeName(type);

    if (trimmedType.includes('|')) {
        return `Enter a valid value for ${type}`;
    }

    if (trimmedType.endsWith('[]') || trimmedType === 'array') {
        return 'Enter an array, e.g. [value1, value2]';
    }

    switch (trimmedType) {
        case 'string':
            return 'Enter text';
        case 'int':
            return 'Enter an integer';
        case 'byte':
            return 'Enter a byte value (0-255)';
        case 'float':
        case 'decimal':
            return 'Enter a number';
        case 'boolean':
            return 'Enter true or false';
        default:
            return type ? `Enter ${type}` : 'Enter a value';
    }
};

const getTomlIntegerValue = (value: string) => {
    const normalizedValue = value.replace(/_/g, '').replace(/^\+/, '');
    return Number(normalizedValue);
};

const splitTopLevelValues = (value: string) => {
    const values: string[] = [];
    let current = '';
    let depth = 0;
    let quote: string | null = null;
    let isEscaped = false;

    for (const char of value) {
        if (quote) {
            current += char;
            if (isEscaped) {
                isEscaped = false;
            } else if (char === '\\') {
                isEscaped = true;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            current += char;
            continue;
        }

        if (char === '[' || char === '{') {
            depth++;
        } else if (char === ']' || char === '}') {
            depth--;
        }

        if (char === ',' && depth === 0) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        values.push(current.trim());
    }

    return values;
};

export const validateTomlValue = (value: string, type: string): string => {
    const trimmedValue = value.trim();
    const trimmedType = getValidationTypeName(type);

    if (!trimmedValue) {
        return '';
    }

    if (trimmedType.includes('|')) {
        const unionTypes = trimmedType.split('|').map(getValidationTypeName);
        return unionTypes.some(unionType => validateTomlValue(trimmedValue, unionType) === '')
            ? ''
            : `Enter a valid value for ${type}.`;
    }

    if (trimmedType.endsWith('[]')) {
        if (!trimmedValue.startsWith('[') || !trimmedValue.endsWith(']')) {
            return `Enter a array for ${type}.`;
        }

        const elementType = trimmedType.slice(0, -2);
        const arrayContent = trimmedValue.slice(1, -1).trim();
        if (!arrayContent) {
            return '';
        }

        const hasInvalidElement = splitTopLevelValues(arrayContent)
            .some(item => validateTomlValue(item, elementType) !== '');
        return hasInvalidElement ? `Enter valid ${elementType} values in the array.` : '';
    }

    switch (trimmedType) {
        case 'string':
            return TOML_STRING_PATTERN.test(trimmedValue)
                ? ''
                : 'Enter a valid string value.';
        case 'int':
        case 'byte':
            if (!TOML_INTEGER_PATTERN.test(trimmedValue)) {
                return `Enter a valid integer value for ${trimmedType}.`;
            }
            if (trimmedType === 'byte') {
                const byteValue = getTomlIntegerValue(trimmedValue);
                if (!Number.isInteger(byteValue) || byteValue < 0 || byteValue > 255) {
                    return 'Enter a byte value between 0 and 255.';
                }
            }
            return '';
        case 'float':
        case 'decimal':
            return TOML_FLOAT_PATTERN.test(trimmedValue)
                ? ''
                : `Enter a valid number value for ${trimmedType}.`;
        case 'boolean':
            return TOML_BOOLEAN_PATTERN.test(trimmedValue)
                ? ''
                : 'Enter true or false.';
        default:
            return '';
    }
};
