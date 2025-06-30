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
import classNames from "classnames";

import { DiagnosticTooltip } from "../../../Diagnostic/DiagnosticTooltip/DiagnosticTooltip";
import { useStyles } from "../styles";
import { Button, Icon } from "@wso2/ui-toolkit";

export const ClickableExpression = (props: {
    node: STNode;
    onEditClick: () => void;
    index?: number;
    testIdPrefix?: string;
    expressionPlaceholder?: string;
}) => {
    const classes = useStyles();
    const { node, onEditClick, index, testIdPrefix, expressionPlaceholder = "<add-expression>" } = props;
    const hasDiagnostic = !!node?.typeData?.diagnostics?.length && node.source.trim() !== "EXPRESSION";

    if (hasDiagnostic) {
        return (
            <DiagnosticTooltip
                placement="right"
                diagnostic={node?.typeData?.diagnostics?.[0]}
                value={node.source}
                onClick={onEditClick}
            >
                <Button
                    appearance="icon"
                    data-testid={`${testIdPrefix || "intermediate-clause-expression"}-${index}`}
                    onClick={onEditClick}
                >
                    {node.source}
                    <Icon
                        name="error-icon"
                        sx={{ height: "14px", width: "14px" }}
                        iconSx={{ fontSize: "14px", color: "var(--vscode-errorForeground)" }}
                    />
                </Button>
            </DiagnosticTooltip>
        );
    }

    return (
        <span
            className={classNames({
                [classes.clausePlaceholder]: node.source.trim() === "EXPRESSION",
                [classes.clauseExpression]: true,
            })}
            onClick={onEditClick}
            data-testid={`${testIdPrefix || "intermediate-clause-expression"}-${index}`}
        >
            {node.source.trim() === "EXPRESSION" ? expressionPlaceholder : node.source}
        </span>
    );
};
