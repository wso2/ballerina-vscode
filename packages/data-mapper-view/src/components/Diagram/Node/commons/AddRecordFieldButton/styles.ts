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
    addIcon: css({
        color: "var(--vscode-editorInfo-foreground)",
        padding: "5px",
        textTransform: "none",
        justifyContent: "left",
        fontStyle: "normal",
        fontWeight: 400,
        fontSize: "13px",
        lineHeight: "24px"
    }),
    tvalueConfigMenu: css({
        '& .MuiMenuItem-root': {
            fontSize: '12px',
            paddingBottom: "1px",
            paddingTop: "1px"
        }
    }),
    addFieldWrap: css({
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: "inherit",
        background: "var(--vscode-editorWidget-background)",
        padding: "5px",
    }),
    addFieldButton: css({
        "& > vscode-button": {
            color: "var(--vscode-textLink-foreground)",
            padding: "4px",
        }
    }),
    input: css({
        maxWidth: '300px',
        width: '100%',
        padding: "5px",
        '&:focus': { outline: 0, border: "1px solid var(--vscode-editorHoverWidget-background)" },
        background: "var(--vscode-editorHoverWidget-background)",
        color: 'var(--vscode-editor-foreground)',
        border: "1px solid transparent",
        fontSize: 13,
        "&::placeholder": {
            opacity: 0.6
        },
        overflow: "hidden",
        textOverflow: "ellipsis"
    }),
    fieldEditor: css({
        display: 'flex',
        alignItems: 'center',
        width: '100%'
    }),
    popoverRoot: css({
        padding: '5px 10px',
        display: 'flex',
        alignItems: 'center'
    }),
    tooltip: css({
        backgroundColor: "var(--vscode-input-background)",
        color: "var(--vscode-inputValidation-errorBorder)",
        boxShadow: "8px 8px",
        fontSize: 13,
    }),
    errorIcon: css({
        color: "var(--vscode-errorForeground)",
    }),
    tickIcon: css({
        color: "var(--vscode-inputValidation-infoBackground)"
    })
});
