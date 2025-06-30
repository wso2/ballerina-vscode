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

export const TWILIO_LOGO_WIDTH = 20;
export const TWILIO_LOGO_HEIGHT = 20;

export function LeanIXLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (TWILIO_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (TWILIO_LOGO_HEIGHT / 2)} width={TWILIO_LOGO_WIDTH} height={TWILIO_LOGO_HEIGHT} >
            <defs>
                <ellipse id="path-1" cx="6.60377358" cy="6.80555556" rx="6.60377358" ry="6.80555556"/>
            </defs>
            <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="adding-new-API-Calls" transform="translate(-1178.000000, -674.000000)">
                    <g id="Icon/Connectro-logo-Copy-7" transform="translate(1178.000000, 674.000000)">
                        <g id="LeanIX-Logo-Farbe" transform="translate(0.000000, 3.000000)">
                            <g id="Group" transform="translate(6.792453, 0.194444)">
                                <g id="a-link" fill="#166BFF" fillRule="nonzero">
                                    <ellipse id="a" cx="6.60377358" cy="6.80555556" rx="6.60377358" ry="6.80555556"/>
                                </g>
                                <g id="Clipped">
                                    <mask id="mask-2" fill="white">
                                        {/* <use xlink:href="#path-1"></use> */}
                                    </mask>
                                    <g id="a"/>
                                </g>
                            </g>
                            <polygon id="Path" fill="#166BFF" fillRule="nonzero" points="0 7 6.79245283 0 13.5849057 7 6.79245283 14"/>
                            <path d="M8.78867925,11.8611111 C7.51115127,10.5867554 6.79067965,8.83229878 6.79244956,7 C6.79244956,5.09444444 7.55707547,3.37166667 8.78867925,2.13888889 L13.5849057,7 L8.78867925,11.8611111 L8.78867925,11.8611111 Z" id="Path" fill="#FFFFFF" fillRule="nonzero"/>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    );
}
