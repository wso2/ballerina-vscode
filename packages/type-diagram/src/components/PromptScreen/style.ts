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
import { ThemeColors } from '@wso2/ui-toolkit';

export const useStyles = () => ({
    button: css({
        backgroundColor: ThemeColors.PRIMARY,
        borderRadius: '5px',
        color: 'white',
        fontSize: '12px',
        marginInline: '5px',
        minWidth: '140px',
        '&:hover': {
            backgroundColor: ThemeColors.PRIMARY_CONTAINER
        }
    }),
    container: css({
        alignItems: 'center',
        backgroundImage: 'radial-gradient(circle at 0.5px 0.5px, var(--vscode-textBlockQuote-border) 1px, transparent 0)',
        backgroundRepeat: 'repeat',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw'
    }),
    messageBox: css({
        color: `${ThemeColors.ON_SURFACE}`,
        fontFamily: 'GilmerRegular',
        fontSize: '16px',
        padding: '10px'
    })
});
