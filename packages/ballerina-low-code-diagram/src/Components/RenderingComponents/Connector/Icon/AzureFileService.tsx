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

export const AZURE_FILE_SERVICE_LOGO_WIDTH = 20;
export const AZURE_FILE_SERVICE_LOGO_HEIGHT = 20;

export function AzureFileServiceLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (AZURE_FILE_SERVICE_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (AZURE_FILE_SERVICE_LOGO_HEIGHT / 2)} width={AZURE_FILE_SERVICE_LOGO_WIDTH} height={AZURE_FILE_SERVICE_LOGO_HEIGHT} >
            <defs>
                <linearGradient x1="50%" y1="100%" x2="50%" y2="0%" id="linearGradient-1">
                    <stop stop-color="#32BEDD" offset="0%"/>
                    <stop stop-color="#32D4F5" offset="77.5%"/>
                </linearGradient>
            </defs>
            <g id="Azure-file-service" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="new-adding-new" transform="translate(-1204.000000, -594.000000)" fillRule="nonzero">
                    <g id="Dropdown/Select/Default-Copy-23" transform="translate(1194.000000, 584.000000)">
                        <g id="Icon/Connectro-logo" transform="translate(10.000000, 10.000000)">
                            <g id="10838-icon-service-Storage-Azure-Files" transform="translate(0.000000, 2.000000)">
                                <path d="M0,3.66615192 L20,3.66615192 L20,15.3352452 C20,15.7023792 19.7008525,16 19.3318354,16 L0.668164617,16 C0.299147489,16 0,15.7023792 0,15.3352452 L0,3.66615192 Z" id="Path" fill="url(#linearGradient-1)"/>
                                <path d="M0.671712394,0 L19.3282876,0 C19.6973047,0 19.9964522,0.297620844 19.9964522,0.664754761 L19.9964522,3.66497537 L0.00354672868,3.66497537 L0.00354672868,0.665931318 C0.00323377078,0.48942363 0.0734908379,0.320038237 0.198830061,0.195117953 C0.324169283,0.0701976692 0.494299032,0 0.671712394,0 Z" id="Path" fill="#0078D4"/>
                                <path d="M15.794702,6.01103022 L10.3547777,6.01103022 C10.2842318,6.01103022 10.2165979,6.03902317 10.1667455,6.08868299 L9.29280984,6.95815869 C9.24295742,7.00781851 9.17532356,7.03574967 9.10477767,7.03581146 L4.97634816,7.03581146 C4.83004756,7.03581146 4.71144749,7.15380627 4.71144749,7.29936025 L4.71144749,13.9469079 C4.71144749,14.0166976 4.73939357,14.083612 4.78910637,14.1328503 C4.83881917,14.1820886 4.9062011,14.2095931 4.97634816,14.2092827 L15.794702,14.2092827 C15.940542,14.2092827 16.0589516,14.0920022 16.0596026,13.9469079 L16.0596026,6.27457901 C16.0596026,6.12902504 15.9410026,6.01103022 15.794702,6.01103022 L15.794702,6.01103022 Z" id="Path" fill="#FFFFFF" opacity="0.9"/>
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    )
}
