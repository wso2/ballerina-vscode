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
import * as React from "react";

export const QUERY_CLIENT_LOGO_WIDTH = 48;
export const QUERY_CLIENT_LOGO_HEIGHT = 48;

export function QueryClientLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (QUERY_CLIENT_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (QUERY_CLIENT_LOGO_HEIGHT / 2)} width={QUERY_CLIENT_LOGO_WIDTH} height={QUERY_CLIENT_LOGO_HEIGHT} >
            <path id="Query" d="M19.921,3.659A8.395,8.395,0,0,1,33.377,5.43a10.3,10.3,0,0,1,14.492,9.521A10.346,10.346,0,0,1,35.515,25.167a7.543,7.543,0,0,1-9.889,3.108,8.6,8.6,0,0,1-16-.393,7.476,7.476,0,0,1-1.639.17A8.09,8.09,0,0,1,4,12.984,9.294,9.294,0,0,1,19.921,3.659" transform="translate(0.066 8.026)" fill="#00a1e0" />
            <circle id="Oval" cx="12.5" cy="12.5" r="12.5" transform="translate(18 19)" fill="#fff" />
            <path id="Query_icon" d="M14,14H10.81l-1-1.012a6.656,6.656,0,0,1-3.042.732A6.823,6.823,0,0,1,0,6.861,6.823,6.823,0,0,1,6.77,0a6.877,6.877,0,0,1,4.877,11.614L14,14l0,0ZM2.256,6.861A4.549,4.549,0,0,0,6.77,11.434a4.446,4.446,0,0,0,1.312-.2L6.02,9.147H9.212l.839.85A4.584,4.584,0,0,0,6.77,2.287,4.549,4.549,0,0,0,2.256,6.861Z" transform="translate(24 25)" fill="#67c6eb" />
        </svg>
    )
}
