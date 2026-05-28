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
import React from 'react';

export default function TopLevelPlusIcon(props: {selected?: boolean}) {
    return (
        <svg width="16px" height="16px" viewBox="0 0 16 16" version="1.1">
            <g id="Top_plus" stroke="none" strokeWidth="1" fill={props.selected ? "#5667d5" : "none"} fillRule="evenodd">
                <g id="top_plus_svg" transform="translate(-98.000000, -80.000000)">
                    <g id="Group_top_plus_svg" transform="translate(98.000000, 80.000000)">
                        <rect id="top_plus_rec" stroke="#5667d5" x="0.5" y="0.5" width="15" height="15" rx="4" />
                        <path d="M8,4 C8.27614237,4 8.5,4.22385763 8.5,4.5 L8.499,7.5 L11.5,7.5 C11.7761424,7.5 12,7.72385763 12,8 C12,8.27614237 11.7761424,8.5 11.5,8.5 L8.499,8.5 L8.5,11.5 C8.5,11.7761424 8.27614237,12 8,12 C7.72385763,12 7.5,11.7761424 7.5,11.5 L7.499,8.5 L4.5,8.5 C4.22385763,8.5 4,8.27614237 4,8 C4,7.72385763 4.22385763,7.5 4.5,7.5 L7.499,7.5 L7.5,4.5 C7.5,4.22385763 7.72385763,4 8,4 Z" id="top_plus_rec_path" fill={props.selected ? "#ffffff" : "#5667d5"} />
                    </g>
                </g>
            </g>
        </svg>
    )
}
