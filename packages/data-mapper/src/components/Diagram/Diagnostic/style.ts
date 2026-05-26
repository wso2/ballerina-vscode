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
import { css } from "@emotion/css";

export const useStyles = () => ({
    pre: css({
        margin: 0,
        width: "300px",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
    }),
    code: css({
        borderRadius: 0,
        backgroundColor: "var(--vscode-sideBar-background)",
        fontSize: "13px",
        padding: "4px 2px",
        "& span": {
            color: "var(--vscode-inputOption-activeForeground)"
        }
    }),
    diagnosticWrapper: css({
        fontSize: '12px',
        letterSpacing: '0',
        color: "var(--vscode-errorForeground)"
    }),
    source: css({
        display: "flex",
        flexDirection: "column"
    }),
    tooltip: css({
        verticalAlign: "middle"
    }),
    editButton: css({
        marginTop: "10px",
        color: "var(--vscode-input-placeholderForeground)",
        width: "100% !important"
    }),
    editButtonText: css({
        width: "fit-content",
        textWrap: "nowrap",
        fontSize: "13px"
    })
});
