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
import { parseNestedJSON } from "../utils";

// Configurable auto-expand depth
export const DEFAULT_AUTO_EXPAND_DEPTH = 3;

interface JsonTreeViewerProps {
    data: unknown;
    searchQuery?: string;
    maxAutoExpandDepth?: number;
    collapseAll?: boolean;
    expandAll?: boolean;
    expandLastOnly?: boolean;
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

        & > span:last-child,
        & > span:last-child button {
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

        & > span:last-child,
        & > span:last-child button {
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
        : 'var(--vscode-button-background)'};
    color: ${(props: { isArrayIndex?: boolean }) => props.isArrayIndex
        ? 'var(--vscode-badge-foreground)'
        : 'var(--vscode-button-foreground)'};
    border: 1px solid var(--vscode-button-border);
    flex-shrink: 0;
`;

const ValueText = styled.span`
    color: var(--vscode-editor-foreground);
    word-break: break-word;
    flex: 0 1 auto;
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
    margin-left: 6px;
`;

const ShowMoreButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    margin: 8px 0;
    background-color: var(--vscode-list-hoverBackground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    color: var(--vscode-badge-foreground);
    font-size: 12px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: all 0.15s ease;
    width: fit-content;

    &:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
    }

    &:active {
        transform: scale(0.98);
    }
`;

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

// Generate expanded set that expands only the last item of root array (and its descendants up to depth)
function generateExpandedForLastItem(data: unknown, maxDepth: number): Set<string> {
    const expanded = new Set<string>();
    if (!Array.isArray(data) || data.length === 0) return expanded;

    const lastIndex = data.length - 1;
    const startPath = `root[${lastIndex}]`;

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

    traverse(data[lastIndex], startPath, 0);
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

// Find paths that match search query and their parent paths
function findMatchingPaths(data: unknown, searchQuery: string): Set<string> {
    if (!searchQuery) return new Set();

    const matchingPaths = new Set<string>();
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    const traverse = (obj: unknown, currentPath: string, parentPaths: string[], key: string = '') => {
        // Check if key or value matches
        const keyMatches = key && regex.test(key);
        const valueMatches = obj != null && typeof obj !== 'object' && regex.test(String(obj));

        if (keyMatches || valueMatches) {
            // Add all parent paths and current path
            parentPaths.forEach(p => matchingPaths.add(p));
            matchingPaths.add(currentPath);
            return;
        }

        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                const itemPath = `${currentPath}[${index}]`;
                traverse(item, itemPath, [...parentPaths, currentPath], String(index));
            });
        } else if (obj != null && typeof obj === 'object') {
            Object.entries(obj).forEach(([k, v]) => {
                const itemPath = `${currentPath}.${k}`;
                traverse(v, itemPath, [...parentPaths, currentPath], k);
            });
        }
    };

    traverse(data, 'root', []);
    return matchingPaths;
}

export function JsonTreeViewer({
    data,
    searchQuery = '',
    maxAutoExpandDepth = DEFAULT_AUTO_EXPAND_DEPTH,
    collapseAll = false,
    expandAll = false,
    expandLastOnly = false
}: JsonTreeViewerProps) {
    // Parse nested JSON strings
    const parsedData = useMemo(() => parseNestedJSON(data), [data]);

    // Initialize expanded state
    const initialExpanded = useMemo(() => {
        if (expandLastOnly && Array.isArray(parsedData)) {
            return generateExpandedForLastItem(parsedData, maxAutoExpandDepth);
        }
        return generateInitialExpanded(parsedData, maxAutoExpandDepth);
    }, [parsedData, maxAutoExpandDepth, expandLastOnly]);

    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(initialExpanded);
    const [showHiddenItems, setShowHiddenItems] = useState(false);

    // Reset showHiddenItems when data changes
    useEffect(() => {
        setShowHiddenItems(false);
    }, [parsedData]);

    // Auto-expand only matching paths when searching, restore initial state when cleared
    useEffect(() => {
        if (searchQuery) {
            const matchingPaths = findMatchingPaths(parsedData, searchQuery);
            setExpandedPaths(matchingPaths);
            // Show all items when searching
            setShowHiddenItems(true);
        } else {
            setExpandedPaths(initialExpanded);
        }
    }, [searchQuery, parsedData, initialExpanded]);

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

    const isFlatRoot = useMemo(() => {
        if (Array.isArray(parsedData)) {
            return parsedData.every(item => item === null || typeof item !== 'object');
        }
        if (parsedData !== null && typeof parsedData === 'object') {
            return Object.values(parsedData).every(v => v === null || typeof v !== 'object');
        }
        return true;
    }, [parsedData]);

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
                {!isFlatRoot && <Spacer />}
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

    if (Array.isArray(parsedData)) {
        const showCondensedView = expandLastOnly && parsedData.length > 4 && !showHiddenItems && !searchQuery;
        const numItemsToShowAtStart = 0;

        if (showCondensedView) {
            const hiddenCount = parsedData.length - numItemsToShowAtStart - 1; // -1 for the last item we'll show

            return (
                <Container>
                    {/* First few items (collapsed) */}
                    {parsedData.slice(0, numItemsToShowAtStart).map((item, index) => (
                        <div key={`root[${index}]`} style={{ marginBottom: '4px' }}>
                            {renderValue(item, String(index), `root[${index}]`, true)}
                        </div>
                    ))}

                    {/* Show more button */}
                    <ShowMoreButton onClick={() => setShowHiddenItems(true)}>
                        <Codicon name="chevron-down" />
                        View {hiddenCount} hidden {hiddenCount === 1 ? 'item' : 'items'}
                    </ShowMoreButton>

                    {/* Last item (expanded) */}
                    <div key={`root[${parsedData.length - 1}]`} style={{ marginBottom: '4px' }}>
                        {renderValue(parsedData[parsedData.length - 1], String(parsedData.length - 1), `root[${parsedData.length - 1}]`, true)}
                    </div>
                </Container>
            );
        }

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
