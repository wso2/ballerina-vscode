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

import { SpecificField } from "@wso2/syntax-tree";

import { ExpressionComponent } from "../../Expression";
import { TokenComponent } from "../../Token";

interface SpecificFieldProps {
    model: SpecificField;
}

export function SpecificFieldComponent(props: SpecificFieldProps) {
    const { model } = props;

    return (
        <>
            <ExpressionComponent model={model.fieldName} />

            {model.colon && (
                <>
                    <TokenComponent model={model.colon} />
                    <ExpressionComponent model={model.valueExpr} />
                </>
                )
            }
        </>
    );
}
