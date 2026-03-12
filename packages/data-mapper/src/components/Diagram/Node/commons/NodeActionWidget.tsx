/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { Button, Icon, ProgressRing } from "@wso2/ui-toolkit";
import { useIONodesStyles } from "../../../styles";

export interface NodeActionWidgetProps {
    onClick: () => void | Promise<void>;
    iconName: string;
    tooltip?: string;
    label: string;
}

export function NodeActionWidget(props: NodeActionWidgetProps) {
    const { onClick, iconName, tooltip, label } = props;
    const classes = useIONodesStyles();
    const [inProgress, setInProgress] = useState(false);

    const handleOnClick = async () => {
        setInProgress(true);
        try {
            await onClick();
        } catch (error) {
            console.error(error);
        } finally {
            setInProgress(false);
        }
    };

    return (
        <Button 
            className={classes.nodeActionButton} 
            onClick={handleOnClick}
            disabled={inProgress}
            tooltip={tooltip}
        >
            {inProgress ? (
                <ProgressRing sx={{ height: '16px', width: '16px' }} />
            ) : (
                <Icon name={iconName} className="action-icon" />
            )}
            <p style={{ margin: 0 }} title={tooltip}>
                {label}
            </p>
        </Button>
    );
}
