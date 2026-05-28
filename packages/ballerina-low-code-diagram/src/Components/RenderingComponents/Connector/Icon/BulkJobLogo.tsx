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

export const BULK_JOB_LOGO_WIDTH = 48;
export const BULK_JOB_LOGO_HEIGHT = 48;

export function BulkJobLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (BULK_JOB_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (BULK_JOB_LOGO_HEIGHT / 2)} width={BULK_JOB_LOGO_WIDTH} height={BULK_JOB_LOGO_HEIGHT} >
            <path id="BulkJob" d="M19.921,3.659A8.395,8.395,0,0,1,33.377,5.43a10.3,10.3,0,0,1,14.492,9.521A10.346,10.346,0,0,1,35.515,25.167a7.543,7.543,0,0,1-9.889,3.108,8.6,8.6,0,0,1-16-.393,7.476,7.476,0,0,1-1.639.17A8.09,8.09,0,0,1,4,12.984,9.294,9.294,0,0,1,19.921,3.659" transform="translate(0.066 8.026)" fill="#00a1e0" />
            <circle id="Oval" cx="12.5" cy="12.5" r="12.5" transform="translate(18 19)" fill="#fff" />
            <path id="BulkJobIcon" d="M2.716,13A2.1,2.1,0,0,1,.569,11.038V7.109Q.289,6.993,0,6.868V3.514A1.381,1.381,0,0,1,1.414,2.172H4.065V1.509A1.547,1.547,0,0,1,5.582,0l.075,0H9.05A1.558,1.558,0,0,1,10.64,1.438l0,.071v.662h1.944A1.381,1.381,0,0,1,14,3.514V6.868q-.289.125-.568.241v3.852A2.091,2.091,0,0,1,11.364,13H2.716Zm-.381-2.038a.368.368,0,0,0,.339.359l.041,0h8.567A.374.374,0,0,0,11.662,11l0-.039V7.78A14.005,14.005,0,0,1,7,8.545,14.007,14.007,0,0,1,2.336,7.78ZM1.768,5.756l.186.068a13.152,13.152,0,0,0,4.8,1.042l.242,0a13.14,13.14,0,0,0,5.045-1.044l.186-.069V3.849H1.768ZM8.874,2.172V1.678H5.833v.494Z" transform="translate(24 25)" fill="#67c6eb" />
        </svg>
    )
}
