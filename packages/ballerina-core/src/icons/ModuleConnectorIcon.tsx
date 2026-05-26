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

export interface ModuleConnectorIconProps {
    className?: string
}

export default function ModuleConnectorIcon(props: ModuleConnectorIconProps) {
    return (
        <svg width="16px" height="16px" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className={props?.className ? props.className : "sub-menu-dark-fill"}>
            <g id="module-connector" className="svg-sub-menu-plus-option-icon" transform="translate(1, 1)" fill="#CBCEDB" fill-rule="nonzero">
                <path d="M13.7689123,2.12347584 C14.0618055,2.41636906 14.0618055,2.89124279 13.7689123,3.18413601 C13.4760191,3.47702923 13.0011454,3.47702923 12.7082521,3.18413601 C10.4627375,0.938621331 6.82203884,0.938621331 4.57652416,3.18413601 C2.33100949,5.42965069 2.33100949,9.07034931 4.57652416,11.315864 C6.82203884,13.5613787 10.4627375,13.5613787 12.7082521,11.315864 C13.0011454,11.0229708 13.4760191,11.0229708 13.7689123,11.315864 C14.0618055,11.6087572 14.0618055,12.0836309 13.7689123,12.3765242 C10.9376112,15.2078253 6.34716511,15.2078253 3.51586399,12.3765242 C2.29113203,11.1517922 1.59618066,9.59789678 1.43100988,7.99960945 L0.75,8 C0.335786438,8 0,7.66421356 0,7.25 C0,6.87030423 0.282153882,6.55650904 0.648229443,6.50684662 L0.75,6.5 L1.43111301,6.49939329 C1.59646976,4.90145686 2.29138676,3.34795307 3.51586399,2.12347584 C6.34716511,-0.707825279 10.9376112,-0.707825279 13.7689123,2.12347584 Z M8.75,4.25 C10.236255,4.25 11.4700781,5.3307897 11.7084039,6.74930382 L15.3705132,6.75 C15.6466555,6.75 15.8705132,6.97385762 15.8705132,7.25 C15.8705132,7.49545989 15.693638,7.69960837 15.4603888,7.74194433 L15.3705132,7.75 L11.7085702,7.74970531 C11.4706526,9.16870697 10.2366011,10.25 8.75,10.25 C7.09314575,10.25 5.75,8.90685425 5.75,7.25 C5.75,5.59314575 7.09314575,4.25 8.75,4.25 Z M8.75,5.25 C7.6454305,5.25 6.75,6.1454305 6.75,7.25 C6.75,8.3545695 7.6454305,9.25 8.75,9.25 C9.8545695,9.25 10.75,8.3545695 10.75,7.25 C10.75,6.1454305 9.8545695,5.25 8.75,5.25 Z" id="Combined-Shape"/>
            </g>
        </svg>
    )
}
