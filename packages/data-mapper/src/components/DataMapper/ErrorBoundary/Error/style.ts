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
import { ThemeColors } from "@wso2/ui-toolkit";

export const useStyles = () => ({

    overlay: css({
        zIndex: 1,
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: "var(--vscode-input-background)",
        opacity: 0.5,
        cursor: 'not-allowed'
    }),

    errorContainer: css({
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '500px',
        zIndex: 2
    }),

    errorBody: css({
        backgroundColor: 'var(--vscode-editorWidget-background)',
        color: 'var(--vscode-foreground)',
        padding: '16px',
        border: `1px solid ${ThemeColors.OUTLINE_VARIANT}`,
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    }),

    headerContainer: css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
    }),

    infoIconContainer: css({
        display: 'flex',
        alignItems: 'center',
        color: 'var(--vscode-editorInfo-foreground)'
    }),

    actionButtons: css({
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
        alignSelf: 'flex-end'
    }),

    errorMessage: css({
        paddingLeft: '8px',
        '& p': {
            margin: '8px 0'
        }
    }),

    link: css({
        color: "var(--vscode-editor-selectionBackground)",
        textDecoration: "underline",
        "&:hover, &:focus, &:active": {
            color: "var(--vscode-editor-selectionBackground)",
            textDecoration: "underline",
        }
    }),

});
