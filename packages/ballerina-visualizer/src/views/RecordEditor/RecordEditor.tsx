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

import React, { useEffect, useState } from "react";
import { STModification } from "@wso2/ballerina-core";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";
import { Drawer, ThemeColors } from "@wso2/ui-toolkit";
import { STNode } from "@wso2/syntax-tree";
import styled from "@emotion/styled";
import { URI } from "vscode-uri";
import { FormField } from "@wso2/ballerina-side-panel";
import { RecordEditor as BalRecordEditor } from '@wso2/record-creator';

const DrawerContainer = styled.div`
    fontFamily: GilmerRegular;
`;

export interface RecordEditorProps {
    isRecordEditorOpen: boolean;
    fields?: FormField[];
    rpcClient: BallerinaRpcClient;
    width?: string;
    onClose: () => void;
    updateFields?: (fields: FormField[]) => void;
    typeId?: string;
}

export function RecordEditor(props: RecordEditorProps) {
    const {
        isRecordEditorOpen,
        fields,
        rpcClient,
        onClose,
        updateFields,
        width
    } = props;
    const [recordFullST, setRecordFullST] = useState<STNode>();
    const [recordPath, setRecordPath] = useState<string>();

    const handleCloseRecordEditor = () => {
        onClose();
    };

    const handleCancelRecordEditor = (recordName: string | undefined) => {
        if (fields) {
            const updatedFormValues = fields.map((formField: FormField) => {
                // Check if recordName is type of string
                if (formField.key === "type" && typeof recordName === 'string') {
                    return { ...formField, value: recordName ?? '' };
                }
                return formField;
            });
            updateFields(updatedFormValues);
        }
        onClose();
    };

    const applyRecordModifications = async (modifications: STModification[]) => {
        const langServerRPCClient = rpcClient.getLangClientRpcClient();
        const filePath = (await rpcClient.getVisualizerLocation()).metadata?.recordFilePath;
        let updatedModifications = modifications;
        if (modifications.length === 1) {
            // Change the start position of the modification to the beginning of the file
            updatedModifications = [{
                ...modifications[0],
                startLine: 0,
                startColumn: 0,
                endLine: 0,
                endColumn: 0
            }];
        }
        const { parseSuccess, source: newSource, syntaxTree } = await langServerRPCClient?.stModify({
            astModifications: updatedModifications,
            documentIdentifier: {
                uri: URI.file(filePath ?? '').toString()
            }
        });
        if (parseSuccess && newSource && filePath) {
            rpcClient.getVisualizerRpcClient().addToUndoStack(newSource);
            await langServerRPCClient.updateFileContent({
                content: newSource,
                filePath
            });
        }
        setRecordFullST(syntaxTree);
    };

    useEffect(() => {
        rpcClient.getVisualizerLocation().then((vl) => {
            setRecordPath(vl.metadata?.recordFilePath);
        });
    }, []);

    return (
        <Drawer
            isOpen={isRecordEditorOpen}
            id="record-editor-drawer"
            isSelected={true}
            sx={{
                backgroundColor: ThemeColors.SURFACE_DIM,
                boxShadow: "none",
                width: width ? width : "400px",
            }}
        >
            <DrawerContainer>
                <BalRecordEditor
                    onClose={handleCloseRecordEditor}
                    applyModifications={applyRecordModifications}
                    importStatements={[]}
                    langServerRpcClient={rpcClient.getLangClientRpcClient()}
                    // @ts-ignore
                    libraryBrowserRpcClient={null}
                    onCancelStatementEditor={() => { }}
                    onCancel={handleCancelRecordEditor}
                    recordCreatorRpcClient={rpcClient.getRecordCreatorRpcClient()}
                    targetPosition={{ startLine: 0, startColumn: 0 }}
                    currentFile={{
                        content: "",
                        path: recordPath ?? '',
                        size: 0
                    }}
                    isDataMapper={false}
                    showHeader={false}
                    fullST={recordFullST}
                />
            </DrawerContainer>
        </Drawer>
    );
}
