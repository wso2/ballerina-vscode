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

export const useStyles = () => ({
    balModuleListWrap: css({
        marginTop: '16px',
        height: '80vh',
        overflowY: 'scroll',
        scrollbarWidth: 'none',
    }),
    balModuleSectionWrap: css({
        marginTop: '48px',
        '&:first-of-type': {
            marginTop: 0,
        },
    }),
    pageLoadingText: css({
        marginLeft: '30px',
    }),
    container: css({
        width: '600px',
        height: '85vh',
        '& .MuiFormControl-marginNormal': {
            margin: '0 !important',
        },
        '& #module-list-container': {
            paddingRight: 0,
        },
    }),
    msgContainer: css({
        height: '80vh',
        display: 'flex',
        alignContent: 'center',
        alignItems: 'center',
    }),
    resultsContainer: css({
        marginTop: '16px',
        scrollbarWidth: 'none',
        display: 'flex',
        alignContent: 'flex-start',
    })
});

export default useStyles;

