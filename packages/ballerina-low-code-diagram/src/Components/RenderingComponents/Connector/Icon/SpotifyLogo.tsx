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

export function SpotifyLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (LOGO_HEIGHT / 2)} width={LOGO_WIDTH} height={LOGO_HEIGHT} >
            <title>1F2D4523-2F75-4213-AD56-DBE920526B49</title>
            <g id="Adding" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="adding-new-API-Calls" transform="translate(-1178.000000, -674.000000)" fill="#1ED760" fillRule="nonzero">
                    <g id="Logo/Circle" transform="translate(1178.000000, 674.000000)">
                        <path d="M9.99994029,0 C4.47724301,0 0,4.47723052 0,10.0000597 C0,15.5231277 4.47724301,20 9.99994029,20 C15.5232346,20 20,15.5231277 20,10.0000597 C20,4.47758877 15.5232346,0.000477660419 9.99982088,0.000477660419 L9.99994029,0 Z M14.5858485,14.4229564 C14.4067301,14.7167175 14.0222226,14.8098613 13.7284685,14.6295445 C11.3805848,13.1953691 8.42489268,12.87056 4.94402551,13.6658646 C4.60859649,13.7422903 4.27424218,13.5321197 4.19781834,13.1965632 C4.12103626,12.8610068 4.33036594,12.5266445 4.66663084,12.4502188 C8.47588171,11.5799215 11.7433592,11.9546461 14.3792653,13.5655559 C14.6730194,13.7458727 14.766161,14.1291952 14.5858485,14.4229564 L14.5858485,14.4229564 Z M15.809824,11.7000531 C15.5841349,12.0668963 15.1040976,12.182729 14.737502,11.9570344 C12.0495322,10.3048071 7.95213957,9.82631073 4.77278834,10.7914236 C4.36045783,10.9159736 3.92496134,10.6835918 3.7998173,10.2719679 C3.67562856,9.85962754 3.90812421,9.42495656 4.31973825,9.2995707 C7.9514231,8.19760812 12.466281,8.73139363 15.5530877,10.6283026 C15.9196833,10.8539971 16.0355132,11.3340458 15.809824,11.7001726 L15.809824,11.7000531 Z M15.9149068,8.86466089 C12.6919701,6.95031735 7.3745425,6.77429948 4.29740816,7.70824502 C3.80328025,7.85811097 3.28073224,7.57915729 3.13098927,7.08501758 C2.98124631,6.59063905 3.2599545,6.0684368 3.75444064,5.91821259 C7.2867745,4.84586495 13.158872,5.05305016 16.8694884,7.2559006 C17.3148961,7.51968857 17.460579,8.09371697 17.196678,8.53758292 C16.933971,8.98204594 16.3584039,9.12856827 15.9153845,8.86466089 L15.9149068,8.86466089 Z" id="Shape"/>
                    </g>
                </g>
            </g>
        </svg>
    );
}
