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
import { FloatingToggleButton as StyledButton } from "../styles";
import { ARIA_PRESSED_ATTRIBUTE } from '../constants';

export type FloatingToggleButtonProps = {
    isActive?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
};

export const FloatingToggleButton: React.FC<FloatingToggleButtonProps> = ({
    isActive,
    onClick,
    children,
    title
}) => {
    return (
        <StyledButton
            isActive={isActive ?? false}
            onClick={onClick}
            title={title}
            {...{[ARIA_PRESSED_ATTRIBUTE]: isActive ?? false}}
        >
            {children}
        </StyledButton>
    );
};
