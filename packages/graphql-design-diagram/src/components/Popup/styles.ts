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

export const Container: React.FC<any> = styled.div`
  display: flex;
  flex-direction: row;
  font-family: GilmerRegular;
  font-size: 13px;
  letter-spacing: 0.8px;
`;

export const popOverCompStyle = {
  backgroundColor: `${ThemeColors.SURFACE_DIM}`,
  border: `1px solid ${ThemeColors.PRIMARY}`,
  padding: "10px",
  borderRadius: "5px",
  display: "flex",
  flexDirection: "column",
  maxWidth: "280px",
  gap: "8px",
};
