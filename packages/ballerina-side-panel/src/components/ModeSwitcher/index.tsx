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
import { getDefaultExpressionMode, getSecondaryMode } from '../editors/MultiModeExpressionEditor/ChipExpressionEditor/utils';
import { InputType } from '@wso2/ballerina-core';

interface ModeSwitcherProps {
    value: InputMode;
    //TODO: Should be removed once fields with type field is fixed to
    // update the types property correctly when changing the type.
    isRecordTypeField: boolean;
    onChange: (value: InputMode) => void;
    types: InputType[];
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ value, isRecordTypeField, onChange, types }) => {
    const defaultMode = useMemo(
        //TODO: Should only return the getDefaultExpressionMode(types) once fields with type field is fixed to
        // update the types property correctly when changing the type.
        () => isRecordTypeField ? InputMode.RECORD : getDefaultExpressionMode(types),
        [types, isRecordTypeField]
    );

    const secondaryMode = useMemo(
        //TODO: Should only return the getSecondaryMode(types) once fields with type field is fixed to
        // update the types property correctly when changing the type.
        () => isRecordTypeField ? InputMode.EXP : getSecondaryMode(types),
        [types, isRecordTypeField]
    );
    const handleModeSwitch = (mode: InputMode) => {
        onChange(mode);
    }
    const isChecked = value === secondaryMode;

    return (
        <SwitchWrapper>
            <Slider checked={isChecked}>
                <Label active={!isChecked} onClick={() => handleModeSwitch(defaultMode)}>{defaultMode}</Label>
                <Label active={isChecked} onClick={() => handleModeSwitch(secondaryMode)}>{secondaryMode}</Label>
            </Slider>
        </SwitchWrapper>
    );
};

export default ModeSwitcher;
