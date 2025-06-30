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
