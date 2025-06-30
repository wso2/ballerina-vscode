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
    treeLabel: css({
        verticalAlign: "middle",
        padding: "5px",
        minWidth: "100px",
        display: "flex",
        minHeight: "24px",
        width: "100%",
        '&:hover': {
            backgroundColor: 'var(--vscode-list-hoverBackground)',
        },
    }),
    treeLabelPortSelected: css({
        color: "var(--vscode-list-activeSelectionForeground)",
        backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
        outline: "1px solid var(--vscode-list-focusAndSelectionOutline, var(--vscode-contrastActiveBorder, var(--vscode-editorLink-activeForeground, var(--vscode-list-focusOutline))))",
        "&:hover": {
            backgroundColor: 'var(--vscode-list-activeSelectionBackground)'
        }
    }),
    treeLabelParentHovered: css({
        backgroundColor: 'var(--vscode-list-hoverBackground)',
    }),
    treeLabelDisableHover: css({
        '&:hover': {
            backgroundColor: 'var(--vscode-input-background)',
        }
    }),
    treeLabelDisabled: css({
        backgroundColor: "var(--vscode-editorWidget-background)",
        '&:hover': {
            backgroundColor: 'var(--vscode-editorWidget-background)',
        },
        cursor: 'not-allowed'
    }),
    treeLabelArray: css({
        flexDirection: "column"
    }),
    ArrayFieldRow: css({
        display: "flex",
        alignItems: 'center',
        '&:hover': {
            backgroundColor: 'inherit',
        }
    }),
    ArrayFieldRowDisabled: css({
        '&:hover': {
            backgroundColor: 'var(--vscode-editorWidget-background)'
        }
    }),
    innerTreeLabel: css({
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: "inherit",
        padding: "10px 12px",
        margin: "10px",
        flex: "none",
        order: 1,
        flexGrow: 0
    }),
    treeLabelOutPort: css({
        float: "right",
        width: 'fit-content',
        marginLeft: "auto",
        display: "flex",
        alignItems: "center"
    }),
    treeLabelInPort: css({
        float: "left",
        marginRight: "5px",
        width: 'fit-content',
        display: "flex",
        alignItems: "center"
    }),
    typeLabel: css({
        marginLeft: "3px",
        padding: "5px",
        fontSize: "13px",
        minWidth: "100px",
        marginRight: "24px",
        fontWeight: 400
    }),
    typeLabelDisabled: css({
        backgroundColor: "var(--vscode-editorWidget-background)",
        color: "var(--vscode-icon-foreground)",
        opacity: 0.5
    }),
    value: css({
        verticalAlign: "middle",
        padding: "5px",
        backgroundColor: "var(--vscode-input-background)",
        borderRadius: "5px",
        cursor: 'pointer',
        pointerEvents: 'auto',
        transition: 'border 0.2s',
        border: `1px solid var(--vscode-input-background)`,
        '&:hover': {
            border: "1px solid var(--vscode-pickerGroup-border)"
        }
    }),
    valueWithError: css({
        verticalAlign: "middle",
        padding: "5px",
        backgroundColor: "var(--vscode-inputValidation-errorBackground)",
        borderRadius: "5px",
        cursor: 'pointer',
        pointerEvents: 'auto',
        transition: 'border 0.2s',
        border: "1px solid var(--vscode-inputValidation-errorBackground)",
        '&:hover': {
            border: "1px solid var(--vscode-errorForeground)"
        }
    }),
    errorIconWrapper: css({
        height: "22px",
        width: "22px",
        marginLeft: '5px',
        verticalAlign: 'middle',
    }),
    valueLabel: css({
        padding: "5px",
        fontWeight: 600,
        fontSize: "13px",
        color: "inherit"
    }),
    valueLabelDisabled: css({
        backgroundColor: "var(--vscode-editorWidget-background)",
        color: "var(--vscode-input-foreground)",
        opacity: 0.5
    }),
    group: css({
        marginLeft: "0px",
        paddingLeft: "0px",
        paddingBottom: "5px"
    }),
    content: css({
        borderTopRightRadius: "16px",
        borderBottomRightRadius: "16px",
        paddingRight: "8px",
    }),
    addIcon: css({
        "& > vscode-button": {
            color: "var(--vscode-inputOption-activeForeground)",
            padding: "5px",
            textTransform: "none",
            display: "flex",
            justifyContent: "space-between",
            fontStyle: "normal",
            fontWeight: 400,
            fontSize: "13px",
            lineHeight: "24px"
        },
        "& > vscode-button > *": {
            margin: "0px 6px"
        }
    }),
    editButton: css({
        float: "right",
        width: 'fit-content',
        marginLeft: "auto"
    }),
    label: css({
        width: "300px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        color: "inherit",
        "&:hover": {
            overflow: "visible"
        }
    }),
    expandIcon: css({
        cursor: "pointer",
        pointerEvents: "all",
        color:  "var(--vscode-inputOption-activeForeground)",
        height: "25px",
        width: "25px",
        marginLeft: "auto"
    }),
    expandIconDisabled: css({
        color: "var(--vscode-editorHoverWidget-border)",
    }),
    requiredMark: css({
        color: "var(--vscode-errorForeground)",
        margin: '0 2px',
        fontSize: '13px'
    }),
    loader: css({
        float: "right",
        marginLeft: "auto",
        marginRight: '3px',
        alignSelf: 'center'
    }),
    valueConfigMenu: css({
        '& .MuiMenuItem-root': {
            fontSize: '12px',
            paddingBottom: "1px",
            paddingTop: "1px"
        }
    }),
    boldedTypeLabel: css({
        fontWeight: 800,
        fontSize: "14px",
    })
});
