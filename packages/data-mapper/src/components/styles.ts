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
    marginRight: "3px",
    padding: "5px 8px",
    minWidth: "100px",
    color: "var(--vscode-foreground)",
    fontFamily: "GilmerRegular",
    verticalAlign: "middle",
    backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
    borderRadius: "3px"
};

const valueLabel = {
    padding: "5px",
    fontFamily: "GilmerRegular",
    fontSize: "13px",
    verticalAlign: "middle",
};

const addElementButton = {
    color: "var(--vscode-textLink-foreground)",
    display: "flex",
    justifyContent: "space-between",
    opacity: 0.7
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
    typeLabel: css({
        ...typeLabel
    }),
    unknownTypeLabel: css({
        ...typeLabel,
        color: "var(--vscode-errorForeground)",
    }),
    valueLabel: css({
        ...valueLabel
    }),
    valueLabelHeader: css({
        ...valueLabel,
        fontSize: "14px",
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
        color: "inherit"
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
        opacity: 0.9
    }),
    treeLabelDisabled: css({
        cursor: 'not-allowed',
        opacity: 0.7
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
		opacity: 0.7
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
        opacity: 0.7
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
        fontSize: '15px'
    }),
    treeLabel: css({
        ...treeLabel
    }),
    treeLabelArray: css({
        ...treeLabel,
        height: 'fit-content',
        flexDirection: "column"
    }),
    subMappingItemLabel: css({
        ...treeLabel,
        cursor: "pointer"
    }),
    enumHeaderTreeLabel: css({
        verticalAlign: "middle",
        padding: "5px",
        minWidth: "100px",
        display: "flex",
        minHeight: "24px",
        backgroundColor: "var(--vscode-sideBar-background)"
    }),
    addAnotherSubMappingButton: css({
        width: "auto",
        margin: 0,
        "& > vscode-button": {
            backgroundColor: "var(--vscode-extensionButton-background)", padding: '2px',
            "&:hover": {
                backgroundColor: "var(--vscode-button-hoverBackground)"
            },
        }
    }),
    subMappingItemSeparator: css({
        height: "2px",
        width: "100%",
        backgroundColor: "var(--vscode-titleBar-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    }),
    objectFieldAdderLabel: css({
        display: "flex",
        justifyContent: "center",
        color: "var(--button-primary-foreground)",
        opacity: 0.7
    }),
    addSubMappingButton: css({
        "& > vscode-button": {
            height: "40px",
            width: `${IO_NODE_DEFAULT_WIDTH}px`,
            border: "1.8px solid var(--vscode-dropdown-border)",
            borderRadius: "6px",
            background: "var(--vscode-sideBar-background)",
            color: "var(--vscode-textLink-foreground)"
        },
        "& > vscode-button > *": {
            margin: "0px 6px"
        },
        "& > vscode-button::part(control)": {
            justifyContent: "flex-start"
        },
        "& > vscode-button:active": {
            background: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            "& p": {
                color: "var(--vscode-button-foreground) !important"
            },
            "& .add-icon": {
                color: "var(--vscode-button-foreground) !important"
            }
        },
        "& .add-icon": {
            color: "var(--vscode-textLink-foreground)"
        },
        "& p": {
            color: "var(--vscode-textLink-foreground)"
        }
    }),
    addMoreSubMappingsButton: css({
        "& > vscode-button": {
            height: "50px",
            width: `${IO_NODE_DEFAULT_WIDTH}px`,
            border: "none",
            borderRadius: "6px"
        },
        "& > vscode-button > *": {
            margin: "0px 6px"
        },
        "& > vscode-button::part(control)": {
            justifyContent: "flex-start"
        }
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
    nodeActionButton: css({
        "& > vscode-button": {
            height: "40px",
            width: `${IO_NODE_DEFAULT_WIDTH}px`,
            border: "1.8px solid var(--vscode-dropdown-border)",
            borderRadius: "6px",
            background: "var(--vscode-sideBar-background)",
            color: "var(--vscode-textLink-foreground)"
        },
        "& > vscode-button > *": {
            margin: "0px 6px"
        },
        "& > vscode-button::part(control)": {
            justifyContent: "flex-start"
        },
        "& > vscode-button:not([disabled]):active": {
            background: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            "& p": {
                color: "var(--vscode-button-foreground) !important"
            },
            "& .action-icon": {
                color: "var(--vscode-button-foreground) !important"
            }
        },
        "& > vscode-button[disabled]": {
            opacity: 0.8,
            cursor: "not-allowed",
        },
        "& > vscode-button[disabled]::part(control)": {
            cursor: "not-allowed",
            background: "var(--vscode-sideBar-background)"
        },
        "& .action-icon": {
            color: "var(--vscode-textLink-foreground)"
        },
        "& p": {
            color: "var(--vscode-textLink-foreground)"
        }
    }),
    payloadWidget: css({
        width: `${IO_NODE_DEFAULT_WIDTH}px`,
        border: "2.5px dashed var(--vscode-dropdown-border)",
        borderRadius: "6px",
        background: "var(--vscode-sideBar-background)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        cursor: "pointer",
        boxSizing: "border-box",
        "&:hover": {
            borderColor: "var(--vscode-focusBorder)"
        }
    }),
    payloadWidgetMessage: css({
        color: "var(--vscode-descriptionForeground)",
        fontSize: "13px",
        fontFamily: "GilmerRegular",
        textAlign: "left",
        width: "100%",
        margin: "0 0 16px 0",
        borderLeft: "3px solid var(--vscode-descriptionForeground)",
        paddingLeft: "10px",
        lineHeight: "1.5"
    }),
    payloadWidgetAction: css({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        color: "var(--vscode-descriptionForeground)"
    }),
    payloadWidgetActionLabel: css({
        margin: 0,
        fontSize: "14px",
        fontFamily: "GilmerRegular",
        color: "var(--vscode-descriptionForeground)"
    })
});

export const useIntermediateNodeStyles = () => ({
    root: css({
        width: '100%',
        backgroundColor: "var(--vscode-sideBar-background)",
        padding: "2px",
        borderRadius: "3px",
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
