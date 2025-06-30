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

import { ReactNode } from "react";
import { IconType } from "react-icons";

import { SymbolInfo } from "@wso2/ballerina-core";
import { NodePosition, STNode } from "@wso2/syntax-tree";
import { CodeAction, Diagnostic } from "vscode-languageserver-types";

import { StmtEditorUndoRedoManager } from "../utils/undo-redo";


export interface CurrentModel {
    model: STNode,
    stmtPosition?: NodePosition,
    isEntered?: boolean
}

export interface VariableUserInputs {
    selectedType: string
    otherType?: string
    varName?: string
    variableExpression?: string
    formField?: string
}

export interface LSSuggestions {
    directSuggestions: SuggestionItem[];
    secondLevelSuggestions?: SecondLevelSuggestions;
}

export interface SuggestionItem {
    value: string;
    label?: string,
    kind?: string;
    insertText?: string;
    completionKind?: number;
    suggestionType?: number;
    insertTextFormat?: number;
    prefix?: string;
    sortText?: string;
    detail?: string;
}

export interface SecondLevelSuggestions {
    selection: string;
    secondLevelSuggestions: SuggestionItem[];
}

export interface RemainingContent {
    code: string,
    position: NodePosition
}

export interface StatementSyntaxDiagnostics {
    message: string;
    isPlaceHolderDiag?: boolean;
    diagnostic?: Diagnostic;
    codeActions?: CodeAction[];
}

export interface StmtOffset {
    startLine: number;
    startColumn: number;
}

export interface MinutiaeJSX {
    leadingMinutiaeJSX: ReactNode[];
    trailingMinutiaeJSX: ReactNode[];
}

export interface EditorModel {
    label: string;
    model: STNode;
    source: string;
    position: NodePosition;
    undoRedoManager: StmtEditorUndoRedoManager;
    isConfigurableStmt?: boolean;
    isModuleVar?: boolean;
    isExistingStmt?: boolean;
    selectedNodePosition?: NodePosition;
    newConfigurableName?: string;
    hasIncorrectSyntax?: boolean;
}

export interface SymbolIcon {
    className: string;
    color: string;
}

// tslint:disable-next-line:no-empty-interface
export interface EmptySymbolInfo {}

export interface DocumentationInfo {
    modelPosition : NodePosition;
    documentation : SymbolInfo | EmptySymbolInfo
}

export interface Suggestion {
    selectedGroup?: number,
    selectedListItem: number
}

export interface SuggestionIcon {
    SuggestIcon : IconType,
    color: string
}

export interface StatementIndex {
    lineIndex: number;
    columnIndex: number;
}
