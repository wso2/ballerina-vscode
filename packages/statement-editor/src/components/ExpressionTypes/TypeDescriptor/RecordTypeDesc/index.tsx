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

import {
    RecordTypeDesc,
    STKindChecker
} from "@wso2/syntax-tree";

import { FIELD_DESCRIPTOR } from "../../../../constants";
import { StatementEditorContext } from "../../../../store/statement-editor-context";
import { ExpressionComponent } from "../../../Expression";
import { ExpressionArrayComponent } from "../../../ExpressionArray";
import { TokenComponent } from "../../../Token";

interface RecordTypeDescProps {
    model: RecordTypeDesc;
}

export function RecordTypeDescComponent(props: RecordTypeDescProps) {
    const { model } = props;
    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: {
            updateModel,
        }
    } = stmtCtx;

    const onClickOnPlusIcon = (event: any) => {
        event.stopPropagation();
        const newPosition = {
            ...model.bodyEndDelimiter.position,
            endColumn: model.bodyEndDelimiter.position.startColumn
        };
        updateModel(`${FIELD_DESCRIPTOR};`, newPosition);
    };

    return (
        <>
            <TokenComponent model={model.recordKeyword} className="keyword" />
            {(model.fields.length === 0) ? (
                // Add plus button when there are no fields
                <TokenComponent model={model.bodyStartDelimiter} isHovered={true} onPlusClick={onClickOnPlusIcon} />
            ) : (
                <TokenComponent model={model.bodyStartDelimiter} />
            )}
            <ExpressionArrayComponent expressions={model.fields} />
            {model.recordRestDescriptor && <ExpressionComponent model={model.recordRestDescriptor} />}
            <span>
                <TokenComponent model={model?.bodyEndDelimiter} />
                {STKindChecker.isTypeDefinition(model?.parent) && model?.parent?.semicolonToken?.value}
            </span>
        </>
    );
}
