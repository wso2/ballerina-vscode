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

import './style.scss';


export const COLLAPSED_BLOCK_HEIGHT = 16;
export const COLLAPSED_BLOCK_WIDTH = 32;

interface CollapsedComponentSVGProps {
    x: number;
    y: number;
    onExpandClick?: () => void;
}

export function CollapsedComponentSVG(props: CollapsedComponentSVGProps) {
    const { onExpandClick, ...xyProps } = props;
    return (
        <svg {...xyProps} onClick={onExpandClick} width="32px" height="16px" viewBox="0 0 32.0 16.0">
            <defs>
                <clipPath id="i0">
                    <path d="M2982,0 L2982,1221 L0,1221 L0,0 L2982,0 Z" />
                </clipPath>
                <clipPath id="i1">
                    <path d="M29,0 C30.6568542,-3.04359188e-16 32,1.34314575 32,3 L32,13 C32,14.6568542 30.6568542,16 29,16 L3,16 C1.34314575,16 2.02906125e-16,14.6568542 0,13 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 L29,0 Z" />
                </clipPath>
                <clipPath id="i2">
                    <path d="M1.5,0 C2.32842712,0 3,0.671572875 3,1.5 C3,2.32842712 2.32842712,3 1.5,3 C0.671572875,3 0,2.32842712 0,1.5 C0,0.671572875 0.671572875,0 1.5,0 Z M9.5,0 C10.3284271,0 11,0.671572875 11,1.5 C11,2.32842712 10.3284271,3 9.5,3 C8.67157288,3 8,2.32842712 8,1.5 C8,0.671572875 8.67157288,0 9.5,0 Z M17.5,0 C18.3284271,0 19,0.671572875 19,1.5 C19,2.32842712 18.3284271,3 17.5,3 C16.6715729,3 16,2.32842712 16,1.5 C16,0.671572875 16.6715729,0 17.5,0 Z" />
                </clipPath>
            </defs>
            <g clip-path="url(#i0)">
                <g clip-path="url(#i1)">
                    <polygon points="0,0 32,0 32,16 0,16 0,0" stroke="none" fill="#F7F8FB" />
                </g>
                <path d="M3,0 L29,0 C30.6568542,-3.04359188e-16 32,1.34314575 32,3 L32,13 C32,14.6568542 30.6568542,16 29,16 L3,16 C1.34314575,16 2.02906125e-16,14.6568542 0,13 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z" stroke="#A6B3FF" stroke-width="1" fill="none" stroke-miterlimit="10" />
                <g transform="translate(6.5 6.5)">
                    <g clip-path="url(#i2)">
                        <polygon points="0,0 19,0 19,3 0,3 0,0" stroke="none" fill="#5567D5" />
                    </g>
                </g>
            </g>
        </svg>
    )
}
