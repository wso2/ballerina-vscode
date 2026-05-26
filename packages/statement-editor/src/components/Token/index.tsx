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

import { STKindChecker, STNode } from "@wso2/syntax-tree";
import classNames from "classnames";

import { StatementEditorContext } from "../../store/statement-editor-context";
import { checkCommentMinutiae, getJSXForMinutiae, isPositionsEquals, isQuestionMarkFromRecordField } from "../../utils";
import { StatementEditorViewState } from "../../utils/statement-editor-viewstate";
import { useStatementRendererStyles } from "../styles";

export interface TokenComponentProps {
    model: STNode;
    className?: string;
    isHovered?: boolean;
    parentIdentifier?: string;
    onPlusClick?: (evt: any) => void;
}

export function TokenComponent(props: TokenComponentProps) {
    const { model, className, parentIdentifier, onPlusClick } = props;

    const statementRendererClasses = useStatementRendererStyles();

    const { modelCtx, isExpressionMode } = useContext(StatementEditorContext);
    const {
        currentModel: selectedModel,
        changeCurrentModel,
        hasSyntaxDiagnostics,
        statementModel
    } = modelCtx;

    const [isHovered, setHovered] = React.useState(false);

    if (isExpressionMode && !selectedModel.model) {
        changeCurrentModel(statementModel);
    }

    const isSelected = selectedModel.model && model && model.parent &&
        (
            isPositionsEquals(selectedModel.model.position, model.parent.position) ||
            (isQuestionMarkFromRecordField(model) && isPositionsEquals(selectedModel.model.position, model.position))
        );

    const styleClassName = classNames(
        isSelected && !hasSyntaxDiagnostics && statementRendererClasses.expressionElementSelected,
        statementRendererClasses.expressionBlock,
        statementRendererClasses.expressionBlockDisabled,
        {
            "hovered": !isSelected && isHovered && !hasSyntaxDiagnostics,
        },
        className
    );

    const mappingConstructorConfig = (model.viewState as StatementEditorViewState).multilineConstructConfig;
    const newLineRequired = mappingConstructorConfig.isClosingBraceWithNewLine;
    const isFieldWithNewLine = mappingConstructorConfig.isFieldWithNewLine;

    const leadingMinutiaeJSX = getJSXForMinutiae(model.leadingMinutiae, isFieldWithNewLine);
    const trailingMinutiaeJSX = getJSXForMinutiae(model.trailingMinutiae, isFieldWithNewLine);
    const filteredLeadingMinutiaeJSX = checkCommentMinutiae(leadingMinutiaeJSX);

    const onMouseOver = (e: React.MouseEvent) => {
        setHovered(true);
        e.stopPropagation();
        e.preventDefault();
    }

    const onMouseOut = (e: React.MouseEvent) => {
        setHovered(false);
        e.stopPropagation();
        e.preventDefault();
    }

    const onMouseClick = (e: React.MouseEvent) => {
        if (!hasSyntaxDiagnostics && STKindChecker.isDotToken(model)) {
            e.stopPropagation();
            e.preventDefault();
            if (model.parent) {
                changeCurrentModel(model.parent, model.parent.position, e.shiftKey);
            }
        } else if (!hasSyntaxDiagnostics && isQuestionMarkFromRecordField(model)) {
            e.stopPropagation();
            e.preventDefault();
            changeCurrentModel(model);
        }
    }

    return (
        <span
            className={styleClassName}
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
            onClick={onMouseClick}
        >
            {STKindChecker.isCloseBraceToken(model) && newLineRequired && <br/>}
            {filteredLeadingMinutiaeJSX}
            {model.value}
            {onPlusClick && (
                <span
                    className={`${statementRendererClasses.plusIcon} ${isHovered ? "view" : "hide"}`}
                    onClick={onPlusClick}
                    data-testid="plus-button"
                    id={parentIdentifier}
                >
                +
                </span>
            )}
            {trailingMinutiaeJSX}
        </span>
    );
}
