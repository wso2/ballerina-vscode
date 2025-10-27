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
import Modal from './modal';
import { ButtonContainer, StyledButton } from './styles';
import { Button, ThemeColors } from '@wso2/ui-toolkit';

interface WarningPopupProps {
    isOpen: boolean;
    onContinue: () => void;
    onCancel: () => void;
}

const WarningPopup: React.FC<WarningPopupProps> = ({ isOpen, onContinue, onCancel }) => {
    return (
        <Modal isOpen={isOpen} onClose={onCancel} maxWidth='90%'>
            <p>If you continue, you will lose all structured information. Do you want to continue?</p>
            <ButtonContainer>
                <Button 
                    appearance='primary'
                    onClick={onContinue}>
                    Continue
                </Button>
                <Button 
                    appearance='secondary'
                    onClick={onCancel}>
                    Cancel
                </Button>
            </ButtonContainer>
        </Modal>
    );
};

export default WarningPopup;
