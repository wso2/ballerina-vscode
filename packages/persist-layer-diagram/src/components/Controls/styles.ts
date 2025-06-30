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

export const useStyles = () => ({
    button: css({
        alignItems: 'center !important',
        backgroundColor: 'white !important',
        borderRadius: '5px !important',
        border: '1px solid #808080 !important',
        color: '#595959 !important',
        display: 'flex !important',
        flexDirection: 'row !important',
        justifyContent: 'space-between !important',
        fontFamily: 'GilmerRegular !important',
        fontSize: '13px !important',
        height: '30px !important',
        textTransform: 'none !important',
        width: '100px !important'
    })
});
