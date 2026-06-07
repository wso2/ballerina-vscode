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

export const GOOGLE_SHEET_LOGO_WIDTH = 20;
export const GOOGLE_SHEET_LOGO_HEIGHT = 20;

export function GoogleSheetLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (GOOGLE_SHEET_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (GOOGLE_SHEET_LOGO_HEIGHT / 2)} width={GOOGLE_SHEET_LOGO_WIDTH} height={GOOGLE_SHEET_LOGO_HEIGHT} >
            <g id="GoogleSheet" transform="translate(3 -0.5)">
                <path id="Path" d="M14.485,5.478V18.712A1.289,1.289,0,0,1,13.2,20H1.288A1.288,1.288,0,0,1,0,18.712H0V1.288A1.288,1.288,0,0,1,1.288,0H9.007Z" fill="#28b446" />
                <path id="Path-2" d="M9.675,5.358,14.486,7.34V5.479l-2.728-.805Z" fill="#219b38" />
                <path id="Path-3" d="M14.485,5.57h-4.26a1.31,1.31,0,0,1-1.31-1.31h0V0Z" fill="#6ace7c" />
                <path id="Path_1" d="M4.02,16.325a.419.419,0,0,1-.418-.419V10.3a.419.419,0,0,1,.418-.418h6.444a.418.418,0,0,1,.418.418h0V15.9a.418.418,0,0,1-.417.419H4.02Zm2.806-5.606H4.413v1.017H6.826Zm3.244,0H7.657v1.017H10.07ZM6.826,12.591H4.413v1.017H6.826Zm3.244,0H7.657v1.017H10.07ZM6.826,14.463H4.413V15.48H6.826Zm3.244,0H7.657V15.48H10.07Z" fill="#fff" />
            </g>
        </svg>
    )
}
