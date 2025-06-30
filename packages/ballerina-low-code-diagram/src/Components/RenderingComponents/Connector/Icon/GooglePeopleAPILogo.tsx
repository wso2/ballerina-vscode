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

export const GOOGLE_PEOPLE_API_LOGO_WIDTH = 20;
export const GOOGLE_PEOPLE_API_LOGO_HEIGHT = 20;

export function GooglePeopleAPILogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (GOOGLE_PEOPLE_API_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (GOOGLE_PEOPLE_API_LOGO_HEIGHT / 2)} width={GOOGLE_PEOPLE_API_LOGO_WIDTH} height={GOOGLE_PEOPLE_API_LOGO_HEIGHT} >
            <g id="Google-people-api" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="new-adding-new" transform="translate(-1204.000000, -514.000000)" fill="#3A64C7" fillRule="nonzero">
                    <g id="Dropdown/Select/Default-Copy-10" transform="translate(1194.000000, 504.000000)">
                        <g id="Logo/Circle" transform="translate(10.000000, 10.000000)">
                            <path d="M6.82352941,10.75 C8.76713235,10.75 12.6470588,11.755 12.6470588,13.75 L12.6470588,13.75 L12.6470588,16 L1,16 L1,13.75 C1,11.755 4.87992647,10.75 6.82352941,10.75 Z M13.643128,10.9679709 C15.3784,10.9679709 18.7915987,11.8754151 18.990874,13.677158 L19,13.8434161 L19,16 L13.7315853,15.9999091 L13.7321553,13.8103244 L13.7252234,13.6131414 C13.6552736,12.6244818 12.9001651,11.8061874 11.8897385,11.1834575 C12.5341708,11.0397673 13.1550277,10.9679709 13.643128,10.9679709 Z M12.9940018,5.09090909 C14.3551573,5.09090909 15.4585918,6.23524747 15.4585918,7.64686039 C15.4585918,9.05847331 14.3551573,10.2028117 12.9940018,10.2028117 C11.7199602,10.2028117 10.671707,9.20026141 10.5427491,7.91437588 C10.5702783,7.72711771 10.5831675,7.53546643 10.5831675,7.34057269 C10.5831675,7.27376141 10.5816528,7.20733117 10.5786582,7.14131938 C10.8036925,5.97199324 11.7996309,5.09090909 12.9940018,5.09090909 Z M6.82352941,4 C8.43227941,4 9.73529412,5.3425 9.73529412,7 C9.73529412,8.6575 8.43227941,10 6.82352941,10 C5.21477941,10 3.91176471,8.6575 3.91176471,7 C3.91176471,5.3425 5.21477941,4 6.82352941,4 Z" id="Combined-Shape"/>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    )
}
