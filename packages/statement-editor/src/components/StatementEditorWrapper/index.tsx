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
import React, { useEffect, useState } from 'react';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    CommandResponse,
    KeyboardNavigationManager,
    STModification,
    STSymbolInfo
} from "@wso2/ballerina-core";
import { LangClientRpcClient, LibraryBrowserRpcClient } from "@wso2/ballerina-rpc-client";
import { NodePosition, STNode } from "@wso2/syntax-tree";
import { SidePanel } from '@wso2/ui-toolkit';
import { URI } from "vscode-uri";

import { CUSTOM_CONFIG_TYPE } from "../../constants";
import { EditorModel } from "../../models/definitions";
import { getPartialSTForExpression, getPartialSTForModuleMembers, getPartialSTForStatement } from "../../utils/ls-utils";
import { StmtEditorUndoRedoManager } from "../../utils/undo-redo";
import { StatementEditor } from "../StatementEditor";
import { useStatementEditorStyles } from '../styles';

export interface LowCodeEditorProps {
    langServerRpcClient: LangClientRpcClient;
    libraryBrowserRpcClient: LibraryBrowserRpcClient;
    applyModifications: (modifications: STModification[]) => void;
    currentFile: {
        content: string,
        path: string,
        size: number,
        originalContent?: string
    };
    formArgs: any;
    config: {
        type: string;
        model?: STNode;
    };
    onWizardClose: (typeName?: string) => void;
    onCancel: () => void;
    syntaxTree: STNode;
    stSymbolInfo: STSymbolInfo;
    importStatements?: string[];
    experimentalEnabled?: boolean;
    isConfigurableStmt?: boolean;
    isModuleVar?: boolean;
    runBackgroundTerminalCommand?: (command: string) => Promise<CommandResponse>;
    isExpressionMode?: boolean;
    mappingCounstructor?: string;
    modelTargetSource?: NodePosition;
    ballerinaVersion?: string;
    isCodeServerInstance?: boolean;
    openExternalUrl?: (url: string) => void;
}

export interface StatementEditorWrapperProps extends LowCodeEditorProps {
    label: string;
    initialSource: string;
    extraModules?: Set<string>;
    isHeaderHidden?: boolean;
    skipSemicolon?: boolean;
    currentReferences?: string[];
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 1000,
            cacheTime: 1000,
        },
    },
});

export function StatementEditorWrapper(props: StatementEditorWrapperProps) {
    const overlayClasses = useStatementEditorStyles();
    const {
        label,
        initialSource,
        formArgs,
        config,
        onCancel,
        onWizardClose,
        langServerRpcClient,
        libraryBrowserRpcClient,
        applyModifications,
        currentFile,
        syntaxTree,
        stSymbolInfo,
        importStatements,
        experimentalEnabled,
        isConfigurableStmt,
        isModuleVar,
        extraModules,
        runBackgroundTerminalCommand,
        isExpressionMode,
        skipSemicolon,
        ballerinaVersion,
        isCodeServerInstance,
        openExternalUrl,
        isHeaderHidden,
        currentReferences
    } = props;

    const {
        formArgs: {
            targetPosition: targetPosition
        }
    } = formArgs;

    const [editors, setEditors] = useState<EditorModel[]>([]);
    const [editor, setEditor] = useState<EditorModel>();
    const [activeEditorId, setActiveEditorId] = useState<number>(0);
    const [fullSource, setFullSource] = useState("");

    useEffect(() => {
        (async () => {
            let model = null;
            let hasIncorrectSyntax = false;
            if (initialSource) {
                const partialST =
                    isConfigurableStmt || isModuleVar
                        ? await getPartialSTForModuleMembers({ codeSnippet: initialSource.trim() }, langServerRpcClient)
                        : (isExpressionMode ? await getPartialSTForExpression({ codeSnippet: initialSource.trim() }, langServerRpcClient)
                            : await getPartialSTForStatement({ codeSnippet: initialSource.trim() }, langServerRpcClient));

                if (!partialST.syntaxDiagnostics.length || config.type === CUSTOM_CONFIG_TYPE) {
                    model = partialST;
                } else {
                    hasIncorrectSyntax = true
                }
            }
            const newEditor: EditorModel = {
                label,
                model,
                source: initialSource,
                position: targetPosition,
                isConfigurableStmt,
                isModuleVar,
                undoRedoManager: new StmtEditorUndoRedoManager(),
                hasIncorrectSyntax
            };

            const fullST = await langServerRpcClient.getST({
                documentIdentifier: { uri: URI.file(currentFile.path).toString() }
            });
            setFullSource(fullST.syntaxTree.source);

            setEditors((prevEditors: EditorModel[]) => {
                return [...prevEditors, newEditor];
            });
        })();
    }, [targetPosition.startLine]);

    useEffect(() => {
        if (!!editors.length) {
            const lastEditorIndex = editors.length - 1;
            switchEditor(lastEditorIndex);
        }
    }, [editors]);

    const switchEditor = (index: number) => {
        const switchedEditor = editors[index];
        setEditor({
            ...switchedEditor
        });
        setActiveEditorId(index);
    };

    const updateEditor = (index: number, newContent: EditorModel) => {
        setEditors((prevEditors: EditorModel[]) => {
            prevEditors[index] = newContent;
            return prevEditors;
        });
    };

    const dropLastEditor = (offset: number = 0) => {
        setEditors((prevEditors: EditorModel[]) => {
            const remainingEditors = prevEditors.slice(0, -1);
            remainingEditors.map((e: EditorModel) => {
                e.position = {
                    ...e.position,
                    startLine: e.position.startLine + ((e.isExistingStmt || !e.isConfigurableStmt) && offset),
                    endLine: e.position.endLine + ((e.isExistingStmt || !e.isConfigurableStmt) && offset)
                };
            });
            return remainingEditors;
        });
    };

    const addConfigurable = async (newLabel: string, newPosition: NodePosition, newSource: string, isExistingStmt: boolean = false) => {
        const partialST = await getPartialSTForModuleMembers(
            { codeSnippet: newSource.trim() }, langServerRpcClient);

        const newEditor: EditorModel = {
            label: newLabel,
            model: !partialST.syntaxDiagnostics.length ? partialST : null,
            source: newSource,
            position: newPosition,
            undoRedoManager: new StmtEditorUndoRedoManager(),
            isConfigurableStmt: true,
            isExistingStmt
        };
        setEditors((prevEditors: EditorModel[]) => {
            return [...prevEditors, newEditor];
        });
    };

    React.useEffect(() => {
        const client = KeyboardNavigationManager.getClient();
        return () => {
            client.resetMouseTrapInstance();
        }
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <SidePanel
                isOpen={true}
                alignment="right"
                sx={{ transition: "all 0.3s ease-in-out", width: 600, zIndex: 3000 }}
                data-testid="property-form"
            >
                {!editor && (
                    <div className={overlayClasses.mainStatementWrapper} data-testid="statement-editor-loader">
                        <div className={overlayClasses.loadingWrapper}>Loading statement editor...</div>
                    </div>
                )}
                {editor && (
                    <>
                        <StatementEditor
                            editor={editor}
                            editorManager={{
                                switchEditor,
                                updateEditor,
                                dropLastEditor,
                                addConfigurable,
                                activeEditorId,
                                editors
                            }}
                            onWizardClose={onWizardClose}
                            onCancel={onCancel}
                            config={config}
                            formArgs={formArgs}
                            langServerRpcClient={langServerRpcClient}
                            libraryBrowserRpcClient={libraryBrowserRpcClient}
                            applyModifications={applyModifications}
                            currentFile={
                                {
                                    ...currentFile,
                                    content: fullSource,
                                    originalContent: fullSource
                                }
                            }
                            importStatements={importStatements}
                            syntaxTree={syntaxTree}
                            stSymbolInfo={stSymbolInfo}
                            extraModules={extraModules}
                            experimentalEnabled={experimentalEnabled}
                            runBackgroundTerminalCommand={runBackgroundTerminalCommand}
                            isExpressionMode={isExpressionMode}
                            skipSemicolon={skipSemicolon}
                            ballerinaVersion={ballerinaVersion}
                            isCodeServerInstance={isCodeServerInstance}
                            openExternalUrl={openExternalUrl}
                            isHeaderHidden={isHeaderHidden}
                            currentReferences={currentReferences}
                        />
                    </>
                )}
            </SidePanel>
        </QueryClientProvider>
    )
}
