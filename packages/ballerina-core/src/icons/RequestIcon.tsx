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

export function RequestIcon(props: any) {
    const { onClick, ...restProps } = props;

    const handleOnClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        if (props && onClick) {
            onClick();
        }
    }

    return (
        <svg width="14px" height="14px" viewBox="0 0 14 14" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" onClick={handleOnClick}>
            <g id="VSC" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="VSC-icons" transform="translate(-533.000000, -613.000000)" fill="#000000" fillRule="nonzero">
                    <path d="M535.5,613 C536.880712,613 538,614.119288 538,615.5 C538,616.709325 537.141338,617.7181 536.000434,617.949903 L536.000434,622.050097 C537.141338,622.2819 538,623.290675 538,624.5 C538,625.880712 536.880712,627 535.5,627 C534.119288,627 533,625.880712 533,624.5 C533,623.290318 533.859168,622.281306 535.000574,622.049893 L535.000574,617.950107 C533.859168,617.718694 533,616.709682 533,615.5 C533,614.119288 534.119288,613 535.5,613 Z M535.5,623 C534.671573,623 534,623.671573 534,624.5 C534,625.328427 534.671573,626 535.5,626 C536.328427,626 537,625.328427 537,624.5 C537,623.671573 536.328427,623 535.5,623 Z M535.5,614 C534.671573,614 534,614.671573 534,615.5 C534,616.328427 534.671573,617 535.5,617 C536.328427,617 537,616.328427 537,615.5 C537,614.671573 536.328427,614 535.5,614 Z M541.853553,617.146447 C542.02712,617.320013 542.046405,617.589437 541.911409,617.784306 L541.853553,617.853553 C541.679987,618.02712 541.410563,618.046405 541.215694,617.911409 L541.146447,617.853553 L538.792893,615.5 L541.146447,613.146447 C541.341709,612.951184 541.658291,612.951184 541.853553,613.146447 C542.02712,613.320013 542.046405,613.589437 541.911409,613.784306 L541.853553,613.853553 L540.706,615 L541.5,615 C543.368563,615 544.895126,616.464278 544.994821,618.307965 L545,618.5 L545.000434,622.050097 C546.141338,622.2819 547,623.290675 547,624.5 C547,625.880712 545.880712,627 544.5,627 C543.119288,627 542,625.880712 542,624.5 C542,623.290318 542.859168,622.281306 544.000574,622.049893 L544,618.5 C544,617.174517 542.968464,616.089961 541.664376,616.005318 L541.5,616 L540.706,616 L541.853553,617.146447 Z M544.5,623 C543.671573,623 543,623.671573 543,624.5 C543,625.328427 543.671573,626 544.5,626 C545.328427,626 546,625.328427 546,624.5 C546,623.671573 545.328427,623 544.5,623 Z" id="request-icon"/>
                </g>
            </g>
        </svg>
    )
}
