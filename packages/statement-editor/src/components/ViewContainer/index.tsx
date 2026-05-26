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
import React, { useContext } from 'react';

import { STKindChecker } from "@wso2/syntax-tree";
import { Button, Codicon, SidePanelTitleContainer } from '@wso2/ui-toolkit';
import { URI } from 'vscode-uri';

import { StatementEditorContext } from "../../store/statement-editor-context";
import { sendDidChange } from "../../utils/ls-utils";
import { EditorOverlay, OverlayType } from '../EditorOverlay';
import { EditorPane } from '../EditorPane';
import { useStatementEditorStyles } from "../styles";

export interface ViewContainerProps {
    isStatementValid: boolean;
    isConfigurableStmt: boolean;
    isPullingModule: boolean;
    isDisableEditor: boolean;
    isHeaderHidden?: boolean;
}

export function ViewContainer(props: ViewContainerProps) {
    const {
        isStatementValid,
        isPullingModule,
        isDisableEditor,
        isHeaderHidden
    } = props;
    const overlayClasses = useStatementEditorStyles();
    const {
        currentFile,
        applyModifications,
        langServerRpcClient,
        onCancel,
        onWizardClose,
        modelCtx: {
            statementModel,
            editing
        },
        editorCtx: {
            editors,
            activeEditorId
        }
    } = useContext(StatementEditorContext);
    const fileSchemeURI = URI.file(currentFile.path).toString();

    const onSaveClick = async () => {
        const typeName = await handleModifications();
        onWizardClose(typeName);
    };

    const onCancelClick = async () => {
        await handleClose();
        onCancel();
    };

    const handleModifications = async () => {
        if (statementModel) {
            await sendDidChange(fileSchemeURI, currentFile.draftSource, langServerRpcClient);
            // HACK: trigger apply modification with space to re draw diagram and code formatting
            applyModifications([
                {
                    "startLine": 0,
                    "startColumn": 0,
                    "endLine": 0,
                    "endColumn": 0,
                    "type": "INSERT",
                    "isImport": false,
                    "config": {
                        "STATEMENT": "  "
                    }
                }

            ]);

            if (STKindChecker.isTypeDefinition(statementModel)) {
                return statementModel.source;
            }
        }
    };

    const handleClose = async () => {
        onWizardClose();
    };

    return (
        (
            <>
                <SidePanelTitleContainer>
                    {!isHeaderHidden && (
                        <>
                            <div>{editors[activeEditorId].label}</div>
                            <Button onClick={onCancel} appearance="icon"><Codicon name="close"/></Button>
                        </>
                    )}
                </SidePanelTitleContainer>
                <div className={overlayClasses.mainStatementWrapper} data-testid="statement-editor">
                    {isDisableEditor && (
                        <EditorOverlay type={OverlayType.Disabled}/>
                    )}
                    {isPullingModule && !isDisableEditor && (
                        <EditorOverlay type={OverlayType.ModulePulling}/>
                    )}
                    {!isPullingModule && !isDisableEditor && (
                        <>
                            <div className={overlayClasses.statementExpressionWrapper}>
                                <EditorPane data-testid="editor-pane" />
                            </div>
                            <div className={overlayClasses.footer}>
                                <div className={overlayClasses.buttonWrapper}>
                                    <Button
                                        appearance='secondary'
                                        onClick={onCancelClick}
                                        data-testid="cancel-btn"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        appearance='primary'
                                        onClick={onSaveClick}
                                        disabled={!isStatementValid || editing}
                                        data-testid="save-btn"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </>
        )
    )
}
