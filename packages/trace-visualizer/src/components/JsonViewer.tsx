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

import React, { useState, useMemo, ReactNode, useEffect } from "react";
import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";
import { JsonTreeViewer, DEFAULT_AUTO_EXPAND_DEPTH } from "./JsonTreeViewer";
import { CopyButton } from "./CopyButton";
import { tryParseJSON, isJSONString, parseNestedJSON, highlightText } from "../utils";
import { Highlight, ToggleGroup, ToggleButton, ToggleButtonProps } from "./shared-styles";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type ViewMode = 'formatted' | 'raw' | 'markdown';

interface JsonViewerProps {
    value: string;
    title?: string;
    searchQuery?: string;
    maxAutoExpandDepth?: number;
    expandLastOnly?: boolean;
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

const MarkdownContent = styled.div`
    font-family: var(--vscode-font-family);
    font-size: 13px;
    line-height: 1.6;
    color: var(--vscode-editor-foreground);

    h1, h2, h3, h4, h5, h6 {
        margin-top: 12px;
        margin-bottom: 8px;
        font-weight: 600;
        line-height: 1.25;
        color: var(--vscode-editor-foreground);
    }

    h1:first-child,
    h2:first-child,
    h3:first-child,
    h4:first-child,
    h5:first-child,
    h6:first-child {
        margin-top: 0;
    }

    h1 { font-size: 1.25em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.2em; }
    h2 { font-size: 1.2em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.2em; }
    h3 { font-size: 1.1em; }
    h4 { font-size: 1em; }
    h5 { font-size: 0.875em; }
    h6 { font-size: 0.85em; color: var(--vscode-descriptionForeground); }

    p {
        margin-top: 0;
        margin-bottom: 10px;
    }

    code {
        padding: 2px 6px;
        margin: 0;
        font-size: 85%;
        background-color: var(--vscode-textCodeBlock-background);
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family, monospace);
    }

    pre {
        padding: 12px;
        overflow: auto;
        font-size: 85%;
        line-height: 1.45;
        background-color: var(--vscode-textCodeBlock-background);
        border-radius: 3px;
        margin-bottom: 10px;

        code {
            padding: 0;
            background-color: transparent;
        }
    }

    blockquote {
        margin: 0 0 10px 0;
        padding: 0 1em;
        color: var(--vscode-descriptionForeground);
        border-left: 4px solid var(--vscode-panel-border);
    }

    ul, ol {
        margin-top: 0;
        margin-bottom: 10px;
        padding-left: 2em;
    }

    li {
        margin-bottom: 4px;
    }

    table {
        border-collapse: collapse;
        margin-bottom: 10px;
        width: 100%;
    }

    table th,
    table td {
        padding: 6px 13px;
        border: 1px solid var(--vscode-panel-border);
    }

    table tr {
        background-color: var(--vscode-editor-background);
    }

    table tr:nth-of-type(2n) {
        background-color: var(--vscode-list-hoverBackground);
    }

    table th {
        font-weight: 600;
        background-color: var(--vscode-list-activeSelectionBackground);
    }

    a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }

    hr {
        height: 1px;
        border: 0;
        background-color: var(--vscode-panel-border);
        margin: 16px 0;
    }

    img {
        max-width: 100%;
        border-radius: 3px;
    }

    /* KaTeX math styling */
    .katex {
        font-size: 1.1em;
        color: var(--vscode-editor-foreground);
    }

    .katex-display {
        margin: 1em 0;
        overflow-x: auto;
        overflow-y: hidden;
        text-align: center;
    }

    .katex .base {
        color: var(--vscode-editor-foreground);
    }
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

// Format JSON with nested parsing
function formatJSON(str: string): string {
    try {
        const trimmed = str.trim();
        const parsed = tryParseJSON(trimmed);
        const deepParsed = parseNestedJSON(parsed);
        return JSON.stringify(deepParsed, null, 2);
    } catch (e) {
        console.error('Failed to format JSON:', e);
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
        // Use non-global regex to avoid state issues
        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
        const parts = text.split(regex);
        return parts.map((part, idx) =>
            idx % 2 === 1
                ? <Highlight key={idx}>{part}</Highlight>
                : part
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

// Preprocess LaTeX delimiters to convert \(...\) and \[...\] to $...$ and $$...$$
function preprocessLatex(text: string): string {
    if (!text || typeof text !== 'string') return text;

    // Convert display math \[...\] to $$...$$
    let processed = text.replace(/\\\[(.*?)\\\]/gs, (_, math) => `$$${math}$$`);

    // Convert inline math \(...\) to $...$
    processed = processed.replace(/\\\((.*?)\\\)/gs, (_, math) => `$${math}$`);

    return processed;
}

// Check if text might contain markdown syntax
function mightContainMarkdown(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    // Check for common markdown patterns with more lenient matching
    const markdownPatterns = [
        /^#{1,6}\s+.+/m,           // Headers (# Header)
        /\*\*.+?\*\*/,              // Bold (**text**)
        /__.+?__/,                  // Bold (__text__)
        /\*.+?\*/,                  // Italic (*text*)
        /_.+?_/,                    // Italic (_text_)
        /`[^`\n]+`/,                // Inline code (`code`)
        /```/,                      // Code blocks (```)
        /^\s*[-*+]\s+.+/m,          // Unordered lists (- item)
        /^\s*\d+\.\s+.+/m,          // Ordered lists (1. item)
        /\[.+?\]\(.+?\)/,           // Links ([text](url))
        /^>\s*.+/m,                 // Blockquotes (> quote)
        /\$\$.+?\$\$/s,              // Block LaTeX ($$...$$)
        /\$.+?\$/,                  // Inline LaTeX ($...$)
        /\\\[.*?\\\]/s,            // LaTeX display math (\[...\])
        /\\\(.*?\\\)/s,            // LaTeX inline math (\(...\))
        /\\[a-zA-Z]+\{/,            // LaTeX commands (\command{)
        /^\|.+\|.+\|/m,             // Tables (| col | col |)
        /!\[.*?\]\(.+?\)/,          // Images (![alt](url))
        /^\s*[-*_]{3,}\s*$/m,       // Horizontal rules (--- or ***)
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
}

export function JsonViewer({
    value,
    title,
    searchQuery = '',
    maxAutoExpandDepth = DEFAULT_AUTO_EXPAND_DEPTH,
    expandLastOnly = false
}: JsonViewerProps) {
    const isJSON = useMemo(() => {
        const result = isJSONString(value);
        return result;
    }, [value]);
    const hasMarkdown = useMemo(() => {
        const result = !isJSON && mightContainMarkdown(value);
        return result;
    }, [value, isJSON]);

    const markdownComponents = useMemo(() => {
        const create = (tag: any) => ({ children, ...props }: any) => {
            const mapped = React.Children.map(children, (child: any) =>
                typeof child === 'string' ? highlightText(child, searchQuery) : child
            );
            return React.createElement(tag, props, mapped);
        };

        return {
            p: create('p'),
            li: create('li'),
            h1: create('h1'),
            h2: create('h2'),
            h3: create('h3'),
            h4: create('h4'),
            h5: create('h5'),
            h6: create('h6'),
            a: ({ children, ...props }: any) =>
                React.createElement('a', props, React.Children.map(children, (c: any) =>
                    typeof c === 'string' ? highlightText(c, searchQuery) : c
                )),
            strong: create('strong'),
            em: create('em'),
            code: ({ inline, children, className, ...props }: any) => {
                if (inline) return React.createElement('code', { className, ...props }, children);
                return React.createElement('pre', props, React.createElement('code', { className }, children));
            }
        };
    }, [searchQuery]);

    const [viewMode, setViewMode] = useState<ViewMode>('formatted');
    const [collapseAll, setCollapseAll] = useState(false);
    const [expandAll, setExpandAll] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Reset view mode when value changes (new content)
    useEffect(() => {
        const newViewMode = isJSON ? 'formatted' : (hasMarkdown ? 'markdown' : 'raw');
        setViewMode(newViewMode);
    }, [value, isJSON, hasMarkdown]);

    const parsedData = useMemo(() => {
        if (!isJSON) return null;
        try {
            const trimmed = value.trim();
            let jsonStr = trimmed;

            // If it's a stringified JSON (starts with quotes), unwrap it first
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                const unescaped = JSON.parse(trimmed);
                if (typeof unescaped === 'string') {
                    jsonStr = unescaped;
                }
            }

            return tryParseJSON(jsonStr);
        } catch {
            return null;
        }
    }, [value, isJSON]);

    const formattedJSON = useMemo(() => {
        if (!isJSON) return value;

        let jsonStr = value.trim();
        // If it's a stringified JSON, unwrap it first
        if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
            try {
                const unescaped = JSON.parse(jsonStr);
                if (typeof unescaped === 'string') {
                    jsonStr = unescaped;
                }
            } catch {
                // Keep original if unwrapping fails
            }
        }

        return formatJSON(jsonStr);
    }, [value, isJSON]);

    // If not JSON, show raw text or markdown
    if (!isJSON) {
        return (
            <Container>
                <Header>
                    <TitleContainer>
                        {title && <Title>{title}</Title>}
                        <CopyButton text={value} size="small" />
                    </TitleContainer>
                    {hasMarkdown && (
                        <ActionButtons>
                            <ToggleGroup>
                                <ToggleButton
                                    active={viewMode === 'markdown'}
                                    onClick={() => setViewMode('markdown')}
                                >
                                    Formatted
                                </ToggleButton>
                                <ToggleButton
                                    active={viewMode === 'raw'}
                                    onClick={() => setViewMode('raw')}
                                >
                                    Raw
                                </ToggleButton>
                            </ToggleGroup>
                        </ActionButtons>
                    )}
                </Header>
                <ContentWrapper>
                    {viewMode === 'markdown' && hasMarkdown ? (
                        <MarkdownContent>
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[rehypeKatex]}
                                components={markdownComponents}
                            >
                                {preprocessLatex(value)}
                            </ReactMarkdown>
                        </MarkdownContent>
                    ) : (
                        <PlainText>{highlightText(value, searchQuery)}</PlainText>
                    )}
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
                                name={isCollapsed ? 'bi-expand-item' : 'bi-collapse-item'}
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
                        expandLastOnly={expandLastOnly}
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
