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

import { useState, useMemo, ReactNode, useEffect } from "react";
import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";
import { CopyButton } from "./CopyButton";

// Configurable auto-expand depth
export const DEFAULT_AUTO_EXPAND_DEPTH = 2;

interface JsonTreeViewerProps {
    data: unknown;
    searchQuery?: string;
    maxAutoExpandDepth?: number;
    collapseAll?: boolean;
    expandAll?: boolean;
}

const Container = styled.div`
    font-size: 13px;
    line-height: 1.6;
`;

const TreeNode = styled.div`
    margin-left: 16px;
    margin-top: 4px;
    border-left: 2px solid var(--vscode-editorIndentGuide-background, rgba(128, 128, 128, 0.2));
    padding-left: 12px;
`;

const NodeRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 1px 0;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);

        & > span:last-child {
            opacity: 1;
        }
    }
`;

const ExpandableRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 1px 0;
    width: 100%;
    cursor: pointer;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);

        & > span:last-child {
            opacity: 1;
        }
    }
`;

const ExpandIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
    margin-top: 2px;
`;

const Spacer = styled.span`
    width: 16px;
    flex-shrink: 0;
`;

const KeyBadge = styled.span<{ isArrayIndex?: boolean }>`
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 3px;
    min-height: 18px;
    background-color: ${(props: { isArrayIndex?: boolean }) => props.isArrayIndex
        ? 'var(--vscode-list-hoverBackground)'
        : 'var(--vscode-badge-background)'};
    color: ${(props: { isArrayIndex?: boolean }) => props.isArrayIndex
        ? 'var(--vscode-editor-foreground)'
        : 'var(--vscode-badge-foreground)'};
    flex-shrink: 0;
`;

const ValueText = styled.span`
    color: var(--vscode-editor-foreground);
    word-break: break-word;
    flex: 1;
    margin-left: 6px;
`;

const TypeIndicator = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-left: 4px;
    display: flex;
    align-self: center;
`;

const Highlight = styled.mark`
    background-color: var(--vscode-editor-findMatchHighlightBackground, #ffcc00);
    color: inherit;
    padding: 0 1px;
    border-radius: 2px;
`;

const CopyWrapper = styled.span`
    opacity: 0;
    transition: opacity 0.15s ease;
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

// Parse nested JSON strings recursively
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

// Highlight search matches in text
function highlightText(text: string, searchQuery: string): ReactNode {
    if (!searchQuery) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
        regex.test(part) ? <Highlight key={i}>{part}</Highlight> : part
    );
}

// Generate initial expanded state based on depth
function generateInitialExpanded(data: unknown, maxDepth: number, path: string = ''): Set<string> {
    const expanded = new Set<string>();

    const traverse = (obj: unknown, currentPath: string, depth: number) => {
        if (depth >= maxDepth) return;

        if (Array.isArray(obj)) {
            expanded.add(currentPath);
            obj.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    traverse(item, `${currentPath}[${index}]`, depth + 1);
                }
            });
        } else if (obj !== null && typeof obj === 'object') {
            expanded.add(currentPath);
            Object.entries(obj).forEach(([key, val]) => {
                if (typeof val === 'object' && val !== null) {
                    traverse(val, `${currentPath}.${key}`, depth + 1);
                }
            });
        }
    };

    traverse(data, path || 'root', 0);
    return expanded;
}

// Collect all paths in the data structure
function collectAllPaths(data: unknown, path: string = ''): Set<string> {
    const paths = new Set<string>();

    const traverse = (obj: unknown, currentPath: string) => {
        if (Array.isArray(obj)) {
            paths.add(currentPath);
            obj.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    traverse(item, `${currentPath}[${index}]`);
                }
            });
        } else if (obj !== null && typeof obj === 'object') {
            paths.add(currentPath);
            Object.entries(obj).forEach(([key, val]) => {
                if (typeof val === 'object' && val !== null) {
                    traverse(val, `${currentPath}.${key}`);
                }
            });
        }
    };

    traverse(data, path || 'root');
    return paths;
}

export function JsonTreeViewer({
    data,
    searchQuery = '',
    maxAutoExpandDepth = DEFAULT_AUTO_EXPAND_DEPTH,
    collapseAll = false,
    expandAll = false
}: JsonTreeViewerProps) {
    // Parse nested JSON strings
    const parsedData = useMemo(() => parseNestedJSON(data), [data]);

    // Initialize expanded state
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() =>
        generateInitialExpanded(parsedData, maxAutoExpandDepth)
    );

    // Handle collapse/expand all
    useEffect(() => {
        if (collapseAll) {
            setExpandedPaths(new Set());
        }
    }, [collapseAll]);

    useEffect(() => {
        if (expandAll) {
            setExpandedPaths(collectAllPaths(parsedData));
        }
    }, [expandAll, parsedData]);

    const toggleExpanded = (path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const renderValue = (
        value: unknown,
        key: string,
        path: string,
        isArrayIndex: boolean = false
    ): ReactNode => {
        const isExpanded = expandedPaths.has(path);

        // Handle arrays
        if (Array.isArray(value)) {
            return (
                <div key={path}>
                    <ExpandableRow onClick={() => toggleExpanded(path)}>
                        <ExpandIcon>
                            <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
                        </ExpandIcon>
                        <KeyBadge isArrayIndex={isArrayIndex}>
                            {highlightText(key, searchQuery)}
                        </KeyBadge>
                        <TypeIndicator>[{value.length} {value.length === 1 ? 'item' : 'items'}]</TypeIndicator>
                        <CopyWrapper>
                            <CopyButton text={JSON.stringify(value, null, 2)} size="small" inline />
                        </CopyWrapper>
                    </ExpandableRow>
                    {isExpanded && (
                        <TreeNode>
                            {value.map((item, index) => (
                                <div key={`${path}[${index}]`} style={{ marginBottom: '4px' }}>
                                    {renderValue(item, String(index), `${path}[${index}]`, true)}
                                </div>
                            ))}
                        </TreeNode>
                    )}
                </div>
            );
        }

        // Handle objects
        if (value !== null && typeof value === 'object') {
            const keys = Object.keys(value);
            return (
                <div key={path}>
                    <ExpandableRow onClick={() => toggleExpanded(path)}>
                        <ExpandIcon>
                            <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
                        </ExpandIcon>
                        <KeyBadge isArrayIndex={isArrayIndex}>
                            {highlightText(key, searchQuery)}
                        </KeyBadge>
                        <TypeIndicator>{`{${keys.length} ${keys.length === 1 ? 'property' : 'properties'}}`}</TypeIndicator>
                        <CopyWrapper>
                            <CopyButton text={JSON.stringify(value, null, 2)} size="small" inline />
                        </CopyWrapper>
                    </ExpandableRow>
                    {isExpanded && (
                        <TreeNode>
                            {Object.entries(value).map(([k, v]) => (
                                <div key={`${path}.${k}`} style={{ marginBottom: '4px' }}>
                                    {renderValue(v, k, `${path}.${k}`, false)}
                                </div>
                            ))}
                        </TreeNode>
                    )}
                </div>
            );
        }

        // Handle primitives
        return (
            <NodeRow key={path}>
                <Spacer />
                <KeyBadge isArrayIndex={isArrayIndex}>
                    {highlightText(key, searchQuery)}
                </KeyBadge>
                <ValueText>{highlightText(String(value), searchQuery)}</ValueText>
                <CopyWrapper>
                    <CopyButton text={String(value)} size="small" inline />
                </CopyWrapper>
            </NodeRow>
        );
    };

    // Render based on data type
    if (Array.isArray(parsedData)) {
        return (
            <Container>
                {parsedData.map((item, index) => (
                    <div key={`root[${index}]`} style={{ marginBottom: '4px' }}>
                        {renderValue(item, String(index), `root[${index}]`, true)}
                    </div>
                ))}
            </Container>
        );
    }

    if (parsedData !== null && typeof parsedData === 'object') {
        return (
            <Container>
                {Object.entries(parsedData).map(([key, value]) => (
                    <div key={`root.${key}`} style={{ marginBottom: '4px' }}>
                        {renderValue(value, key, `root.${key}`, false)}
                    </div>
                ))}
            </Container>
        );
    }

    // Primitive value at root
    return (
        <Container>
            <ValueText>{highlightText(String(parsedData), searchQuery)}</ValueText>
        </Container>
    );
}
