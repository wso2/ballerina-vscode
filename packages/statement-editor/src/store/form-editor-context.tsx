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
// tslint:disable: no-empty jsx-no-multiline-js
import React from 'react';

import {
    STModification,
    STSymbolInfo
} from "@wso2/ballerina-core";
import { LangClientRpcClient } from '@wso2/ballerina-rpc-client';
import { NodePosition, STNode } from "@wso2/syntax-tree";
import { WorkspaceEdit } from "vscode-languageserver-protocol";

import { CurrentModel } from "../models/definitions";


export const FormEditorContext = React.createContext({
    model: null,
    type: "",
    isLastMember: false,
    isEdit: false,
    targetPosition: null,
    currentFile: {
        content: "",
        path: "",
        size: 0
    },
    syntaxTree: null,
    fullST: null,
    stSymbolInfo: null,
    onCancel: () => undefined,
    onSave: () => undefined,
    onChange: (code: string, partialST: STNode, moduleList?: Set<string>, currentModel?: CurrentModel,
               newValue?: string, completionKinds?: number[], offsetLineCount?: number,
               diagnosticOffSet?: NodePosition) => undefined,
    langServerRpcClient: null,
    applyModifications: (modifications: STModification[], filePath?: string) => undefined,
    changeInProgress: false,
    renameSymbol: (workspaceEdits: WorkspaceEdit) =>  undefined
});

export interface FormEditorProps {
    children?: React.ReactNode,
    model?: STNode;
    type?: string;
    targetPosition?: NodePosition;
    onCancel: () => void;
    onSave: () => void;
    isLastMember?: boolean;
    stSymbolInfo?: STSymbolInfo;
    syntaxTree?: STNode;
    fullST?: STNode;
    isEdit?: boolean;
    langServerRpcClient: LangClientRpcClient;
    onChange: (code: string, partialST: STNode, moduleList?: Set<string>, currentModel?: CurrentModel,
               newValue?: string, completionKinds?: number[], offsetLineCount?: number,
               diagnosticOffSet?: NodePosition) => void;
    currentFile: {
        content: string,
        path: string,
        size: number
    };
    applyModifications: (modifications: STModification[], filePath?: string) => void;
    changeInProgress: boolean;
    renameSymbol: (workspaceEdits: WorkspaceEdit) => Promise<boolean>;
}

export const FormEditorContextProvider = (props: FormEditorProps) => {
    const {
        children,
        model,
        type,
        isEdit,
        stSymbolInfo,
        isLastMember,
        syntaxTree,
        fullST,
        currentFile,
        targetPosition,
        applyModifications,
        onCancel,
        onSave,
        onChange,
        langServerRpcClient,
        changeInProgress,
        renameSymbol
    } = props;

    return (
        <FormEditorContext.Provider
            value={{
                model,
                type,
                isEdit,
                stSymbolInfo,
                isLastMember,
                syntaxTree,
                fullST,
                currentFile,
                targetPosition,
                applyModifications,
                onCancel,
                onSave,
                onChange,
                langServerRpcClient,
                changeInProgress,
                renameSymbol
            }}
        >
            {children}
        </FormEditorContext.Provider>
    );
}
