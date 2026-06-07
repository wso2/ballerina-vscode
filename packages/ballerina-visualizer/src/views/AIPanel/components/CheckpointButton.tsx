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
import { Button } from "@wso2/ui-toolkit";

interface CheckpointButtonProps {
    checkpointId?: string;
    onRestore: (checkpointId: string) => void;
    disabled?: boolean;
}

const CheckpointButton: React.FC<CheckpointButtonProps> = ({ checkpointId, onRestore, disabled = false }) => {
    if (!checkpointId) {
        return null;
    }

    return (
        <Button
            appearance="secondary"
            onClick={() => onRestore(checkpointId)}
            tooltip="Revert conversation back to this point"
            disabled={disabled}
        >
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontSize: "12px",
                whiteSpace: "nowrap"
            }}>
                <span style={{ fontSize: "14px", lineHeight: "1" }}>↺</span>
                <span>Revert</span>
            </div>
        </Button>
    );
};

export default CheckpointButton;
