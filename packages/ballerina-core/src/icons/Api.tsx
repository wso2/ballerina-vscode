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
import React from 'react';

export default function ApiIcon(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" {...props}>
            <g fill="#5668D5">
                <path d="M6 1v2h1.889c.49 0 .889.398.889.889v.222c0 .491-.398.889-.89.889H6v6h2c.49 0 .889.398.889.889v.222c0 .491-.398.889-.889.889H6v2c-3.314 0-6-2.686-6-6V7c0-3.238 2.566-5.878 5.775-5.996L6 1z" />
                <path d="M10 15V1c3.314 0 6 2.686 6 6v2c0 3.314-2.686 6-6 6z" opacity=".3" />
            </g>
        </svg>
    )
}
