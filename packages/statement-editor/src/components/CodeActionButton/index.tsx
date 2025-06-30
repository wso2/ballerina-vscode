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
import React, { useContext, useEffect, useRef, useState } from "react";

import { NodePosition } from "@wso2/syntax-tree";
import { Button, Codicon, Item, Menu, MenuItem } from "@wso2/ui-toolkit";
import { CodeAction, TextDocumentEdit } from "vscode-languageserver-protocol";

import { StatementSyntaxDiagnostics } from "../../models/definitions";
import { StatementEditorContext } from "../../store/statement-editor-context";
import {
    filterCodeActions,
    getContentFromSource,
    getStatementIndex,
    getStatementPosition,
    getUpdatedSource,
    isPositionsEquals
} from "../../utils";

import { useStyles } from "./style";

export interface CodeActionButtonProps {
    syntaxDiagnostic: StatementSyntaxDiagnostics;
    index?: number;
}

export function CodeActionButton(props: CodeActionButtonProps) {
    const { syntaxDiagnostic, index: key } = props;

    const classes = useStyles();

    const stmtCtx = useContext(StatementEditorContext);
    const {
        currentFile,
        modelCtx: { statementModel, updateStatementModel },
    } = stmtCtx;

    const [updatedSource, setUpdatedSource] = useState(currentFile.draftSource);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const contextRef = useRef(null);

    const codeActions = filterCodeActions(syntaxDiagnostic.codeActions);
    const menuItems: React.ReactNode[] = [];

    useEffect(() => {
        setUpdatedSource(currentFile.draftSource);
    }, [currentFile.draftSource]);

    if (codeActions) {
        codeActions.reverse();
        codeActions.forEach((action, index) => {
            const onSelectCodeAction = () => {
                applyCodeAction(action);
            };
            const itemElement = (
                <div
                    className={classes.itemContainer}
                    key={action.title}
                >
                    <div>{action.title}</div>
                </div>
            );
            const menuItem: Item = { id: action.title, label: itemElement, onClick: onSelectCodeAction }
            menuItems.push(
                <MenuItem
                    sx={{ pointerEvents: "auto", userSelect: "none" }}
                    item={menuItem}
                    data-testid={`code-action-${index}`}
                />
            );
        });
    }

    const onClickCodeAction = () => {
        setIsMenuOpen(prev => !prev);
    };

    const onCloseCodeActionMenu = () => {
        setIsMenuOpen(false);
    };

    const applyCodeAction = async (action: CodeAction) => {
        const editorActiveStatement = getContentFromSource(updatedSource, currentFile.draftPosition);
        const editorActivePosition: NodePosition = { ...currentFile.draftPosition };
        let currentSource = updatedSource;

        if (!(editorActivePosition.endLine || editorActivePosition.endLine === 0)) {
            editorActivePosition.endLine =
                statementModel.position.endLine - statementModel.position.startLine + editorActivePosition.startLine;
        }

        const reversedTextEdits = (action.edit?.documentChanges[0] as TextDocumentEdit).edits.reverse();

        reversedTextEdits.forEach(textEdit => {
            let targetedEditPosition: NodePosition;
            if (textEdit.newText.indexOf("\n") !== 0) {
                targetedEditPosition = {
                    endColumn: textEdit.range.end.character,
                    endLine: textEdit.range.end.line,
                    startColumn: textEdit.range.start.character,
                    startLine: textEdit.range.start.line,
                };
            } else {
                // statement with a new line
                targetedEditPosition = {
                    startColumn: 0,
                    startLine: textEdit.range.start.line + 1,
                };
            }

            currentSource = getUpdatedSource(textEdit.newText, currentSource, targetedEditPosition, undefined, true, false);
            if (targetedEditPosition.startLine < editorActivePosition.startLine) {
                const stmtIndex = getStatementIndex(currentSource, editorActiveStatement, editorActivePosition);
                const newTargetPosition = getStatementPosition(currentSource, editorActiveStatement, stmtIndex);
                const newLine = newTargetPosition.startLine;
                editorActivePosition.startLine = newLine;
                editorActivePosition.endLine += newLine - editorActivePosition.startLine;
            } else if (targetedEditPosition.startLine >= editorActivePosition.startLine
                && targetedEditPosition.endLine <= editorActivePosition.endLine) {
                // The text edit applies for the editorActiveExpression
                const isSingleLinedExpr = editorActivePosition.startLine === editorActivePosition.endLine;
                const newTextLines = textEdit.newText.split('\n');
                const noOfNewTextLines = newTextLines.length - 1;
                editorActivePosition.endLine = editorActivePosition.endLine + noOfNewTextLines;

                if (isPositionsEquals(targetedEditPosition, editorActivePosition)) {
                    // The entire editorActiveExpression is replaced by the text edit
                    editorActivePosition.endColumn = isSingleLinedExpr
                        ? noOfNewTextLines > 0
                            ? newTextLines[newTextLines.length - 1].length
                            : editorActivePosition.startColumn + textEdit.newText.length
                        : newTextLines[newTextLines.length - 1].length;
                } else if (targetedEditPosition.startColumn === editorActivePosition.startColumn && isSingleLinedExpr) {
                    // The text edit appends as a prefix
                    editorActivePosition.endColumn = noOfNewTextLines > 0
                        ? newTextLines[newTextLines.length - 1].length + editorActiveStatement.length
                        : editorActivePosition.startColumn + textEdit.newText.length + editorActiveStatement.length;
                } else if (targetedEditPosition.endColumn === editorActivePosition.endColumn) {
                    // The text edit appends as a suffix
                    editorActivePosition.endColumn = noOfNewTextLines > 0
                        ? newTextLines[newTextLines.length - 1].length
                        : editorActivePosition.endColumn + textEdit.newText.length;
                } else if (isSingleLinedExpr || (!isSingleLinedExpr && targetedEditPosition.startLine === editorActivePosition.endLine)) {
                    // The text edit placed within editorActiveExpression
                    const charsAfterTextEdit = editorActivePosition.endColumn - targetedEditPosition.startColumn
                    editorActivePosition.endColumn = noOfNewTextLines > 0
                        ? newTextLines[newTextLines.length - 1].length + charsAfterTextEdit
                        : editorActivePosition.endColumn + textEdit.newText.length;
                }
            }
        });

        const changedActiveContent = getContentFromSource(currentSource, editorActivePosition);
        editorActivePosition.endColumn = currentFile.draftPosition.startColumn + changedActiveContent.length;

        // TODO: add loader while changing source
        await updateStatementModel(changedActiveContent, currentSource, editorActivePosition);
        setUpdatedSource(currentSource);
        setIsMenuOpen(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    }

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div ref={contextRef} className={classes.container} data-testid="code-action-btn" data-index={key}>
            <Button
                appearance="icon"
                onClick={onClickCodeAction}
                data-testid="code-action-icon"
            >
                <Codicon name="lightbulb" sx={{color: 'var(--vscode-editorLightBulb-foreground)'}}/>
            </Button>
            {isMenuOpen && (
                <Menu
                    sx={{
                        background: 'var(--vscode-quickInput-background)',
                        padding: '0px',
                        position: 'absolute',
                        zIndex: 1,
                        border: '1px solid var(--vscode-panel-border)',
                    }}
                >
                    {menuItems}
                </Menu>
            )}
        </div>
    );
}
