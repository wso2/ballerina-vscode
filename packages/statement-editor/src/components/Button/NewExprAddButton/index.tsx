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
import React, { useContext } from "react";

import { STNode } from "@wso2/syntax-tree";

import { StatementEditorContext } from "../../../store/statement-editor-context";
import { useStatementRendererStyles } from "../../styles";

export interface AddButtonProps {
    model: STNode;
    onClick?: (model?: STNode) => void;
    classNames?: string;
}

export function NewExprAddButton(props: AddButtonProps) {
    const { model, onClick, classNames } = props;

    const { modelCtx } = useContext(StatementEditorContext);
    const {
        hasSyntaxDiagnostics
    } = modelCtx;

    const statementRendererClasses = useStatementRendererStyles();

    const onClickOnAddButton = () => {
        if (!hasSyntaxDiagnostics) {
            onClick(model);
        }
    };

    return (
        <span
            className={`${statementRendererClasses.plusIcon} ${classNames}`}
            onClick={onClickOnAddButton}
            data-testid="plus-button"
        >
            +
        </span>
    );
}
