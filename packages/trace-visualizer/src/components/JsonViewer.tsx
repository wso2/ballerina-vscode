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

import { useState, useMemo, ReactNode } from "react";
import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";
import { JsonTreeViewer, DEFAULT_AUTO_EXPAND_DEPTH } from "./JsonTreeViewer";
import { CopyButton } from "./CopyButton";

type ViewMode = 'formatted' | 'raw';

interface JsonViewerProps {
    value: string;
    title?: string;
    searchQuery?: string;
    maxAutoExpandDepth?: number;
}

const Container = styled.div``;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ActionButtons = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const Title = styled.h4`
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    letter-spacing: 0.5px;
`;

const ToggleGroup = styled.div`
    display: flex;
    gap: 2px;
`;

const IconButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: transparent;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    color: var(--vscode-descriptionForeground);
    transition: opacity 0.15s ease, background-color 0.15s ease;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
    }
`;

interface ToggleButtonProps {
    active: boolean;
}

const ToggleButton = styled.button<ToggleButtonProps>`
    padding: 4px 10px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
    cursor: pointer;
    transition: all 0.15s ease;

    background-color: ${(props: ToggleButtonProps) =>
        props.active
            ? 'var(--vscode-button-background)'
            : 'var(--vscode-input-background)'};
    color: ${(props: ToggleButtonProps) =>
        props.active
            ? 'var(--vscode-button-foreground)'
            : 'var(--vscode-foreground)'};

    &:first-of-type {
        border-radius: 3px 0 0 3px;
    }

    &:last-of-type {
        border-radius: 0 3px 3px 0;
    }

    &:hover {
        background-color: ${(props: ToggleButtonProps) =>
        props.active
            ? 'var(--vscode-button-hoverBackground)'
            : 'var(--vscode-list-hoverBackground)'};
    }
`;

const ContentWrapper = styled.div`
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px;
    max-height: 500px;
    overflow-y: auto;
`;

const RawContent = styled.pre`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--vscode-editor-foreground);
`;

const PlainText = styled.div`
    font-family: var(--vscode-font-family);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--vscode-editor-foreground);
`;

const Highlight = styled.mark`
    background-color: var(--vscode-editor-findMatchHighlightBackground, #ffcc00);
    color: inherit;
    padding: 0 1px;
    border-radius: 2px;
`;

// Syntax highlighting for JSON
const JsonKey = styled.span`
    color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe);
`;

const JsonString = styled.span`
    color: var(--vscode-debugTokenExpression-string, #ce9178);
`;

const JsonNumber = styled.span`
    color: var(--vscode-debugTokenExpression-number, #b5cea8);
`;

const JsonBoolean = styled.span`
    color: var(--vscode-debugTokenExpression-boolean, #569cd6);
`;

const JsonNull = styled.span`
    color: var(--vscode-debugTokenExpression-boolean, #569cd6);
`;

const JsonPunctuation = styled.span`
    color: var(--vscode-foreground);
`;

// Helper function to fix invalid JSON escape sequences
function fixJSONEscapes(str: string): string {
    // Strategy: First escape all backslashes, then unescape valid JSON sequences
    // This handles cases like \times where \t would be interpreted as tab

    // Step 1: Escape all backslashes
    let result = str.replace(/\\/g, '\\\\');

    // Step 2: Unescape valid JSON escape sequences
    // Valid: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
    result = result.replace(/\\\\\\(["\\/@bfnrt])/g, '\\$1');
    result = result.replace(/\\\\\\u([0-9a-fA-F]{4})/g, '\\u$1');

    return result;
}

// Helper function to check if a string is valid JSON
function isJSONString(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
    try {
        const fixed = fixJSONEscapes(trimmed);
        JSON.parse(fixed);
        return true;
    } catch (e) {
        console.log('JSON parse failed:', e, 'Input:', trimmed.substring(0, 100));
        return false;
    }
}

// Parse nested JSON strings recursively for formatting
function parseNestedJSON(value: unknown): unknown {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (isJSONString(trimmed)) {
            try {
                const parsed = JSON.parse(fixJSONEscapes(trimmed));
                return parseNestedJSON(parsed);
            } catch (e) {
                console.log('Failed to parse nested JSON:', e, 'Value:', trimmed.substring(0, 100));
                return value;
            }
        }
    }
    if (Array.isArray(value)) {
        return value.map(item => parseNestedJSON(item));
    }
    if (value !== null && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            result[key] = parseNestedJSON(val);
        }
        return result;
    }
    return value;
}

// Format JSON with nested parsing
function formatJSON(str: string): string {
    try {
        const trimmed = str.trim();
        const parsed = JSON.parse(fixJSONEscapes(trimmed));
        const deepParsed = parseNestedJSON(parsed);
        return JSON.stringify(deepParsed, null, 2);
    } catch (e) {
        console.log('Failed to format JSON:', e);
        return str;
    }
}

// Syntax highlight JSON string
function syntaxHighlightJSON(json: string, searchQuery: string): ReactNode[] {
    const tokens: ReactNode[] = [];
    let i = 0;
    let tokenId = 0;

    const highlight = (text: string): ReactNode => {
        if (!searchQuery) return text;
        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, idx) =>
            regex.test(part) ? <Highlight key={idx}>{part}</Highlight> : part
        );
    };

    while (i < json.length) {
        const char = json[i];

        // Strings
        if (char === '"') {
            let str = '"';
            i++;
            while (i < json.length && (json[i] !== '"' || json[i - 1] === '\\')) {
                str += json[i];
                i++;
            }
            str += '"';
            i++;

            // Check if this is a key (followed by :)
            let j = i;
            while (j < json.length && /\s/.test(json[j])) j++;
            const isKey = json[j] === ':';

            if (isKey) {
                tokens.push(<JsonKey key={tokenId++}>{highlight(str)}</JsonKey>);
            } else {
                tokens.push(<JsonString key={tokenId++}>{highlight(str)}</JsonString>);
            }
            continue;
        }

        // Numbers
        if (/[\d-]/.test(char) && (i === 0 || /[\s,\[{:]/.test(json[i - 1]))) {
            let num = '';
            while (i < json.length && /[\d.eE+-]/.test(json[i])) {
                num += json[i];
                i++;
            }
            tokens.push(<JsonNumber key={tokenId++}>{highlight(num)}</JsonNumber>);
            continue;
        }

        // Booleans
        if (json.slice(i, i + 4) === 'true') {
            tokens.push(<JsonBoolean key={tokenId++}>{highlight('true')}</JsonBoolean>);
            i += 4;
            continue;
        }
        if (json.slice(i, i + 5) === 'false') {
            tokens.push(<JsonBoolean key={tokenId++}>{highlight('false')}</JsonBoolean>);
            i += 5;
            continue;
        }

        // Null
        if (json.slice(i, i + 4) === 'null') {
            tokens.push(<JsonNull key={tokenId++}>{highlight('null')}</JsonNull>);
            i += 4;
            continue;
        }

        // Punctuation
        if (/[{}\[\]:,]/.test(char)) {
            tokens.push(<JsonPunctuation key={tokenId++}>{char}</JsonPunctuation>);
            i++;
            continue;
        }

        // Whitespace and other
        tokens.push(<span key={tokenId++}>{char}</span>);
        i++;
    }

    return tokens;
}

// Highlight text for plain text display
function highlightText(text: string, searchQuery: string): ReactNode {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? <Highlight key={i}>{part}</Highlight> : part
    );
}

export function JsonViewer({
    value,
    title,
    searchQuery = '',
    maxAutoExpandDepth = DEFAULT_AUTO_EXPAND_DEPTH
}: JsonViewerProps) {
    const isJSON = useMemo(() => isJSONString(value), [value]);
    const [viewMode, setViewMode] = useState<ViewMode>('formatted');
    const [collapseAll, setCollapseAll] = useState(false);
    const [expandAll, setExpandAll] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const parsedData = useMemo(() => {
        if (!isJSON) return null;
        try {
            const trimmed = value.trim();
            return JSON.parse(fixJSONEscapes(trimmed));
        } catch {
            return null;
        }
    }, [value, isJSON]);

    const formattedJSON = useMemo(() => {
        if (!isJSON) return value;
        return formatJSON(value);
    }, [value, isJSON]);

    // If not JSON, just show plain text
    if (!isJSON) {
        return (
            <Container>
                {title && (
                    <Header>
                        <TitleContainer>
                            <Title>{title}</Title>
                            <CopyButton text={value} size="small" />
                        </TitleContainer>
                    </Header>
                )}
                <ContentWrapper>
                    <PlainText>{highlightText(value, searchQuery)}</PlainText>
                </ContentWrapper>
            </Container>
        );
    }

    const handleCollapseExpandToggle = () => {
        if (isCollapsed) {
            setExpandAll(true);
            setCollapseAll(false);
            setIsCollapsed(false);
            // Reset expandAll after a short delay
            setTimeout(() => setExpandAll(false), 50);
        } else {
            setCollapseAll(true);
            setExpandAll(false);
            setIsCollapsed(true);
            // Reset collapseAll after a short delay
            setTimeout(() => setCollapseAll(false), 50);
        }
    };

    return (
        <Container>
            <Header>
                <TitleContainer>
                    {title && <Title>{title}</Title>}
                    <CopyButton text={value} size="small" />
                </TitleContainer>
                <ActionButtons>
                    {viewMode === 'formatted' && (
                        <IconButton
                            onClick={handleCollapseExpandToggle}
                            title={isCollapsed ? 'Expand all' : 'Collapse all'}
                        >
                            <Icon
                                name={isCollapsed ? 'bi-expand' : 'bi-collapse'}
                                sx={{ fontSize: "12px", width: "12px", height: "12px" }}
                                iconSx={{ display: "flex" }}
                            />
                        </IconButton>
                    )}
                    <ToggleGroup>
                        <ToggleButton
                            active={viewMode === 'formatted'}
                            onClick={() => setViewMode('formatted')}
                        >
                            Formatted
                        </ToggleButton>
                        <ToggleButton
                            active={viewMode === 'raw'}
                            onClick={() => setViewMode('raw')}
                        >
                            JSON
                        </ToggleButton>
                    </ToggleGroup>
                </ActionButtons>
            </Header>
            <ContentWrapper>
                {viewMode === 'formatted' ? (
                    <JsonTreeViewer
                        data={parsedData}
                        searchQuery={searchQuery}
                        maxAutoExpandDepth={maxAutoExpandDepth}
                        collapseAll={collapseAll}
                        expandAll={expandAll}
                    />
                ) : (
                    <RawContent>
                        {syntaxHighlightJSON(formattedJSON, searchQuery)}
                    </RawContent>
                )}
            </ContentWrapper>
        </Container>
    );
}
