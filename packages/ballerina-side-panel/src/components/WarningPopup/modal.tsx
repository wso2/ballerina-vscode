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
import { ModalBackdrop, ModalContent } from './styles';

interface ModalProps {
    isOpen: boolean;
    children: React.ReactNode;
    onClose?: () => void;
    maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, children, onClose, maxWidth = '400px' }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && onClose) {
            onClose();
        }
    };

    return (
        <ModalBackdrop onClick={handleBackdropClick}>
            <ModalContent maxWidth={maxWidth}>
                {children}
            </ModalContent>
        </ModalBackdrop>
    );
};

export default Modal;
