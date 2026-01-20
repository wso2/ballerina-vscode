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
import styled from "@emotion/styled";
import { CheckBox, ThemeColors } from "@wso2/ui-toolkit";

const AuthCheckboxContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    cursor: pointer;
    font-family: var(--font-family);
`;

const AuthCheckboxWrapper = styled.div`
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    gap: 8px;
    cursor: pointer;
`;

const AuthCheckboxLabel = styled.div`
    color: ${ThemeColors.ON_SURFACE};
`;

const AuthCheckboxDescription = styled.div`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-top: 4px;
`;

export interface RequiresAuthCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export const RequiresAuthCheckbox: React.FC<RequiresAuthCheckboxProps> = ({ checked, onChange }) => {
    const handleToggle = () => {
        onChange(!checked);
    };

    return (
        <AuthCheckboxContainer key="auth-checkbox" onClick={handleToggle}>
            <div>
                <AuthCheckboxLabel>Requires Authentication</AuthCheckboxLabel>
                <AuthCheckboxDescription>
                    Enable if the server requires authentication
                </AuthCheckboxDescription>
            </div>
            <AuthCheckboxWrapper>
                <CheckBox
                    label=""
                    checked={checked}
                    onChange={() => { }}
                    sx={{ display: "contents" }}
                />
            </AuthCheckboxWrapper>
        </AuthCheckboxContainer>
    );
};
