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

export const GOOGLE_DRIVE_LOGO_WIDTH = 20;
export const GOOGLE_DRIVE_LOGO_HEIGHT = 20;

export function GoogleDriveLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (GOOGLE_DRIVE_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (GOOGLE_DRIVE_LOGO_HEIGHT / 2)} width={GOOGLE_DRIVE_LOGO_WIDTH} height={GOOGLE_DRIVE_LOGO_HEIGHT} >
            <g id="GoogleDrive" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="GoogleDrive-new" transform="translate(-1048.000000, -514.000000)" fillRule="nonzero">
                    <g id="Dropdown/Select/Default-Copy-20" transform="translate(1038.000000, 504.000000)">
                        <g id="GoogleDrive-circle" transform="translate(10.000000, 10.000000)">
                            <path d="M1.51202749,16.4269231 L2.39404353,17.9615385 C2.57731959,18.2846154 2.84077892,18.5384615 3.15005727,18.7230769 L6.30011455,13.2307692 L0,13.2307692 C0,13.5884615 0.0916380298,13.9461538 0.274914089,14.2692308 L1.51202749,16.4269231 Z" id="Path" fill="#0066DA"/>
                            <path d="M10,6.76923077 L6.84994273,1.27692308 C6.54066438,1.46153846 6.27720504,1.71538462 6.09392898,2.03846154 L0.274914089,12.1923077 C0.0950087054,12.5084172 0.000239533318,12.8663987 0,13.2307692 L6.30011455,13.2307692 L10,6.76923077 Z" id="Path" fill="#00AC47"/>
                            <path d="M16.8499427,18.7230769 C17.1592211,18.5384615 17.4226804,18.2846154 17.6059565,17.9615385 L17.9725086,17.3269231 L19.7250859,14.2692308 C19.908362,13.9461538 20,13.5884615 20,13.2307692 L13.6994273,13.2307692 L15.0400916,15.8846154 L16.8499427,18.7230769 Z" id="Path" fill="#EA4335"/>
                            <path d="M10,6.76923077 L13.1500573,1.27692308 C12.8407789,1.09230769 12.4856816,1 12.1191294,1 L7.88087056,1 C7.51431844,1 7.15922108,1.10384615 6.84994273,1.27692308 L10,6.76923077 Z" id="Path" fill="#00832D"/>
                            <path d="M13.6998855,13.2307692 L6.30011455,13.2307692 L3.15005727,18.7230769 C3.45933562,18.9076923 3.81443299,19 4.18098511,19 L15.8190149,19 C16.185567,19 16.5406644,18.8961538 16.8499427,18.7230769 L13.6998855,13.2307692 Z" id="Path" fill="#2684FC"/>
                            <path d="M16.8155785,7.11538462 L13.906071,2.03846154 C13.722795,1.71538462 13.4593356,1.46153846 13.1500573,1.27692308 L10,6.76923077 L13.6998855,13.2307692 L19.9885452,13.2307692 C19.9885452,12.8730769 19.8969072,12.5153846 19.7136312,12.1923077 L16.8155785,7.11538462 Z" id="Path" fill="#FFBA00"/>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    )
}
