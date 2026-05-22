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

import React from "react";
import styled from "@emotion/styled";

export type LoaderVariant = "block" | "inline";
export type LoaderSize = "sm" | "md";

interface Props {
    label?: string;
    variant?: LoaderVariant;
    size?: LoaderSize;
}

const Block = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px 16px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-family: var(--vscode-font-family);
    text-align: center;
`;

const Inline = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-family: var(--vscode-font-family);
`;

const ICON_SIZE: Record<LoaderSize, number> = { sm: 14, md: 18 };

/**
 * Shared spinner for the AI panel surfaces (SettingsPanel, McpManagerPanel,
 * chip popovers, etc). Use the block variant in place of an empty-state card
 * while data is loading; use the inline variant inside a row that is otherwise
 * showing chips/buttons.
 */
export const Loader: React.FC<Props> = ({ label, variant = "block", size = "md" }) => {
    const fontSize = ICON_SIZE[size];
    if (variant === "inline") {
        return (
            <Inline>
                <span className="codicon codicon-loading codicon-modifier-spin" style={{ fontSize }} />
                {label && <span>{label}</span>}
            </Inline>
        );
    }
    return (
        <Block>
            <span className="codicon codicon-loading codicon-modifier-spin" style={{ fontSize }} />
            {label && <span>{label}</span>}
        </Block>
    );
};

export default Loader;
