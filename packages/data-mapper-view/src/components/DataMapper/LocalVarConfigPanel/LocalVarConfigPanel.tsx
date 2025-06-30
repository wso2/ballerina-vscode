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
import React, { ReactNode, useEffect, useMemo, useState } from "react";

import { STModification } from "@wso2/ballerina-core";
import { LetVarDecl, STKindChecker, STNode } from "@wso2/syntax-tree";
import classNames from "classnames";

import { ExpressionInfo } from "../DataMapper";

import { LetVarDeclItem } from "./LetVarDeclItem";
import {
    getLetExprAddModification,
    getLetExprDeleteModifications,
    getLetExpression,
    getLetExpressions,
    getLetVarDeclarations
} from "./local-var-mgt-utils";
import { NewLetVarDeclPlusButton } from "./NewLetVarDeclPlusButton";
import { useStyles } from "./style";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";
import styled from "@emotion/styled";
import { Button, Codicon, SidePanel } from "@wso2/ui-toolkit";
import { EmptyLocalVarPanel } from "./EmptyLocalVarPanel";
import { hasErrorDiagnosis } from "../../../utils/st-utils";

export interface LetVarDeclModel {
    index: number;
    letVarDecl: LetVarDecl;
    checked: boolean;
    hasDiagnostics: boolean;
}

export interface LocalVarConfigPanelProps {
    handleLocalVarConfigPanel: (showPanel: boolean) => void;
    enableStatementEditor: (expressionInfo: ExpressionInfo) => void;
    fnDef: STNode;
    applyModifications: (modifications: STModification[]) => Promise<void>;
    langServerRpcClient: LangClientRpcClient,
    filePath: string;
}

export const SidePanelTitleContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    font: inherit;
    font-weight: bold;
    color: var(--vscode-editor-foreground);
`;

export const SidePanelBody = styled.div`
    padding: 16px;
`;

export function LocalVarConfigPanel(props: LocalVarConfigPanelProps) {
    const {
        handleLocalVarConfigPanel,
        fnDef,
        enableStatementEditor,
        applyModifications,
        langServerRpcClient,
        filePath
    } = props;

    const letExpression = getLetExpression(fnDef);
    const [letVarDecls, setLetVarDecls] = useState<LetVarDeclModel[]>([]);
    const hasSelectedLetVarDecl = letVarDecls.some(decl => decl.checked);
    const hasDiagnostics = letVarDecls.some(decl => decl.hasDiagnostics);

    useEffect(() => {
        const letVarDeclarations = letExpression
            ? getLetVarDeclarations(letExpression).filter(decl => STKindChecker.isLetVarDecl(decl)) as LetVarDecl[]
            : [];
        setLetVarDecls(letVarDeclarations.map(decl => {
            return {
                index: letVarDeclarations.indexOf(decl),
                letVarDecl: decl,
                checked: false,
                hasDiagnostics: hasErrorDiagnosis(decl)
            };
        }))
    }, [fnDef]);

    const overlayClasses = useStyles();

    const onCancel = () => {
        handleLocalVarConfigPanel(false);
    };

    const onAddNewVar = async (index?: number) => {
        const addModification = getLetExprAddModification(index, fnDef, letExpression, letVarDecls);
        await applyModifications([addModification]);
    };

    const handleOnCheck = (index: number) => {        
        setLetVarDecls(prevDecls => {
            return prevDecls.map(decl => {
                const isChecked = decl.checked;
                if (decl.index === index) {
                    decl.checked = !isChecked;
                }
                return decl;
            }
        )});
    };

    const onEditClick = (letVarDecl: LetVarDecl) => {
        enableStatementEditor({
            label: "Let Variable Expression",
            value: letVarDecl.expression.source,
            valuePosition: letVarDecl.expression.position
        });
    };

    const onSelectAll = () => {
        let checkAll = true;
        const letVarDeclsClone = [...letVarDecls];
        if (letVarDeclsClone.every(value => value.checked)) {
            checkAll = false;
        }
        setLetVarDecls(prevDecls => {
            return prevDecls.map(decl => {
                decl.checked = checkAll;
                return decl;
            }
        )});
    }

    const onDeleteSelected = async () => {
        const letExpressions = getLetExpressions(letExpression);
        const modifications: STModification[] = [];
        letExpressions.forEach(expr => {
            modifications.push(...getLetExprDeleteModifications(expr, letVarDecls));
        });
        const updatedVarList = letVarDecls.filter(decl => !decl.checked);
        setLetVarDecls(updatedVarList);
        await applyModifications(modifications);
    };

    const letVarList: ReactNode = useMemo(() => {
        return (
            <>
                {
                    letVarDecls && letVarDecls.map((decl, index) => {
                        return (
                            <>
                                <NewLetVarDeclPlusButton index={index} onAddNewVar={onAddNewVar}/>
                                <LetVarDeclItem
                                    index={index}
                                    key={decl.letVarDecl.source}
                                    letVarDeclModel={decl}
                                    handleOnCheck={handleOnCheck}
                                    onEditClick={onEditClick}
                                    applyModifications={applyModifications}
                                    langServerRpcClient={langServerRpcClient}
                                    filePath={filePath}
                                />
                            </>
                        );
                    })
                }
            </>
        );
    }, [letVarDecls]);

    return (
        <SidePanel
            isOpen={true}
            alignment="right"
            sx={{ transition: "all 0.3s ease-in-out", width: 600 }}
        >
            <SidePanelTitleContainer>
                <div>Sub Mappings</div>
                <Button onClick={onCancel} appearance="icon"><Codicon name="close"/></Button>
            </SidePanelTitleContainer>
            <SidePanelBody>
                <div className={overlayClasses.localVarFormWrapper}>
                    {letVarList}
                    {letVarDecls.length === 0 ? (
                        <EmptyLocalVarPanel onAddNewVar={onAddNewVar}/>
                    ) : (
                        <>
                            <div className={overlayClasses.addNewButtonWrapper}>
                                <Button
                                    appearance="icon"
                                    onClick={onAddNewVar}
                                    className={overlayClasses.linePrimaryButton} 
                                    sx={{width: '100%'}}
                                >
                                    <Codicon sx={{marginTop: 2, marginRight: 5}} name="add"/>
                                    <div>Add New</div>
                                </Button>
                            </div>
                            <div className={overlayClasses.varMgtToolbar}>
                                <Button onClick={onSelectAll} appearance="icon">
                                    <div className={overlayClasses.localVarControlButton}>
                                        <Codicon sx={{ marginRight: 5 }} name="check-all" />
                                        Select All
                                    </div>
                                </Button>
                                <Button
                                    appearance="icon"
                                    onClick={hasSelectedLetVarDecl ? onDeleteSelected : undefined}
                                    disabled={!hasSelectedLetVarDecl}
                                >
                                    <div 
                                        className={classNames(
                                            overlayClasses.deleteLetVarDecl,
                                            overlayClasses.localVarControlButton,
                                            hasSelectedLetVarDecl && overlayClasses.deleteLetVarDeclEnabled
                                        )}
                                    >
                                        <Codicon sx={{marginRight: 5}} name="trash"/>
                                        Delete Selected
                                    </div>
                                </Button>
                            </div>
                            <div className={overlayClasses.doneButtonWrapper}>
                                <Button
                                    appearance="primary"
                                    onClick={!hasDiagnostics ? onCancel : undefined}
                                    disabled={hasDiagnostics}
                                    tooltip={hasDiagnostics ? "Fix errors to continue" : ""}
                                >
                                    <div className={overlayClasses.doneButton}>Done</div>
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </SidePanelBody>
        </SidePanel>
    );
}
