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

export const DEFAULT_LOGO_WIDTH = 47;

export interface DefaultIconProps {
    cx?: number;
    cy?: number;
    width?: number;
    scale?: number;
}

export default function DefaultConnectorIcon(props: DefaultIconProps) {
    const { cx, cy, width, scale } = props;
    const iconWidth = width || DEFAULT_LOGO_WIDTH;
    const translateDistance = scale < 1 ? iconWidth * scale : 0;

    return (
        <svg width={iconWidth} height={iconWidth} x={cx} y={cy}>
            <g id="connector-icon" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g fill="#5567D5" fill-rule="nonzero">
                    <path
                        transform={`scale(${scale || 1}) translate(${translateDistance}, ${translateDistance})`}
                        d="M40.9705627,9.1507576 C41.9468735,10.1270683 41.9468735,11.7099808 40.9705627,12.6862915 C39.994252,13.6626022 38.4113396,13.6626022 37.4350288,12.6862915 C31.1866402,6.43790283 21.0560005,6.43790283 14.8076118,12.6862915 C8.55922318,18.9346802 8.55922318,29.0653198 14.8076118,35.3137085 C21.0560005,41.5620972 31.1866402,41.5620972 37.4350288,35.3137085 C38.4113396,34.3373978 39.994252,34.3373978 40.9705627,35.3137085 C41.9468735,36.2900192 41.9468735,37.8729317 40.9705627,38.8492424 C32.7695526,47.0502525 19.4730881,47.0502525 11.2720779,38.8492424 C7.93659152,35.513756 5.95770258,31.335388 5.33541111,26.9997661 L3,27 C1.34314575,27 2.02906125e-16,25.6568542 0,24 C-2.02906125e-16,22.3431458 1.34314575,21 3,21 L5.3355548,20.999233 C5.95800715,16.663969 7.93684819,12.4859873 11.2720779,9.1507576 C19.4730881,0.949747469 32.7695526,0.949747469 40.9705627,9.1507576 Z M26,14.5 C30.1981026,14.5 33.7601988,17.2230666 35.0163468,20.9992578 L45,21 C46.6568542,21 48,22.3431458 48,24 C48,25.6568542 46.6568542,27 45,27 L35.0166782,26.9997458 C33.7608254,30.7764544 30.1984718,33.5 26,33.5 C20.7532949,33.5 16.5,29.2467051 16.5,24 C16.5,18.7532949 20.7532949,14.5 26,14.5 Z M26,19.5 C23.5147186,19.5 21.5,21.5147186 21.5,24 C21.5,26.4852814 23.5147186,28.5 26,28.5 C28.4852814,28.5 30.5,26.4852814 30.5,24 C30.5,21.5147186 28.4852814,19.5 26,19.5 Z"
                        id="Combined-Shape"
                    />
                </g>
            </g>
        </svg>
    );
}
