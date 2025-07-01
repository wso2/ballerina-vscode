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
import React from "react";

import { STNode } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";

import { UnionTypeListItem } from "./UnionTypeListItem";
import { UnionTypeInfo } from "../../utils/union-type-utils";

export interface UnionTypesListProps {
    unionTypes: string[];
    context: IDataMapperContext;
    hasInvalidTypeCast: boolean;
    innermostExpr: STNode;
    typeCastExpr: STNode;
    unionTypeInfo: UnionTypeInfo;
}

export function UnionTypesList(props: UnionTypesListProps) {
    const { unionTypes, context, hasInvalidTypeCast, innermostExpr, typeCastExpr, unionTypeInfo } = props;

    return (
        <>
            {
                unionTypes.map((type: string, index: number) => (
                    <UnionTypeListItem
                        key={index}
                        context={context}
                        type={type}
                        hasInvalidTypeCast={hasInvalidTypeCast}
                        innermostExpr={innermostExpr}
                        typeCastExpr={typeCastExpr}
                        unionTypeInfo={unionTypeInfo}
                    />
                ))
            }
        </>
    );
}
