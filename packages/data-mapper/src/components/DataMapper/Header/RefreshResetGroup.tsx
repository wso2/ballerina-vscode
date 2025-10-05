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

interface RefreshResetGroupProps {
    onRefresh: () => Promise<void>;
    onReset: () => Promise<void>;
}

export function RefreshResetGroup({ onRefresh, onReset }: RefreshResetGroupProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleOnRefresh = async () => {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
    };

    const handleOnReset = async () => {
        setIsResetting(true);
        await onReset();
        setIsResetting(false);
    };

    return (
        <ButtonGroup>
            <Button appearance="icon" onClick={handleOnRefresh} buttonSx={{ padding: "2px 4px" }} disabled={isRefreshing} tooltip="Refresh">
                <span style={{ pointerEvents: "none" }}>
                    {isRefreshing ? (
                        <ProgressRing sx={{ width: 16, height: 16 }} />
                    ) : (
                        <Codicon name="refresh" />
                    )}
                </span>
            </Button>
            <Button appearance="icon" onClick={handleOnReset} buttonSx={{ padding: "2px 4px" }} disabled={isResetting} tooltip="Clear all mappings">
                <span style={{ pointerEvents: "none" }}>
                    {isResetting ? (
                        <ProgressRing sx={{ width: 16, height: 16 }} />
                    ) : (
                        <Codicon name="clear-all" />
                    )}
                </span>
            </Button>
        </ButtonGroup>
    );
}
