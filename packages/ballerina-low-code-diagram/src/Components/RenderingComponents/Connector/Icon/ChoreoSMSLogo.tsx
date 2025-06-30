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

export function ChoreoSMSLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (TWILIO_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (TWILIO_LOGO_HEIGHT / 2)} width={TWILIO_LOGO_WIDTH} height={TWILIO_LOGO_HEIGHT} >
            <g id="Adding" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="new-adding-new" transform="translate(-763.000000, -650.000000)">
                    <g id="Dropdown/Select/Default-Copy-27" transform="translate(753.000000, 640.000000)">
                        <g id="Logo/Circle" transform="translate(10.000000, 10.000000)">
                            <path d="M5,2 L15,2 C17.209139,2 19,3.790861 19,6 L19,12 C19,14.209139 17.209139,16 15,16 L5.027,16 L5.027,16 L2.70472434,18.3067054 C2.31288868,18.6959139 1.67972728,18.6937842 1.29051877,18.3019485 C1.10443553,18.1146092 1,17.8612753 1,17.5972242 L1,6 C1,3.790861 2.790861,2 5,2 Z" id="Rectangle" stroke="#CCD1F2" strokeWidth="2"/>
                            <path d="M14,6 C14.5522847,6 15,6.44771525 15,7 C15,7.51283584 14.6139598,7.93550716 14.1166211,7.99327227 L14,8 L6,8 C5.44771525,8 5,7.55228475 5,7 C5,6.48716416 5.38604019,6.06449284 5.88337887,6.00672773 L6,6 L14,6 Z" id="Path-23" fill="#5567D5" fillRule="nonzero"/>
                            <path d="M12,10 C12.5522847,10 13,10.4477153 13,11 C13,11.5128358 12.6139598,11.9355072 12.1166211,11.9932723 L12,12 L6,12 C5.44771525,12 5,11.5522847 5,11 C5,10.4871642 5.38604019,10.0644928 5.88337887,10.0067277 L6,10 L12,10 Z" id="Path-23-Copy" fill="#5567D5" fillRule="nonzero"/>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    );
}
