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

export const GOOGLE_CALANDER_LOGO_WIDTH = 20;
export const GOOGLE_CALANDER_LOGO_HEIGHT = 20;

export function GoogleCalanderLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (GOOGLE_CALANDER_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (GOOGLE_CALANDER_LOGO_HEIGHT / 2)} width={GOOGLE_CALANDER_LOGO_WIDTH} height={GOOGLE_CALANDER_LOGO_HEIGHT} >
            <g id="_GoogleCalander" transform="translate(-14 -13.406)">
                <path id="Shape" d="M15.337,17.256V14.3a.885.885,0,0,1,.877-.892H31.787a.885.885,0,0,1,.878.89h0v2.959Z" fill="#e6e6e6" />
                <path id="Path" d="M33.981,17.446,32.65,24.374l.544,7.2a.911.911,0,0,1-.84.977c-.025,0-.047,0-.07,0H15.717a.914.914,0,0,1-.914-.912.508.508,0,0,1,0-.068l.544-7.2-1.331-6.928a1.059,1.059,0,0,1,.84-1.237,1.034,1.034,0,0,1,.2-.019H32.94A1.057,1.057,0,0,1,34,17.246h0A1.034,1.034,0,0,1,33.981,17.446Z" fill="#3a5bbc" />
                <path id="Path-2" d="M32.275,32.559H15.727a.92.92,0,0,1-.917-.922.57.57,0,0,1,0-.072l.547-7.3H32.644l.541,7.3a.919.919,0,0,1-.84.991C32.322,32.557,32.3,32.559,32.275,32.559Z" fill="#518ef8" />
                <g id="Group">
                    <path id="Path-3" d="M23.672,22.51a2.558,2.558,0,0,0-5.113,0h.852a1.706,1.706,0,1,1,1.7,1.634h-.8V25h.8a1.634,1.634,0,0,1,.138,3.266q-.069,0-.138,0a1.67,1.67,0,0,1-1.7-1.633h-.852a2.558,2.558,0,0,0,5.113,0,2.469,2.469,0,0,0-1.125-2.059A2.469,2.469,0,0,0,23.672,22.51Z" fill="#fff" />
                    <path id="Path-4" d="M25.328,21.476l.437.732L27.449,21.2v7.486H28.3V19.7Z" fill="#fff" />
                </g>
            </g>
        </svg>
    )
}

