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
import React from "react";

import { MappingBindingPattern } from "@wso2/syntax-tree";

import { getMinutiaeJSX } from "../../../utils";
import { StatementEditorViewState } from "../../../utils/statement-editor-viewstate";
import { InputEditor } from "../../InputEditor";

interface MappingBindingPatternProps {
    model: MappingBindingPattern;
}

export function MappingBindingPatternComponent(props: MappingBindingPatternProps) {
    const { model } = props;

    const inputEditorProps = {
        model
    };

    const { leadingMinutiaeJSX, trailingMinutiaeJSX } = getMinutiaeJSX(model);

    return (
        <>
            {leadingMinutiaeJSX}
            <InputEditor {...inputEditorProps} />
            {trailingMinutiaeJSX}
        </>
    );
}
