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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Button, Codicon, ProgressRing } from "@wso2/ui-toolkit";

const ButtonGroup = styled.div`
    display: flex;
    align-items: center;
`;

interface ActionButtonProps {
    onClick: () => Promise<void>;
    iconName: string;
    tooltip: string;
}

function ActionButton({ onClick, iconName, tooltip }: ActionButtonProps) {
    const [inProgress, setInProgress] = useState(false);
    
    const handleOnClick = async () => {
        setInProgress(true);
        await onClick();
        setInProgress(false);
    };
    
    return (
        <Button appearance="icon" onClick={handleOnClick} disabled={inProgress} tooltip={tooltip}>
            <span style={{ pointerEvents: "none" }}>
                {inProgress ? (
                    <ProgressRing sx={{ width: 16, height: 16 }} />
                ) : (
                    <Codicon name={iconName} />
                )}
            </span>
        </Button>
    );
}

interface RefreshResetGroupProps {
    onRefresh: () => Promise<void>;
    onReset: () => Promise<void>;
}

export function RefreshResetGroup({ onRefresh, onReset }: RefreshResetGroupProps) {
    return (
        <ButtonGroup>
            <ActionButton 
                onClick={onRefresh}
                iconName="refresh"
                tooltip="Refresh"
            />
            <ActionButton 
                onClick={onReset}
                iconName="clear-all"
                tooltip="Clear all mappings"
            />
        </ButtonGroup>
    );
}
