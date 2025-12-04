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

import { ChipExpressionEditorDefaultConfiguration } from "./ChipExpressionEditor/ChipExpressionDefaultConfig";
import { TokenType } from "./ChipExpressionEditor/types";
import { ParsedToken } from "./ChipExpressionEditor/utils";
import { InputMode } from "./ChipExpressionEditor/types";

export class StringTemplateEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    getHelperValue(value: string, token?: ParsedToken): string {
        if (token?.type === TokenType.FUNCTION) return value;
        return `\$\{${value}\}`;
    }
    getSerializationPrefix() {
        return "string `";
    }
    getSerializationSuffix() {
        return "`";
    }
    getAdornment(): ({ onClick }: { onClick?: () => void; }) => JSX.Element {
        return () => null;
    }
    serializeValue(value: string): string {
        const suffix = this.getSerializationSuffix();
        const prefix = this.getSerializationPrefix();
        if (value.trim().startsWith(prefix) && value.trim().endsWith(suffix)) {
            return value.trim().slice(prefix.length, value.trim().length - suffix.length);
        }
        return value;
    }
    deserializeValue(value: string): string {
        const suffix = this.getSerializationSuffix();
        const prefix = this.getSerializationPrefix();
        if (value.trim().startsWith(prefix) && value.trim().endsWith(suffix)) {
            return value;
        }
        return `${prefix}${value}${suffix}`;
    }
}

export class RawTemplateEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    getHelperValue(value: string, token?: ParsedToken): string {
        if (token?.type === TokenType.FUNCTION) return value;
        return `\$\{${value}\}`;
    }
    getSerializationPrefix() {
        return "`";
    }
    getSerializationSuffix() {
        return "`";
    }
    getAdornment(): ({ onClick }: { onClick?: () => void; }) => JSX.Element {
        return () => null;
    }
    serializeValue(value: string): string {
        const suffix = this.getSerializationSuffix();
        const prefix = this.getSerializationPrefix();
        if (value.trim().startsWith(prefix) && value.trim().endsWith(suffix)) {
            return value.trim().slice(prefix.length, value.trim().length - suffix.length);
        }
        return value;
    }
    deserializeValue(value: string): string {
        const suffix = this.getSerializationSuffix();
        const prefix = this.getSerializationPrefix();
        if (value.trim().startsWith(prefix) && value.trim().endsWith(suffix)) {
            return value;
        }
        return `${prefix}${value}${suffix}`;
    }
}

export class ChipExpressionEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    getHelperValue(value: string, token?: ParsedToken): string {
        if (token?.type === TokenType.FUNCTION) return value;
        return `\$\{${value}\}`;
    }
}

export class PrimaryModeChipExpressionEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    private readonly primaryMode: InputMode;

    constructor(primaryMode: InputMode) {
        super();
        this.primaryMode = primaryMode;
    }

    getHelperValue(value: string, token?: ParsedToken): string {
        const isTextOrTemplateMode = this.primaryMode === InputMode.TEXT || this.primaryMode === InputMode.TEMPLATE;
        if (isTextOrTemplateMode && (!token || token.type !== TokenType.FUNCTION)) {
            return `\$\{${value}\}`;
        }
        return value;
    }
}
