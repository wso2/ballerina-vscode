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

export const GMAIL_LOGO_WIDTH = 20;
export const GMAIL_LOGO_HEIGHT = 20;

export function GmailLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (GMAIL_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (GMAIL_LOGO_HEIGHT / 2)} width={GMAIL_LOGO_WIDTH} height={GMAIL_LOGO_HEIGHT} >
            <defs>
                <radialGradient cx="-0.0229073661%" cy="6.29035857%" fx="-0.0229073661%" fy="6.29035857%" r="167.296932%" gradientTransform="translate(-0.000229,0.062904),scale(0.700335,1.000000),translate(0.000229,-0.062904)" id="radialGradient-1">
                    <stop stopColor="#263238" offset="32%" />
                    <stop stopColor="#263238" offset="100%" />
                </radialGradient>
                <radialGradient cx="1.79158904%" cy="2.43858239%" fx="1.79158904%" fy="2.43858239%" r="159.88798%" gradientTransform="translate(0.017916,0.024386),scale(0.749863,1.000000),translate(-0.017916,-0.024386)" id="radialGradient-2">
                    <stop stopColor="#FFFFFF" offset="0%" />
                    <stop stopColor="#FFFFFF" offset="100%" />
                </radialGradient>
            </defs>
            <g id="GmailWrapper" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <path id="Path" d="M1.364,11.136H4.545V3.409L0,0V9.773a1.363,1.363,0,0,0,1.364,1.364" transform="translate(0 3.868)" fill="#4285f4" />
                <path id="Path-2" d="M0,11.136H3.182A1.363,1.363,0,0,0,4.545,9.773V0L0,3.409" transform="translate(15.455 3.868)" fill="#34a853" />
                <path id="Path-3" d="M0,1.368V7.277L4.545,3.868V2.049A2.045,2.045,0,0,0,1.273.413" transform="translate(15.455 0)" fill="#fbbc04" />
                <path id="Path-4" d="M0,5.909V0L5.455,4.091,10.909,0V5.909L5.455,10" transform="translate(4.545 1.368)" fill="#ea4335" />
                <path id="Path-5" d="M0,2.049V3.868L4.545,7.277V1.368L3.273.413A2.045,2.045,0,0,0,0,2.049" transform="translate(0 0)" fill="#c5221f" />
            </g>
        </svg>
    )
}

