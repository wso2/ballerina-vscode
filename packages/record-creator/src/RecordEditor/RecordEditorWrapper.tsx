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
import React, { useMemo } from "react";
import { Context } from "../Context";
import { useBallerinaProjectComponent, useBallerinaVersion, useFullST } from "../Hooks";
import { RecordEditorC } from "./RecordEditorC";
import { RecordEditorProps } from ".";

export function RecordEditorWrapper(props: RecordEditorProps) {
    const {
        model,
        fullST: fullSyntaxTree,
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
        onUpdate,
    } = props;
    const { ballerinaVersion, isFetching: isFetchingBallerinaVersion } = useBallerinaVersion(langServerRpcClient);
    const { fullST, isFetching: isFetchingFullST } = useFullST(currentFile.path, langServerRpcClient);
    const { ballerinaProjectComponents, isFetching: isFetchingBallerinaProjectComponents } =
        useBallerinaProjectComponent(currentFile.path, langServerRpcClient);

    const contextValue = useMemo(() => {
        if (isFetchingBallerinaVersion || isFetchingFullST || isFetchingBallerinaProjectComponents) {
            return undefined;
        }

        return {
            props: {
                targetPosition,
                langServerRpcClient,
                libraryBrowserRpcClient,
                recordCreatorRpcClient,
                currentFile,
                importStatements,
                currentReferences,
                ballerinaVersion,
                fullST : fullSyntaxTree || fullST.syntaxTree,
                ballerinaProjectComponents,
            },
            api: {
                applyModifications,
                onCancelStatementEditor,
                onClose,
            },
        };
    }, [isFetchingBallerinaVersion, isFetchingFullST, isFetchingBallerinaProjectComponents, fullSyntaxTree]);

    return (
        <Context.Provider value={contextValue}>
            {contextValue && (
                <RecordEditorC
                    model={model}
                    isDataMapper={isDataMapper}
                    onCancel={onCancel}
                    showHeader={showHeader}
                    onUpdate={onUpdate}
                />
            )}
        </Context.Provider>
    );
}
