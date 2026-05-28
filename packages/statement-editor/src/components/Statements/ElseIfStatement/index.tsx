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
import React, { ReactNode, useContext } from "react";

import { ElseBlock, NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree"
import classNames from "classnames";

import { StatementEditorContext } from "../../../store/statement-editor-context";
import { ExprDeleteButton } from "../../Button/ExprDeleteButton";
import { StatementRenderer } from "../../StatementRenderer";
import { useStatementRendererStyles } from "../../styles";
import { TokenComponent } from "../../Token";

interface ElseBlockProps {
    model: ElseBlock;
}

export function ElseBlockC(props: ElseBlockProps) {
    const { model } = props;
    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: {
            updateModel
        }
    } = stmtCtx;

    const statementRendererClasses = useStatementRendererStyles();

    const deleteIfStatement = (ifBodyModel: STNode) => {
        const newPosition: NodePosition = {
            ...ifBodyModel.position,
            startColumn: 0,
            endColumn: 0
        }
        updateModel(``, newPosition);
    };

    const deleteElseStatement = (ifBodyModel: STNode) => {
        const newPosition: NodePosition = {
            ...ifBodyModel.position,
            startLine: ifBodyModel.position.startLine - 1,
            startColumn: 0,
            endColumn: 0
        }
        updateModel(`}`, newPosition);
    };

    const conditionComponent: ReactNode = (STKindChecker.isBlockStatement(model.elseBody)) ?
        (
            <>
                <TokenComponent model={model.elseKeyword} className="keyword" />
                <TokenComponent model={model.elseBody.openBraceToken} />
                &nbsp;&nbsp;&nbsp;{"..."}
                <TokenComponent model={model.elseBody.closeBraceToken} />
                &nbsp;
                <ExprDeleteButton model={model.elseBody} onClick={deleteElseStatement} />;
            </>
        ) : (
            <span>
                <span
                    className={classNames(
                        statementRendererClasses.expressionBlock,
                        statementRendererClasses.expressionBlockDisabled,
                        "keyword"
                    )}
                >
                    <ExprDeleteButton
                        model={model.elseBody.ifBody}
                        onClick={deleteIfStatement}
                    />&nbsp;
                    {"else"}&nbsp;
                </span>
                <StatementRenderer
                    model={model?.elseBody}
                />
            </span>
        );

    return (
        conditionComponent
    );
}
