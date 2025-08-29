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

import { Codicon } from "@wso2/ui-toolkit";

import { useIONodesStyles } from "../../../styles";

export function OutputBeforeInputNotification() {
    const classes = useIONodesStyles();
    
    return (
        <div className={classes.outputBeforeInputNotification}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
                <Codicon name="info" sx={{ marginRight: "7px" }} />
                Click on input field first to create a mapping
            </span>
        </div>
    );
}
