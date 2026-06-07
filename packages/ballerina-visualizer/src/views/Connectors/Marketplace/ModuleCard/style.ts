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
    balModule: css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        height: '140px',
        border: `1px solid ${ThemeColors.OUTLINE_VARIANT}`,
        backgroundColor: `${ThemeColors.PRIMARY_CONTAINER}`,
        borderRadius: '10px',
        padding: '16px',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: `${ThemeColors.PRIMARY_CONTAINER}`,
            border: `1px solid ${ThemeColors.PRIMARY}`
        },
    }),
    balModuleName: css({
        fontSize: '13px',
        width: '120px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 500,
        textAlign: 'center',
    }),
    orgName: css({
        fontSize: '13px',
        width: '120px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center',
    }),
});

export default useStyles;
