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

export const IMAP_LOGO_WIDTH = 22;
export const IMAP_LOGO_HEIGHT = 22;

export function ImapLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (IMAP_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (IMAP_LOGO_HEIGHT / 2)} width={IMAP_LOGO_WIDTH} height={IMAP_LOGO_HEIGHT} >
            <g id="Logo_IMAP" transform="translate(-88.089 -354.061)">
                <path id="Path" d="M89.676,355.648h18.333" fill="none" stroke="#ccd1f2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.175" />
                <path id="Path-2" d="M108.009,373.564H89.676" fill="none" stroke="#ccd1f2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.175" />
                <path id="Path_2" d="M101.437,362.24h-1.5l-1.779,4.814h1.176l.339-.921h2.035l.335.921h1.176Zm-1.394,2.9.653-1.8.653,1.8Zm-3.522,1.91v-2.82l-1.414,1.933-1.41-1.933v2.82H92.555v-4.814h1.084l1.474,2.138,1.465-2.138h1.089v4.814Zm-6.028,0v-4.814H91.65v4.814Zm16.787-4.361a1.591,1.591,0,0,0-1.24-.533l0,0H103.75v4.826h1.118v-1.348H106a1.638,1.638,0,0,0,1.277-.531,1.767,1.767,0,0,0,0-2.41Zm-.817,1.648a.623.623,0,0,1-.489.209l0,0h-1.105V363.14h1.151a.588.588,0,0,1,.461.21.722.722,0,0,1,.18.5.693.693,0,0,1-.193.494Z" fill="#5567d5" />
            </g>
        </svg>
    )
}
