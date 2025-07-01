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
// tslint:disable: jsx-no-multiline-js no-submodule-imports
import React, { useState } from "react";

import { NodePosition, STNode } from "@wso2/syntax-tree";
import { Icon, ProgressRing, Tooltip, Typography } from "@wso2/ui-toolkit";

import { IDataMapperContext} from "../../../../utils/DataMapperContext/DataMapperContext";
import { getModification } from "../../utils/modifications";
import { useUnionTypeNodeStyles } from "../../../styles";
import { UnionTypeInfo } from "../../utils/union-type-utils";
import { getDefaultValue, getTypeName } from "../../utils/dm-utils";

export interface UnionTypeListItemProps {
    key: number;
    context: IDataMapperContext;
    type: string;
    hasInvalidTypeCast: boolean;
    innermostExpr: STNode;
    typeCastExpr: STNode;
    unionTypeInfo: UnionTypeInfo;
}

export function UnionTypeListItem(props: UnionTypeListItemProps) {
    const { key, context, type, hasInvalidTypeCast, innermostExpr, typeCastExpr, unionTypeInfo } = props;
    const [isAddingTypeCast, setIsAddingTypeCast] = useState(false);
    const classes = useUnionTypeNodeStyles();

    const onClickOnListItem = async () => {
        setIsAddingTypeCast(true)
        try {
            const selectedType = unionTypeInfo.unionType.members.find(member => {
                return getTypeName(member) === type;
            });
            const defaultValue = selectedType ? getDefaultValue(selectedType.typeName) : `()`;
            let targetPosition: NodePosition;
            const valueExprPosition: NodePosition = innermostExpr.position;
            if (hasInvalidTypeCast) {
                const typeCastExprPosition: NodePosition = typeCastExpr.position;
                targetPosition = {
                    ...typeCastExprPosition,
                    endLine: valueExprPosition.startLine,
                    endColumn: valueExprPosition.startColumn
                };
            } else {
                targetPosition = valueExprPosition;
            }
            const modification = [getModification(`<${type}>${defaultValue}`, targetPosition)];
            await context.applyModifications(modification);
        } finally {
            setIsAddingTypeCast(false);
        }
    };

    return (
        <Tooltip
            content={type}
            position="right"
        >
            <div
                key={key}
                onMouseDown={onClickOnListItem}
                className={classes.unionTypeListItem}
            >
                {isAddingTypeCast ? (
                    <ProgressRing />
                ) : (
                    <Icon
                        name="symbol-struct-icon"
                        sx={{ height: "15px", width: "15px" }}
                        iconSx={{ display: "flex", fontSize: "15px", color: "var(--vscode-input-placeholderForeground)" }}
                    />
                )}
                <Typography variant="h4" className={classes.unionTypeValue} sx={{ margin: "0 0 0 6px" }} >
                    {type}
                </Typography>
            </div>
        </Tooltip>
    );
}
