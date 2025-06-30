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
import React, { useState } from "react";

import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

import { useStmtEditorHelperPanelStyles } from "../../styles";

interface NamedArgIncludedRecordProps {
    isNewRecord: boolean
    addIncludedRecordToModel: (userInput: string) => void
}
// tslint:disable: jsx-no-multiline-js
export function NamedArgIncludedRecord(props: NamedArgIncludedRecordProps){
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const {isNewRecord, addIncludedRecordToModel} = props;
    const defaultNamedArg = "NamedArg";
    const [userInput, setUserInput] = useState<string>(defaultNamedArg);


    const inputEnterHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            addIncludedRecordToModel(userInput);
        }
    };

    const inputChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUserInput(event.target.value);
    };

    return (
        <>
            {isNewRecord && (
                <div className={stmtEditorHelperClasses.docListDefault} data-testid="named-arg">
                    <VSCodeCheckbox
                        checked={true}
                    />
                    <input
                        placeholder={defaultNamedArg}
                        autoFocus={true}
                        onKeyDown={inputEnterHandler}
                        onInput={inputChangeHandler}
                        style={{ padding: '8px'}}
                        data-testid="named-arg-input"
                    />
                </div>
            )}
        </>
    );
}
