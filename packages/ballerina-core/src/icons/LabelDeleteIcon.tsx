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

export default function LabelDeleteIcon() {
    return (
        <svg id="delete-button" width="13px" height="15px">
            <defs>
                <path
                    d="M6.5,0 C7.80625206,0 8.91751442,0.834850101 9.32932572,2.00008893 L12.5,2 C12.7761424,2 13,2.22385763 13,2.5 C13,2.77614237 12.7761424,3 12.5,3 L12,3 L12,11 C12,12.6568542 10.6568542,14 9,14 L4,14 C2.34314575,14 1,12.6568542 1,11 L1,2.999 L0.5,3 C0.223857625,3 0,2.77614237 0,2.5 C0,2.22385763 0.223857625,2 0.5,2 L3.67067428,2.00008893 C4.08248558,0.834850101 5.19374794,0 6.5,0 Z M11,3 L2,3 L2,11 C2,12.0543618 2.81587779,12.9181651 3.85073766,12.9945143 L4,13 L9,13 C10.0543618,13 10.9181651,12.1841222 10.9945143,11.1492623 L11,11 L11,3 Z M4.5,5 C4.77614237,5 5,5.22385763 5,5.5 L5,10.5 C5,10.7761424 4.77614237,11 4.5,11 C4.22385763,11 4,10.7761424 4,10.5 L4,5.5 C4,5.22385763 4.22385763,5 4.5,5 Z M8.5,5 C8.77614237,5 9,5.22385763 9,5.5 L9,10.5 C9,10.7761424 8.77614237,11 8.5,11 C8.22385763,11 8,10.7761424 8,10.5 L8,5.5 C8,5.22385763 8.22385763,5 8.5,5 Z M6.5,1 C5.7595136,1 5.11301752,1.40242038 4.76727851,2.00049436 L8.23239368,1.99992752 C7.88657394,1.40216612 7.24025244,1 6.5,1 Z"
                    id="delete-path"
                />
            </defs>
            <g
                id="delete"
                stroke="none"
                stroke-width="1"
                fill="none"
                fill-rule="evenodd"
            >
                <g
                    id="delete-service-design-separrated-"
                    transform="translate(-1069.000000, -32.000000)"
                >
                    <g id="delete-1" transform="translate(803.000000, 20.000000)">
                        <g id="delete-2" transform="translate(265.000000, 6.000000)">
                            <g id="delete-7" transform="translate(1.500000, 6.000000)">
                                <mask id="delete-mask-2" fill="white">
                                    <use xlinkHref="#delete-path" />
                                </mask>
                                <use
                                    id="delete-shape"
                                    fill="#FE523C"
                                    fill-rule="nonzero"
                                    xlinkHref="#delete-path"
                                />
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    );
}
