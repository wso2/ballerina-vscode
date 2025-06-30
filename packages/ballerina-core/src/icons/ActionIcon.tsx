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

export interface ActionIconProps {
    className?: string
}

export default function Action(props: ActionIconProps) {
    return (
        <svg className="svg-sub-menu-plus-option-icon" width="16" height="16" strokeWidth='0' viewBox="0 0 20 20" {...props}>
            <path d="M10.999,6.76556444 L11,0 L4.27682032,11.7655644 L8.999,11.7655644 L9,20.0009477 L15.6178724,6.76759491 L10.999,6.76556444 Z M8.999,7.53256444 L9,8.76520306 L12.382,8.76556444 L10.999,11.5305644 L11,9.76556444 L7.723,9.76556444 L8.999,7.53256444 Z" id="Path-151" />
            <path d="M14.4167782,0.991584181 C17.80671,2.66288376 20,6.11778632 20,9.96556444 C20,14.2427691 17.289967,18.0042593 13.3196435,19.4010839 C12.7986606,19.5843742 12.2277345,19.3106203 12.0444442,18.7896374 C11.8611539,18.2686546 12.1349079,17.6977284 12.6558907,17.5144382 C15.8316529,16.3971532 18,13.3875159 18,9.96556444 C18,6.88665977 16.2455842,4.12307826 13.5323838,2.78541986 C13.0370297,2.54120108 12.8334444,1.94165884 13.0776632,1.4463048 C13.3218819,0.950950753 13.9214242,0.747365398 14.4167782,0.991584181 Z M7.96587021,1.13911774 C8.14854677,1.66031609 7.87412063,2.23091944 7.35292228,2.413596 C4.1726387,3.52826425 2,6.54022498 2,9.96556444 C2,13.0335156 3.7418868,15.7889108 6.44022554,17.1321395 C6.93463867,17.3782576 7.13592159,17.9785767 6.88980353,18.4729898 C6.64368547,18.967403 6.04336632,19.1686859 5.54895319,18.9225678 C2.17765172,17.2443394 0,13.7996315 0,9.96556444 C0,5.68411882 2.71539191,1.91973139 6.69139196,0.526169809 C7.21259031,0.343493253 7.78319366,0.617919389 7.96587021,1.13911774 Z" id="Shape" />
        </svg>
    );
}
