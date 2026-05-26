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

export const SMTP_LOGO_WIDTH = 22;
export const SMTP_LOGO_HEIGHT = 22;

export function SMTPLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (SMTP_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (SMTP_LOGO_HEIGHT / 2)} width={SMTP_LOGO_WIDTH} height={SMTP_LOGO_HEIGHT} >
            <g id="SmtpLogo" transform="translate(-54.5 -352)">
                <path id="Path" d="M56.47,354.159H74.8" fill="none" stroke="#ccd1f2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.175" />
                <path id="Path-2" d="M74.8,372.075H56.47" fill="none" stroke="#ccd1f2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.175" />
                <g id="Group_9">
                    <path id="Path_203" d="M57.27,365.2a2.194,2.194,0,0,1-.8-1.035l1.073-.335a1.251,1.251,0,0,0,.46.576,1.308,1.308,0,0,0,.765.221.948.948,0,0,0,.537-.134.39.39,0,0,0,.2-.321c0-.2-.169-.351-.51-.462l-1.222-.382a1.741,1.741,0,0,1-.8-.489,1.107,1.107,0,0,1-.291-.784,1.26,1.26,0,0,1,.5-1.014,1.911,1.911,0,0,1,1.262-.419,2.432,2.432,0,0,1,1.328.365,1.817,1.817,0,0,1,.772.894l-1.037.308a1.1,1.1,0,0,0-.427-.416,1.258,1.258,0,0,0-.626-.16.847.847,0,0,0-.457.111.323.323,0,0,0-.172.281q0,.246.318.342l1.2.385a2.68,2.68,0,0,1,.96.492,1.08,1.08,0,0,1,.338.854,1.343,1.343,0,0,1-.54,1.089,2.178,2.178,0,0,1-1.411.435v.02A2.357,2.357,0,0,1,57.27,365.2Z" fill="#5567d5" />
                    <path id="Path_204" d="M67.879,365.5v-3.766H66.37V360.7h4.15v1.032H69.01V365.5Z" fill="#5567d5" />
                    <path id="Path_205" d="M64.948,365.5v-2.808l-1.393,1.93-1.391-1.93V365.5H61.037v-4.8h1.07l1.455,2.134,1.444-2.134h1.073v4.8Z" fill="#5567d5" />
                    <path id="Path_206" d="M74.354,361.217a1.587,1.587,0,0,0-1.24-.533l.005-.005H70.825v4.827h1.117v-1.348h1.13a1.634,1.634,0,0,0,1.277-.532,1.764,1.764,0,0,0,0-2.409Zm-.816,1.647a.622.622,0,0,1-.49.21l0,0h-1.1v-1.415H73.09a.593.593,0,0,1,.461.209.731.731,0,0,1,.18.5.688.688,0,0,1-.194.493Z" fill="#5567d5" />
                </g>
            </g>
        </svg>
    )
}
