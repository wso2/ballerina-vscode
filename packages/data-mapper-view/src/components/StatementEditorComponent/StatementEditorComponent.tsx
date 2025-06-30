// tslint:disable: no-implicit-dependencies
import React from "react";

import { STModification } from "@wso2/ballerina-core";
import { LangClientRpcClient, LibraryBrowserRpcClient } from "@wso2/ballerina-rpc-client";
import { StatementEditorWrapper } from "@wso2/ballerina-statement-editor";

import { ExpressionInfo } from "../DataMapper/DataMapper";


export interface StatementEditorComponentProps {
    expressionInfo: ExpressionInfo,
    langServerRpcClient: LangClientRpcClient;
    libraryBrowserRpcClient: LibraryBrowserRpcClient;
    currentFile?: {
        content: string,
        path: string,
        size: number
    };
    applyModifications: (modifications: STModification[]) => void;
    onCancel: () => void;
    onClose: () => void;
    importStatements: string[];
    currentReferences?: string[];
}
function StatementEditorC(props: StatementEditorComponentProps) {
    const {
        expressionInfo,
        langServerRpcClient,
        libraryBrowserRpcClient,
        currentFile,
        applyModifications,
        onCancel,
        onClose,
        importStatements,
        currentReferences
    } = props;

    const stmtEditorComponent = StatementEditorWrapper(
        {
            formArgs: { formArgs: {
                targetPosition: expressionInfo.valuePosition
                } },
            config: {
                type: "Custom",
                model: null
            },
            onWizardClose: onClose,
            syntaxTree: null,
            stSymbolInfo: null,
            langServerRpcClient: langServerRpcClient,
            libraryBrowserRpcClient: libraryBrowserRpcClient,
            label: expressionInfo.label,
            initialSource:  expressionInfo.value,
            applyModifications,
            currentFile: {
                ...currentFile,
                content: currentFile.content,
                originalContent: currentFile.content
            },
            onCancel,
            isExpressionMode: true,
            importStatements,
            currentReferences
        }
    );

    return  stmtEditorComponent;
}

export const StatementEditorComponent = React.memo(StatementEditorC);
