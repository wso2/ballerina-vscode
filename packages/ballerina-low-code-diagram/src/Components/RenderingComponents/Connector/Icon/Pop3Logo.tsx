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

export const POP3_LOGO_WIDTH = 22;
export const POP3_LOGO_HEIGHT = 22;

export function Pop3Logo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (POP3_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (POP3_LOGO_HEIGHT / 2)} width={POP3_LOGO_WIDTH} height={POP3_LOGO_HEIGHT} >
            <g id="Pop3Wrapper" transform="translate(1 1)">
                <path id="Combined_Shape" d="M7.131,4.583a2.322,2.322,0,0,1-1.691-.658,2.215,2.215,0,0,1-.668-1.638A2.2,2.2,0,0,1,5.445.654,2.332,2.332,0,0,1,7.135,0a2.332,2.332,0,0,1,1.69.654,2.2,2.2,0,0,1,.669,1.634,2.215,2.215,0,0,1-.669,1.638,2.315,2.315,0,0,1-1.686.658Zm-.894-3.2a1.258,1.258,0,0,0-.345.9,1.258,1.258,0,0,0,.345.9,1.192,1.192,0,0,0,.894.356A1.191,1.191,0,0,0,8.025,3.2a1.258,1.258,0,0,0,.345-.9,1.258,1.258,0,0,0-.345-.9,1.191,1.191,0,0,0-.894-.356A1.192,1.192,0,0,0,6.237,1.387Zm9.191,2.725a1.664,1.664,0,0,1-.555-.982l.944-.266a.991.991,0,0,0,.279.525.708.708,0,0,0,.518.222.694.694,0,0,0,.508-.185.612.612,0,0,0,.009-.874.661.661,0,0,0-.492-.182.892.892,0,0,0-.405.083l-.175-.608.728-.908H15.018V0h3.168V.692l-.919.972-.009.006a1.442,1.442,0,0,1,.781.457,1.268,1.268,0,0,1,.295.861,1.427,1.427,0,0,1-.474,1.086,1.658,1.658,0,0,1-1.18.445A1.814,1.814,0,0,1,15.428,4.112Zm-4.133.4H10.1V0l2.457,0A1.828,1.828,0,0,1,13.88.5a1.54,1.54,0,0,1,.511,1.124,1.541,1.541,0,0,1-.514,1.134,1.9,1.9,0,0,1-1.368.495H11.3V4.515h0ZM11.288,2.3h1.185l0,0a.729.729,0,0,0,.528-.2.623.623,0,0,0,.207-.463.636.636,0,0,0-.2-.463.67.67,0,0,0-.492-.2H11.288ZM1.2,4.516H0V0L2.456,0A1.828,1.828,0,0,1,3.784.5a1.542,1.542,0,0,1,.51,1.124,1.541,1.541,0,0,1-.514,1.134,1.9,1.9,0,0,1-1.367.495H1.2V4.515h0ZM1.192,2.3H2.378l0,0a.729.729,0,0,0,.528-.2.621.621,0,0,0,.207-.463.637.637,0,0,0-.2-.463.671.671,0,0,0-.493-.2H1.192Z" transform="translate(0.833 7.917)" fill="#5567d5" />
                <path id="Path" d="M0,.5H18.333" transform="translate(0.833 0.542)" fill="none" stroke="#ccd1f2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.175" />
                <path id="Path-2" d="M18.333.5H0" transform="translate(0.833 18.458)" fill="none" stroke="#ccd1f2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.175" />
            </g>
        </svg>
    )
}
