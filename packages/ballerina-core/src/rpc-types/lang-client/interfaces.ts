/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { STNode } from "@wso2/syntax-tree";
import { DocumentIdentifier, Range } from "../../interfaces/common";
import { CodeAction, CodeActionContext, Diagnostic, LocationLink, Position, TextDocumentIdentifier, WorkspaceEdit, Location, TextDocumentItem } from "vscode-languageserver-types";
import { Completion } from "../../interfaces/extended-lang-client";
import { ExecutorPosition, ResolvedTypeForExpression, ResolvedTypeForSymbol } from "../../interfaces/ballerina";

export interface STRequest {
    documentIdentifier: {
        uri: string;
    };
}

export interface SyntaxTreeResponse {
    syntaxTree: STNode;
    parseSuccess?: boolean;
    source?: string;
    defFilePath?: string;
}

export interface STByRangeRequest {
    lineRange: Range;
    documentIdentifier: DocumentIdentifier;
}

export interface ProjectComponentsRequest {
    documentIdentifiers: DocumentIdentifier[];
}


export interface BallerinaVersionResponse {
    version: string;
}

export interface CompletionRequest {
    textDocument: {
        uri: string;
    };
    position: {
        character: number;
        line: number;
    };
    context: {
        triggerKind: number;
    };
}

export interface CompletionResponse {
    completions: Completion[];
}

export interface DiagnosticData {
    uri: string;
    diagnostics: Diagnostic[];
}

export interface DiagnosticsResponse {
    diagnostics: DiagnosticData[]
}

export interface CodeActionRequest extends WorkDoneProgressParams, PartialResultParams {
    textDocument: TextDocumentIdentifier;
    range: Range;
    context: CodeActionContext;
}

export interface CodeActionResponse {
    codeActions: CodeAction[];
}

export interface WorkDoneProgressParams {
    workDoneToken?: ProgressToken;
}

export interface PartialResultParams {
    partialResultToken?: ProgressToken;
}

export type ProgressToken = number | string;

export interface RenameRequest extends WorkDoneProgressParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
    newName: string;
}

export interface RenameResponse {
    workspaceEdit: WorkspaceEdit
}

export interface DefinitionPositionRequest {
    textDocument: TextDocumentIdentifier;
    position: Position;
}

export interface UpdateFileContentRequest {
    filePath: string;
    content: string;
    skipForceSave?: boolean;
}

export interface UpdateFileContentResponse {
    status: boolean;
}


export interface DefinitionResponse {
    location: Location | Location[] | LocationLink[] | null
}


export interface ExecutorPositionsRequest {
    documentIdentifier: DocumentIdentifier;
}

export interface DidOpenRequest {
    textDocument: TextDocumentItem;
}

export interface DidCloseRequest {
    textDocument: {
        uri: string;
    };
}

export interface DidChangeRequest {
    textDocument: {
        uri: string;
        version: number;
    };
    contentChanges: [
        {
            text: string;
        }
    ];
}

export interface TypesFromExpressionResponse {
    types: ResolvedTypeForExpression[];
}

export interface TypesFromSymbolResponse {
    types: ResolvedTypeForSymbol[];
}

export interface ExecutorPositionsResponse {
    executorPositions?: ExecutorPosition[];
}