/*
 * Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React from "react";

import { STNode } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { UnionTypeInfo } from "../../utils/union-type-utils";

import { UnionTypesList } from "./UnionTypesList";

export interface UnionTypeSelectorProps {
    context: IDataMapperContext;
    supportedUnionTypes: string[];
    hasInvalidTypeCast: boolean;
    innermostExpr: STNode;
    typeCastExpr: STNode;
    unionTypeInfo: UnionTypeInfo;
}

export function UnionTypeSelector(props: UnionTypeSelectorProps) {
    const { context, supportedUnionTypes, hasInvalidTypeCast, innermostExpr, typeCastExpr, unionTypeInfo } = props;

    return (
        <UnionTypesList
            context={context}
            unionTypes={supportedUnionTypes}
            hasInvalidTypeCast={hasInvalidTypeCast}
            innermostExpr={innermostExpr}
            typeCastExpr={typeCastExpr}
            unionTypeInfo={unionTypeInfo}
        />
    );
}
