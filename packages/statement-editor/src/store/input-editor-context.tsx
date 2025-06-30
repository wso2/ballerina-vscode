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
// tslint:disable: no-empty jsx-no-multiline-js
import React, { useState } from 'react';

export interface InputEditorCtx {
    userInput: string,
    suggestionInput: string,
    onInputChange: (value: string) => void,
    onSuggestionSelection: (value: string) => void
}

export const InputEditorContext = React.createContext<InputEditorCtx>({
    userInput: "",
    suggestionInput: "",
    onInputChange: (value: string) => {},
    onSuggestionSelection: (value: string) => {}
});

export const InputEditorContextProvider: React.FC = (props) => {
    const [userInput, setUserInput] = useState("");
    const [suggestionInput, setSuggestionInput] = useState("");

    const onInputChange = (value: string) => {
        setUserInput(value);
    };

    const onSuggestionSelection = (value: string) => {
        setSuggestionInput(value);
    };

    return (
        <InputEditorContext.Provider
            value={{
                userInput,
                onInputChange,
                suggestionInput,
                onSuggestionSelection
            }}
        >
            {props.children}
        </InputEditorContext.Provider>
    );
};
