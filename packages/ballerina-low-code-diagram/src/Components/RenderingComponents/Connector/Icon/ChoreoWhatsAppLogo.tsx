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
import * as React from "react";

export const TWILIO_LOGO_WIDTH = 20;
export const TWILIO_LOGO_HEIGHT = 20;

export function ChoreoWhatsAppLogo(props: { cx?: number, cy?: number, scale?: number; }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (TWILIO_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (TWILIO_LOGO_HEIGHT / 2)} width={TWILIO_LOGO_WIDTH} height={TWILIO_LOGO_HEIGHT} >
            <g id="Adding" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="new-adding-new" transform="translate(-593.000000, -690.000000)" strokeWidth="2">
                    <g id="Dropdown/Select/Default-Copy-30" transform="translate(583.000000, 680.000000)">
                        <g id="Logo/Circle" transform="translate(10.000000, 10.000000)">
                            <path d="M10,18 C14.418278,18 18,14.418278 18,10 C18,5.581722 14.418278,2 10,2 C5.581722,2 2,5.581722 2,10 C2,11.4434404 2.38228168,12.797594 3.05112431,13.9667403 C3.05300449,13.9663511 2.70262973,15.310771 2,18 C4.71571493,17.3193108 6.07647873,16.9782097 6.08229139,16.9766965 C7.24020052,17.6283086 8.57669367,18 10,18 Z" id="Oval" stroke="#CCD1F2"/>
                            <path d="M8,6 L7.28557943,6.71442057 C7.09656089,6.90346555 6.99108876,7.16031639 6.99272361,7.42764267 C7.00336047,9.16695816 7.52099997,10.500647 8.54564209,11.4287092 C9.50711001,12.2995518 10.627762,12.9348468 11.9075979,13.3345942 C12.2626161,13.4454658 12.6498395,13.3501605 12.9128323,13.0871677 L13.5,12.5 L13.5,12.5" id="Path-26" stroke="#5567D5" stroke-linecap="round"/>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    );
}
