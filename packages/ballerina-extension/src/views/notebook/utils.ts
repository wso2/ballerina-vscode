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

import { CompletionItemKind as MonacoCompletionItemKind } from "monaco-languageclient";
import { CompletionItemKind as VSCodeCompletionItemKind, Uri, workspace } from "vscode";
import { TextEncoder } from "util";
import { isInDefinedVariables } from "./notebookController";

export interface CompletionResponse {
    detail: string;
    insertText: string;
    insertTextFormat: number;
    kind: number;
    label: string;
    documentation?: string;
    sortText?: string;
}

const QUOTE = "'";

function getPlainTextSnippet(snippet: string) {
    return snippet.replace(/\${\d+(:\S+)*}/g, "");
}

function getReplacedInsertedText(text: string) {
    return text.replace(/\\\\/g, "\\");
}

function isVariableWithQuote(completionResponse: CompletionResponse) {
    const insertText = getReplacedInsertedText(completionResponse.insertText);
    return (
        completionResponse.kind === 6 &&
        insertText.startsWith(QUOTE) &&
        !isInDefinedVariables(insertText)
    );
}

export function getInsertText(completionResponse: CompletionResponse) {
    const insertText = getReplacedInsertedText(completionResponse.insertText);
    if (isVariableWithQuote(completionResponse)) {
        return getPlainTextSnippet(insertText.substring(1));
    }
    return getPlainTextSnippet(insertText);
}

export function getLabel(completionResponse: CompletionResponse) {
    if (isVariableWithQuote(completionResponse)) {
        return completionResponse.label.substring(1);
    }
    return completionResponse.label;
}

export function translateCompletionItemKind(kind: MonacoCompletionItemKind) {
    return (kind - 1) as VSCodeCompletionItemKind;
}

export function filterCompletions(completions: CompletionResponse[]): CompletionResponse[] {
    const labelsUsedInShell = [
        "__last__",
        "__java_recall(handle context_id, handle name)",
        "__memorize(string name, any|error value)",
        "main()",
        "init()",
        "__run()",
        "__recall_any_error(string name)",
        "__recall_any(string name)",
        "__java_memorize(handle context_id, handle name, any|error value)",
        "__stmts()",
    ];
    return completions.filter(
        (item) => !labelsUsedInShell.includes(item.label)
    );
}

export async function createFile(uri: Uri, content?: string) {
    await workspace.fs.writeFile(uri, new TextEncoder().encode(content));
}

export function getSmallerMax(array: number[], goal: number) {
    return array.sort((a, b) => a - b).reverse().find(value => value <= goal);
}
