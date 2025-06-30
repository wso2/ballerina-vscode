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

export const PAGERDUTY_LOGO_WIDTH = 48;
export const PAGERDUTY_LOGO_HEIGHT = 41;

export function PagerDutyLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (PAGERDUTY_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (PAGERDUTY_LOGO_HEIGHT / 2)} width={PAGERDUTY_LOGO_WIDTH} height={PAGERDUTY_LOGO_HEIGHT} >
            <g id="Symbols" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="Logo/PagerDuty" transform="translate(0.000000, -4.000000)" fill="#25C151" fillRule="nonzero">
                    <path
                        d="M5.028,45 L0,45 L0,19.6546276 C0,17.0523019 1.0635,15.4788551 1.953,14.6051365
                    C3.9255,12.6618657 6.603,12.6046221 7.0395,12.6046221 L14.949,12.6046221 C17.77275,12.6046221
                    19.3965,13.7494948 20.28675,14.7135981 C22.04625,16.6365323 22.06575,19.1221112 22.02675,19.7826726
                    L22.02675,29.3385935 C22.02675,32.0968329 20.90475,33.7282764 19.977,34.6019951 C18.06225,36.4081824
                    15.5295,36.4473491 14.9295,36.4277657 L5.028,36.4277657 L5.028,45 Z M15.123,31.3654701
                    C15.393,31.3654701 16.14825,31.2878899 16.554,30.8984826 C16.86375,30.606992 17.019,30.0827608
                    17.019,29.3167506 L17.019,19.5100121 C17.019,19.2388581 16.96125,18.5195466 16.57425,18.1113091
                    C16.19925,17.722655 15.49125,17.6443216 14.94975,17.6443216 L6.99975,17.6443216 C5.02725,17.6443216
                    5.02725,19.1394349 5.02725,19.6448359 L5.02725,31.3571848 L15.123,31.3654701 Z M42.972,4 L48,4
                    L48,29.3657089 C48,31.9680347 46.9365,33.5414814 46.047,34.4152001 C44.0745,36.3584708
                    41.397,36.4157144 40.9605,36.4157144 L33.051,36.4157144 C30.22725,36.4157144 28.6035,35.2708418
                    27.71325,34.3067384 C25.95375,32.3838042 25.93425,29.8982254 25.97325,29.237664 L25.97325,19.6945475
                    C25.97325,16.9363082 27.09525,15.3048646 28.023,14.431146 C29.93775,12.6249587 32.4705,12.585792
                    33.0705,12.6053753 L42.972,12.6053753 L42.972,4 Z M32.877,17.645828 C32.607,17.645828
                    31.85175,17.7234082 31.446,18.1128155 C31.13625,18.4043061 30.981,18.9285373 30.981,19.6945475
                    L30.981,29.501286 C30.981,29.77244 31.03875,30.4917515 31.42575,30.899989 C31.80075,31.2886431
                    32.50875,31.3669765 33.05025,31.3669765 L40.99875,31.3669765 C42.99075,31.3473932
                    42.99075,29.8605651 42.99075,29.3468788 L42.99075,17.645828 L32.877,17.645828 Z"
                        id="Shape"
                    />
                </g>
            </g>
        </svg>
    )
}

