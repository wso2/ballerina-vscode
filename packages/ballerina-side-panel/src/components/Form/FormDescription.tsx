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

import React from "react";
import styled from "@emotion/styled";
import { ThemeColors, Codicon } from "@wso2/ui-toolkit";
import { NodeKind } from "@wso2/ballerina-core";

import { FormField } from "./types";
import { hasRequiredParameters, hasOptionalParameters, hasReturnType, isPrioritizedField } from "./utils";

namespace S {
    export const FormInfoDescription = styled.div`
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        font-size: 13px;
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 4px;
        opacity: 0.9;
        line-height: 1.4;
        background-color: var(--vscode-editor-inactiveSelectionBackground);
    `;

    export const ConfigurationCompleteContainer = styled.div`
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;

    export const ConfigurationCompleteHeader = styled.div`
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: ${ThemeColors.PRIMARY};
    `;

    export const ConfigurationCompleteText = styled.div`
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        font-size: 12px;
        line-height: 1.4;
    `;
}

interface FormDescriptionProps {
    formFields: FormField[];
    selectedNode?: NodeKind;
}

export const FormDescription: React.FC<FormDescriptionProps> = ({
    formFields,
    selectedNode
}) => {
    const getFormInfoDescription = (): React.ReactNode => {
        const hasRequired = hasRequiredParameters(formFields, selectedNode);
        const hasOptional = hasOptionalParameters(formFields);
        const hasReturn = hasReturnType(formFields);
        const hasAnyParams = formFields.filter(field => 
            !isPrioritizedField(field) &&
            field.type !== "VIEW" && 
            !field.hidden
        ).length > 0;

        if (!hasRequired && hasOptional) {
            // Rule 1: No Required Params, but Optional Params Exist
            return "This operation has no required parameters. Optional settings can be configured below.";
        } else if (!hasAnyParams && hasReturn) {
            // Rule 2: No Parameters at All (but has return)
            return "This is a simple operation that requires no parameters. Specify where to store the result to finish.";
        } else if (!hasAnyParams && !hasReturn) {
            // Rule 3: No Parameters AND No Return
            return (
                <S.ConfigurationCompleteContainer>
                    <S.ConfigurationCompleteHeader>
                        <Codicon name="check-all" iconSx={{ fontSize: 16, color: ThemeColors.PRIMARY }} />
                        Configuration Complete
                    </S.ConfigurationCompleteHeader>
                    <S.ConfigurationCompleteText>
                        It does not require any parameters and does not return a result. You can save the configuration.
                    </S.ConfigurationCompleteText>
                </S.ConfigurationCompleteContainer>
            );
        }

        return "";
    };

    const description = getFormInfoDescription();

    if (!description) {
        return null;
    }

    return (
        <S.FormInfoDescription>
            {description}
        </S.FormInfoDescription>
    );
};

export default FormDescription; 
