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

interface DownloadIconProps {
    color?: string; 
    sx?: React.CSSProperties;
}

export const DownloadIcon = ({ color = "#000", sx }: DownloadIconProps) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style={sx}>
            <g fill="none" stroke={color} stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path stroke-dasharray="2 4" stroke-dashoffset="6" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9">
                    <animate attributeName="stroke-dashoffset" dur="0.96s" repeatCount="indefinite" values="6;0" />
                </path>
                <path
                    stroke-dasharray="32"
                    stroke-dashoffset="32"
                    d="M12 21c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"
                >
                    <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.16s" dur="0.64s" values="32;0" />
                </path>
                <path stroke-dasharray="10" stroke-dashoffset="10" d="M12 8v7.5">
                    <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.32s" values="10;0" />
                </path>
                <path stroke-dasharray="6" stroke-dashoffset="6" d="M12 15.5l3.5 -3.5M12 15.5l-3.5 -3.5">
                    <animate fill="freeze" attributeName="stroke-dashoffset" begin="1.12s" dur="0.32s" values="6;0" />
                </path>
            </g>
        </svg>
    );
};
