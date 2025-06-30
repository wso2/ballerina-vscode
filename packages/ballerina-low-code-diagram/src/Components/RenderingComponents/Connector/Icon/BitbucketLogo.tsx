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

export function BitbucketLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (LOGO_HEIGHT / 2)} width={LOGO_WIDTH} height={LOGO_HEIGHT} >
            <title>BA502F3B-6142-438B-AEAB-6ABEE0D88D68</title>
            <defs>
                <linearGradient x1="108.63338%" y1="29.6476374%" x2="46.9265964%" y2="66.1865792%" id="linearGradient-1">
                    <stop stop-color="#0052CC" offset="18%"/>
                    <stop stop-color="#2684FF" offset="100%"/>
                </linearGradient>
            </defs>
            <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="adding-new-API-Calls" transform="translate(-1008.000000, -674.000000)">
                    <g id="Logo/Circle" transform="translate(1008.000000, 674.000000)">
                        <polygon id="Path" points="8.05846467 13 12.0391459 13 13 7 7 7"/>
                        <path d="M0.649072708,1.00005116 C0.459767948,0.99766092 0.279072393,1.07912427 0.155457534,1.22264217 C0.0318426757,1.36616007 -0.0220379689,1.55704166 0.00826905634,1.74408306 L2.72848056,18.2719492 C2.79844033,18.6894415 3.15780825,18.9963867 3.58074942,18.9999475 L16.6307158,18.9999475 C16.9481653,19.003983 17.2207496,18.7748131 17.2715194,18.4611506 L19.9917309,1.74728987 C20.022038,1.56024846 19.9681573,1.36936687 19.8445425,1.22584897 C19.7209276,1.08233108 19.5402321,1.00086772 19.3509273,1.00331141 L0.649072708,1.00005116 Z M12.103438,12.9454483 L7.93821425,12.9454483 L6.81039982,7.04813635 L13.1127037,7.04813635 L12.103438,12.9454483 Z" id="Shape" fill="#2684FF" fillRule="nonzero"/>
                        <path d="M19,7 L13.0258604,7 L12.0232743,12.9210895 L7.88561766,12.9210895 L3,18.7874435 C3.15485249,18.9228985 3.35228252,18.9982216 3.55699224,19 L16.5237716,19 C16.8391201,19.0040517 17.1099004,18.7739579 17.1603342,18.4590307 L19,7 Z" id="Path" fill="url(#linearGradient-1)" fillRule="nonzero"/>
                    </g>
                </g>
            </g>
        </svg>
    );
}
