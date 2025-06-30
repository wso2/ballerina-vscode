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
// tslint:disable: jsx-no-multiline-js
import React, { useContext } from "react";

import { NodePosition } from "@wso2/syntax-tree";

import { createPropertyStatement } from "../utils";

import { CreateRecord } from "../CreateRecord";
import { UndoRedoManager } from "../components/UndoRedoManager";
import { StatementEditorWrapper } from "@wso2/ballerina-statement-editor";
import { Context } from "../Context";
import { FormContainer } from "../style";
import { RecordEditorCProps } from ".";

const undoRedoManager = new UndoRedoManager();

export function RecordEditorC(props: RecordEditorCProps) {
    const { model, isDataMapper, onCancel, showHeader, onUpdate } = props;

    const {
        props: {
            targetPosition,
            langServerRpcClient,
            libraryBrowserRpcClient,
            currentFile,
            importStatements,
            currentReferences,
        },
        api: { applyModifications, onCancelStatementEditor, onClose },
    } = useContext(Context);

    const createModelSave = (recordString: string, pos: NodePosition) => {
        undoRedoManager.updateContent(currentFile.path, currentFile.content);
        undoRedoManager.addModification(currentFile.content);
        applyModifications([createPropertyStatement(recordString, targetPosition, false)]);
        if (isDataMapper) {
            onCancel(recordString);
        }
    };

    const stmtEditorComponent = StatementEditorWrapper({
        formArgs: {
            formArgs: {
                targetPosition: model ? targetPosition : { startLine: targetPosition.startLine, startColumn: targetPosition.startColumn },
            },
        },
        config: {
            type: "Custom",
            model: null,
        },
        onWizardClose: onClose,
        syntaxTree: null,
        stSymbolInfo: null,
        langServerRpcClient: langServerRpcClient,
        libraryBrowserRpcClient: libraryBrowserRpcClient,
        label: 'Record',
        initialSource: model?.source,
        applyModifications,
        currentFile: {
            ...currentFile,
            content: currentFile.content,
            originalContent: currentFile.content,
        },
        onCancel: onCancelStatementEditor,
        isExpressionMode: true,
        importStatements,
        currentReferences,
    });

    return (
        <>
            {model ? (
                // Edit existing record
                <FormContainer>{stmtEditorComponent}</FormContainer>
            ) : (
                // Create new record
                <CreateRecord
                    onCancel={onCancel}
                    onSave={createModelSave}
                    isDataMapper={isDataMapper}
                    undoRedoManager={undoRedoManager}
                    showHeader={showHeader}
                    onUpdate={onUpdate}
                />
            )}
        </>
    );
}
