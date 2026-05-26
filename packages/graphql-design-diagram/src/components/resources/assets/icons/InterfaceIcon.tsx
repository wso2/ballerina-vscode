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

export function InterfaceIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_3490_20666)">
                <path d="M9.11332 15.2796L6.47063 6.47066L15.2796 9.11335C15.3607 9.13767 15.3768 9.2454 15.3063 9.29234L13.2869 10.6386C13.0244 10.8137 12.9876 11.1851 13.2107 11.4082L14.7761 12.9736C15.1666 13.3641 15.1666 13.9973 14.7761 14.3878L14.3878 14.7761C13.9973 15.1667 13.3641 15.1667 12.9736 14.7761L11.4082 13.2107C11.1851 12.9876 10.8136 13.0244 10.6386 13.2869L9.29231 15.3064C9.24537 15.3768 9.13764 15.3607 9.11332 15.2796Z" fill={ThemeColors.PRIMARY} stroke-linecap="round"/>
                <path d="M10 5.5C10 3.01472 7.98528 1 5.5 1C3.01472 1 1 3.01472 1 5.5C1 7.98528 3.01472 10 5.5 10" stroke="#40404B" stroke-width="1.5" stroke-linecap="round"/>
            </g>
            <defs>
                <clipPath id="clip0_3490_20666">
                    <rect width="16" height="16" fill="white"/>
                </clipPath>
            </defs>
        </svg>
    );
}
