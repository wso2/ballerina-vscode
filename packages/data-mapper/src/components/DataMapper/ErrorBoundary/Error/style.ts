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
import { css, keyframes } from "@emotion/css";

const fadeIn = keyframes`
    from { opacity: 0.5; }
    to { opacity: 1; }
`;

export const useStyles = () => ({
    root: css({
        position: 'relative',
        flexGrow: 1,
        margin: '25vh auto',
        width: 'fit-content'
    }),
    errorContainer: css({
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column" 
    }),
    errorTitle: css({
        color: "var(--vscode-badge-background)",
        textAlign: "center"
    }),
    errorMsg: css({
        paddingTop: "16px",
        color: "var(--vscode-checkbox-border)",
        textAlign: "center"
    }),
    closeButtonContainer: css({
        position: 'absolute',
        top: '16px',
        right: '16px'
    }),
    errorImg: css({
        display: 'flex',
        justifyContent: 'center',
        width: '100%'
    }),
    iconContainer: css({
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        marginTop: '16px'
    }),
    gridContainer: css({
        height: "100%"
    }),
    link: css({
        color: "var(--vscode-editor-selectionBackground)",
        textDecoration: "underline",
        "&:hover, &:focus, &:active": {
            color: "var(--vscode-editor-selectionBackground)",
            textDecoration: "underline",
        }
    }),
    overlay: css({
        zIndex: 1,
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: "var(--vscode-input-background)",
        opacity: 0.5,
        cursor: 'not-allowed'
    }),
    errorBanner: css({
        borderColor: "var(--vscode-errorForeground)"
    }),
    errorMessage: css({
        zIndex: 1,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        animation: `${fadeIn} 0.5s ease-in-out`
    }),
    warningContainer: css({
        marginTop: 20,
        marginLeft: 16,
        marginRight: 16,
        backgroundColor: 'var(--vscode-editorWidget-background)',
        color: 'var(--vscode-sideBarSectionHeader-foreground)',
        padding: 10,
        minWidth: 120,
        width: 'fit-content',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'row',
        height: 'fit-content',
    }),
    warningIcon: css({
        display: 'flex',
        alignItems: 'center',
        position: 'absolute',
        top: '50%',
        color: 'var(--vscode-editorWarning-foreground)'
    }),
    warningBody: css({
        marginLeft: 35
    })
});
