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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { TextField, Dropdown } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { BallerinaRpcClient, useRpcContext } from "@wso2/ballerina-rpc-client";
import { Type } from "@wso2/ballerina-core";
import { RecordFromJson } from "../../RecordFromJson/RecordFromJson";
import { RecordFromXml } from "../../RecordFromXml/RecordFromXml";
import { debounce } from "lodash";
import { Utils, URI } from "vscode-uri";

const CategoryRow = styled.div<{ showBorder?: boolean }>`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
    padding-bottom: 14px;
    border-bottom: ${({ showBorder }) => (showBorder ? `1px solid var(--vscode-welcomePage-tileBorder)` : "none")};
`;

const TextFieldWrapper = styled.div`
    flex: 1;
`;

enum ImportFormat {
    JSON = "JSON",
    XML = "XML",
}

interface ImportTabProps {
    type: Type;
    onTypeSave: (type: Type) => void;
    isSaving: boolean;
    setIsSaving: (isSaving: boolean) => void;
}

export function ImportTab(props: ImportTabProps) {
    const {
        type,
        onTypeSave,
        isSaving,
        setIsSaving,
    } = props;

    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const [importFormat, setImportFormat] = useState<ImportFormat>(ImportFormat.JSON);
    const [importTypeName, setImportTypeName] = useState<string>(type.name);
    const [isTypeNameValid, setIsTypeNameValid] = useState<boolean>(true);
    const [nameError, setNameError] = useState<string>("");

    const { rpcClient } = useRpcContext();


    useEffect(() => {
        if (importFormat === ImportFormat.JSON) {
            validateTypeName(importTypeName);
        }
    }, [type]);


    const onImport = (types: Type[]) => {
        if (types.length > 0) {
            const importedType = types[0];
            onTypeSave(importedType);
        }
    }

    const validateTypeName = useCallback(debounce(async (value: string) => {
        const projectUri = await rpcClient.getVisualizerLocation().then((res) => res.projectUri);

        const endPosition = await rpcClient.getBIDiagramRpcClient().getEndOfFile({
            filePath: Utils.joinPath(URI.file(projectUri), 'types.bal').fsPath
        });

        const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
            filePath: type?.codedata?.lineRange?.fileName || "types.bal",
            context: {
                expression: value,
                startLine: {
                    line: type?.codedata?.lineRange?.startLine?.line ?? endPosition.line,
                    offset: type?.codedata?.lineRange?.startLine?.offset ?? endPosition.offset
                },
                offset: 0,
                lineOffset: 0,
                codedata: {
                    node: "VARIABLE",
                    lineRange: {
                        startLine: {
                            line: type?.codedata?.lineRange?.startLine?.line ?? endPosition.line,
                            offset: type?.codedata?.lineRange?.startLine?.offset ?? endPosition.offset
                        },
                        endLine: {
                            line: type?.codedata?.lineRange?.endLine?.line ?? endPosition.line,
                            offset: type?.codedata?.lineRange?.endLine?.offset ?? endPosition.offset
                        },
                        fileName: type?.codedata?.lineRange?.fileName
                    },
                },
                property: type?.properties["name"] ?
                    {
                        ...type.properties["name"],
                        valueTypeConstraint: "Global"
                    } :
                    {
                        metadata: {
                            label: "",
                            description: "",
                        },
                        valueType: "IDENTIFIER",
                        value: "",
                        valueTypeConstraint: "Global",
                        optional: false,
                        editable: true
                    }
            }
        });


        if (response && response.diagnostics && response.diagnostics.length > 0) {
            setNameError(response.diagnostics[0].message);
            setIsTypeNameValid(false);
        } else {
            setNameError("");
            setIsTypeNameValid(true);
        }
    }, 250), [rpcClient, type]);

    const handleOnBlur = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await validateTypeName(e.target.value);
    };

    const handleNameChange = async (value: string) => {
        setImportTypeName(value);
        await validateTypeName(value);
    };


    return (
        <>
            <CategoryRow>
                <Dropdown
                    id="format-selector"
                    label="Format"
                    value={importFormat === ImportFormat.XML ? "XML" : "JSON"}
                    items={[
                        { id: "JSON", content: "JSON", value: "JSON" },
                        { id: "XML", content: "XML", value: "XML" }
                    ]}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === "JSON") {
                            setImportFormat(ImportFormat.JSON);
                        } else {
                            setImportFormat(ImportFormat.XML);
                        }
                    }}
                />
                {importFormat === ImportFormat.JSON && (
                    <TextFieldWrapper>
                        <TextField
                            label="Name"
                            value={importTypeName}
                            errorMsg={nameError}
                            onBlur={handleOnBlur}
                            onChange={(e) => handleNameChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleNameChange((e.target as HTMLInputElement).value);
                                }
                            }}
                            onFocus={(e) => {
                                e.target.select();
                                validateTypeName(e.target.value);
                            }}
                            ref={nameInputRef}
                        />
                    </TextFieldWrapper>
                )}
            </CategoryRow>

            {importFormat === ImportFormat.JSON && (
                <RecordFromJson
                    rpcClient={rpcClient}
                    name={importTypeName}
                    isTypeNameValid={isTypeNameValid}
                    onImport={onImport}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                />
            )}
            {importFormat === ImportFormat.XML && (
                <RecordFromXml
                    rpcClient={rpcClient}
                    onImport={onImport}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                />
            )}
        </>
    );
}
