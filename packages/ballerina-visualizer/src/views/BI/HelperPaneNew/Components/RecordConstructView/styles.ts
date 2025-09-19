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


const removePadding = {
    padding: '0px'
}

const statementFontStyles = {
    fontSize: "15px",
    'user-select': 'none',
    fontFamily: 'monospace'
}

const truncateText = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
}

export const useHelperPaneStyles = () => ({
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


