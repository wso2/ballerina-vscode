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

import { RecordField } from "@wso2/syntax-tree";

import { FIELD_DESCRIPTOR } from "../../../../constants";
import { StatementEditorContext } from "../../../../store/statement-editor-context";
import { ExpressionComponent } from "../../../Expression";
import { TokenComponent } from "../../../Token";

interface RecordFieldProps {
    model: RecordField;
    isHovered?: boolean;
}

export function RecordFieldComponent(props: RecordFieldProps) {
    const { model, isHovered } = props;

    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: {
            updateModel,
        }
    } = stmtCtx;

    const onClickOnPlusIcon = (event: any) => {
        event.stopPropagation();
        const newPosition = {
            startLine: model.position.endLine,
            startColumn: model.position.endColumn,
            endLine: model.position.endLine,
            endColumn: model.position.endColumn
        }
        updateModel(`${FIELD_DESCRIPTOR};`, newPosition);
    };

    return (
        <>
            {model.readonlyKeyword && <ExpressionComponent model={model.readonlyKeyword} />}
            <ExpressionComponent model={model.typeName} />
            <ExpressionComponent model={model.fieldName} />
            {model.questionMarkToken && <TokenComponent model={model.questionMarkToken}/>}
            <TokenComponent
                model={model.semicolonToken}
                parentIdentifier={model.fieldName.value}
                isHovered={isHovered}
                onPlusClick={onClickOnPlusIcon}
            />
        </>
    );
}
