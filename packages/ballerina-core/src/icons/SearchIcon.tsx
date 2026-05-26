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

export default function SearchIcon(props: any) {
    return (
        <svg id="search-button" width="13px" height="13px" {...props}>
            <defs>
                <clipPath id="clip-path">
                    <path
                        id="Combined_Shape"
                        data-name="Combined Shape"
                        d="M13.707,15.121,11.19,12.6A7.007,7.007,0,1,1,12.6,11.19l2.516,2.517a1,1,0,1,1-1.414,1.414ZM2.154,7A4.846,4.846,0,1,0,7,2.154,4.852,4.852,0,0,0,2.154,7Z"
                        transform="translate(1 1)"
                    />
                </clipPath>
            </defs>
            <g id="Group_1" data-name="Group 1" transform="translate(-1 -1)">
                <path
                    id="Combined_Shape-2"
                    fill="#CBCEDB"
                    fill-rule="nonzero"
                    data-name="Combined Shape"
                    d="M13.707,15.121,11.19,12.6A7.007,7.007,0,1,1,12.6,11.19l2.516,2.517a1,1,0,1,1-1.414,1.414ZM2.154,7A4.846,4.846,0,1,0,7,2.154,4.852,4.852,0,0,0,2.154,7Z"
                    transform="translate(1 1)"
                />
                <g id="Mask_Group_1" data-name="Mask Group 1" clip-path="url(#clip-path)">
                    <rect id="Color" width="18" height="18" fill="#CBCEDB" />
                </g>
            </g>
        </svg>
    );
}
