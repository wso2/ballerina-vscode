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

export const SOBJECT_CLIENT_LOGO_WIDTH = 48;
export const SOBJECT_CLIENT_LOGO_HEIGHT = 48;

export function SObjectClientLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (SOBJECT_CLIENT_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (SOBJECT_CLIENT_LOGO_HEIGHT / 2)} width={SOBJECT_CLIENT_LOGO_WIDTH} height={SOBJECT_CLIENT_LOGO_HEIGHT} >
            <path id="SObject" d="M19.921,3.659A8.395,8.395,0,0,1,33.377,5.43a10.3,10.3,0,0,1,14.492,9.521A10.346,10.346,0,0,1,35.515,25.167a7.543,7.543,0,0,1-9.889,3.108,8.6,8.6,0,0,1-16-.393,7.476,7.476,0,0,1-1.639.17A8.09,8.09,0,0,1,4,12.984,9.294,9.294,0,0,1,19.921,3.659" transform="translate(0.066 8.026)" fill="#00a1e0" />
            <circle id="Oval" cx="12.5" cy="12.5" r="12.5" transform="translate(18 19)" fill="#fff" />
            <path id="SObjectIcon" d="M8.616,12V10.238H9.646a.909.909,0,0,0,.734-.245,1.267,1.267,0,0,0,.205-.806V7.84A1.7,1.7,0,0,1,11.767,6a1.715,1.715,0,0,1-1.191-1.83V2.8a1.252,1.252,0,0,0-.2-.792.912.912,0,0,0-.734-.245H8.616V0h1.567a2.178,2.178,0,0,1,2.469,2.459V4.167a.862.862,0,0,0,.292.674,1.057,1.057,0,0,0,.733.266H14v1.77h-.324a1.053,1.053,0,0,0-.733.266.88.88,0,0,0-.292.688V9.527A2.182,2.182,0,0,1,10.183,12Zm-4.8,0A2.182,2.182,0,0,1,1.349,9.527V7.833a.881.881,0,0,0-.293-.688,1.051,1.051,0,0,0-.733-.266H0V5.108H.323a1.056,1.056,0,0,0,.733-.266.862.862,0,0,0,.293-.674V2.459A2.177,2.177,0,0,1,3.818,0H5.385V1.762H4.354a.91.91,0,0,0-.733.245,1.252,1.252,0,0,0-.2.792V4.174A1.716,1.716,0,0,1,2.232,6,1.7,1.7,0,0,1,3.416,7.84V9.186a1.267,1.267,0,0,0,.205.806.907.907,0,0,0,.733.245H5.385V12Z" transform="translate(24 26)" fill="#67c6eb" />
        </svg>
    )
}
