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

export interface CustomIconProps {
    className?: string
}

export default function CustomIcon(props: CustomIconProps) {
    return (
        <svg width="20" height="20" className={props?.className ? props.className : "sub-menu-dark-fill"}>
            <g id="Custom-icon" transform="translate(0 0)" >
                <path className="svg-sub-menu-plus-option-icon"  id="Combined-Shape" d="M7.767.465a.863.863,0,0,1,.1,1.721l-.1,0H2.589a.864.864,0,0,0-.857.763l-.006.1V13.411a.863.863,0,0,0,.762.857l.1.006H10l3.811-3.81V8.233a.864.864,0,0,1,.762-.858l.1-.005a.863.863,0,0,1,.857.762l.006.1v2.946L10.714,16H2.589A2.59,2.59,0,0,1,0,13.563l0-.152V3.054A2.589,2.589,0,0,1,2.437.47l.152,0Z"/>
                <path className="svg-sub-menu-plus-option-icon"  id="Path-24" d="M12.472.605,7.32,5.757V8.68h2.923L15.4,3.528A2.067,2.067,0,1,0,12.472.605Zm1.821,1.2a.249.249,0,0,1-.04.3l-4.9,4.894H9.006V6.641L13.9,1.747a.25.25,0,0,1,.353,0Z"/>
            </g>
        </svg>
    )
}
