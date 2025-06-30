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

import React from "react";

import { ThemeColors } from "@wso2/ui-toolkit";

export function ServiceClassIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_614_6173)">
                <path d="M13.6216 0H2.37838C1.06484 0 0 1.06484 0 2.37838V13.6216C0 14.9352 1.06484 16 2.37838 16H13.6216C14.9352 16 16 14.9352 16 13.6216V2.37838C16 1.06484 14.9352 0 13.6216 0ZM2.37838 1.2973H13.6216C14.2187 1.2973 14.7027 1.78131 14.7027 2.37838V13.6216C14.7027 14.2187 14.2187 14.7027 13.6216 14.7027H2.37838C1.78131 14.7027 1.2973 14.2187 1.2973 13.6216V2.37838C1.2973 1.78131 1.78131 1.2973 2.37838 1.2973Z" fill={ThemeColors.PRIMARY}/>
            </g>
            <defs>
                <clipPath id="clip0_614_6173">
                    <rect width="16" height="16" fill="white"/>
                </clipPath>
            </defs>
        </svg>
    );
}
