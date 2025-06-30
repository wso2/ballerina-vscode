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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React, { ReactNode, useMemo, useState } from "react";

// tslint:disable-next-line:no-submodule-imports
import { VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import { STModification } from "@wso2/ballerina-core";
import { CaptureBindingPattern, LetVarDecl, NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";
import classNames from "classnames";

import { getRenameEdits } from "../../Diagram/utils/ls-utils";

import { LetVarDeclModel } from "./LocalVarConfigPanel";
import { useStyles } from "./style";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";
import styled from "@emotion/styled";
import { Icon, ProgressRing, Tooltip } from "@wso2/ui-toolkit";

export const LocalVarContainer = styled.div`
    display: flex;
    margin: 10px 0;
    flex-direction: row;
    border-radius: 5px;
    padding: 10px;
    border: 1px solid var(--vscode-dropdown-border);
    margin-left: 10px;
    justify-content: space-between;
    height: 40px;
    align-items: center;
`;

interface LetVarDeclItemProps {
    index: number;
    letVarDeclModel: LetVarDeclModel;
    handleOnCheck: (index: number) => void;
    onEditClick: (letVarDecl: LetVarDecl) => void;
    applyModifications: (modifications: STModification[]) => Promise<void>;
    langServerRpcClient: LangClientRpcClient;
    filePath: string;
}

export function LetVarDeclItem(props: LetVarDeclItemProps) {
    const {index, letVarDeclModel, handleOnCheck, onEditClick, applyModifications, langServerRpcClient, filePath} = props;
    const overlayClasses = useStyles();
    const varNameNode = (letVarDeclModel.letVarDecl.typedBindingPattern.bindingPattern as CaptureBindingPattern)
        .variableName;
    const exprSource = letVarDeclModel.letVarDecl.expression.source.trim();
    const isExprPlaceholder = exprSource === "EXPRESSION";
    const diagnostic = letVarDeclModel.hasDiagnostics ? letVarDeclModel.letVarDecl?.typeData?.diagnostics[0] : undefined;

    const [type, varName] = useMemo(() => {
        const pattern = letVarDeclModel.letVarDecl.typedBindingPattern;
        if (STKindChecker.isCaptureBindingPattern(pattern.bindingPattern)) {
            return [pattern.typeDescriptor.source.trim(), pattern.bindingPattern.variableName.value];
        }
        return [undefined, undefined];
    }, [letVarDeclModel]);

    const [updatedName, setUpdatedName] = useState(varName);
    const [updatedExpr, setUpdatedExpr] = useState(exprSource);
    const [nameEditable, setNameEditable] = useState(false);
    const [exprEditable, setExprEditable] = useState(false);
    const [isLoading, setLoading] = useState(false);

    const handleCheckboxClick = () => {
        handleOnCheck(letVarDeclModel.index);
    };

    const handleEdit = (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
        event.preventDefault();
        onEditClick(letVarDeclModel.letVarDecl);
    };

    const onKeyUp = async (key: string, node?: STNode) => {
        if (key === "Escape") {
            setNameEditable(false);
            setExprEditable(false);
        }
        if (key === "Enter") {
            setLoading(true);
            try {
                const workspaceEdit = await getRenameEdits(filePath, updatedName, node.position as NodePosition, langServerRpcClient);
                const modifications: STModification[] = [];

                Object.values(workspaceEdit?.changes).forEach((edits) => {
                    edits.forEach((edit) => {
                        modifications.push({
                            type: "INSERT",
                            config: {STATEMENT: edit.newText},
                            endColumn: edit.range.end.character,
                            endLine: edit.range.end.line,
                            startColumn: edit.range.start.character,
                            startLine: edit.range.start.line,
                        });
                    });
                });

                if (updatedExpr !== exprSource) {
                    modifications.push({
                        type: "INSERT",
                        config: {STATEMENT: updatedExpr},
                        endColumn: letVarDeclModel.letVarDecl.expression.position.endColumn,
                        endLine: letVarDeclModel.letVarDecl.expression.position.endLine,
                        startColumn: letVarDeclModel.letVarDecl.expression.position.startColumn,
                        startLine: letVarDeclModel.letVarDecl.expression.position.startLine,
                    });
                }

                modifications.sort((a, b) => a.startLine - b.startLine);
                await applyModifications(modifications);
            } finally {
                setLoading(false);
            }
        }
    };

    const ExpressionContent = () => (
        <>{isExprPlaceholder ? `<add-expression>` : exprSource}</>
    );

    const DiagnosticsTooltip = (
        <>
            {diagnostic && (
                <div className={overlayClasses.declExpressionWarning}>
                    <Icon name="error-icon" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                    <div className={overlayClasses.declExpressionErrorMessage}>{diagnostic.message}</div>
                </div>
            )}
        </>
    );

    const expression: ReactNode = (
        <div className={overlayClasses.declWrap}>
            {nameEditable ? (
                <input
                    spellCheck={false}
                    className={overlayClasses.input}
                    autoFocus={true}
                    value={updatedName}
                    onChange={(event) => setUpdatedName(event.target.value)}
                    onKeyUp={(event) =>
                        onKeyUp(
                            event.key,
                            varNameNode
                        )
                    }
                    onBlur={() => {
                        setNameEditable(false);
                        setUpdatedName(varName);
                    }}
                    data-testid={`local-variable-name-input-${index}`}
                />
            ) : (
                <span
                    onClick={() => setNameEditable(true)}
                    data-testid={`local-variable-name-${index}`}
                    className={overlayClasses.declExpression}
                >
                    {updatedName}
                </span>
            )}
            <span>{letVarDeclModel.letVarDecl.equalsToken.value}</span>
            <span
                className={classNames(
                    overlayClasses.declExpression,
                    isExprPlaceholder && overlayClasses.exprPlaceholder,
                    diagnostic && overlayClasses.declExpressionError
                )}
                onClick={handleEdit}
                data-testid={`local-variable-value-${index}`}
            >
                {diagnostic ? (
                    <Tooltip
                        id={`local-var-diagnostic-${index}`}
                        content={DiagnosticsTooltip}
                        position="bottom"
                    >
                        <ExpressionContent />
                    </Tooltip>
                ) : (
                    <ExpressionContent />
                )}
            </span>
        </div>
    );

    return (
        <LocalVarContainer>
            <div className={overlayClasses.contentSection}>
                {isLoading ? (
                    <ProgressRing sx={{ height: '16px', width: '16px' }} />
                ) : (
                    <VSCodeCheckbox checked={letVarDeclModel.checked} onClick={handleCheckboxClick} id="select-local-var" />
                )}
                {expression}
            </div>
        </LocalVarContainer>
    );
}
