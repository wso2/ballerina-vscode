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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline
import React from "react";

import { STNode, WhereClause } from "@wso2/syntax-tree";

import { DEFAULT_INTERMEDIATE_CLAUSE } from "../../../constants";
import { getMinutiaeJSX } from "../../../utils";
import { ExpressionComponent } from "../../Expression";
import { TokenComponent } from "../../Token";

interface WhereClauseProps {
    model: WhereClause;
}

export function WhereClauseComponent(props: WhereClauseProps) {
    const { model } = props;

    const exprModel: STNode = {
        ...model.expression,
        position: model.position
    }

    const { leadingMinutiaeJSX } = getMinutiaeJSX(model);

    return (
        <>
            {model.expression?.source?.includes(DEFAULT_INTERMEDIATE_CLAUSE) ?
                <>
                    {leadingMinutiaeJSX}
                    <ExpressionComponent model={exprModel}/>
                </>
                : (
                    <>
                        <TokenComponent model={model.whereKeyword} className={"keyword"}/>
                        <ExpressionComponent model={model.expression}/>
                    </>
                )}
        </>
    );
}
