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
import React, { useContext, useEffect, useReducer } from "react";

import { DIAGNOSTIC_SEVERITY, JsonToRecord } from "@wso2/ballerina-core";
import { ModulePart, NodePosition, STKindChecker, STNode, TypeDefinition } from "@wso2/syntax-tree";
import debounce from "lodash.debounce";

import { TextPreloaderVertical } from "../PreLoader/TextPerloaderVertical";
import {
    convertJsonToRecordUtil,
    getModulePartST,
    getRecordST,
    getRootRecord,
    getInitialSource,
    mutateTypeDefinition,
} from "../utils";
import { FileSelector } from "../components/FileSelector";
import { FormActionButtons } from "../components/FormComponents/FormFieldComponents/FormActionButtons";
import { FormTextArea } from "../components/FormComponents/FormFieldComponents/TextField/FormTextArea";
import { UndoRedoManager } from "../components/UndoRedoManager";
import { checkDiagnostics, getUpdatedSource } from "../components/FormComponents/Utils";
import { RecordOverview } from "../RecordOverview";
import { Context } from "../Context";
import { FileSelect, FormContainer, FormWrapper, InputContainer, InputWrapper, LabelWrapper, useStyles } from "../style";
import { Button, CheckBox, Codicon, SidePanelTitleContainer, Typography } from "@wso2/ui-toolkit";
import { FormTextInput } from "../components/FormComponents/FormFieldComponents/TextField/FormTextInput";

interface RecordState {
    isLoading?: boolean;
    jsonValue?: string;
    recordName?: string;
    recordNameDiag?: string;
    importedRecord?: TypeDefinition | ModulePart;
    modifiedPosition?: NodePosition;
    isSeparateDef?: boolean;
    jsonDiagnostics?: string;
}

interface RecordFromJsonProps {
    undoRedoManager?: UndoRedoManager;
    onSave: (recordString: string, modifiedPosition: NodePosition) => void;
    onCancel: (createdRecordName?: string) => void;
    isHeaderHidden?: boolean;
    onUpdate?: (updated: boolean) => void;
}

const debounceDelay = 300;

const reducer = (state: RecordState, action: { type: string; payload: any }) => {
    switch (action.type) {
        case "jsonConversionStart":
            return { ...state, isLoading: action.payload };
        case "setJsonDiagnostics":
            return { ...state, jsonDiagnostics: action.payload, isLoading: false };
        case "setJsonValue":
            return { ...state, jsonValue: action.payload, jsonDiagnostics: "" };
        case "recordNameChange":
            return { ...state, recordName: action.payload.recordName, recordNameDiag: action.payload.recordNameDiag };
        case "setRecordNameDiag":
            return { ...state, recordNameDiag: action.payload.recordNameDiag };
        case "checkSeparateDef":
            return { ...state, isSeparateDef: action.payload };
        case "jsonConversionSuccess":
            return {
                ...state,
                importedRecord: action.payload.importedRecord,
                modifiedPosition: action.payload.modifiedPosition,
                jsonValue: "",
                isLoading: false,
                jsonDiagnostics: "",
            };
        default:
            break;
    }
};

export function RecordFromJson(recordFromJsonProps: RecordFromJsonProps) {
    const classes = useStyles();
    const { isHeaderHidden, undoRedoManager, onSave, onCancel, onUpdate } = recordFromJsonProps;

    const {
        props: { langServerRpcClient, recordCreatorRpcClient, currentFile, fullST, targetPosition },
    } = useContext(Context);

    const [formState, dispatchFromState] = useReducer(reducer, {
        recordName: "",
        jsonValue: "",
        isLoading: false,
        jsonDiagnostics: "",
        isSeparateDef: false,
        recordNameDiag: "",
        importedRecord: undefined,
    });

    const convertToJSon = () => {
        dispatchFromState({ type: "jsonConversionStart", payload: true });
    };

    const onJsonChange = (jsonText: string) => {
        dispatchFromState({ type: "setJsonValue", payload: jsonText });
    };

    const onNameOutFocus = async (event: any) => {
        const content = getInitialSource(mutateTypeDefinition(event.target.value, "record {};", targetPosition, true));
        const updateContent = getUpdatedSource(content, currentFile.content, targetPosition);
        const diagnostics = await checkDiagnostics(currentFile?.path, updateContent, langServerRpcClient);
        let filteredDiagnostics;
        if (diagnostics[0]?.diagnostics[0].severity === 1 && diagnostics[0]?.diagnostics[0].range?.start?.line - 1 === targetPosition.startLine) {
            filteredDiagnostics = diagnostics[0].diagnostics.filter((diag) => diag.message.includes(event.target.value));
        }
        dispatchFromState({
            type: "recordNameChange",
            payload: {
                recordName: event.target.value,
                recordNameDiag: filteredDiagnostics && filteredDiagnostics.length ? filteredDiagnostics[0].message : "",
            },
        });
    };

    const onNameChange = async (name: string) => {
        dispatchFromState({
            type: "recordNameChange",
            payload: {
                recordName: `${name.charAt(0).toUpperCase()}${name.slice(1)}`,
                recordNameDiag: "",
            },
        });
    };
    const debouncedNameChanged = debounce(onNameChange, debounceDelay);

    const onSeparateDefinitionSelection = (mode: boolean) => {
        dispatchFromState({ type: "checkSeparateDef", payload: mode });
    };

    const formatRecord = (block: string) => {
        let i = 0;
        return block.replace(/record {/g, (match: string) => {
            return match === "record {" ? (i++ === 0 ? "record {" : "record {\n") : "";
        });
    };

    // This fix is added due to incorrect record name generation from ballerina side.
    // This can be removed once that issue is fixed
    const fixNewRecordResponse = (response: JsonToRecord) => {
        const expected = `type ${formState.recordName}`;
        const notExpected = "type NewRecord";
        if (response.codeBlock && !response.codeBlock.includes(expected) && response.codeBlock.includes(notExpected)) {
            response.codeBlock = response.codeBlock.replace(notExpected, expected);
        }
        return response;
    };

    useEffect(() => {
        if (formState.isLoading) {
            (async () => {
                const recordResponseLS = await convertJsonToRecordUtil(
                    formState.jsonValue,
                    formState.recordName,
                    false,
                    formState.isSeparateDef,
                    recordCreatorRpcClient
                );
                const recordResponse = fixNewRecordResponse(recordResponseLS);
                let recordST: STNode;
                let modulePart: STNode;
                let newPosition: NodePosition;
                const updatedBlock = formState.isSeparateDef
                    ? recordResponse.codeBlock
                    : formatRecord(recordResponse.codeBlock);
                if (
                    recordResponse?.diagnostics?.length === 0 ||
                    recordResponse?.diagnostics[0]?.severity !== DIAGNOSTIC_SEVERITY.ERROR
                ) {
                    if (formState.isSeparateDef) {
                        // Uses module part since we receive multiple records
                        modulePart = await getModulePartST(
                            {
                                codeSnippet: updatedBlock.trim(),
                            },
                            langServerRpcClient
                        );
                        if (STKindChecker.isModulePart(modulePart)) {
                            recordST = getRootRecord(modulePart, formState.recordName);
                            newPosition = {
                                startLine: targetPosition.startLine + recordST.position.startLine,
                                startColumn: targetPosition.startColumn,
                                endLine: targetPosition.startLine + recordST.position.endLine,
                                endColumn: recordST.position.endColumn,
                            };
                        }
                        dispatchFromState({
                            type: "jsonConversionSuccess",
                            payload: {
                                importedRecord: modulePart,
                                modifiedPosition: newPosition,
                            },
                        });
                    } else {
                        recordST = await getRecordST({ codeSnippet: updatedBlock.trim() }, langServerRpcClient);
                        newPosition = {
                            startLine: targetPosition.startLine,
                            startColumn: targetPosition.startColumn,
                            endLine: targetPosition.startLine + recordST.position.endLine,
                            endColumn: recordST.position.endColumn,
                        };
                        dispatchFromState({
                            type: "jsonConversionSuccess",
                            payload: {
                                importedRecord: recordST,
                                modifiedPosition: newPosition,
                            },
                        });
                    }
                    // TODO: Fix the flow after the Demo
                    onCancel(formState.recordName);
                    onSave(updatedBlock, newPosition);
                    onUpdate && onUpdate(true);
                } else {
                    dispatchFromState({ type: "setJsonDiagnostics", payload: recordResponse?.diagnostics[0].message });
                }
            })();
        }
    }, [formState.isLoading]);

    const isSaveButtonEnabled =
        formState.jsonDiagnostics === "" &&
        formState.jsonValue !== "" &&
        !formState.recordNameDiag &&
        formState.recordName;

    return (
        <>
            {formState.importedRecord ? (
                <RecordOverview
                    type="JSON"
                    undoRedoManager={undoRedoManager}
                    prevST={fullST}
                    definitions={formState.importedRecord}
                    onComplete={onCancel}
                    onCancel={onCancel}
                />
            ) : (
                <FormContainer data-testid="module-variable-config-form">
                    {!isHeaderHidden && (
                        <SidePanelTitleContainer sx={{paddingLeft: 20}}>
                            <Typography variant="h3" sx={{margin: 0, fontSize: "13px"}}>Import Sample JSON</Typography>
                            <Button onClick={onCancel} appearance="icon"><Codicon name="close" /></Button>
                        </SidePanelTitleContainer>
                    )}
                    <FormWrapper id="json-input-container" test-id="json-input-container">
                        <FormTextInput
                            label="Record Name"
                            dataTestId="import-record-name"
                            placeholder="Enter Record Name"
                            defaultValue={formState.recordName}
                            customProps={{ readonly: false, isErrored: formState?.recordNameDiag }}
                            errorMessage={formState?.recordNameDiag}
                            onBlur={onNameOutFocus}
                            onChange={debouncedNameChanged}
                        />
                        <InputContainer>
                            <InputWrapper>
                                    <Typography variant="body3" className={classes.inputLabelForRequired}>
                                        Sample JSON
                                    </Typography>
                                <FileSelect>
                                    <FileSelector label="Select JSON file" extension="json" onReadFile={onJsonChange} />
                                </FileSelect>
                            </InputWrapper>
                            <FormTextArea
                                data-TestId="json-input"
                                placeholder={`eg: {"organization": "wso2", "address": "Colombo"}`}
                                onChange={onJsonChange}
                                customProps={{
                                    isInvalid: formState.jsonDiagnostics !== "",
                                    text: formState.jsonDiagnostics,
                                }}
                                defaultValue={formState.jsonValue}
                            />
                        </InputContainer>
                        {formState.isLoading && <TextPreloaderVertical position="absolute" />}
                        <CheckBox label="Make Separate Record Definitions" value="Make Separate Record Definitions" checked={formState.isSeparateDef} onChange={onSeparateDefinitionSelection} />
                        <FormActionButtons
                            cancelBtnText="Back"
                            saveBtnText="Save"
                            isMutationInProgress={false}
                            validForm={isSaveButtonEnabled}
                            onSave={convertToJSon}
                            onCancel={onCancel}
                        />
                    </FormWrapper>
                </FormContainer>
            )}
        </>
    );
}
