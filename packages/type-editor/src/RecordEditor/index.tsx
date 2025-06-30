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
import React from "react";

import { RecordTypeDesc, STNode, TypeDefinition } from "@wso2/syntax-tree";

import { StatementEditorComponentProps } from "../types";
import { RecordCreatorRpcClient } from "@wso2/ballerina-rpc-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecordEditorWrapper } from "./RecordEditorWrapper";
import { IntlProvider } from "react-intl";
import messages from "../lang/en.json";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 1000
        },
    },
});

export interface RecordEditorCProps {
    model?: RecordTypeDesc | TypeDefinition;
    isDataMapper?: boolean;
    onCancel: (createdNewRecord?: string) => void;
    showHeader?: boolean;
    onUpdate?: (updated: boolean) => void;
}

export interface RecordEditorProps extends RecordEditorCProps, StatementEditorComponentProps {
    recordCreatorRpcClient: RecordCreatorRpcClient;
    fullST?: STNode;
}

export function RecordEditor(props: RecordEditorProps) {
    const {
        model,
        fullST,
        isDataMapper,
        onCancel,
        showHeader,
        targetPosition,
        langServerRpcClient,
        libraryBrowserRpcClient,
        recordCreatorRpcClient,
        currentFile,
        applyModifications,
        onCancelStatementEditor,
        onClose,
        importStatements,
        currentReferences,
        onUpdate
    } = props;

    return (
        <QueryClientProvider client={queryClient}>
            <IntlProvider locale="en" defaultLocale="en" messages={messages}>
                <RecordEditorWrapper
                    model={model}
                    fullST={fullST}
                    isDataMapper={isDataMapper}
                    onCancel={onCancel}
                    showHeader={showHeader}
                    targetPosition={targetPosition}
                    langServerRpcClient={langServerRpcClient}
                    libraryBrowserRpcClient={libraryBrowserRpcClient}
                    recordCreatorRpcClient={recordCreatorRpcClient}
                    currentFile={currentFile}
                    applyModifications={applyModifications}
                    onCancelStatementEditor={onCancelStatementEditor}
                    onClose={onClose}
                    importStatements={importStatements}
                    currentReferences={currentReferences}
                    onUpdate={onUpdate}
                />
            </IntlProvider>
        </QueryClientProvider>
    );
}
