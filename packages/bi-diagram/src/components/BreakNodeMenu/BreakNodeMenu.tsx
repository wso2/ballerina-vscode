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

import { MenuItem } from "@wso2/ui-toolkit";
import React from "react";

interface BreakpointMenuWidgetProps {
    hasBreakpoint: boolean;
    onAddBreakpoint: () => void;
    onRemoveBreakpoint: () => void;
}

export function BreakpointMenu(props: BreakpointMenuWidgetProps) {
    const { hasBreakpoint, onAddBreakpoint, onRemoveBreakpoint } = props;

    return (
        <>
            {hasBreakpoint ?
                <MenuItem
                    key={'remove-breakpoint-btn'}
                    item={{ label: 'Remove Breakpoint', id: "removeBreakpoint", onClick: () => onRemoveBreakpoint() }}
                /> :
                <MenuItem key={'breakpoint-btn'}
                    item={{ label: 'Add Breakpoint', id: "addBreakpoint", onClick: () => onAddBreakpoint() }}
                />
            }
        </>
    );
}
