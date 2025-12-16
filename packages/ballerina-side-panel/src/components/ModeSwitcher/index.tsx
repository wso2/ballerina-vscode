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

import React, { useMemo } from 'react';
import { Label, Slider, SwitchWrapper } from './styles';
import { InputMode } from '../editors/MultiModeExpressionEditor/ChipExpressionEditor/types';
import { getDefaultExpressionMode } from '../editors/MultiModeExpressionEditor/ChipExpressionEditor/utils';
import { InputType } from '@wso2/ballerina-core';

interface ModeSwitcherProps {
    value: InputMode;
    isRecordTypeField: boolean;
    onChange: (value: InputMode) => void;
    types: InputType[];
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ value, isRecordTypeField, onChange, types }) => {
    const isChecked = value === InputMode.EXP;

    const defaultMode = useMemo(
        () => isRecordTypeField ? InputMode.RECORD : getDefaultExpressionMode(types),
        [types, isRecordTypeField]
    );

    const handlePrimaryModeClick = () => {
        onChange(defaultMode);
    };

    const handleExpressionClick = () => {
        onChange(InputMode.EXP);
    };

    return (
        <SwitchWrapper>
            <Slider checked={isChecked}>
                <Label active={!isChecked} onClick={handlePrimaryModeClick}>{defaultMode}</Label>
                <Label active={isChecked} onClick={handleExpressionClick}>Expression</Label>
            </Slider>
        </SwitchWrapper>
    );
};

export default ModeSwitcher;
