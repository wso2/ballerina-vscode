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
import { IO_NODE_DEFAULT_WIDTH, IO_NODE_FIELD_HEIGHT } from "./Diagram/utils/constants";

const typeLabel = {
    marginLeft: "3px",
    marginRight: "24px",
    padding: "5px",
    minWidth: "100px",
    color: "inherit",
    verticalAlign: "middle",
};

const addElementButton = {
    color: "var(--vscode-inputOption-activeForeground)",
    display: "flex",
    justifyContent: "space-between",
    fontStyle: "normal",
    fontWeight: 400,
    fontSize: "13px",
    lineHeight: "24px",
};

const treeLabel = {
    verticalAlign: "middle",
    padding: "5px",
    minWidth: "100px",
    display: "flex",
    width: "100%",
    height: `${IO_NODE_FIELD_HEIGHT}px`,
    '&:hover': {
        backgroundColor: 'var(--vscode-list-hoverBackground)',
    },
};

export const useIONodesStyles = () => ({
    inputTypeLabel: css({
        ...typeLabel
    }),
    outputTypeLabel: css({
        fontSize: "13px",
        fontWeight: 400,
        ...typeLabel
    }),
    valueLabel: css({
        padding: "5px",
        fontWeight: 600,
        fontSize: "13px",
        color: "inherit",
        verticalAlign: "middle",
    }),
    inPort: css({
		float: "left",
		marginRight: "5px",
		width: 'fit-content',
		display: "flex",
		alignItems: "center"
	}),
    outPort: css({
        float: "right",
        width: 'fit-content',
        marginLeft: "auto",
        display: "flex",
        alignItems: "center"
    }),
    label: css({
        display: "flex",
        alignItems: "center",
        width: "300px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        color: "inherit",
        "&:hover": {
            overflow: "visible"
        },
    }),
    nodeType: css({
        float: 'right',
        marginRight: 5,
        color: "var(--vscode-pickerGroup-border)",
    }),
    treeLabelDisableHover: css({
        '&:hover': {
            backgroundColor: 'var(--vscode-input-background)',
        },
        opacity: 0.8
    }),
    treeLabelDisabled: css({
        cursor: 'not-allowed',
        opacity: 0.5
    }),
    header: css({
		color: "black",
		backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
		display: "flex",
		height: "40px",
		padding: "8px"
	}),
    boldedTypeLabel: css({
		fontWeight: 800,
		fontSize: "14px",
	}),
    labelDisabled: css({
		opacity: 0.5
	}),
    treeLabelPortSelected: css({
        color: "var(--vscode-list-activeSelectionForeground)",
        backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
        outline: "1px solid var(--vscode-list-focusAndSelectionOutline, var(--vscode-contrastActiveBorder, var(--vscode-editorLink-activeForeground, var(--vscode-list-focusOutline))))",
        "&:hover": {
            backgroundColor: 'var(--vscode-list-activeSelectionBackground)'
        }
    }),
    treeLabelPortExprFocused: css({
        outline: "2px solid var(--vscode-list-focusAndSelectionOutline, var(--vscode-contrastActiveBorder, var(--vscode-editorLink-activeForeground, var(--vscode-list-focusOutline))))",
    }),
    treeLabelParentHovered: css({
        backgroundColor: 'var(--vscode-list-hoverBackground)',
    }),
    ArrayFieldRow: css({
        display: "flex",
        alignItems: 'center',
        '&:hover': {
            backgroundColor: 'inherit',
        }
    }),
    ArrayFieldRowDisabled: css({
        cursor: 'not-allowed',
        opacity: 0.5
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
    outputNodeValueBase: css({
        verticalAlign: "middle",
        padding: "5px"
    }),
    outputNodeValue: css({
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
    requiredMark: css({
        color: "var(--vscode-errorForeground)",
        margin: '0 2px',
        fontSize: '13px'
    }),
    treeLabel: css({
        ...treeLabel
    }),
    treeLabelArray: css({
        ...treeLabel,
        height: 'fit-content',
        flexDirection: "column"
    }),
    enumHeaderTreeLabel: css({
        verticalAlign: "middle",
        padding: "5px",
        minWidth: "100px",
        display: "flex",
        minHeight: "24px",
        backgroundColor: "var(--vscode-sideBar-background)"
    }),
    objectFieldAdderLabel: css({
        display: "flex",
        justifyContent: "center",
        color: "var(--button-primary-foreground)",
        opacity: 0.7
    }),
    addArrayElementButton: css({
        "& > vscode-button": {
            padding: "5px",
            textTransform: "none",
            ...addElementButton
        },
        "& > vscode-button > *": {
            margin: "0px 6px"
        }
    }),
    outputBeforeInputNotification: css({
        position: 'absolute',
        left: "0",
        backgroundColor: "var(--vscode-notifications-background)",
        color: "var(--vscode-notifications-foreground)",
        fontSize: "12px",
        border: "1px solid var(--vscode-editorWarning-foreground)",
        borderRadius: '4px',
        padding: "5px 7px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        transform: 'translateY(-50%)',
        marginLeft: '8px'
    }),
});

export const useIntermediateNodeStyles = () => ({
    root: css({
        width: '100%',
        backgroundColor: "var(--vscode-sideBar-background)",
        padding: "2px",
        borderRadius: "2px",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        color: "var(--vscode-checkbox-border)",
        alignItems: "center",
        border: "1px solid var(--vscode-welcomePage-tileBorder)",
    }),
    element: css({
        backgroundColor: 'var(--vscode-input-background)',
        padding: '5px',
        cursor: 'pointer',
        transitionDuration: '0.2s',
        userSelect: 'none',
        pointerEvents: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        '&:hover': {
            filter: 'brightness(0.95)',
        },
    }),
    header: css({
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        "& > *": {
            margin: "0 2px"
        }
    }),
    loadingContainer: css({
        padding: "10px"
    })
});
