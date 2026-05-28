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
import React from "react";

export default function ExpandButton(props: any) {
  const { onClick, ...restProps } = props;

  const handleOnClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    if (props && onClick) {
      onClick();
    }
  };

  return (
    <svg
      id="expand-button"
      width="13"
      height="13"
      onClick={handleOnClick}
      {...restProps}
    >
      <g>
      <polygon id="svg_2" points="5.347127824185009,6.920349611245911 1.1123937246215974,11.155083922494669 1.1123937246215974,8.827177343628136 0,8.827177343628136 0,13.054086635478598 4.226910703086105,13.054086635478598 4.226910703086105,11.941694251530862 1.898930316595397,11.941694251530862 6.133702025588718,7.706922683661105 "/>
   <polygon id="svg_3" points="8.827177343628136,0 8.827177343628136,1.1123937246215974 11.155083922494669,1.1123937246215974 6.920311790130654,5.347201772932749 7.706885427040106,6.13373871771546 11.941694251530862,1.8989672909692672 11.941694251530862,4.226910703086105 13.054086635478598,4.226910703086105 13.054086635478598,0 "/>
      </g>
    </svg>
  );
}
