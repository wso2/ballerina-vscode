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
// tslint:disable: jsx-no-lambda
import React from "react";

import styled from "@emotion/styled";
import { Button, Codicon, ErrorBanner, TruncatedLabel } from "@wso2/ui-toolkit";

import { Title } from "../DataMapperConfigPanel";
import { InputParamEditor } from "../InputParamsPanel/InputParamEditor";
import { DataMapperOutputParam } from "../InputParamsPanel/types";
import { RecordButtonGroup } from "../RecordButtonGroup";
import { CompletionResponseWithModule } from "../TypeBrowser";
import { getTypeIncompatibilityMsg } from "../utils";

export interface OutputConfigWidgetProps {
    outputType: DataMapperOutputParam;
    fetchingCompletions: boolean;
    completions: CompletionResponseWithModule[]
    showOutputType: boolean;
    isArraySupported: boolean;
    handleShowOutputType: () => void;
    handleHideOutputType: () => void;
    handleOutputTypeChange: (type: string, isArray: boolean) => void;
    handleShowRecordEditor: () => void;
    handleOutputDeleteClick: () => void;
}

export function OutputTypePanel(props: OutputConfigWidgetProps) {
    const {
        outputType,
        fetchingCompletions,
        completions,
        showOutputType,
        isArraySupported,
        handleShowOutputType,
        handleHideOutputType,
        handleOutputTypeChange,
        handleShowRecordEditor,
        handleOutputDeleteClick
    } = props;

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <TypeName isInvalid={outputType.isUnsupported}>{outputType.isArray ? `${outputType.type}[]` : outputType.type}</TypeName>
        </TruncatedLabel>
    );

    const handleEdit = () => {
        if (!outputType.isUnsupported) {
            handleShowOutputType();
        }
    };


    return (
        <OutputTypeConfigPanel data-testid='dm-output'>
            <Title>Output Type</Title>
            {(!outputType.type || showOutputType) ? (
                <>
                    {showOutputType ? (
                        <InputParamEditor
                            param={{ ...outputType, name: "" }}
                            hideName={true}
                            onUpdate={(_, param) => {
                                handleOutputTypeChange(param.type, param.isArray);
                                handleHideOutputType();
                            }}
                            onCancel={handleHideOutputType}
                            completions={completions}
                            loadingCompletions={fetchingCompletions}
                            isArraySupported={isArraySupported}
                        />
                    ) :
                        <RecordButtonGroup openRecordEditor={handleShowRecordEditor} showTypeList={handleShowOutputType} />
                    }

                </>
            ) : (
                <>
                    <OutputTypeContainer isInvalid={outputType.isUnsupported}>
                        <ClickToEditContainer isInvalid={outputType.isUnsupported} onClick={handleEdit}>
                            {label}
                        </ClickToEditContainer>
                        <Box>
                            {!outputType.isUnsupported && (
                                <EditButton
                                    onClick={handleShowOutputType}
                                    appearance="icon"
                                    data-testid={`data-mapper-config-edit-output`}
                                >
                                    <Codicon name="edit" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                                </EditButton>
                            )}
                            <DeleteButton
                                onClick={handleOutputDeleteClick}
                                appearance="icon"
                                data-testid={`data-mapper-config-delete-output`}
                            >
                                <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                            </DeleteButton>
                        </Box>
                    </OutputTypeContainer>
                    {outputType.type && outputType.isUnsupported && (
                        <ErrorBanner
                            errorMsg={getTypeIncompatibilityMsg(outputType.typeNature, outputType.type, "output")}
                        />
                    )}
                </>
            )}
        </OutputTypeConfigPanel>
    );
}

const ClickToEditContainer = styled.div(({ isInvalid }: { isInvalid?: boolean }) => ({
    cursor: isInvalid ? 'auto' : 'pointer',
    width: '100%'
}));

const OutputTypeContainer = styled.div(({ isInvalid }: { isInvalid?: boolean }) => ({
    background: 'var(--vscode-sideBar-background)',
    padding: 10,
    color: `${isInvalid ? 'var(--vscode-errorForeground)' : 'inherit'}`,
    margin: "1rem 0 0.25rem",
    justifyContent: "space-between",
    display: "flex",
    width: "100%",
    alignItems: "center",
}));

const OutputTypeConfigPanel = styled.div`
    color: 'var(--vscode-foreground)';
    width: 100%;
`;

const DeleteButton = styled(Button)`
    padding: 0;
    color: var(--vscode-errorForeground);
`;

const TypeName = styled.span(({ isInvalid }: { isInvalid?: boolean }) => ({
    fontWeight: 500,
    color: `${isInvalid ? 'var(--vscode-errorForeground)' : 'inherit'}`,
    marginRight: '6px'
}));

const EditButton = styled(Button)`
    padding: 0;
    margin-right: 5px;
    color: #36B475;
`;

const Box = styled.div`
    display: flex;
`;
