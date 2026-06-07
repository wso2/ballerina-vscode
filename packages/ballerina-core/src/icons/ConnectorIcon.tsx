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

export interface ConnectorIconProps {
    className?: string
}

export default function Connector(props: ConnectorIconProps) {
    return (
        <svg className="svg-sub-menu-plus-option-icon" width="16" height="16" strokeWidth='0' viewBox="0 0 20 20" {...props}>
            <path d="M17.7383297,2.78248558 C18.128854,3.17300987 18.128854,3.80617485 17.7383297,4.19669914 C17.3478054,4.58722343 16.7146404,4.58722343 16.3241161,4.19669914 C13.395184,1.26776695 8.64644661,1.26776695 5.71751442,4.19669914 C2.78858223,7.12563133 2.78858223,11.8743687 5.71751442,14.8033009 C8.64644661,17.732233 13.395184,17.732233 16.3241161,14.8033009 C16.7146404,14.4127766 17.3478054,14.4127766 17.7383297,14.8033009 C18.128854,15.1938252 18.128854,15.8269901 17.7383297,16.2175144 C14.0283489,19.9274952 8.01328163,19.9274952 4.30330086,16.2175144 C2.70279633,14.6170099 1.79275758,12.5875049 1.5731846,10.4991455 L1,10.5 C0.44771525,10.5 0,10.0522847 0,9.5 C0,8.98716416 0.38604019,8.56449284 0.883378875,8.50672773 L1,8.5 L1.57329018,8.49985083 C1.79304918,6.4118448 2.70305274,4.38273369 4.30330086,2.78248558 C8.01328163,-0.927495193 14.0283489,-0.927495193 17.7383297,2.78248558 Z" id="Combined-Shape" />
            <path d="M11,5.5 C12.8639271,5.5 14.4300871,6.77489272 14.8740452,8.50024347 L19,8.5 C19.5522847,8.5 20,8.94771525 20,9.5 C20,10.0128358 19.6139598,10.4355072 19.1166211,10.4932723 L19,10.5 L14.8737865,10.5007613 C14.429479,12.2256022 12.8635652,13.5 11,13.5 C8.790861,13.5 7,11.709139 7,9.5 C7,7.290861 8.790861,5.5 11,5.5 Z M11,7.5 C9.8954305,7.5 9,8.3954305 9,9.5 C9,10.6045695 9.8954305,11.5 11,11.5 C12.1045695,11.5 13,10.6045695 13,9.5 C13,8.3954305 12.1045695,7.5 11,7.5 Z" id="Combined-Shape" />
        </svg>
    );
}
