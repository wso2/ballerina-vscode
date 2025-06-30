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

const syntaxHighlightingRules = {
    '& .type-descriptor, &.type-descriptor': {
        color: '#008080'
    },
    '& .numeric-literal, &.numeric-literal': {
        color: '#128bdf'
    },
    '& .string-literal, &.string-literal': {
        color: '#a31515'
    },
    '& .boolean-literal, &.boolean-literal': {
        color: '#dd0000'
    },
    '& .operator, &.operator': {
        color: '#0000ff'
    },
    '& .keyword, &.keyword': {
        color: '#0000ff'
    }
}

const hoverColor2 = {
    '&.hovered': {
        backgroundColor: 'var(--vscode-list-inactiveSelectionBackground)'
    },
}

const removePadding = {
    padding: '0px'
}

const stmtEditorPadding = {
    paddingLeft: '25px',
    paddingRight: '25px'
}

const statementFontStyles = {
    fontSize: "15px",
    'user-select': 'none',
    fontFamily: 'monospace'
}

const inputEditorTemplateStyles = {
    minWidth: '20px',
    letterSpacing: 0,
    position: 'relative' as 'relative',
    '&:focus': {
        outline: 'none'
    }
}

const truncateText = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
}

const HEADER_FOOTER_HEIGHT = '105px';

export const useStatementEditorToolbarStyles = () => ({
    toolbar: css({
        display: 'flex',
        width: '100%',
        justifyContent: 'flex-start',
        borderBottom: '1px solid var(--vscode-panel-border)',
        paddingLeft: '17px'
    }),
    toolbarOperators: css({
        display: 'flex',
        flexDirection: 'row',
        padding: 0,
        alignItems: 'center',
    }),
    toolbarIcons: css({
        padding: '8px',
        borderRadius: '5px',
        margin: '5px 0'
    }),
    toolbarStatementQualifier: css({
        padding: '8px',
        borderRadius: '5px',
        margin: '5px 0',
        display: 'flex',
    }),
    toolbarOperatorsIcons: css({
        color: 'var(--foreground)',
        padding: '0px 8px',
        margin: '5px 0px'
    }),
    toolbarMoreExpIcon: css({
        color: 'var(--vscode-textLink-foreground)',
        fontWeight: 1000,
        fontFamily: 'monospace',
        fontSize: '12px',
        marginTop: '2px',
    }),
    QualifierCheckbox: css({
        float: 'right',
        marginRight: 0,
        color: '#40404B',
        padding: '3px 9px 0 0',
        "& .MuiCheckbox-colorSecondary.Mui-checked": {
            color: "#2FA86C"
        },
        "&$checked": {
            color: "#2FA86C",
            paddingLeft: '0px',
            "&:hover": {
                background: "transparent",
            },
            "& .MuiIconButton-label": {
                position: "relative"
            },
            "& .MuiIconButton-label::after": {
                content: '""',
                left: 1,
                top: 1,
                width: 19,
                height: 19,
                position: "absolute",
                backgroundColor: "#fff",
                zIndex: -1,
                borderRadius: 3,
            }
        },
    }),
    checked: css({}),
    toolbarDivider: css({
        borderLeft: '1px solid var(--vscode-panel-border)',
        height: "70%",
        alignSelf: "center",
        marginRight: '7px',
        marginLeft: '7px'
    })
});

export const useStatementRendererStyles = () => ({
    expressionBlock: css({
        position: 'relative',
        paddingRight: '10px',
        ...syntaxHighlightingRules
    }),
    expressionBlockDisabled: css({
        height: '24px',
        width: '15px',
        letterSpacing: 0,
        ...removePadding
    }),
    inputEditorTemplate: css({
        border: 'none',
        ...inputEditorTemplateStyles,
        ...statementFontStyles
    }),
    inputEditorEditingState: css({
        maxWidth: '120px',
        padding: "4px",
        '&:focus': { outline: 0, border: "1px solid var(--vscode-inputOption-activeBorder)" },
        background: "var(--vscode-editorHoverWidget-background)",
        color: 'var(--vscode-editor-foreground)',
        border: "1px solid transparent",
        letterSpacing: 0,
        ...statementFontStyles
    }),
    expressionElement: css({
        position: 'relative',
        width: 'fit-content',
        '&': {
            width: 'fit-content'
        },
        cursor: "pointer",
        ...syntaxHighlightingRules,
        ...hoverColor2
    }),
    expressionElementSelected: css({
        '&': {
            backgroundColor: 'var(--vscode-editor-selectionBackground)'
        },
        '&.hovered': {
            backgroundColor: 'var(--vscode-list-hoverBackground)',
        },
        '&:focus-within': {
            backgroundColor: 'var(--vscode-list-activeSelectionBackground)'
        },
        '&.hovered:focus-within:': {
            backgroundColor: 'transparent',
        },
        ...hoverColor2
    }),
    syntaxErrorElementSelected: css({
        '&': {
            boxSizing: 'border-box',
            height: '25px',
            weight: '75px',
            border: '1px solid #FE523C',
            borderRadius: '2px',
            backgroundColor: '#FCEDED',
            boxShadow: '0 1px 4px 0 rgba(0,0,0,0.11)',
            color: '#FE523C',
        },
        '&:focus-within': {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            border: 'none'
        }
    }),
    addNewExpressionButton: css({
        backgroundColor: '#f7f8fb',
        border: '#6830e9',
        borderStyle: 'solid',
        color: '#6830e9',
        textAlign: 'center',
        fontSize: '16px',
        margin: '4px 2px',
        borderRadius: '50%'
    }),
    rhsComponent: css({
        position: 'relative',
        top: '10px',
        width: '90%',
        marginLeft: '5%'
    }),
    propertyDivider: css({
        height: '1px',
        marginTop: '2%',
        marginBottom: '10px',
        width: '94%',
        opacity: 0.52,
        backgroundColor: '#DCDEE4'
    }),
    buttonWrapper: css({
        height: 'auto',
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
        zIndex: 100,
    }),
    plusIcon: css({
        boxSizing: 'border-box',
        border: '1px dashed #A6B3FF',
        borderRadius: '4px',
        position: 'relative',
        width: 'fit-content',
        backgroundColor: '#F0F1FB',
        fontFamily: "monospace",
        color: '#0095FF',
        margin: '0px 2px',
        padding: '0px 4px',
        '&:hover': {
            backgroundColor: 'rgba(173, 214, 255, 0.3)'
        },
        '&.modifiable': {
            position: 'absolute',
            marginLeft: '10px',
        },
        '&.view': {
            display: "inline"
        },
        '&.hide': {
            visibility: "hidden"
        }
    }),
    errorHighlight: css({
        backgroundImage: `linear-gradient(45deg, transparent 65%, red 80%, transparent 90%),
            linear-gradient(135deg, transparent 5%, red 15%, transparent 25%),
            linear-gradient(135deg, transparent 45%, red 55%, transparent 65%),
            linear-gradient(45deg, transparent 25%, red 35%, transparent 50%)`,
        backgroundRepeat: "repeat-x",
        backgroundSize: "8px 2px",
        backgroundPosition: "0 95%"
    }),
    syntaxErrorTooltip: css({
        position: 'absolute',
        top: '-26px',
        left: '80%'
    })
});

export const useStatementEditorDiagnosticStyles = () => ({
    diagnosticsPane: css({
        maxHeight: '125px',
        overflowY: 'scroll',
        marginRight: '-25px',
        color: 'var(--vscode-editorError-foreground)',
        paddingTop: '13px',
        width: '100%',
        fontFamily: 'var(--vscode-font-family)',
    }),
    diagnosticsPaneInner: css({
        display: 'flex',
        alignItems: 'flex-start',
    }),
    diagnosticsErrorIcon: css({
        padding: '4px 6px 0 0'
    }),
});

export const useStmtEditorHelperPanelStyles = () => ({
    suggestionsInner: css({
        overflowY: 'hidden',
        height: '100%',
        width: '100%'
    }),
    suggestionListContainer: css({
        overflowY: 'scroll',
        marginTop: '5px',
    }),
    suggestionListItem: css({
        display: 'flex'
    }),
    suggestionDataType: css({
        color: 'var(--vscode-terminal-ansiGreen)',
        ...truncateText,
    }),
    suggestionValue: css({
        ...truncateText,
    }),
    listItem: css({
        display: 'flex',
        maxWidth: '155px',
    }),
    suggestionListInner: css({
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
    }),
    expressionExample: css({
        fontSize: '13px',
    }),
    searchBox: css({
        width: '100%'
    }),
    librarySearchBox: css({
        position: 'relative',
        height: '32px',
        width: 'inherit',
        border: '1px var(--custom-input-border-color)',
        color: '#8D91A3',
        textIndent: '12px',
        textAlign: 'left',
        marginBottom: '16px',
        paddingLeft: '10px'
    }),
    helperPaneSubHeader: css({
        color: 'var(--vscode-editor-foreground)',
        marginBottom: '4px',
        fontWeight: 500
    }),
    groupHeaderWrapper: css({
        display: 'flex',
        flexDirection: 'row',
        marginBottom: '14px'
    }),
    selectionWrapper: css({
        display: 'flex',
        flexDirection: 'row',
        marginTop: '5px'
    }),
    suggestionDividerWrapper: css({
        marginTop: '5px',
    }),
    groupHeader: css({
        color: 'var(--vscode-editor-foreground)',
        fontWeight: 500
    }),
    selectionSubHeader: css({
        color: 'var(--vscode-settings-textInputForeground)',
        borderRadius: '5px',
        backgroundColor: 'var(--vscode-editor-selectionBackground)',
        marginRight: '5px',
        ...statementFontStyles
    }),
    selectionSeparator: css({
        height: '1px',
        width: '100%',
        flex: '1 0',
        backgroundColor: 'var(--vscode-panel-border)',
        alignSelf: 'flex-end'
    }),
    loadingContainer: css({
        height: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    }),
    libraryWrapper: css({
        marginTop: '5px',
        overflowY: 'scroll',
    }),
    libraryBrowser: css({
        height: '100%'
    }),
    libraryBrowserHeader: css({
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        zIndex: 1,
        color: 'var(--vscode-sideBar-foreground)'
    }),
    searchResult: css({
        paddingTop: '15px',
    }),

    moduleTitle: css({
        fontSize: '14px',
        margin: '0 10px'
    }),
    libraryReturnIcon: css({
        marginRight: '8px'
    }),
    libraryElementBlock: css({
        top: '5%',
        display: 'flex',
        flexDirection: 'column'
    }),
    libraryElementBlockLabel: css({
        height: '10%',
        padding: '0 10px'
    }),
    parameterCheckbox: css({
        margin: '0px'
    }),
    checked: css({}),
    docParamSuggestions: css({
        height: '100%',
        overflowY: 'scroll'
    }),
    returnSeparator: css({
        height: '1px',
        opacity: '0.52',
        backgroundColor: 'var(--vscode-panel-border)',
        marginBottom: '15px'
    }),
    docParamDescriptionText: css({
        flex: "inherit",
        ...removePadding
    }),
    includedRecordPlusBtn: css({
        display: 'block',
        alignSelf: 'center',
        padding: '0px',
        marginLeft: '10px'
    }),
    paramHeader: css({
        marginTop: '0px',
        color: 'var(--vscode-editor-foreground)'
    }),
    paramDataType: css({
        marginLeft: '8px',
        marginRight: '8px',
        flex: 'inherit',
        ...removePadding
    }),
    requiredArgList: css({
        display: 'flex',
        alignItems: 'flex-start',
        overflowX: 'hidden',
        width: 'fit-content',
        ...removePadding
    }),
    docDescription: css({
        maxHeight: '50%',
        overflowY: 'scroll',
        whiteSpace: 'break-spaces',
        display: 'block',
        margin: '10px 0px',
        ...removePadding
    }),
    returnDescription: css({
        maxHeight: '15%',
        overflowY: 'scroll',
        whiteSpace: 'break-spaces',
        "& .MuiListItem-root": {
            paddingLeft: '0px'
        },
        ...removePadding
    }),
    paramList: css({
        overflowY: 'auto',
        margin: '10px 0px',
    }),
    documentationWrapper: css({
        marginLeft: '28px',
    }),
    includedRecordHeaderList: css({
        "& .MuiListItem-root": {
            padding: '0px',
            alignItems: 'flex-start'
        },
        "& .MuiListItemText-root": {
            flex: "inherit"
        },
        ...removePadding
    }),
    docListDefault: css({
        "& .MuiListItem-root": {
            padding: '0px'
        },
        "& .MuiListItemText-root": {
            flex: 'inherit',
            minWidth: 'auto',
            margin: '0 6px 0 0'
        },
        alignItems: 'flex-start',
        width: 'fit-content',
        ...removePadding
    }),
    docListCustom: css({
        marginBottom: '12px',
        "& .MuiListItem-root": {
            padding: '0px'
        },
        "& .MuiListItemText-root": {
            flex: 'inherit',
            minWidth: 'auto',
            margin: '0 6px 0 0'
        },
        alignItems: 'flex-start',
        width: 'fit-content',
        ...removePadding
    }),
    exampleCode: css({
        display: 'flex',
        padding: '5px',
        fontFamily: 'monospace',
        borderRadius: '0px'
    }),
    paramTreeDescriptionText: css({
        flex: "inherit",
        whiteSpace: 'pre-wrap',
        marginLeft: '24px',
        ...removePadding
    }),
    listItemMultiLine: css({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        minHeight: '32px'
    }),
    listItemHeader: css({
        display: 'flex',
        alignItems: 'center',
        height: '28px'
    }),
    listItemBody: css({
        marginLeft: '12px',
        marginBottom: '8px',
        paddingLeft: '16px',
        borderLeft: "1px solid #d8d8d8",
    }),
    listDropdownWrapper: css({
        width: '200px',
    }),
    listOptionalWrapper: css({
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        marginBottom: '12px'
    }),
    listOptionalBtn: css({
        textTransform: 'none',
        minWidth: '32px',
        marginLeft: '8px'
    }),
    listOptionalHeader: css({
        fontSize: '13px',
        color: "gray",
        fontWeight: 500,
        letterSpacing: '0',
        lineHeight: '14px',
        paddingLeft: '0px',
    }),
});

export const useStatementEditorStyles = () => ({
    mainStatementWrapper: css({
        display: 'flex',
        height: 'auto',
        flexDirection: 'column',
    }),
    sourceEditor: css({
        fontSize: '13px',
        fontFamily: 'Gilmer',
        overflowY: 'hidden',
        padding: '0px 10px 0px 10px',
        margin: '0px 10px'
    }),
    statementExpressionWrapper: css({
        height: 'calc(100vh - ' + HEADER_FOOTER_HEIGHT + ')',
        '&.overlay': {
            display: 'block',
            position: 'relative',
            backgroundColor: '#fff',
            opacity: '0.7',
            zIndex: -1
        },
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    }),
    loadingWrapper: css({
        height: 'calc(100vh - 110px)',
        '&.overlay': {
            display: 'block',
            position: 'relative',
            backgroundColor: '#fff',
            opacity: '0.7',
            zIndex: -1
        },
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    }),
    sectionLoadingWrapper: css({
        height: '18vh',
        '&.overlay': {
            display: 'block',
            position: 'relative',
            backgroundColor: '#fff',
            opacity: '0.7',
            zIndex: -1
        },
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    }),
    suggestionsSection: css({
        display: 'flex',
        flexDirection: 'column',
        height: 'inherit'
    }),
    stmtEditorContentWrapper: css({
        backgroundColor: 'var(--vscode-editor-background)',
        display: 'flex',
        flexDirection: 'column',
        padding: "0px 0px 8px 0px",
        borderBottom: '1px solid var(--vscode-panel-border)'
    }),
    statementExpressionTitle: css({
        display: 'flex',
        alignItems: 'center',
        fontWeight: 500
    }),
    statementExpressionContent: css({
        maxHeight: '275px',
        overflowY: 'scroll',
        marginRight: '-25px',
        paddingTop: '25px',
        paddingBottom: '10px',
        width: '100%',
        ...statementFontStyles
    }),
    footer: css({
        height: 'auto',
        display: 'flex',
        width: '100%',
        padding: '10px 25px',
        borderTop: '1px solid var(--vscode-panel-border)'
    }),
    buttonWrapper: css({
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
        gap: '10px'
    }),
    stmtEditorToggle: css({
        width: '50%'
    }),
    separatorLine: css({
        height: '1px',
        opacity: '0.52',
        backgroundColor: 'var(--vscode-panel-border)',
        marginBottom: '15px'
    }),
    lastExpression: css({
        marginBottom: '15px'
    }),
    stmtEditorExpressionWrapper: css({
        marginTop: '10px',
        height: 'inherit'
    }),
    editorsBreadcrumb: css({
        width: '90%',
        '& > * + *': {
            marginTop: 16,
        },
    }),
    statementEditorHeader: css({
        minHeight: '5vh',
        display: 'flex',
        borderBottom: 'solid 1px #d8d8d8',
        padding: 12,
        ...stmtEditorPadding
    }),
    closeButton: css({
        display: 'flex',
        justifyContent: 'flex-end',
        width: '10%'
    }),
    helpLink: css({
        marginLeft: '8px',
        color: '#5567D5',
        "&:hover": {
            cursor: "pointer"
        }
    }),
    docButton: css({
        alignItems: "center",
        display: "flex"
    })
});
