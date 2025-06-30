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

export interface StatementExpandIconProps {
    color?: string
}

export default function StatementExpandIcon(props: StatementExpandIconProps) {
    return (
        <svg width="16px" height="16px" viewBox="0 0 16 16">
            <g id="Symbols" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="Icon/Expression" fill={props.color ? props.color : "#5567D5"} fill-rule="nonzero">
                    <path
                        d="M3.5,9 C3.77614237,9 4,9.22385763 4,9.5 C4,9.77614237 3.77614237,10 3.5,10 C2.11928813,
                    10 1,11.1192881 1,12.5 C1,13.8807119 2.11928813,15 3.5,15 C4.88071187,15 6,13.8807119 6,
                    12.5 C6,12.2238576 6.22385763,12 6.5,12 C6.77614237,12 7,12.2238576 7,12.5 C7,
                    14.4329966 5.43299662,16 3.5,16 C1.56700338,16 0,14.4329966 0,12.5 C0,10.5670034 1.56700338,
                    9 3.5,9 Z M13,3 L13,6.5 C13,6.77614237 12.7761424,7 12.5,7 C12.2545401,7 12.0503916,
                    6.82312484 12.0080557,6.58987563 L12,6.5 L11.999,4.707 L3.85355339,12.8535534 C3.65829124,
                    13.0488155 3.34170876,13.0488155 3.14644661,12.8535534 C2.97288026,12.679987 2.95359511,
                    12.4105626 3.08859116,12.2156945 L3.14644661,12.1464466 L11.293,3.999 L9.5,4 C9.25454011,
                    4 9.05039163,3.82312484 9.00805567,3.58987563 L9,3.5 C9,3.25454011 9.17687516,
                    3.05039163 9.41012437,3.00805567 L9.5,3 L13,3 Z M14.3888889,0 C15.2292481,0 15.9193335,
                    0.64339875 15.9934159,1.46446716 L16,1.61111111 L16,9.38888889 C16,10.2292481 15.3566012,
                    10.9193335 14.5355328,10.9934159 L14.3888889,11 L9.94444444,11 C9.66830207,11 9.44444444,
                    10.7761424 9.44444444,10.5 C9.44444444,10.2545401 9.62131961,10.0503916 9.85456881,
                    10.0080557 L9.94444444,10 L14.3888889,10 C14.6926455,10 14.9446402,9.77838095 14.9920016,
                    9.48801429 L15,9.38888889 L15,1.61111111 C15,1.3073545 14.778381,1.05535979 14.4880143,
                    1.00799841 L14.3888889,1 L6.61111111,1 C6.3073545,1 6.05535979,1.22161905 6.00799841,
                    1.51198571 L6,1.61111111 L6,6.05555556 C6,6.33169793 5.77614237,6.55555556 5.5,
                    6.55555556 C5.25454011,6.55555556 5.05039163,6.37868039 5.00805567,6.14543119 L5,6.05555556 L5,
                    1.61111111 C5,0.770751908 5.64339875,0.0806665358 6.46446716,0.00658408451 L6.61111111,
                    0 L14.3888889,0 Z"
                    />
                </g>
            </g>
        </svg>
    )
}
