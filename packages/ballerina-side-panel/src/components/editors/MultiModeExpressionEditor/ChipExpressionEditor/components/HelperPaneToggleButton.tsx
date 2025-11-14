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

interface HelperPaneToggleButtonProps {
    isOpen: boolean;
    onClick: () => void;
}

export const HelperPaneToggleButton = React.forwardRef<HTMLButtonElement, HelperPaneToggleButtonProps>(({
    isOpen,
    onClick
}, ref) => {
    
    return (
        <button
            ref={ref}
            onClick={onClick}
            type="button"
            aria-label="Toggle helper pane"
            aria-pressed={isOpen}
            tabIndex={-1}
            style={{
                padding: '6px 12px',
                borderRadius: '3px',
                border: '1px solid var(--vscode-button-border)',
                backgroundColor: isOpen ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
                color: isOpen ? 'var(--vscode-button-foreground)' : 'var(--vscode-button-secondaryForeground)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                width: '55px',
                height: '25px',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'var(--vscode-font-family)',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.1s ease'
            }}
        >
            <Codicon name="question" />
            <Codicon name={isOpen ? "chevron-right" : "chevron-down"} />
        </button>
    );
});