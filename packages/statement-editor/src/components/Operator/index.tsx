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
import React, { useContext } from "react";

import { AsteriskToken,
    BitwiseAndToken,
    BitwiseXorToken,
    DoubleDotLtToken,
    DoubleEqualToken,
    DoubleGtToken,
    DoubleLtToken,
    EllipsisToken,
    ElvisToken,
    GtEqualToken,
    GtToken,
    LogicalAndToken,
    LogicalOrToken,
    LtEqualToken,
    LtToken,
    NotDoubleEqualToken,
    NotEqualToken,
    PercentToken,
    PipeToken,
    PlusToken,
    SlashToken,
    TrippleEqualToken,
    TrippleGtToken } from "@wso2/syntax-tree";
import cn from "classnames";

import { StatementEditorContext } from "../../store/statement-editor-context";
import { getMinutiaeJSX, isPositionsEquals } from "../../utils";
import { InputEditor } from "../InputEditor";
import { useStatementRendererStyles } from "../styles";

export interface OperatorProps {
    model:  AsteriskToken |
            BitwiseAndToken |
            BitwiseXorToken |
            DoubleDotLtToken |
            DoubleEqualToken |
            DoubleGtToken |
            DoubleLtToken |
            EllipsisToken |
            ElvisToken |
            GtEqualToken |
            GtToken |
            LogicalAndToken |
            LogicalOrToken |
            LtEqualToken |
            LtToken |
            NotDoubleEqualToken |
            NotEqualToken |
            PercentToken |
            PipeToken |
            PlusToken |
            SlashToken |
            TrippleEqualToken |
            TrippleGtToken;
}

export function OperatorComponent(props: OperatorProps) {
    const { model } = props;

    const [isHovered, setHovered] = React.useState(false);

    const { modelCtx } = useContext(StatementEditorContext);
    const {
        currentModel: selectedModel,
        changeCurrentModel,
        hasSyntaxDiagnostics
    } = modelCtx;

    const statementRenedererClasses = useStatementRendererStyles();

    const isSelected = selectedModel.model && model && isPositionsEquals(selectedModel.model.position, model.position);

    const onMouseOver = (e: React.MouseEvent) => {
        setHovered(true);
        e.stopPropagation();
        e.preventDefault();
    }

    const onMouseOut = (e: React.MouseEvent) => {
        setHovered(false);
        e.stopPropagation();
        e.preventDefault();
    }

    const onMouseClick = (e: React.MouseEvent) => {
        if (!hasSyntaxDiagnostics) {
            e.stopPropagation();
            e.preventDefault();
            changeCurrentModel(model);
        }
    }

    const styleClassNames = cn(statementRenedererClasses.expressionElement,
        isSelected && statementRenedererClasses.expressionElementSelected,
        {
            "hovered": !isSelected && isHovered && !hasSyntaxDiagnostics,
        },
    )
    const inputEditorProps = {
        model,
        classNames: "operator",
        notEditable: true
    };

    const { leadingMinutiaeJSX, trailingMinutiaeJSX } = getMinutiaeJSX(model);

    return (
        <span
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
            className={styleClassNames}
            onClick={onMouseClick}
        >
            {leadingMinutiaeJSX}
            <InputEditor {...inputEditorProps} />
            {trailingMinutiaeJSX}
        </span>
    );
}
