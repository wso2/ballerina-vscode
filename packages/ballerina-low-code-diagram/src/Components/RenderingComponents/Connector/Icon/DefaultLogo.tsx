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
export const DEFAULT_LOGO_HEIGHT = 47;

export function DefaultLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (DEFAULT_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (DEFAULT_LOGO_HEIGHT / 2)} width={DEFAULT_LOGO_WIDTH} height={DEFAULT_LOGO_HEIGHT} >
            <circle id="DefaultIcon" cx="23.5" cy="23.5" r="23.5" fill="#e6e7ec"/>
        </svg>
    )
}
