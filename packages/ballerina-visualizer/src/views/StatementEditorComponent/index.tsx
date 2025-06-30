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
import React from "react";

import { STModification } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { StatementEditorWrapper } from "@wso2/ballerina-statement-editor";
import { NodePosition, STNode } from "@wso2/syntax-tree";

export interface StatementEditorComponentProps {
    label: string;
    initialSource: string;
    currentFile?: {
        content: string,
        path: string,
        size: number
    };
    applyModifications: (modifications: STModification[]) => void;
    onCancel: () => void;
    onClose: () => void;
    syntaxTree: STNode;
    targetPosition: NodePosition;
    config: any;
    skipSemicolon?: boolean;
    extraModules?: Set<string>;
    formArgs?: any;
}
function StatementEditorC(props: StatementEditorComponentProps) {
    const { rpcClient } = useRpcContext();
    const langServerRpcClient = rpcClient.getLangClientRpcClient();
    const libraryBrowserRPCClient = rpcClient.getLibraryBrowserRPCClient();

    const {
        label,
        initialSource,
        syntaxTree,
        currentFile,
        applyModifications,
        onCancel,
        onClose,
        targetPosition,
        config,
        skipSemicolon,
        extraModules,
        formArgs
    } = props;


    const openExternalUrl = (url: string) => {
        rpcClient.getCommonRpcClient().openExternalUrl({ url: url});
    }

    const stmtEditorComponent = StatementEditorWrapper(
        {
            formArgs: {
                formArgs: {
                    targetPosition: targetPosition,
                    ...formArgs 
                }
            },
            config: config,
            onWizardClose: onClose,
            syntaxTree: syntaxTree,
            stSymbolInfo: null,
            langServerRpcClient: langServerRpcClient,
            libraryBrowserRpcClient: libraryBrowserRPCClient,
            label: label,
            initialSource: initialSource,
            applyModifications,
            currentFile: {
                ...currentFile,
                content: currentFile.content,
                originalContent: currentFile.content
            },
            onCancel,
            skipSemicolon: skipSemicolon ? skipSemicolon : false,
            extraModules: extraModules,
            openExternalUrl: openExternalUrl
        }
    );

    return stmtEditorComponent;
}

export const StatementEditorComponent = React.memo(StatementEditorC);
