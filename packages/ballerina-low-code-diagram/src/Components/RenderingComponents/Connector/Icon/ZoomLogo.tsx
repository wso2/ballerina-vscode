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

export function ZoomLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (LOGO_HEIGHT / 2)} width={LOGO_WIDTH} height={LOGO_HEIGHT} >
            <title>256530C0-9CF1-4EC4-AE28-48CE74ADBC1A</title>
            <g id="Adding" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="adding-new-API-Calls" transform="translate(-1008.000000, -674.000000)" fill="#4392FF">
                    <g id="Logo/Circle" transform="translate(1008.000000, 674.000000)">
                        <path d="M10,0 C15.5228475,0 20,4.4771525 20,10 C20,15.5228475 15.5228475,20 10,20 C4.4771525,20 0,15.5228475 0,10 C0,4.4771525 4.4771525,0 10,0 Z M15.8974707,6.63258776 C15.7497811,6.46829923 15.4968728,6.45484318 15.3325842,6.60253282 L15.3325842,6.60253282 L13.1010656,8.60859002 C13.0377744,8.66548656 13.0016274,8.74658729 13.0016274,8.83169304 L13.0016274,8.83169304 L13.0016274,11.1811966 C13.0016274,11.266458 13.0379062,11.3476918 13.1013979,11.4045979 L13.1013979,11.4045979 L15.3330273,13.4047569 C15.4064016,13.4705206 15.5014674,13.5068885 15.6,13.5068885 C15.8209139,13.5068885 16,13.3278024 16,13.1068885 L16,13.1068885 L16,6.90000351 C16,6.8012657 15.9634808,6.70601678 15.8974707,6.63258776 Z M10.734592,6.50624738 L4.60015603,6.50624738 C4.26879239,6.50626584 4.00016622,6.77488374 4.00013758,7.10624738 L4,11.5789918 C4.00390076,12.6471694 4.81557185,13.5068771 5.80542986,13.5025494 L11.9398658,13.5025494 C12.2712367,13.5025494 12.5398658,13.2339203 12.5398658,12.9025494 L12.5398658,8.42980499 C12.535965,7.3616274 11.724294,6.50191969 10.734592,6.50624738 Z" id="Combined-Shape"/>
                    </g>
                </g>
            </g>
        </svg>
    );
}
