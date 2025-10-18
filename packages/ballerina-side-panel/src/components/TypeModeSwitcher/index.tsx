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
import { Label, Slider, SwitchWrapper } from './styles';


export enum TypeInputMode {
    GUIDED = "Guided",
    ADVANCED = "Advanced"
}

interface TypeModeSwitcherProps {
    value: TypeInputMode;
    onChange: (value: TypeInputMode) => void;
}

const TypeModeSwitcher: React.FC<TypeModeSwitcherProps> = ({ value, onChange }) => {
    const isChecked = value === TypeInputMode.ADVANCED;

    const handleGuidedClick = () => {
        onChange(TypeInputMode.GUIDED);
    };

    const handleAdvancedClick = () => {
        onChange(TypeInputMode.ADVANCED);
    };

    return (
        <SwitchWrapper>
            <Slider checked={isChecked}>
                <Label active={!isChecked} onClick={handleGuidedClick}>Guided</Label>
                <Label active={isChecked} onClick={handleAdvancedClick}>Advanced</Label>
            </Slider>
        </SwitchWrapper>
    );
};

export default TypeModeSwitcher;

