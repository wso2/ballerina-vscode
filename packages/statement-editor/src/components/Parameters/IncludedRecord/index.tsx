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

import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { ParameterInfo } from "@wso2/ballerina-core";
import { Typography } from "@wso2/ui-toolkit";

import { StatementEditorContext } from "../../../store/statement-editor-context";
import { getParamHighlight } from "../../../utils";
import { useStmtEditorHelperPanelStyles } from "../../styles";

interface IncludedRecordProps {
    param: ParameterInfo,
    handleCheckboxClick: (param: ParameterInfo) => () => void
    key?: number,
}

// tslint:disable: jsx-no-multiline-js
export function IncludedRecord(props: IncludedRecordProps){
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const { param, handleCheckboxClick, key } = props;
    const {
        modelCtx: {
            currentModel : {
                model
            }
        }
    } = useContext(StatementEditorContext);

    return (
        <>
            {param.modelPosition && (
                <div
                    key={key}
                    className={stmtEditorHelperClasses.docListDefault}
                    style={getParamHighlight(model, param)}
                    data-testid="included-record-arg"
                >
                    <VSCodeCheckbox
                        checked={true}
                        onClick={handleCheckboxClick(param)}
                    />
                    <Typography
                        variant="body3"
                        sx={{margin: '0px 5px'}}
                    >
                        {param.name}
                    </Typography>
                </div>
            )}
        </>
    );
}
