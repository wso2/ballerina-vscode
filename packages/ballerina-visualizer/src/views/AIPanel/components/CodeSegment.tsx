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

import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";
import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import { Collapse } from "react-collapse";

const Container = styled.div`
    margin-top: 10px;
    border-radius: 4px;
    background-color: var(--vscode-toolbar-activeBackground);
`;

const Header = styled.div<{ isOpen: boolean; collapsible: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: ${({ collapsible }: { collapsible: boolean }) => (collapsible ? "pointer" : "default")};
    padding: 8px 12px;
    background-color: var(--vscode-toolbar-activeBackground);
    border-radius: ${({ isOpen, collapsible }: { isOpen: boolean; collapsible: boolean }) =>
        collapsible ? (isOpen ? "4px 4px 0 0" : "4px") : "4px 4px 0 0"};
`;

const FileName = styled.div`
    flex-grow: 1;
    font-weight: bold;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CopyButton = styled.button<{ copied: boolean }>`
    background: transparent;
    border: none;
    color: var(--vscode-editor-foreground);
    cursor: pointer;
    font-size: 0.75rem;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const CodeWrapper = styled.div`
    padding: 8px;
    background-color: var(--vscode-toolbar-activeBackground);
    border-radius: 0 0 4px 4px;

    pre {
        margin: 0 !important;
    }
`;

export interface CodeSegmentProps {
    source: string;
    fileName: string;
    language?: string;
    collapsible?: boolean;
    showCopyButton?: boolean;
}

export const CodeSegment: React.FC<CodeSegmentProps> = ({
    source,
    fileName,
    language = "plaintext",
    collapsible = true,
    showCopyButton = false,
}) => {
    const [isOpen, setIsOpen] = useState(!collapsible);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(source);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code: ", err);
        }
    };

    return (
        <Container>
            <Header isOpen={isOpen} collapsible={collapsible} onClick={() => collapsible && setIsOpen(!isOpen)}>
                <FileName>
                    {collapsible && <Codicon name={isOpen ? "chevron-down" : "chevron-right"} />}
                    {fileName}
                </FileName>
                {showCopyButton && (
                    <CopyButton onClick={handleCopy} copied={copied} title={copied ? "Copied" : "Copy code"}>
                        <Codicon name={copied ? "check" : "copy"} />
                        {copied ? "Copied" : "Copy"}
                    </CopyButton>
                )}
            </Header>
            <Collapse isOpened={isOpen}>
                <CodeWrapper>
                    <MarkdownRenderer markdownContent={`\`\`\`${language}\n${source}\n\`\`\``} />
                </CodeWrapper>
            </Collapse>
        </Container>
    );
};
