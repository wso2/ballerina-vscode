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
import { Codicon, Icon, ProgressRing } from "@wso2/ui-toolkit";
import { useIONodesStyles } from "../../../styles";

export interface PayloadWidgetProps {
    onClick: () => void | Promise<void>;
    typeName?: string;
}

export function PayloadWidget(props: PayloadWidgetProps) {
    const { onClick, typeName } = props;
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
        <div
            className={classes.payloadWidget}
            onClick={!inProgress ? handleOnClick : undefined}
        >
            <p className={classes.payloadWidgetMessage}>{`Please provide a sample ${typeName} payload to construct the ${typeName} structure to create mappings`}</p>
            <div className={classes.payloadWidgetAction}>
                {inProgress ? (
                    <ProgressRing sx={{ height: '16px', width: '16px' }} />
                ) : (
                    <Codicon name="add"/>
                )}
                <p className={classes.payloadWidgetActionLabel}>{`Add sample ${typeName}`}</p>
            </div>
        </div>
    );
}
