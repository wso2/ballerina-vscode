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

export const GENARIC_MAIL_LOGO_WIDTH = 44;
export const GENARIC_MAIL_LOGO_HEIGHT = 33;

export function GenaricMailLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (GENARIC_MAIL_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (GENARIC_MAIL_LOGO_HEIGHT / 2)} width={GENARIC_MAIL_LOGO_WIDTH} height={GENARIC_MAIL_LOGO_HEIGHT} >
            <g id="GenaricMailWrapper" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="GenaricMail" transform="translate(-2.000000, -8.000000)" fillRule="nonzero">
                    <g id="GenaricMailPath" transform="translate(2.000000, 8.000000)">
                        <path
                            d="M41.2500004,4.41723021e-07 L2.75000044,4.41723021e-07 C2.02052834,-0.00041283487
                        1.32081468,0.289185602 0.804999927,0.805000326 C0.289185176,1.32081505 0,2.02052868
                        0,2.75000074 L0,30.2499993 C0,30.9794713 0.289185176,31.679185 0.804999927,32.1949997
                        C1.32081468,32.7108144 2.02052834,33.0004128 2.75000044,33.0000004 L41.2500004,33.0000004
                        C41.9794725,33.0004128 42.6791862,32.7108144 43.195001,32.1949997 C43.7108157,31.679185
                        44,30.9794713 44,30.2499993 L44,2.75000074 C44,2.02052868 43.7108157,1.32081505
                        43.195001,0.805000326 C42.6791862,0.289185602 41.9794725,-0.00041283487
                        41.2500004,4.41723021e-07 Z M5.50000044,27.4999994 L5.50000044,12.988296 L20.6357254,21.6374581
                        C21.4810144,22.1208468 22.5189865,22.1208468 23.3642754,21.6374581 L38.5000004,12.988296
                        L38.5000004,27.4999994 L5.50000044,27.4999994 Z"
                            id="Shape"
                            fill="#5567D5"
                        />
                        <polygon id="Path" fill="#CCD1F2" points="39 5 39 6.19985449 22.5 16 6 6.19985449 6 5" />
                    </g>
                </g>
            </g>
        </svg>
    )
}

