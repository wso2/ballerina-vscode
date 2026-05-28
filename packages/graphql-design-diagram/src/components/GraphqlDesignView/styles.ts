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

import { css } from '@emotion/css';
import { ThemeColors } from "@wso2/ui-toolkit";

export const GraphqlUnsupportedStyles = () => ({
    overlayWrapper: css(
        {
            height: 'calc(100vh - 110px)',
            '&.overlay': {
                display: 'block',
                position: 'relative',
                backgroundColor: `${ThemeColors.SURFACE_DIM}`,
                opacity: '0.7',
                zIndex: -1
            },
            overflowY: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        }
    ),
    title: css(
        {
            fontWeight: 600,
            fontSize: "17px",
            lineHeight: "24px",
            marginTop: "28px",
            marginBottom: "4px",
            color: "var(--vscode-editor-foreground)"
        }
    ),
    subtitle: css(
        {
            fontWeight: 400,
            fontSize: "13px",
            lineHeight: "20px",
            color: "var(--vscode-editorInlayHint-foreground)"
        }
    ),

})

