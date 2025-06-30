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
import React, { FocusEvent, useContext, useEffect, useMemo, useRef, useState } from "react";

import styled from "@emotion/styled";
import {
    BallerinaProjectComponents,
    createFunctionSignature,
    STModification,
    updateFunctionSignature,
} from "@wso2/ballerina-core";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";
import { Button, Divider, Typography, Codicon, SidePanel, Confirm } from "@wso2/ui-toolkit";
import {
    ExpressionFunctionBody,
    FunctionDefinition,
    NodePosition,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";
import { camelCase } from "lodash";

import { CurrentFileContext } from "../Context/current-file-context";
import { isArraysSupported } from "../utils";

import { FunctionNameEditor } from "./FunctionNameEditor";
import { InputParamsPanel } from "./InputParamsPanel/InputParamsPanel";
import { DataMapperInputParam, DataMapperOutputParam } from "./InputParamsPanel/types";
import { OutputTypePanel } from "./OutputTypePanel/OutputTypePanel";
import { CompletionResponseWithModule } from "./TypeBrowser";
import {
    getDefaultFnName,
    getDiagnosticsForFnName,
    getFnNameFromST,
    getModifiedTargetPosition
} from "./utils";
import { getRecordCompletions } from "../../Diagram/utils/ls-utils";

export const DM_DEFAULT_FUNCTION_NAME = "transform";
export const REDECLARED_SYMBOL_ERROR_CODE = "BCE2008";

export interface DataMapperConfigPanelProps {
    fnST: FunctionDefinition;
    targetPosition?: NodePosition;
    importStatements: string[];
    projectComponents?: BallerinaProjectComponents;
    filePath: string;
    inputs: DataMapperInputParam[];
    output: DataMapperOutputParam;
    ballerinaVersion: string;
    onSave: (funcName: string, inputParams: DataMapperInputParam[], outputType: DataMapperOutputParam) => void;
    onClose: () => void;
    applyModifications: (modifications: STModification[]) => Promise<void>;
    langServerRpcClient: LangClientRpcClient;
    recordPanel?: (props: { targetPosition: NodePosition, closeAddNewRecord: (createdNewRecord?: string) => void, onUpdate: (updated: boolean) => void }) => React.ReactElement;
}


export function DataMapperConfigPanel(props: DataMapperConfigPanelProps) {
    const {
        fnST,
        targetPosition,
        importStatements,
        projectComponents,
        filePath,
        inputs,
        output,
        ballerinaVersion,
        onSave,
        onClose,
        applyModifications,
        langServerRpcClient,
        recordPanel
    } = props;
    const { path, content } = useContext(CurrentFileContext);

    const [fnNameFromST, setFnNameFromST] = useState(getFnNameFromST(fnST));
    const [inputParams, setInputParams] = useState<DataMapperInputParam[]>(inputs);
    const [fnName, setFnName] = useState(fnNameFromST === undefined ? DM_DEFAULT_FUNCTION_NAME : fnNameFromST);
    const [outputType, setOutputType] = useState<DataMapperOutputParam>(output);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [isAddExistType, setAddExistType] = useState(false);
    const [dmFuncDiagnostic, setDmFuncDiagnostic] = useState("");
    const [showOutputType, setShowOutputType] = useState(false);
    const [newRecordBy, setNewRecordBy] = useState<"input" | "output">(undefined);
    const [newRecords, setNewRecords] = useState<string[]>([]);
    const [initiated, setInitiated] = useState(false);
    const [isValidationInProgress, setValidationInProgress] = useState(false);
    const [popoverAnchorEl, setPopoverAnchorEl] = React.useState(null);
    const [isClicked, setIsClicked] = React.useState<boolean>(false);
    const [disableFnNameEditing, setDisableFnNameEditing] = React.useState<boolean>(false);
    const editConfirmMessage = useRef<string>();
    const buttonContainerRef = useRef<HTMLDivElement>(null);
    const editConfirmPopoverOpen = Boolean(popoverAnchorEl);
    const id = editConfirmPopoverOpen ? 'edit-confirm-popover' : undefined;

    const isValidConfig = useMemo(() => {
        const hasInvalidInputs = inputParams.some(input => input.isUnsupported);
        return fnName
            && inputParams.length > 0
            && !hasInvalidInputs
            && outputType.type !== ""
            && !outputType.isUnsupported
            && dmFuncDiagnostic === "";
    }, [fnName, inputParams, outputType, dmFuncDiagnostic])

    useEffect(() => {
        void (async () => {
            setValidationInProgress(true);
            try {
                const diagnostics = await getDiagnosticsForFnName(
                    fnName,
                    inputParams,
                    outputType.type,
                    fnST,
                    targetPosition,
                    content,
                    filePath,
                    langServerRpcClient
                );
                if (diagnostics.length > 0) {
                    const redeclaredSymbol = diagnostics.some((diagnostic) => {
                        return diagnostic.code === REDECLARED_SYMBOL_ERROR_CODE
                    });
                    if (fnNameFromST === undefined && redeclaredSymbol) {
                        const defaultFnName = await getDefaultFnName(filePath, targetPosition, langServerRpcClient);
                        setFnName(defaultFnName);
                    } else {
                        setDmFuncDiagnostic(diagnostics[0]?.message);
                    }
                }
            } finally {
                setValidationInProgress(false);
            }
            setInitiated(true);
        })();
    }, []);
    const [fetchingCompletions, setFetchingCompletions] = useState(false);

    const [recordCompletions, setRecordCompletions] = useState<CompletionResponseWithModule[]>([]);

    useEffect(() => {
        void (async () => {
            if (initiated) {
                setFetchingCompletions(true);
                const allCompletions = await getRecordCompletions(
                    content,
                    importStatements,
                    fnST?.position as NodePosition || targetPosition,
                    path,
                    langServerRpcClient
                );
                setRecordCompletions(allCompletions);
                setFetchingCompletions(false);
            }
        })();
    }, [content, initiated]);

    useEffect(() => {
        if (isClicked && !isValidationInProgress && !editConfirmPopoverOpen) {
            onSaveForm();
        }
    }, [isClicked, isValidationInProgress, editConfirmPopoverOpen]);


    const handleOnConfirm = (status: boolean) => {
        if (status) {
            onSaveForm();
        }
        handleClosePopover();
    }

    const onSaveForm = () => {
        handleClosePopover();
        const parametersStr = inputParams
            .map((item) => `${item.type}${item.isArray ? '[]' : ''} ${item.name}`)
            .join(",");

        const returnTypeStr = `returns ${outputType.type}${outputType.isArray ? '[]' : ''}`;

        const modifications: STModification[] = [];
        if (fnST && STKindChecker.isFunctionDefinition(fnST)) {
            // check previous output signature and decide whether or not to reset the signature
            modifications.push(
                updateFunctionSignature(fnName, parametersStr, returnTypeStr, {
                    ...fnST?.functionSignature?.position as NodePosition,
                    startColumn: (fnST?.functionName?.position as NodePosition)?.startColumn,
                })
            );

            let functionExpression: STNode = (fnST.functionBody as ExpressionFunctionBody)?.expression;
            if (functionExpression && STKindChecker.isLetExpression(functionExpression)) {
                functionExpression = functionExpression.expression
            }
            if (
                functionExpression &&
                (STKindChecker.isNilLiteral(functionExpression) ||
                    outputType.type !== output?.type ||
                    outputType?.isArray !== output?.isArray)
            ) {
                // if function returns () or if output type has changed
                // reset function body with {} or []
                modifications.push({
                    type: "INSERT",
                    config: { STATEMENT: outputType.isArray ? "[]" : "{}" },
                    ...functionExpression.position,
                });
            }
        } else {
            modifications.push(
                createFunctionSignature(
                    "",
                    fnName,
                    parametersStr,
                    returnTypeStr,
                    targetPosition,
                    false,
                    true,
                    outputType.isArray ? '[]' : '{}'
                )
            );
        }
        onSave(fnName, inputParams, outputType);
        void applyModifications(modifications);
    };

    useEffect(() => {
        setInputParams(inputs);
        setOutputType(output);
        setFnNameFromST(getFnNameFromST(fnST));
    }, [inputs, output]);

    useEffect(() => {
        if (fnST) {
            if (fnNameFromST === undefined) {
                setFnNameFromST(getFnNameFromST(fnST));
            }
        }
    }, [fnST]);


    useEffect(() => {
        void (async () => {
            setValidationInProgress(true);
            try {
                if (fnNameFromST) {
                    const diagnostics = await getDiagnosticsForFnName(
                        fnNameFromST,
                        inputParams,
                        outputType.type,
                        fnST,
                        targetPosition,
                        content,
                        filePath,
                        langServerRpcClient
                    );
                    if (diagnostics.length > 0) {
                        setDmFuncDiagnostic(diagnostics[0]?.message);
                    }
                    setFnName(fnNameFromST);
                }
            } finally {
                setValidationInProgress(false);
            }
        })();
    }, [fnNameFromST]);

    // For Input Value
    const enableAddNewRecord = () => {
        setIsNewRecord(true);
        setNewRecordBy("input");
    };

    const closeAddNewRecord = (createdNewRecord?: string) => {
        setIsNewRecord(false);
        if (createdNewRecord) {
            const constantWord = "type";
            const pattern = new RegExp(`${constantWord}\\s+(\\w+)`);
            const match = createdNewRecord.match(pattern);
            const newRecordType = match ? match[1] : "";
            if (newRecordBy === "input") {
                setInputParams([...inputParams, {
                    name: camelCase(newRecordType),
                    type: newRecordType,
                    isUnsupported: false,
                    isArray: false
                }])
            }
            if (newRecordBy === "output") {
                setOutputType({ type: newRecordType, isUnsupported: false, isArray: false });
            }
            setNewRecords([...newRecords, newRecordType]);
        }
        setNewRecordBy(undefined);
    };

    const handleShowOutputType = () => {
        setShowOutputType(true);
    };

    const handleHideOutputType = () => {
        setShowOutputType(false);
    }

    // For Output Value
    const handleShowRecordEditor = () => {
        enableAddNewRecord();
        setNewRecordBy("output");
    };

    const handleOutputDeleteClick = () => {
        setOutputType({ type: undefined, isUnsupported: true, isArray: false });
        setShowOutputType(false);
    };

    const handleOutputTypeChange = (type: string, isArray: boolean) => {
        setOutputType({ type, isUnsupported: false, isArray })
    }

    const breadCrumb = (
        <FormTitleContainer>
            <FormTitle variant="h4">Data Mapper</FormTitle>
            <Codicon name="chevron-right" />
            <FormTitle variant="h4">Record</FormTitle>
            <CloseButton
                appearance="icon"
                onClick={() => closeAddNewRecord()}
            >
                <Codicon sx={{ width: "16px" }} iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} name="close" />
            </CloseButton>
        </FormTitleContainer>
    );

    const onNameOutFocus = async (value: string) => {
        const name = value;
        if (name === "") {
            setDmFuncDiagnostic("missing function name");
        } else if (name !== fnNameFromST) {
            setValidationInProgress(true);
            try {
                const diagnostics = await getDiagnosticsForFnName(
                    value,
                    inputParams,
                    outputType.type,
                    fnST,
                    targetPosition,
                    content,
                    filePath,
                    langServerRpcClient
                );
                if (diagnostics.length > 0) {
                    setDmFuncDiagnostic(diagnostics[0]?.message);
                }
            } finally {
                setValidationInProgress(false);
            }
        }
    };

    const onNameChange = (name: string) => {
        setFnName(name);
        setDmFuncDiagnostic("");
    };

    const isArraySupported = useMemo(() => isArraysSupported(ballerinaVersion), [ballerinaVersion]);

    const handleClosePopover = () => {
        setIsClicked(false);
        setPopoverAnchorEl(null);
    };

    const onSaveInit = (event: React.MouseEvent<HTMLElement>) => {
        // only show confirm popover if something has changed and if its the edit flow
        if (fnST && STKindChecker.isFunctionDefinition(fnST)) {
            const outputChanged =
                output.type &&
                outputType.type !== output?.type ||
                outputType?.isArray !== output?.isArray;
            const inputsChanged = !inputs?.every((item) =>
                inputParams?.some(
                    (newInput) =>
                        newInput.isArray === item.isArray &&
                        newInput.name === item.name &&
                        newInput.type === item.type
                )
            );
            if (outputChanged || inputsChanged) {
                let confirmMessage = "";
                if (outputChanged) {
                    confirmMessage = "Modifying the output type will reset the function body. "
                } else if (inputsChanged) {
                    confirmMessage += "Modifying the existing input types might make any existing mappings invalid. "
                }
                confirmMessage += "Are you sure you want to proceed?";
                editConfirmMessage.current = confirmMessage;
                setPopoverAnchorEl(event.currentTarget);
            }
        }
    };

    const handleSave = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if (!isClicked) {
            setIsClicked(true);
            onSaveInit(event);
        }
    }

    return (
        <SidePanel
            isOpen={true}
            alignment="right"
            sx={{ transition: "all 0.3s ease-in-out", width: 600 }}
        >
            <div>
                <WizardFormControlExtended
                    data-testid="data-mapper-form"
                >
                    {(isNewRecord && breadCrumb) || (
                        <FormTitleContainer>
                            <FormTitle variant="h4">Data Mapper</FormTitle>
                            <CloseButton
                                appearance="icon"
                                onClick={onClose}
                            >
                                <Codicon sx={{ width: "16px" }} iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} name="close" />
                            </CloseButton>
                        </FormTitleContainer>
                    )}
                    {isNewRecord &&
                        recordPanel({
                            targetPosition: getModifiedTargetPosition(newRecords, targetPosition, projectComponents, filePath),
                            closeAddNewRecord,
                            onUpdate: setDisableFnNameEditing
                        })
                    }
                    {!isNewRecord && (
                        <>
                            <FormBody>
                                <FunctionNameEditor
                                    value={fnName}
                                    onBlur={(event: FocusEvent<HTMLInputElement>) => onNameOutFocus(event.target.value)}
                                    onChange={onNameChange}
                                    isValidating={!initiated || isValidationInProgress}
                                    errorMessage={dmFuncDiagnostic}
                                />
                                <FormDivider />
                                <InputParamsPanel
                                    inputParams={inputParams}
                                    onUpdateParams={setInputParams}
                                    enableAddNewRecord={enableAddNewRecord}
                                    setAddExistType={setAddExistType}
                                    isAddExistType={isAddExistType}
                                    loadingCompletions={fetchingCompletions}
                                    completions={recordCompletions}
                                    isArraySupported={isArraySupported}
                                />
                                <FormDivider />
                                <OutputTypePanel
                                    outputType={outputType}
                                    fetchingCompletions={fetchingCompletions}
                                    completions={recordCompletions}
                                    showOutputType={showOutputType}
                                    handleShowOutputType={handleShowOutputType}
                                    handleHideOutputType={handleHideOutputType}
                                    handleOutputTypeChange={handleOutputTypeChange}
                                    handleShowRecordEditor={handleShowRecordEditor}
                                    handleOutputDeleteClick={handleOutputDeleteClick}
                                    isArraySupported={isArraySupported}
                                />
                            </FormBody>
                            <ButtonContainer ref={buttonContainerRef}>
                                <Button
                                    appearance="secondary"
                                    onClick={onClose}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    disabled={isClicked || !isValidConfig}
                                    onClick={handleSave}
                                >
                                    Save
                                </Button>
                            </ButtonContainer>
                            <Confirm
                                id={id}
                                isOpen={editConfirmPopoverOpen}
                                anchorEl={popoverAnchorEl}
                                confirmText="Continue"
                                message={editConfirmMessage.current}
                                onConfirm={handleOnConfirm}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                sx={{zIndex: 2000}}
                            />
                        </>
                    )}
                </WizardFormControlExtended>
            </div>
        </SidePanel>
    );
}

const FormTitleContainer = styled.div`
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--vscode-editorIndentGuide-background);
    padding: 16px 12px;
    gap: 8px;
`;

const FormTitle = styled(Typography)`
    margin: 0;
`

const FormBody = styled.div`
    width: 100%;
    flex-direction: row;
    padding: 15px 20px;
`;

const FormDivider = styled(Divider)`
    margin: 1.5rem 0;
`;

const WizardFormControlExtended = styled.div`
    width: 600;
`;

const CloseButton = styled(Button)`
    margin-left: auto;
`

export const Title = styled.div((element) => ({
    color: 'inherit',
    fontSize: "13px",
    letterSpacing: "normal",
    textTransform: "capitalize",
    margin: "0 0 8px",
    lineHeight: "1rem",
    paddingBottom: "0.6rem",
    fontWeight: 500,
}));

const ButtonContainer = styled.div`
    display: flex;
    gap: 10px;
    padding: 0 20px;

    & :nth-of-type(1) {
        margin-left: auto;
    }
`;

