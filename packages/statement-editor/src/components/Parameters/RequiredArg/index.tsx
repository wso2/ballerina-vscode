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

import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { ParameterInfo } from "@wso2/ballerina-core";
import { Typography } from "@wso2/ui-toolkit";

import { StatementEditorContext } from "../../../store/statement-editor-context";
import { getParamHighlight } from "../../../utils";
import { useStmtEditorHelperPanelStyles } from "../../styles";

interface RequiredArgProps {
    param: ParameterInfo
    value: number
    handleCheckboxClick: (param: ParameterInfo) => () => void
}
export function RequiredArg(props: RequiredArgProps) {
    const { param, value, handleCheckboxClick } = props;
    const statementEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const isMandatory = !!param.modelPosition;

    const {
        modelCtx: {
            currentModel
        }
    } = useContext(StatementEditorContext);


    return (
        <div
            key={value}
            className={statementEditorHelperClasses.requiredArgList}
            style={getParamHighlight(currentModel.model, param)}
            data-testid="required-arg"
        >
            <VSCodeCheckbox
                checked={param.modelPosition !== undefined}
                {...(isMandatory && { disabled: true })}
                onClick={isMandatory ? undefined : handleCheckboxClick(param)}
                className={statementEditorHelperClasses.parameterCheckbox}
                data-testid="arg-check"
            />
            <Typography
                variant="body3"
                sx={{margin: '0px 5px'}}
            >
                {param.name}
            </Typography>
            <Typography
                className={statementEditorHelperClasses.suggestionDataType}
                variant="body3"
            >
                {param.type}
            </Typography>
            {param.description !== undefined && (
                <Typography
                    className={statementEditorHelperClasses.docParamDescriptionText}
                    variant="body3"
                >
                    {" : " + param.description}
                </Typography>
            )}
        </div>
    );
}
