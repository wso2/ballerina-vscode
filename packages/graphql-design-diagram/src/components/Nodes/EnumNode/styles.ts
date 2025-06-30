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

import styled from "@emotion/styled";
import { ThemeColors } from "@wso2/ui-toolkit";

interface StyleProps {
    isSelected?: boolean;
}

export const EnumFieldContainer: React.FC<any> = styled.div`
   align-items: center;
  background-color: ${(props: StyleProps) => props.isSelected ? ThemeColors.ON_SECONDARY : ThemeColors.SURFACE_DIM};
  border-bottom: 0.5px solid ${ThemeColors.OUTLINE_VARIANT};
  color:${ThemeColors.ON_SURFACE};
  display: flex;
  flex-direction: row;
  font-family: GilmerRegular;
  font-size: 12px;
  height: 30px;
  justify-content: flex-start;
  line-height: 16px;
  min-width: calc(100% - 16px);
  padding: 8px 8px 8px 8px;
  text-align: center;
`;

