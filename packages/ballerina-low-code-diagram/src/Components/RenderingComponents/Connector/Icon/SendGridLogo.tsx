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

export const LOGO_WIDTH = 20;
export const LOGO_HEIGHT = 20;

export function SendGridLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (LOGO_HEIGHT / 2)} width={LOGO_WIDTH} height={LOGO_HEIGHT} >
            <title>C728B5A1-E8B9-4D2C-912E-4D4EC818DA55</title>
            <g id="Adding" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="adding-new-API-Calls" transform="translate(-1008.000000, -714.000000)" fillRule="nonzero">
                    <g id="Group" transform="translate(1008.000000, 714.000000)">
                        <rect id="Rectangle" fill="#99E1F4" x="6.66142969" y="13.3385703" width="6.66142969" height="6.66142969"/>
                        <polygon id="Path" fill="#99E1F4" points="6.66142969 6.67714061 6.66142969 6.67714061 6.66142969 6.67714061 0 6.67714061 0 13.3385703 6.66142969 13.3385703"/>
                        <rect id="Rectangle" fill="#1A82E2" x="0" y="13.3385703" width="6.66142969" height="6.66142969"/>
                        <polygon id="Path" fill="#00B2E3" points="20 6.67714061 20 6.67714061 13.3385703 6.67714061 13.3385703 13.3385703 20 13.3385703"/>
                        <rect id="Rectangle" fill="#00B2E3" x="6.66142969" y="0" width="6.66142969" height="6.66142969"/>
                        <polygon id="Path" fill="#009DD9" points="6.66142969 6.67714061 6.66142969 13.3385703 13.3385703 13.3385703 13.3385703 6.67714061 13.3385703 6.67714061"/>
                        <rect id="Rectangle" fill="#1A82E2" x="13.3385703" y="0" width="6.66142969" height="6.66142969"/>
                    </g>
                </g>
            </g>
        </svg>
    );
}
