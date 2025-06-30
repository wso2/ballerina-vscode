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

export function MediumLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (LOGO_HEIGHT / 2)} width={LOGO_WIDTH} height={LOGO_HEIGHT} >
            <title>5A68F12C-66DA-41F4-AAFC-C1122AB9B9C2</title>
            <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="adding-new-API-Calls" transform="translate(-1178.000000, -634.000000)" fill="#000000" fillRule="nonzero">
                    <g id="Logo/Circle" transform="translate(1178.000000, 634.000000)">
                        <path d="M5.64069642,5 C8.75597674,5 11.2812012,7.46257023 11.2812012,10.5000928 C11.2812012,13.5376154 8.7557851,16 5.64069642,16 C2.52560773,16 0,13.5376154 0,10.5000928 C0,7.46257023 2.5254161,5 5.64069642,5 Z M14.6484865,5.32218117 C16.2061267,5.32218117 17.4688347,7.64017816 17.4688347,10.5000928 L17.4690264,10.5000928 C17.4690264,13.3592651 16.2063183,15.6780044 14.6486782,15.6780044 C13.091038,15.6780044 11.82833,13.3592651 11.82833,10.5000928 C11.82833,7.64092052 13.0908464,5.32218117 14.6484865,5.32218117 Z M19.0080776,5.86150057 C19.5557813,5.86150057 20,7.93823286 20,10.5000928 C20,13.0612104 19.5559729,15.138685 19.0080776,15.138685 C18.4601822,15.138685 18.0163468,13.0617671 18.0163468,10.5000928 C18.0163468,7.93841845 18.4603739,5.86150057 19.0080776,5.86150057 Z" id="Combined-Shape"/>
                    </g>
                </g>
            </g>
        </svg>
    );
}
