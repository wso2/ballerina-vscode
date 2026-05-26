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

export interface ResourceIconProps {
    className?: string
}

export default function ResourceIcon(props: ResourceIconProps) {

    return (
        <svg width="14px" height="14px" viewBox="0 0 14 14" version="1.1" className={props?.className ? props.className : "sub-menu-dark-fill"} fill-rule="nonzero">
            <g id="Deploy" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="deploy-indication" transform="translate(-340.000000, -457.000000)" >
                    <g id="Combined-Shape" className="svg-sub-menu-plus-option-icon" transform="translate(340.000000, 456.999725)">
                        <path d="M13.6270667,8.58408702 C13.8376274,8.90005074 13.7768486,9.31764405 13.4997593,9.56197822 L13.4188678,9.6241126 L7.97060087,13.2548804 C7.42476369,13.6186306 6.72555499,13.6445377 6.15787887,13.3326342 L6.02934126,13.2546599 L0.583944866,9.62401809 C0.239309377,9.3942372 0.146201324,8.92858072 0.375982209,8.58394524 C0.586614687,8.26802937 0.995448182,8.16346642 1.32758145,8.32522291 L1.41605506,8.37598258 L6.86145145,12.0066244 C6.92862124,12.0514089 7.01206199,12.0603737 7.08574668,12.033516 L7.13877426,12.0066559 L12.5870411,8.37588807 C12.9317288,8.14618549 13.3973641,8.23939934 13.6270667,8.58408702 Z M6.02942309,0.747102749 C6.61712669,0.355300354 7.38275035,0.355213383 7.97054295,0.746882247 L7.97054295,0.746882247 L13.1690869,4.21087252 C13.6057053,4.50180817 13.7238045,5.09160723 13.4328688,5.52822559 C13.3632474,5.63270921 13.2736051,5.72235572 13.1691249,5.7919822 L13.1691249,5.7919822 L7.97061284,9.2563114 C7.38278818,9.64804237 6.61708886,9.64795538 6.02935322,9.25609088 L6.02935322,9.25609088 L0.83355095,5.79186249 C0.397012664,5.5008067 0.279075797,4.91097516 0.570131585,4.47443688 C0.639701195,4.37009331 0.729241983,4.28055682 0.833588886,4.21099222 L0.833588886,4.21099222 Z M7.13877622,1.99514669 C7.07159993,1.95038453 6.98816479,1.94144006 6.91449147,1.9683103 L6.91449147,1.9683103 L6.86147339,1.99517819 L2.35229426,5.00143135 L6.86146341,8.00805537 C6.94542565,8.06403601 7.05481127,8.06404844 7.13878622,8.00808687 L7.13878622,8.00808687 L11.6493342,5.00143135 Z" />
                    </g>
                </g>
            </g>
        </svg>
    )
}
