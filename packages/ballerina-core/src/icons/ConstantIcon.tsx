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

export interface ConstantIconProps {
    className?: string
}

export default function ConstantIcon(props: ConstantIconProps) {
    return (
        <svg width="16px" height="16px" viewBox="0 0 16 16" version="1.1" className={props?.className ? props.className : "sub-menu-dark-fill"}>
            <g id="module-var" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="module-var-body" className="svg-sub-menu-plus-option-icon" transform="translate(-907.000000, -112.000000)" fill-rule="nonzero">
                    <path d="M913.566981,112.895341 L907.171996,125.651299 C907.058894,125.876903 907,126.125788 907,126.378155 C907,127.273874 907.726124,128 908.621842,128 L921.377801,128 C921.628999,128 921.876764,127.941648 922.101563,127.829548 C922.903145,127.429825 923.228917,126.455975 922.829194,125.654393 L916.46822,112.898435 C916.311619,112.584396 916.057387,112.329621 915.743683,112.17235 C914.942955,111.770919 913.968412,112.094613 913.566981,112.895341 Z M915.120664,113.415076 C915.165478,113.437543 915.201797,113.473939 915.224169,113.518802 L921.585143,126.27476 C921.642246,126.389272 921.595707,126.528394 921.481195,126.585497 C921.449081,126.601511 921.413686,126.609847 921.377801,126.609847 L908.621842,126.609847 C908.493883,126.609847 908.390151,126.506115 908.390151,126.378155 C908.390151,126.342102 908.398564,126.306547 908.414722,126.274318 L914.809706,113.51836 C914.857496,113.423035 914.962141,113.375035 915.061893,113.39487 L915.120664,113.415076 Z" id="module-var-path" />
                </g>
            </g>
        </svg>
    )
}
