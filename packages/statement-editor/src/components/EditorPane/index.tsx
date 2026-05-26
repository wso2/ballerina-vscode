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

import { StatementEditorContext } from "../../store/statement-editor-context";
import { Diagnostics } from "../Diagnostics";
import { HelperPane } from "../HelperPane";
import { StatementRenderer } from "../StatementRenderer";
import { useStatementEditorStyles } from "../styles";
import Toolbar from "../Toolbar";

export function EditorPane() {
    const statementEditorClasses = useStatementEditorStyles();
    const [docExpandClicked, setDocExpand] = React.useState(false);

    const stmtCtx = useContext(StatementEditorContext);

    const {
        modelCtx: {
            statementModel
        },
    } = stmtCtx;

    return (
        <>
            <div className={statementEditorClasses.stmtEditorContentWrapper} data-testid="statement-contentWrapper">
                <Toolbar />
                <div className={statementEditorClasses.sourceEditor}>
                    <div className={statementEditorClasses.statementExpressionContent}  data-testid="statement-renderer">
                        <StatementRenderer
                            model={statementModel}
                        />
                    </div>
                    <Diagnostics/>
                </div>
            </div>
            <div className={statementEditorClasses.suggestionsSection} data-testid="suggestions-section">
                <HelperPane />
            </div>
        </>
    );
}
