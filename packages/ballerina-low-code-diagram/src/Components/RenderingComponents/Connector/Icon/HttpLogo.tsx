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

export const HTTP_LOGO_WIDTH = 22;
export const HTTP_LOGO_HEIGHT = 22;

export function HttpLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (HTTP_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (HTTP_LOGO_HEIGHT / 2)} width={HTTP_LOGO_WIDTH} height={HTTP_LOGO_HEIGHT} >
            <g id="HttpWrapper" transform="translate(1 1)">
                <path id="Combined_Shape" d="M15.344,5H14.186V0h2.379l-.007,0A1.647,1.647,0,0,1,17.84.554a1.826,1.826,0,0,1,0,2.5,1.7,1.7,0,0,1-1.321.547H15.344V5h0Zm-.006-2.454h1.144l0,0a.664.664,0,0,0,.51-.22.736.736,0,0,0,.2-.512.758.758,0,0,0-.19-.513.607.607,0,0,0-.476-.22H15.337ZM12.3,5H11.13V1.074H9.558V0h4.32V1.074H12.3V5h0ZM6.5,5V1.074H4.931V0h4.32V1.074H7.676V5ZM3.47,5V3.072h-2.3V5H0V0H1.172V2h2.3V0H4.642V5Z" transform="translate(0.833 7.5)" fill="#5567d5" />
                <path id="Path" d="M0,.5H18.333" transform="translate(0.833 0.542)" fill="none" stroke="#ccd1f2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.175" />
                <path id="Path-2" d="M18.333.5H0" transform="translate(0.833 18.458)" fill="none" stroke="#ccd1f2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.175" />
            </g>
        </svg>
    )
}
