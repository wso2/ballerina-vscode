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
import { ThemeColors } from "@wso2/ui-toolkit/lib/styles/Theme";
import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { sql } from "@codemirror/lang-sql";
import { EditorState } from "@codemirror/state";


const customSqlHighlightStyle = HighlightStyle.define([
    {
        tag: tags.keyword,
        color: ThemeColors.PRIMARY
    },

    {
        tag: tags.comment,
        color: ThemeColors.ON_SURFACE_VARIANT,
        fontStyle: "italic"
    },

    {
        tag: tags.string,
        color: ThemeColors.ERROR
    },

    {
        tag: tags.number,
        color: ThemeColors.SECONDARY
    },
    {
        tag: tags.operator,
        color: ThemeColors.ON_SURFACE
    },
    {
        tag: tags.punctuation,
        color: ThemeColors.ON_SURFACE
    },
    {
        tag: tags.variableName,
        color: ThemeColors.ON_SURFACE
    }
]);

export class StringTemplateEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    getHelperValue(value: string, token?: ParsedToken): string {
        if (token?.type === TokenType.FUNCTION) return value;
        if (value === "\"TEXT_HERE\"") return "TEXT_HERE";
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
        if (value === '') {
            return value;
        }
        if (value.trim().startsWith(prefix) && value.trim().endsWith(suffix)) {
            return value;
        }
        return `${prefix}${value}${suffix}`;
    }

    getIsValueCompatible(expValue: string) {
        if (!expValue) return true;
        const suffix = this.getSerializationSuffix();
        const prefix = this.getSerializationPrefix();
        return (expValue.trim().startsWith(prefix) && expValue.trim().endsWith(suffix))
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
        if (value === '') {
            return value;
        }
        if (value.trim().startsWith(prefix) && value.trim().endsWith(suffix)) {
            return value;
        }
        return `${prefix}${value}${suffix}`;
    }
}

export class SQLExpressionEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    showHelperPane() {
        return true;
    }
    getHelperValue(value: string, token?: ParsedToken): string {
        if (token?.type === TokenType.FUNCTION) return value;
        return `\$\{${value}\}`;
    }
    getAdornment() {
        return () => null;
    }
    getSerializationPrefix(): string {
        return "`";
    }
    getSerializationSuffix(): string {
        return "`";
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
        if (value === '') {
            return value;
        }
        if (value.trim().startsWith(prefix) && value.trim().endsWith(suffix)) {
            return value;
        }
        return `${prefix}${value}${suffix}`;
    }
    getPlugins() {
        return [
            sql(),
            syntaxHighlighting(customSqlHighlightStyle)
        ];
    }
}

export class ChipExpressionEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    getHelperValue(value: string, token?: ParsedToken): string {
        if (token?.type === TokenType.FUNCTION) return value;
        return `\$\{${value}\}`;
    }
}

export class NumberExpressionEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    DECIMAL_INPUT_REGEX = /^\d*\.?\d*$/;

    showHelperPane() {
        return false;
    }
    getAdornment() {
        return () => null;
    }
    getPlugins() {
        const numericOnly = EditorState.changeFilter.of(tr => {
            if (!tr.docChanged) {
                return true;
            }

            const nextValue = tr.newDoc.toString();
            return this.DECIMAL_INPUT_REGEX.test(nextValue);
        });

        return [numericOnly];

    }

    getIsToggleHelperAvailable(): boolean {
        return false;
    }

    getIsValueCompatible(value: string): boolean {
        if (!value) return true;
        return this.DECIMAL_INPUT_REGEX.test(value);
    }
}

export class RecordConfigExpressionEditorConfig extends ChipExpressionEditorDefaultConfiguration {
    getIsToggleHelperAvailable(): boolean {
        return false;
    }
}
