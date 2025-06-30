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
import React, { useState } from "react";

import styled from "@emotion/styled";
import { camelCase } from "lodash";

import { CompletionResponseWithModule, TypeBrowser } from "../TypeBrowser";

import { DataMapperInputParam } from "./types";
import { Button, TextField, Typography } from "@wso2/ui-toolkit";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

interface InputParamEditorProps {
    index?: number;
    param?: DataMapperInputParam,
    onSave?: (param: DataMapperInputParam) => void;
    onUpdate?: (index: number, param: DataMapperInputParam) => void;
    onCancel?: () => void;
    validateParamName?: (paramName: string) => { isValid: boolean, message: string };
    isArraySupported: boolean;
    completions: CompletionResponseWithModule[];
    loadingCompletions: boolean;
    hideName?: boolean;
}

export function InputParamEditor(props: InputParamEditorProps) {

    const { param, onSave, onUpdate, index, onCancel, validateParamName, isArraySupported, completions, loadingCompletions, hideName } = props;

    const initValue: DataMapperInputParam = param ? { ...param } : {
        name: "",
        type: "",
        isArray: false,
    };

    const [paramType, setParamType] = useState<string>(param?.type || "");
    const [paramName, setParamName] = useState<string>(param?.name || "");
    const [pramError, setParamError] = useState<string>("");
    const [isValidParam, setIsValidParam] = useState(true);
    const [isArray, setIsArray] = useState<boolean>(param?.isArray || false);

    const validateNameValue = (value: string) => {
        if (value && validateParamName) {
            const { isValid, message } = validateParamName(value);
            setIsValidParam(isValid);
            if (!isValid) {
                setParamError(message);
            }
        }
        setParamError("");
        return true;
    };

    const onUpdateParamName = (value: string) => {
        setParamName(value);
        validateNameValue(value);
    }

    const handleOnSave = () => {
        onSave({
            ...initValue,
            name: paramName,
            type: paramType,
            isArray
        });
    };

    const handleOnUpdate = () => {
        onUpdate(index, {
            ...initValue,
            name: paramName,
            type: paramType,
            isArray
        });
    };

    const handleParamTypeChange = (type: string) => {
        setParamType(type);
        if (type && type.length > 1) {
            setParamName(camelCase(type.split(':').pop()));
        }
    }

    return (
        <ParamEditorContainer>
            <Row>
                <Column>
                    <InputLabel>Type</InputLabel>
                    <TypeBrowser
                        type={paramType}
                        onChange={handleParamTypeChange}
                        isLoading={loadingCompletions}
                        recordCompletions={completions}
                    />
                </Column>
                {!hideName && (
                    <Column>
                        <InputLabel>Name</InputLabel>
                        <TextField
                            value={paramName}
                            placeholder={paramName}
                            onTextChange={onUpdateParamName}
                            errorMsg={pramError}
                            size={40}
                        />
                    </Column>
                )}

            </Row>
            <Row style={{ marginTop: "8px" }}>
                <Column>
                    {isArraySupported && (
                        <FormControlLabel>
                            <VSCodeCheckbox
                                checked={isArray}
                                onChange={event => setIsArray((event.target as HTMLInputElement).checked)}
                            />
                            <Typography variant="h4" sx={{ textWrap: "nowrap" }}>Is Array</Typography>
                        </FormControlLabel>
                    )}

                </Column>
                <Column>
                    <ButtonContainer>
                        <Button
                            appearance="secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            appearance="primary"
                            disabled={(!hideName && !paramName) || !paramType || pramError !== "" || !isValidParam}
                            onClick={onUpdate ? handleOnUpdate : handleOnSave}
                        >
                            {onUpdate ? "Update" : " Add"}
                        </Button>
                    </ButtonContainer>
                </Column>
            </Row>
        </ParamEditorContainer>
    );
}


const ParamEditorContainer = styled.div((element) => ({
    boxSizing: "border-box",
    height: "153px",
    width: "100%",
    border: "1px solid var(--vscode-editorIndentGuide-background)",
    backgroundColor: "var(--vscode-editorWidget-background)",
    padding: "15px 10px"
}));

const InputLabel = styled.div((element) => ({
    height: "24px",
    width: "38px",
    color: "var(--vscode-input-foreground)",
    fontSize: "13px",
    letterSpacing: "0",
    lineHeight: "24px"
}));

const ButtonContainer = styled.div((element) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
}))

const FormControlLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    width: 100%;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

