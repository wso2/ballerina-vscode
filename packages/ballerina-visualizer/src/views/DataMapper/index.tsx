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

import React, { useMemo } from "react";

import { DataMapperView } from "@wso2/data-mapper-view";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { STModification, HistoryEntry } from "@wso2/ballerina-core";
import { FunctionDefinition } from "@wso2/syntax-tree";
import { RecordEditor, StatementEditorComponentProps } from "@wso2/record-creator";
import { View } from "@wso2/ui-toolkit";
import { URI, Utils } from "vscode-uri";
import { TopNavigationBar } from "../../components/TopNavigationBar";
import { FunctionForm } from "../BI";

interface DataMapperProps {
    projectPath: string;
    filePath: string;
    model: FunctionDefinition;
    functionName: string;
    applyModifications: (modifications: STModification[], isRecordModification?: boolean) => Promise<void>;
}

export function DataMapper(props: DataMapperProps) {
    const { projectPath, filePath, model, functionName, applyModifications } = props;
    const { rpcClient } = useRpcContext();
    const langServerRpcClient = rpcClient.getLangClientRpcClient();
    const libraryBrowserRPCClient = rpcClient.getLibraryBrowserRPCClient();
    const recordCreatorRpcClient = rpcClient.getRecordCreatorRpcClient();

    const hasInputs = useMemo(
        () => model.functionSignature.parameters?.length > 0,
        [model.functionSignature.parameters]
    );

    const hasOutputs = useMemo(
        () => model.functionSignature?.returnTypeDesc && model.functionSignature.returnTypeDesc.type,
        [model.functionSignature]
    );


    const goToFunction = async (entry: HistoryEntry) => {
        rpcClient.getVisualizerRpcClient().addToHistory(entry);
    };

    const applyRecordModifications = async (modifications: STModification[]) => {
        await props.applyModifications(modifications, true);
    };

    const renderRecordPanel = (props: {
        closeAddNewRecord: (createdNewRecord?: string) => void,
        onUpdate: (updated: boolean) => void
    } & StatementEditorComponentProps) => {
        return (
            <RecordEditor
                isDataMapper={true}
                onCancel={props.closeAddNewRecord}
                recordCreatorRpcClient={recordCreatorRpcClient}
                {...props}
                applyModifications={applyRecordModifications}
            />
        );
    };

    return (
        <>
            {!hasInputs || !hasOutputs ? (
                <FunctionForm
                    projectPath={projectPath}
                    filePath={filePath}
                    functionName={functionName}
                    isDataMapper={true}
                />
            ) : (
                <View>
                    <TopNavigationBar />
                    <DataMapperView
                        fnST={model}
                        filePath={filePath}
                        langServerRpcClient={langServerRpcClient}
                        libraryBrowserRpcClient={libraryBrowserRPCClient}
                        applyModifications={applyModifications}
                        goToFunction={goToFunction}
                        renderRecordPanel={renderRecordPanel}
                    />
                </View>
            )}
        </>
    );
};
