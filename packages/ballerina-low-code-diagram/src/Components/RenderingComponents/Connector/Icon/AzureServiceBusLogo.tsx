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

export function AzureServiceBusLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (LOGO_HEIGHT / 2)} width={LOGO_WIDTH} height={LOGO_HEIGHT} >
            <title>ECFAEF0E-C86E-4CAE-9B66-F864789D106A</title>
            <g id="Adding" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="new-adding-new" transform="translate(-1204.000000, -674.000000)" fill="#0072C6">
                    <g id="Dropdown/Select/Default-Copy-26" transform="translate(1038.000000, 664.000000)">
                        <g id="Logo/Circle" transform="translate(166.000000, 10.000000)">
                            <path d="M2.174,4.7825 L2.174,2.174 L17.82625,2.174 L17.82625,4.7825 L20,4.7825 L20,0 L0,0 L0,4.7825 L2.174,4.7825 Z M17.826,15.2175 L17.826,17.82625 L2.174,17.82625 L2.174,15.2175 L0,15.2175 L0,20 L20,20 L20,15.2175 L17.826,15.2175 Z M9.254,10.39825 C9.45775,10.5865 9.723,10.69 10,10.69 C10.277,10.69 10.5425,10.5865 10.746,10.39825 L15.65225,5.8695 L15.65225,5.652 L4.34775,5.652 L4.34775,5.8695 L9.254,10.39825 Z M15.652,6.9565 L11.336,10.941 C10.5814653,11.6371685 9.41878469,11.6371685 8.66425,10.941 L4.34775,6.9565 L4.34775,14.34775 L15.652,14.34775 L15.652,6.9565 Z" id="Shape"/>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    );
}
