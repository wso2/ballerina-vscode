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

import React, { useState, useCallback } from "react";
import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";

interface CopyButtonProps {
    text: string;
    title?: string;
    inline?: boolean;
    size?: "small" | "medium";
}

interface ButtonProps {
    inline?: boolean;
    size?: "small" | "medium";
}

const Button = styled.button<ButtonProps>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: ${(props: ButtonProps) => props.size === "small" ? "2px" : "4px"};
    background: transparent;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    color: var(--vscode-descriptionForeground);
    opacity: ${(props: ButtonProps) => props.inline ? 0 : 1};
    transition: opacity 0.15s ease, background-color 0.15s ease;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
    }

    .group:hover & {
        opacity: 1;
    }
`;

const COPY_FEEDBACK_DURATION = 2000;

export function CopyButton({ text, title = "Copy", inline = false, size = "medium" }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
        } catch (err) {
            console.error("Failed to copy text:", err);
        }
    }, [text]);

    return (
        <Button
            onClick={handleCopy}
            title={copied ? "Copied!" : title}
            inline={inline}
            size={size}
        >
            {copied ? (
                <Icon name="bi-check" sx={{ color: "var(--vscode-testing-iconPassed, #73c991)", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
            ) : (
                <Icon name="bi-copy" sx={{ display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
            )}
        </Button>
    );
}
