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
import { GAP_BETWEEN_INTERMEDIATE_CLAUSES, QUERY_EXPR_INTERMEDIATE_CLAUSE_HEIGHT } from "../../utils/constants";

export const useStyles = () => ({
    clauseItem: css({
        width: "100%",
        minWidth: "200px",
        display: "flex",
        alignItems: "center",
        "&:hover": {
            color: "var(--vscode-inputOption-activeForeground)",
            "& $deleteIcon": {
                opacity: 1
            }
        }
    }),
    clauseItemBody: css({
        display: "flex",
        alignItems: "center",
        background: "var(--vscode-editorWidget-background)",
        marginLeft: "25px"
    }),
    lineWrap: css({
        width: "80px",
        height: `${GAP_BETWEEN_INTERMEDIATE_CLAUSES}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        flexDirection: "column"
    }),
    line: css({
        height: "6px",
        width: "2px",
        background: "var(--vscode-input-background)"
    }),
    clauseKeyWrap: css({
        border: "1px solid var(--vscode-input-background)",
        height: `${QUERY_EXPR_INTERMEDIATE_CLAUSE_HEIGHT}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "26px 0",
        background: "var(--vscode-editorWidget-background)",
        width: "80px",
        textAlign: "center",
        fontWeight: "bold"
    }),
    fromClauseKeyWrap: css({
        border: "1px solid var(--vscode-pickergroup-border)"
    }),
    clauseWrap: css({
        background: "var(--vscode-editorWidget-background)",
        height: `${QUERY_EXPR_INTERMEDIATE_CLAUSE_HEIGHT}px`,
        display: "flex",
        alignItems: "center",
        padding: "26px 10px",
        "&:hover": {
            "& $addOrderKeyIcon": {
                opacity: 0.7
            }
        }
    }),
    buttonWrapper: css({
        border: "1px solid var(--vscode-editorwidget-background)",
        borderRadius: "8px",
        right: "35px"
    }),
    clauseItemKey: css({
        marginLeft: "5px"
    }),
    clauseExpressionLight: css({
        marginLeft: "5px",
        marginRight: "5px",
        display: "flex",
        alignItems: "center",
        transition: "background 0.2s",
        "&:hover": {
            background: "var(--vscode-editorHoverWidget-background)",
            "& $deleteOrderKeyIcon": {
                opacity: 0.7
            }
        }
    }),
    clauseExpression: css({
        cursor: "pointer",
        padding: "5px",
        marginLeft: "5px",
        marginRight: "5px",
        transition: "border 0.2s",
        width: "max-content",
        border: "1px solid var(--vscode-pickerGroup-border)",
        '&:hover': {
            border: "1px solid var(--vscode-welcomePage-tileBorder)",
            background: "var(--vscode-input-background)",
            color: "var(--vscode-input-foreground)"
        }
    }),
    clauseDiagnostics: css({
        background: "var(--vscode-inputValidation-errorBackground)",
        "&:hover": {
            border: "1px solid var(--vscode-errorForeground)"
        }
    }),
    errorIconWrapper: css({
        height: "22px",
        width: "22px",
        marginLeft: '5px',
        verticalAlign: 'middle',
    }),
    clausePlaceholder: css({
        background: 'var(--vscode-dropdown-border)',
    }),
    addIcon: css({
        cursor: 'pointer',
        fontSize: '18px',
        color: 'var(--vscode-inputOption-activeForeground)',
        transition: 'all 0.2s',
        "&:hover": {
            color: 'var(--vscode-textLink-foreground)',
        }
    }),
    deleteIcon: css({
        cursor: 'pointer',
        color: "var(--vscode-errorForeground)",
        fontSize: '20px',
        transition: 'all 0.2s ease-in-out',
        opacity: 0,
        "&:hover": {
            color: "var(--vscode-inputValidation-errorBorder)",
        }
    }),
    deleteOrderKeyIcon: css({
        cursor: 'pointer',
        color: "var(--vscode-errorForeground)",
        fontSize: '20px',
        transition: 'opacity 0.2s ease-in-out',
        opacity: 0,
        paddingRight: 5,
        "&:hover": {
            opacity: 1,
            color: "var(--vscode-inputValidation-errorBorder)",
        }
    }),
    addOrderKeyIcon: css({
        cursor: 'pointer',
        color: "var(--vscode-input-placeholderForeground)",
        fontSize: '20px',
        transition: 'opacity 0.2s ease-in-out',
        opacity: 0,
        paddingRight: 5,
        "&:hover": {
            opacity: 1,
            color: "var(--vscode-icon-foreground)",
        }
    }),
    input: css({
        maxWidth: '120px',
        padding: "5px",
        border: 0,
        "&:hover": { outline: 0 },
        "&:focus": { outline: 0 },
        background: 'transparent'
    }),
    addButtonWrap: css({
        position: 'absolute',
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        top: 0,
    }),
    queryInputInputPortWrap: css({
        width: 85,
        display: 'flex',
        justifyContent: 'center'
    }),
    addMenu: css({
        marginLeft: 5,
        marginTop: 10,
        "& .MuiMenuItem-root": {
            fontSize: '11px',
            paddingBottom: "1px",
            paddingTop: "1px"
        }
    }),
    orderSelect: css({
        '& .MuiSelect-select:focus': {
            backgroundColor: 'unset',
        },
        background: "var(--vscode-editorHoverWidget-background)",
        borderRadius: 5,
        cursor: 'pointer',
        paddingLeft: 5,
        paddingRight: 5,
        marginLeft: 5,
        marginRight: 5,
        transition: 'border 0.2s',
        border: `1px solid transparent`,
        '&:hover': {
            border: "1px solid var(--vscode-pickerGroup-border)"
        }
    })
});