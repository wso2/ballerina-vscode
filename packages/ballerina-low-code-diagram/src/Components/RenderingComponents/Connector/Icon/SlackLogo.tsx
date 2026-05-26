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
// tslint:disable: jsx-no-multiline-js
import * as React from "react";

export const SLACK_LOGO_WIDTH = 20;
export const SLACK_LOGO_HEIGHT = 20;

export function SlackLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (SLACK_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (SLACK_LOGO_HEIGHT / 2)} width={SLACK_LOGO_WIDTH} height={SLACK_LOGO_HEIGHT} >
            <g id="Symbols" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="Slack" fillRule="nonzero">
                    <g id="Slack_path">
                        <path id="Path_207" d="M1.7,13.384A1.681,1.681,0,0,1,.087,12.254c0-.019-.018-.056-.018-.074a1.726,1.726,0,0,1,1.111-2.111L15.324,5.33a1.663,1.663,0,0,1,.519-.074A1.7,1.7,0,0,1,17.491,6.4l.018.074A1.7,1.7,0,0,1,16.324,8.5s-.148.055-14.071,4.8A1.842,1.842,0,0,1,1.7,13.384Z" transform="translate(0 -2.867)" fill="#70cadb" />
                        <path id="Path_208" d="M6.872,28.613A1.632,1.632,0,0,1,5.261,27.5c0-.019-.018-.055-.018-.074A1.738,1.738,0,0,1,6.353,25.3L20.5,20.5a1.942,1.942,0,0,1,.555-.093A1.727,1.727,0,0,1,22.7,21.559l.019.074a1.809,1.809,0,0,1-.222,1.444,2.382,2.382,0,0,1-.833.592l-14.2,4.851a3.033,3.033,0,0,1-.593.092Z" transform="translate(-2.823 -11.135)" fill="#e01765" />
                        <path id="Path_209" d="M27.049,17.5a1.735,1.735,0,0,1-1.666-1.185L20.661,2.3l-.018-.074A1.746,1.746,0,0,1,21.753.093,1.808,1.808,0,0,1,22.29,0a1.608,1.608,0,0,1,.778.185,1.726,1.726,0,0,1,.87,1L28.659,15.2l.019.037A1.754,1.754,0,0,1,27.567,17.4,1.513,1.513,0,0,1,27.049,17.5Z" transform="translate(-11.224)" fill="#e8a723" />
                        <path id="Path_210" d="M11.608,22.711a1.734,1.734,0,0,1-1.666-1.185L5.221,7.511c0-.019-.019-.056-.019-.074A1.747,1.747,0,0,1,6.313,5.308a1.711,1.711,0,0,1,.537-.093A1.735,1.735,0,0,1,8.516,6.4l4.721,14.016c0,.019.019.055.019.074a1.746,1.746,0,0,1-1.111,2.129,1.724,1.724,0,0,1-.537.093Z" transform="translate(-2.801 -2.845)" fill="#3eb890" />
                        <path id="Path_211" d="M28.4,26.373l3.3-1.129-1.074-3.2-3.3,1.111Z" transform="translate(-14.907 -12.024)" fill="#cc2027" />
                        <path id="Path_212" d="M12.976,31.606l3.3-1.129L15.18,27.256l-3.3,1.129Z" transform="translate(-6.483 -14.869)" fill="#361238" />
                        <path id="Path_213" d="M23.265,11.121l3.3-1.129L25.487,6.844l-3.3,1.092Z" transform="translate(-12.107 -3.734)" fill="#65863a" />
                        <path id="Path_214" d="M7.824,16.332l3.3-1.129-1.074-3.184-3.3,1.092Z" transform="translate(-3.683 -6.557)" fill="#1a937d" />
                    </g>
                </g>
            </g>
        </svg>
    )
}
