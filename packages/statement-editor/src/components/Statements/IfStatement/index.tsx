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

import { IfElseStatement, NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree"

import { ELSEIF_CLAUSE, ELSE_CLAUSE } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { NewExprAddButton } from "../../Button/NewExprAddButton";
import { ExpressionComponent } from "../../Expression";
import { StatementRenderer } from "../../StatementRenderer";
import { TokenComponent } from "../../Token";

interface IfStatementProps {
    model: IfElseStatement;
}

export function IfStatementC(props: IfStatementProps) {
    const { model } = props;
    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: {
            currentModel,
            changeCurrentModel,
            updateModel
        }
    } = stmtCtx;

    if (!currentModel.model && !STKindChecker.isElseBlock(model)) {
        changeCurrentModel(model.condition);
    }

    const isFinalIfElseStatement = !(model.elseBody?.elseBody as IfElseStatement)?.ifBody;
    const isElseAvailable = model.elseBody?.elseBody && STKindChecker.isBlockStatement(model.elseBody?.elseBody);

    const addNewIfStatement = (ifBodyModel: STNode) => {
        const newPosition: NodePosition = {
            ...ifBodyModel.position
        }
        updateModel(`${ELSEIF_CLAUSE}`, newPosition);
    };

    const addNewElseStatement = (ifBodyModel: STNode) => {
        const newPosition: NodePosition = {
            ...ifBodyModel.position
        }
        updateModel(`${ELSE_CLAUSE}`, newPosition);
    };

    return (
        <>
            <TokenComponent model={model.ifKeyword} className="keyword" />
            <ExpressionComponent model={model.condition} />
            <TokenComponent model={model.ifBody.openBraceToken} />
            &nbsp;&nbsp;&nbsp;{"..."}
            {isFinalIfElseStatement && !isElseAvailable && <br />}
            <TokenComponent model={model.ifBody.closeBraceToken} />
            {isFinalIfElseStatement && (
                isElseAvailable ? (
                    <>
                        <NewExprAddButton model={model.ifBody.closeBraceToken} onClick={addNewIfStatement} />
                        &nbsp;
                    </>
                ) : (
                    <>
                        &nbsp;
                        <NewExprAddButton model={model.ifBody.closeBraceToken} onClick={addNewElseStatement} />
                    </>
                )
            )}
            {!!model.elseBody && <StatementRenderer model={model.elseBody} />}
        </>
    );
}
