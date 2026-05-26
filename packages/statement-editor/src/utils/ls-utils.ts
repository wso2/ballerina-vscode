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
import {
    Completion,
    CompletionParams,
    DiagnosticData,
    PartialSTParams,
    SymbolInfo
} from "@wso2/ballerina-core";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";
import {
    NodePosition,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";
import { CodeAction, Diagnostic, WorkspaceEdit } from "vscode-languageserver-types";
import { URI } from "vscode-uri";

import {
    acceptedCompletionKindForExpressions,
    acceptedCompletionKindForTypes,
    PROPERTY_COMPLETION_KIND
} from "../constants";
import { CurrentModel, SuggestionItem } from '../models/definitions';

import { getSymbolPosition, sortSuggestions } from "./index";
import { ModelType, StatementEditorViewState } from "./statement-editor-viewstate";

export async function getPartialSTForStatement(
    partialSTRequest: PartialSTParams,
    langServerRpcClient: LangClientRpcClient
): Promise<STNode> {
    const resp = await langServerRpcClient.getSTForSingleStatement(partialSTRequest);
    return resp.syntaxTree;
}

export async function getPartialSTForModuleMembers(
    partialSTRequest: PartialSTParams,
    langServerRpcClient: LangClientRpcClient, isResource?: boolean
): Promise<STNode> {
    const resp = isResource ? await langServerRpcClient.getSTForResource(partialSTRequest) :
        await langServerRpcClient.getSTForModuleMembers(partialSTRequest);
    return resp.syntaxTree;
}

export async function getPartialSTForModulePart(
    partialSTRequest: PartialSTParams,
    langServerRpcClient: LangClientRpcClient
): Promise<STNode> {
    const resp = await langServerRpcClient.getSTForModulePart(partialSTRequest);
    return resp.syntaxTree;
}

export async function getPartialSTForExpression(
    partialSTRequest: PartialSTParams,
    langServerRpcClient: LangClientRpcClient
): Promise<STNode> {
    const resp = await langServerRpcClient.getSTForExpression(partialSTRequest);
    return resp.syntaxTree;
}

export async function getRenameEdits(
    fileURI: string,
    newName: string,
    position: NodePosition,
    langServerRpcClient: LangClientRpcClient
): Promise<WorkspaceEdit> {
    const renameEdits = await langServerRpcClient.rename({
        textDocument: { uri: URI.file(fileURI).toString() },
        position: {
            line: position.startLine,
            character: position?.startColumn
        },
        newName
    });
    return renameEdits.workspaceEdit;
}

export async function getCompletions(
    docUri: string,
    targetPosition: NodePosition,
    completeModel: STNode,
    currentModel: CurrentModel,
    langServerRpcClient: LangClientRpcClient,
    userInput: string = ''
): Promise<SuggestionItem[]> {

    const isTypeDescriptor = (currentModel.model.viewState as StatementEditorViewState).modelType === ModelType.TYPE_DESCRIPTOR;
    const varName = STKindChecker.isLocalVarDecl(completeModel)
        && completeModel.typedBindingPattern.bindingPattern.source.trim();
    const currentModelPosition = currentModel.model.position;
    const currentModelSource = currentModel.model.source
        ? currentModel.model.source.trim()
        : currentModel.model.value.trim();
    const suggestions: SuggestionItem[] = [];

    const completionParams: CompletionParams = {
        textDocument: {
            uri: docUri
        },
        context: {
            triggerKind: 1
        },
        position: {
            character: targetPosition.startColumn + currentModelPosition.startColumn + userInput.length,
            line: targetPosition.startLine + currentModelPosition.startLine
        }
    }

    // CodeSnippet is split to get the suggestions for field-access-expr (expression.field-name)
    const inputElements = userInput.split('.');

    const completions: Completion[] = (await langServerRpcClient.getCompletion(completionParams)).completions;

    const filteredCompletionItems = completions.filter((completionResponse: Completion) => (
        (!completionResponse.kind ||
            (isTypeDescriptor ?
                acceptedCompletionKindForTypes.includes(completionResponse.kind) :
                acceptedCompletionKindForExpressions.includes(completionResponse.kind)
            )
        ) &&
        completionResponse.label !== varName &&
        !(completionResponse.label.includes("main")) &&
        (userInput ?
            inputElements.some(element => (
                completionResponse.label.toLowerCase()).includes(element.toLowerCase())
            ) :
            completionResponse.label !== currentModelSource
        )
    ));

    filteredCompletionItems.sort(sortSuggestions);

    filteredCompletionItems.map((completion) => {
        let updatedInsertText = completion.insertText;
        const isProperty = completion.kind === PROPERTY_COMPLETION_KIND;
        if (isProperty) {
            const regex = /\${\d+:?(""|0|0.0|false|\(\)|xml ``|{})?}/gm;
            let placeHolder;
            // tslint:disable-next-line:no-conditional-assignment
            while ((placeHolder = regex.exec(completion.insertText)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (placeHolder.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
                updatedInsertText = updatedInsertText.replace(placeHolder[0], placeHolder[1] || '');
            }
        }
        suggestions.push(
            {
                value: completion.label,
                kind: completion.detail,
                insertText: isProperty && updatedInsertText,
                completionKind: completion.kind
            }
        );
    });

    return suggestions;
}

export async function getCompletionsForType(
    docUri: string,
    langServerRpcClient: LangClientRpcClient,
    completionKinds: number[] = []
): Promise<SuggestionItem[]> {

    const suggestions: SuggestionItem[] = [];

    const completionParams: CompletionParams = {
        textDocument: {
            uri: docUri
        },
        context: {
            triggerKind: 22
        },
        position: {
            character: 0,
            line: 0
        }
    }

    // CodeSnippet is split to get the suggestions for field-access-expr (expression.field-name)
    const completions: Completion[] = (await langServerRpcClient.getCompletion(completionParams)).completions;

    completions
        .filter((completionResponse: Completion) => (
            (!completionResponse.kind || completionKinds.includes(completionResponse.kind) || !completionKinds || completionKinds.length <= 0)
        ))
        .sort(sortSuggestions)
        .forEach((completion) => {
            suggestions.push({
                value: completion.insertText,
                kind: completion.detail,
                suggestionType: completion.kind,
                label: completion.label,
                sortText: completion.sortText,
                insertTextFormat: completion.insertTextFormat,
                detail: completion.detail,
                insertText: completion.insertText
            });
        });

    // filteredCompletionItems.sort(sortSuggestions);

    // filteredCompletionItems
    return suggestions;
}

export async function sendDidOpen(
    docUri: string,
    content: string,
    langServerRpcClient: LangClientRpcClient
) {
    langServerRpcClient.didOpen({
        textDocument: {
            uri: docUri,
            languageId: "ballerina",
            text: content,
            version: 1
        }
    });
}

export async function sendDidClose(
    docUri: string,
    langServerRpcClient: LangClientRpcClient
) {
    langServerRpcClient.didClose({
        textDocument: {
            uri: docUri
        }
    });
}

export async function sendDidChange(
    docUri: string,
    content: string,
    langServerRpcClient: LangClientRpcClient
) {
    langServerRpcClient.didChange({
        contentChanges: [
            {
                text: content
            }
        ],
        textDocument: {
            uri: docUri,
            version: 1
        }
    });
}

export async function getDiagnostics(
    docUri: string,
    langServerRpcClient: LangClientRpcClient
): Promise<DiagnosticData[]> {
    const diagnostics = await langServerRpcClient.getDiagnostics({
        documentIdentifier: {
            uri: docUri,
        }
    });

    return diagnostics.diagnostics;
}

export async function getCodeAction(
    filePath: string,
    diagnostic: Diagnostic,
    langServerRpcClient: LangClientRpcClient
): Promise<CodeAction[]> {
    const codeAction = await langServerRpcClient.codeAction({
        context: {
            diagnostics: [
                {
                    code: diagnostic.code,
                    message: diagnostic.message,
                    range: {
                        end: {
                            line: diagnostic.range.end.line,
                            character: diagnostic.range.end.character,
                        },
                        start: {
                            line: diagnostic.range.start.line,
                            character: diagnostic.range.start.character,
                        },
                    },
                    severity: 1,
                },
            ],
            only: [ "quickfix" ],
        },
        range: {
            end: {
                line: diagnostic.range.end.line,
                character: diagnostic.range.end.character,
            },
            start: {
                line: diagnostic.range.start.line,
                character: diagnostic.range.start.character,
            },
        },
        textDocument: {
            uri: filePath,
        },
    });

    return codeAction.codeActions;
}

export async function getSymbolDocumentation(
    docUri: string,
    targetPosition: NodePosition,
    currentModel: STNode,
    langServerRpcClient: LangClientRpcClient,
    userInput: string = ''
): Promise<SymbolInfo> {
    const symbolPos = getSymbolPosition(targetPosition, currentModel, userInput);
    const symbolDoc = await langServerRpcClient.getSymbolDocumentation({
        textDocumentIdentifier: {
            uri: docUri
        },
        position: {
            line: symbolPos.line,
            character: symbolPos.offset
        }
    });
    return symbolDoc;
}


export async function updateFileContent(
    fileUri: string,
    content: string,
    langServerRpcClient: LangClientRpcClient,
    skipForceSave?: boolean,
): Promise<boolean> {
    const response = await langServerRpcClient.updateFileContent({
        filePath: fileUri,
        content,
        skipForceSave
    });
    return response.status;
}

export const handleDiagnostics = async (
    fileURI: string,
    langServerRpcClient: LangClientRpcClient
):
    Promise<Diagnostic[]> => {
    const diagResp = await getDiagnostics(fileURI, langServerRpcClient);
    const diag = diagResp[0]?.diagnostics ? diagResp[0].diagnostics : [];
    return diag;
}
