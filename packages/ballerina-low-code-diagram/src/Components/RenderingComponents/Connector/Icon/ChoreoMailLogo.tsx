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

export function ChoreoMailLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (TWILIO_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (TWILIO_LOGO_HEIGHT / 2)} width={TWILIO_LOGO_WIDTH} height={TWILIO_LOGO_HEIGHT} >
            <g id="Adding" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="new-adding-new" transform="translate(-593.000000, -650.000000)" strokeWidth="2">
                    <g id="Dropdown/Select/Default-Copy-29" transform="translate(583.000000, 640.000000)">
                        <g id="Logo/Circle" transform="translate(10.000000, 10.000000)">
                            <path d="M19,6 L19,15 C19,16.1045695 18.1045695,17 17,17 L3,17 C1.8954305,17 1,16.1045695 1,15 L1,6" id="Path" stroke="#CCD1F2" stroke-linecap="round"/>
                            <path d="M3.62843022,2 L16.3680313,2 C16.920316,2 17.3680313,2.44771525 17.3680313,3 C17.3680313,3.28579354 17.2457507,3.55793053 17.0320612,3.747706 L11.3211557,8.81950182 C10.5630826,9.49273866 9.421171,9.49222834 8.66369995,8.81831421 L2.96373227,3.74711219 C2.5511136,3.38000965 2.51421548,2.74792072 2.88131803,2.33530204 C3.07107729,2.12201501 3.34294828,2 3.62843022,2 Z" id="Rectangle" stroke="#5567D5"/>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    );
}
