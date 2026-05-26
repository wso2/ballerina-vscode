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

export default function DeleteButton(props: any) {
    const { onClick, ...restProps } = props;

    const handleOnClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        if (props && onClick) {
            onClick();
        }
    }

    return (
        <svg id="delete-button" width="12" height="13" onClick={handleOnClick} {...restProps}>
            <defs>
                <path d="M6,-4.4408921e-16 C7.1045695,0 8,0.8954305 8,2 L11.5,2 C11.7761424,2 12,2.22385763 12,2.5 C12,2.77614237 11.7761424,3 11.5,3 L11,3 L11,10 C11,11.6568542 9.65685425,13 8,13 L4,13 C2.34314575,13 1,11.6568542 1,10 L1,3 L0.5,3 C0.223857625,3 0,2.77614237 0,2.5 C0,2.22385763 0.223857625,2 0.5,2 L4,2 L4,2 C4,0.8954305 4.8954305,-4.4408921e-16 6,-4.4408921e-16 Z M10,3 L2,3 L2,10 C2,11.0543618 2.81587779,11.9181651 3.85073766,11.9945143 L4,12 L8,12 C9.0543618,12 9.91816512,11.1841222 9.99451426,10.1492623 L10,10 L10,3 Z M4.5,5 C4.77614237,5 5,5.22385763 5,5.5 L5,9.5 C5,9.77614237 4.77614237,10 4.5,10 C4.22385763,10 4,9.77614237 4,9.5 L4,5.5 C4,5.22385763 4.22385763,5 4.5,5 Z M7.5,5 C7.77614237,5 8,5.22385763 8,5.5 L8,9.5 C8,9.77614237 7.77614237,10 7.5,10 C7.22385763,10 7,9.77614237 7,9.5 L7,5.5 C7,5.22385763 7.22385763,5 7.5,5 Z M6,1 C5.48716416,1 5.06449284,1.38604019 5.00672773,1.88337887 L5,2 L7,2 C7,1.44771525 6.55228475,1 6,1 Z" id="path-1" />
            </defs>
            <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="config" transform="translate(-146.000000, -561.000000)">
                    <g id="Group-5-Copy-2" transform="translate(144.000000, 560.000000)">
                        <g id="Icon/Delete-app-Copy" transform="translate(2.000000, 1.000000)">
                            <mask id="mask-2" fill="white">
                                <use xlinkHref="#path-1" />
                            </mask>
                            <use id="Combined-Shape" fill="#FE523C" fillRule="nonzero" xlinkHref="#path-1" />
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    )
}
