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
import { ThemeColors } from '@wso2/ui-toolkit';

interface LabelProps {
  active: boolean;
}

export const Label = styled.span<LabelProps>`
  position: absolute;
  text-align: center;
  font-size: 10px;
  z-index: 1;
  transition: all 0.2s ease;
  color: ${props => props.active ? ThemeColors.ON_SURFACE : ThemeColors.ON_SURFACE_VARIANT};
  font-weight: ${props => props.active ? '600' : '500'};
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  
  &:first-of-type {
    left: 0;
    width: 40%;
  }
  
  &:last-of-type {
    left: 40%;
    width: 60%;
  }
`;

export const Slider = styled.div<{ checked: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${ThemeColors.SURFACE_CONTAINER};
  color: ${ThemeColors.ON_SURFACE};
  font-weight: 500;
  border-radius: 2px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 2px;
  transition: all 0.2s ease;
  border: 1px solid ${ThemeColors.OUTLINE_VARIANT};

  &:before {
    content: "";
    position: absolute;
    height: calc(100% - 4px);
    width: ${props => props.checked ? 'calc(60% - 4px)' : 'calc(40% - 2px)'};
    left: ${props => props.checked ? 'calc(40% + 2px)' : '2px'};
    border-radius: 1px;
    background: ${ThemeColors.SURFACE_DIM};
    transition: all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
    z-index: 0;
    border: 1px solid ${ThemeColors.OUTLINE};
  }

  &:active:before {
    background: ${ThemeColors.SURFACE_DIM};
    box-shadow: 
      0 1px 2px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transform: translateY(1px);
  }
`;

export const SwitchWrapper = styled.div`
  font-size: 12px;
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 112px;
  width: max-content;
  height: 24px;
  margin-top: 2px;
`;
