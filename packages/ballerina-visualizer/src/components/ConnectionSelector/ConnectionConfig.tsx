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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlowNode, LineRange } from "@wso2/ballerina-core";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FormGeneratorNew } from "../../views/BI/Forms/FormGeneratorNew";
import { RelativeLoader } from "../RelativeLoader";
import { ConnectionConfigProps } from "./types";
import { getConnectionKindConfig } from "./config";
import { createConnectionSelectField, fetchConnectionForNode, updateNodeWithConnectionVariable } from "./utils";
import { LoaderContainer } from "../RelativeLoader/styles";
import { URI, Utils } from "vscode-uri";
import { CONNECTIONS_FILE } from "../../constants";

export function ConnectionConfig(props: ConnectionConfigProps): JSX.Element {
    const { fileName, connectionKind, selectedNode, onSave, onNavigateToSelectionList } = props;
    const config = useMemo(() => getConnectionKindConfig(connectionKind), [connectionKind]);
    const { rpcClient } = useRpcContext();

    const [selectedConnection, setSelectedConnection] = useState<FlowNode>();
    const [selectedConnectionFields, setSelectedConnectionFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const projectPath = useRef<string>("");
    const currentFilePath = useRef<string>("");
    const targetLineRangeRef = useRef<LineRange | undefined>(undefined);

    useEffect(() => {
        initPanel();
    }, []);

    useEffect(() => {
        if (selectedConnection) {
            renderFormField();
        }
    }, [selectedConnection]);

    const initPanel = async () => {
        setLoading(true);
        projectPath.current = await rpcClient.getVisualizerLocation().then((location) => location.projectPath);
        currentFilePath.current = fileName;


        const endPosition = await rpcClient.getBIDiagramRpcClient().getEndOfFile({
            filePath: currentFilePath.current
        });
        targetLineRangeRef.current = {
            startLine: {
                line: endPosition.line,
                offset: endPosition.offset
            },
            endLine: {
                line: endPosition.line,
                offset: endPosition.offset
            }
        };

        await fetchSelectedConnection();
        setLoading(false);
    };

    const fetchSelectedConnection = async () => {
        const connection = await fetchConnectionForNode(rpcClient, connectionKind, selectedNode);
        setSelectedConnection(connection);
    };

    const renderFormField = () => {
        const connectionSelectField = createConnectionSelectField(selectedConnection, config, onCreateNewConnection);
        setSelectedConnectionFields([connectionSelectField]);
    };

    const handleOnSave = useCallback(async (data: FormValues) => {
        setSavingForm(true);
        updateNodeWithConnectionVariable(connectionKind, selectedNode, data["connection"]);
        onSave?.(selectedNode);
    }, [onSave, rpcClient]);

    const onCreateNewConnection = useCallback(() => {
        onNavigateToSelectionList?.();
    }, [onNavigateToSelectionList]);

    return (
        <>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && selectedConnectionFields?.length > 0 && (
                <>
                    <FormGeneratorNew
                        key={selectedConnection?.id}
                        fileName={currentFilePath.current || projectPath.current}
                        targetLineRange={targetLineRangeRef.current}
                        fields={selectedConnectionFields}
                        onSubmit={handleOnSave}
                        disableSaveButton={savingForm}
                        isSaving={savingForm}
                        helperPaneSide="left"
                    />
                </>
            )}
        </>
    );
}
