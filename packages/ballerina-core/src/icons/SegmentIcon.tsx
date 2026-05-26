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

export function SegmentIcon(props: any) {
    const { onClick, ...restProps } = props;

    const handleOnClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        if (props && onClick) {
            onClick();
        }
    }

    return (
        <svg width="14px" height="14px" viewBox="0 0 14 14" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onClick={handleOnClick} {...restProps}>
            <g id="VSC" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="VSC-icons" transform="translate(-821.000000, -613.000000)" fill="#000000" fillRule="nonzero">
                    <path d="M823,620 C824.104569,620 825,620.895431 825,622 C825,622.711622 824.628342,623.336438 824.068542,623.690931 C824.849987,625.093414 826.340492,626 828,626 C830.272257,626 832.151162,624.31586 832.456566,622.127728 L832.472,622 L827,622 L827,621 L833.5,621 L833.5,621.5 C833.5,624.537566 831.037566,627 828,627 C825.901362,627 824.023836,625.813607 823.098117,623.997043 L823,624 C821.895431,624 821,623.104569 821,622 C821,620.895431 821.895431,620 823,620 Z M823,621 C822.447715,621 822,621.447715 822,622 C822,622.552285 822.447715,623 823,623 C823.552285,623 824,622.552285 824,622 C824,621.447715 823.552285,621 823,621 Z M828,613 C830.098638,613 831.976164,614.186393 832.901883,616.002957 L833,616 C834.104569,616 835,616.895431 835,618 C835,619.104569 834.104569,620 833,620 C831.895431,620 831,619.104569 831,618 C831,617.288378 831.371658,616.663562 831.931458,616.309069 C831.150013,614.906586 829.659508,614 828,614 C825.727743,614 823.848838,615.68414 823.543434,617.872272 L823.528,618 L829,618 L829,619 L822.5,619 L822.5,618.5 C822.5,615.462434 824.962434,613 828,613 Z M833,617 C832.447715,617 832,617.447715 832,618 C832,618.552285 832.447715,619 833,619 C833.552285,619 834,618.552285 834,618 C834,617.447715 833.552285,617 833,617 Z" id="segment-icon"/>
                </g>
            </g>
        </svg>
    )
}
