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
import { ThemeColors } from "@wso2/ui-toolkit";

const ViewContainer = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3000;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    padding: 28px 56px;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

// Add a backdrop for the fade effect
const Backdrop = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2999; // Behind the ViewContainer
    background-color: rgba(0, 0, 0, 0.5); // Semi-transparent background
`;

const TopBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

interface PopupPanelProps {
    children: React.ReactNode;
    onClose: () => void;
}

export function PopupMessage(props: PopupPanelProps) {
    const { children, onClose } = props;

    return (
        <>
            <Backdrop onClick={onClose} />
            <ViewContainer>
                {/* <TopBar>
                    <div></div>
                    <Button appearance="icon" onClick={onClose}>
                        <Codicon name="close" />
                    </Button>
                </TopBar> */}
                {children}
            </ViewContainer>
        </>
    );
}

export default PopupMessage;
