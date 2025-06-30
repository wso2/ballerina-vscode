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

import { Codicon, Typography } from "@wso2/ui-toolkit";

import { StatementSyntaxDiagnostics } from "../../models/definitions";
import { StatementEditorContext } from "../../store/statement-editor-context";
import { filterCodeActions } from "../../utils";
import { CodeActionButton } from "../CodeActionButton";
import { useStatementEditorDiagnosticStyles } from "../styles";

export const DiagnosticsPaneId = "data-mapper-diagnostic-pane";

export function Diagnostics() {
    const statementEditorDiagnosticClasses = useStatementEditorDiagnosticStyles();
    const stmtCtx = useContext(StatementEditorContext);
    const {
        statementCtx: { diagnostics, errorMsg },
    } = stmtCtx;
    let hasCodeAction = false;

    function actionButton(diag: StatementSyntaxDiagnostics, key?: number) {
        if (filterCodeActions(diag.codeActions).length > 0) {
            hasCodeAction = true;
            return <CodeActionButton syntaxDiagnostic={diag} index={key}/>;
        } else if (hasCodeAction) {
            return <div style={{ width: "30px", marginRight: "6px" }} />;
        }
    }

    const diagnosticsMessages = diagnostics && diagnostics.map((diag: StatementSyntaxDiagnostics, index: number) =>
        !diag.isPlaceHolderDiag && (
            <div className={statementEditorDiagnosticClasses.diagnosticsPaneInner}>
                {actionButton(diag, index)}
                <Codicon name="error" sx={{marginTop: '3px', cursor: 'unset'}} />
                <Typography
                    variant="body2"
                    sx={{marginLeft: "5px"}}
                >
                    {diag.message}
                </Typography>
            </div>
        )
    );

    const errorMessage = errorMsg && errorMsg.length > 0 && (
        <Typography
            variant="body2"
            data-testid="error-message"
        >
            {errorMsg}
        </Typography>
    );

    return (
        <div
            id={DiagnosticsPaneId}
            className={(diagnosticsMessages.length > 0 || errorMessage) && statementEditorDiagnosticClasses.diagnosticsPane}
            data-testid="diagnostics-pane"
        >
            <div>
                {diagnostics && diagnosticsMessages}
                {errorMsg && errorMsg.length > 0 && errorMessage}
            </div>
        </div>
    );
}
