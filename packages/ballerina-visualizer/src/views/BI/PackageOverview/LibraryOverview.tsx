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

import { useMemo, useRef, useState } from "react";
import {
    DIRECTORY_MAP,
    EVENT_TYPE,
    MACHINE_VIEW,
    ProjectStructure,
    ProjectStructureArtifactResponse,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, Icon, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

// ── Toolbar: search + summary ──────────────────────────────────────────

const Toolbar = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 4px;
`;

const SearchBar = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 6px 28px 6px 32px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    color: var(--vscode-input-foreground);
    font-size: 13px;
    font-family: var(--vscode-font-family);
    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
`;

const SearchIcon = styled.div`
    position: absolute;
    left: 10px;
    color: var(--vscode-input-placeholderForeground);
    pointer-events: none;
    display: flex;
    align-items: center;
`;

const ClearButton = styled.div`
    position: absolute;
    right: 6px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--vscode-input-placeholderForeground);
    &:hover {
        color: var(--vscode-input-foreground);
    }
`;

const SummaryBar = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const SummaryBadge = styled.div<{ accentColor: string; active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
    color: ${ThemeColors.ON_SURFACE};
    background-color: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} ${(props: { active: boolean }) => props.active ? "20%" : "8%"}, transparent);
    border: 1px solid color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} ${(props: { active: boolean }) => props.active ? "50%" : "20%"}, transparent);
    &:hover {
        background-color: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 25%, transparent);
        border-color: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 50%, transparent);
    }
`;

const BadgeCount = styled.span`
    font-weight: 600;
`;

// ── Layout ──────────────────────────────────────────────────────────────

const SectionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    width: 100%;
`;

const NoResults = styled.div`
    padding: 24px 16px;
    text-align: center;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.5;
    font-size: 13px;
`;

// ── Section ─────────────────────────────────────────────────────────────

const Section = styled.div`
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    overflow: hidden;
`;

const SectionHeader = styled.div<{ accentColor: string; isExpanded: boolean; clickable: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: ${(props: { clickable: boolean }) => props.clickable ? "pointer" : "default"};
    user-select: none;
    background-color: ${(props: { isExpanded: boolean; accentColor: string }) =>
        props.isExpanded
            ? `color-mix(in srgb, ${props.accentColor} 6%, transparent)`
            : "transparent"};
    &:hover {
        background-color: ${(props: { clickable: boolean; accentColor: string }) =>
            props.clickable
                ? `color-mix(in srgb, ${props.accentColor} 10%, transparent)`
                : "transparent"};
    }
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SectionTitle = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: ${ThemeColors.ON_SURFACE};
`;

const ItemCount = styled.span`
    font-size: 11px;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.6;
`;

const ChevronIcon = styled.div<{ isExpanded: boolean }>`
    display: flex;
    align-items: center;
    transition: transform 0.2s ease;
    transform: ${(props: { isExpanded: boolean }) => props.isExpanded ? "rotate(0deg)" : "rotate(-90deg)"};
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.6;
`;

const SectionContent = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px;
`;

// ── Empty section ───────────────────────────────────────────────────────

const EmptySection = styled.div<{ accentColor: string }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border: 1px dashed color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 30%, ${ThemeColors.OUTLINE_VARIANT});
    border-radius: 4px;
`;

const EmptySectionLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const EmptySectionLabel = styled.span`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.5;
`;


// ── Construct chip ──────────────────────────────────────────────────────

const ConstructItem = styled.div<{ accentColor: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 10px;
    border: 1px solid color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 30%, transparent);
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE};
    background-color: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 10%, transparent);
    &:hover {
        background-color: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 20%, transparent);
        border-color: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 50%, transparent);
    }
    &:hover .delete-btn {
        display: flex;
    }
`;

const ConstructItemIcon = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    > div:first-child {
        width: 14px;
        height: 14px;
        font-size: 14px;
    }
`;

const ConstructItemName = styled.span`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 160px;
`;

const HighlightMatch = styled.span`
    font-weight: 700;
    text-decoration: underline;
    text-decoration-color: ${ThemeColors.PRIMARY};
    text-underline-offset: 2px;
`;

const DeleteButton = styled.div`
    display: none;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.6;
    &:hover {
        color: ${ThemeColors.ERROR};
        opacity: 1;
    }
`;

// ── Config ──────────────────────────────────────────────────────────────

interface SectionConfig {
    key: DIRECTORY_MAP;
    title: string;
    icon: string;
    emptyMessage: string;
    accentColor: string;
}

const SECTIONS: SectionConfig[] = [
    {
        key: DIRECTORY_MAP.CONNECTION,
        title: "Connections",
        icon: "bi-connection",
        emptyMessage: "No connections yet",
        accentColor: "var(--vscode-charts-blue)",
    },
    {
        key: DIRECTORY_MAP.TYPE,
        title: "Types",
        icon: "bi-type",
        emptyMessage: "No types yet",
        accentColor: "var(--vscode-charts-purple)",
    },
    {
        key: DIRECTORY_MAP.FUNCTION,
        title: "Functions",
        icon: "bi-function",
        emptyMessage: "No functions yet",
        accentColor: "var(--vscode-charts-green)",
    },
    {
        key: DIRECTORY_MAP.NP_FUNCTION,
        title: "Natural Functions",
        icon: "bi-ai-function",
        emptyMessage: "No natural functions yet",
        accentColor: "var(--vscode-charts-orange)",
    },
    {
        key: DIRECTORY_MAP.DATA_MAPPER,
        title: "Data Mappers",
        icon: "dataMapper",
        emptyMessage: "No data mappers yet",
        accentColor: "var(--vscode-charts-red)",
    },
    {
        key: DIRECTORY_MAP.CONFIGURABLE,
        title: "Configurations",
        icon: "bi-config",
        emptyMessage: "No configurations yet",
        accentColor: "var(--vscode-charts-yellow)",
    },
];

// ── Helpers ─────────────────────────────────────────────────────────────

function highlightName(name: string, query: string) {
    if (!query) {
        return <>{name}</>;
    }
    const idx = name.toLowerCase().indexOf(query);
    if (idx === -1) {
        return <>{name}</>;
    }
    return (
        <>
            {name.slice(0, idx)}
            <HighlightMatch>{name.slice(idx, idx + query.length)}</HighlightMatch>
            {name.slice(idx + query.length)}
        </>
    );
}

// ── Component ───────────────────────────────────────────────────────────

interface LibraryOverviewProps {
    projectStructure: ProjectStructure;
}

export function LibraryOverview(props: LibraryOverviewProps) {
    const { projectStructure } = props;
    const { rpcClient } = useRpcContext();
    const [collapsedSections, setCollapsedSections] = useState<Set<DIRECTORY_MAP>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    const isSearching = searchQuery.trim().length > 0;

    const toggleSection = (key: DIRECTORY_MAP) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const scrollToSection = (key: DIRECTORY_MAP) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
        setTimeout(() => {
            document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
    };

    const handleAdd = (key: DIRECTORY_MAP) => {
        if (key === DIRECTORY_MAP.CONNECTION) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.AddConnectionWizard },
                isPopup: true,
            });
        } else if (key === DIRECTORY_MAP.TYPE) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.TypeDiagram, addType: true },
            });
        } else if (key === DIRECTORY_MAP.FUNCTION) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.BIFunctionForm },
            });
        } else if (key === DIRECTORY_MAP.NP_FUNCTION) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.BINPFunctionForm },
            });
        } else if (key === DIRECTORY_MAP.DATA_MAPPER) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.BIDataMapperForm },
            });
        } else if (key === DIRECTORY_MAP.CONFIGURABLE) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.AddConfigVariables },
            });
        }
    };

    const handleItemClick = (key: DIRECTORY_MAP, item: ProjectStructureArtifactResponse) => {
        if (key === DIRECTORY_MAP.CONNECTION) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.EditConnectionWizard,
                    identifier: item.name,
                },
                isPopup: true,
            });
        } else if (key === DIRECTORY_MAP.TYPE) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.TypeDiagram,
                    documentUri: item.path,
                    position: item.position,
                },
            });
        } else if (key === DIRECTORY_MAP.DATA_MAPPER) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.DataMapper,
                    documentUri: item.path,
                    position: item.position,
                },
            });
        } else if (key === DIRECTORY_MAP.CONFIGURABLE) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.ViewConfigVariables },
            });
        } else if (item.position && item.path) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { documentUri: item.path, position: item.position },
            });
        }
    };

    const handleDelete = (item: ProjectStructureArtifactResponse) => {
        if (!item.position || !item.path) {
            return;
        }
        rpcClient.getBIDiagramRpcClient().deleteByComponentInfo({
            filePath: item.path,
            component: {
                name: item.name,
                filePath: item.path,
                startLine: item.position.startLine,
                startColumn: item.position.startColumn,
                endLine: item.position.endLine,
                endColumn: item.position.endColumn,
            },
        });
    };

    const dirMap = projectStructure.directoryMap as Record<string, ProjectStructureArtifactResponse[]>;
    const query = searchQuery.trim().toLowerCase();

    const sectionsWithItems = useMemo(() => {
        return SECTIONS.map((section) => {
            const allItems: ProjectStructureArtifactResponse[] = dirMap[section.key] ?? [];
            const filteredItems = isSearching
                ? allItems.filter((item) => item.name.toLowerCase().includes(query))
                : allItems;
            return { section, allItems, filteredItems };
        });
    }, [dirMap, query, isSearching]);

    const populatedSections = sectionsWithItems.filter((s) => s.allItems.length > 0);
    const emptySections = sectionsWithItems.filter((s) => s.allItems.length === 0);
    const hasAnyResults = isSearching && sectionsWithItems.some((s) => s.filteredItems.length > 0);

    return (
        <SectionsContainer>
            <Toolbar>
                <SearchBar>
                    <SearchIcon>
                        <Codicon name="search" iconSx={{ fontSize: 14 }} />
                    </SearchIcon>
                    <SearchInput
                        ref={searchRef}
                        type="text"
                        placeholder="Search constructs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                        <ClearButton onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}>
                            <Codicon name="close" iconSx={{ fontSize: 14 }} />
                        </ClearButton>
                    )}
                </SearchBar>
                {!isSearching && (
                    <SummaryBar>
                        {SECTIONS.map((section) => {
                            const count = (dirMap[section.key] ?? []).length;
                            return (
                                <SummaryBadge
                                    key={section.key}
                                    accentColor={section.accentColor}
                                    active={count > 0}
                                    onClick={() => count > 0 ? scrollToSection(section.key) : handleAdd(section.key)}
                                >
                                    <Icon name={section.icon} sx={{ fontSize: 12, width: 12, height: 12 }} />
                                    {section.title}
                                    <BadgeCount>{count}</BadgeCount>
                                </SummaryBadge>
                            );
                        })}
                    </SummaryBar>
                )}
            </Toolbar>

            {isSearching && !hasAnyResults && (
                <NoResults>No constructs matching "{searchQuery.trim()}"</NoResults>
            )}

            {/* Populated sections */}
            {populatedSections.map(({ section, allItems, filteredItems }) => {
                if (isSearching && filteredItems.length === 0) {
                    return null;
                }

                const displayItems = isSearching ? filteredItems : allItems;
                const isExpanded = isSearching || !collapsedSections.has(section.key);

                return (
                    <Section key={section.key} id={`section-${section.key}`}>
                        <SectionHeader
                            accentColor={section.accentColor}
                            isExpanded={isExpanded}
                            clickable={!isSearching}
                            onClick={!isSearching ? () => toggleSection(section.key) : undefined}
                        >
                            <SectionHeaderLeft>
                                {!isSearching && (
                                    <ChevronIcon isExpanded={isExpanded}>
                                        <Codicon name="chevron-down" iconSx={{ fontSize: 14 }} />
                                    </ChevronIcon>
                                )}
                                <Icon name={section.icon} />
                                <SectionTitle>{section.title}</SectionTitle>
                                <ItemCount>
                                    ({isSearching ? `${filteredItems.length}/${allItems.length}` : allItems.length})
                                </ItemCount>
                            </SectionHeaderLeft>
                            {!isSearching && (
                                <Button
                                    appearance="icon"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        handleAdd(section.key);
                                    }}
                                    buttonSx={{ padding: "2px 8px" }}
                                >
                                    <Codicon name="add" sx={{ marginRight: 4 }} /> Add
                                </Button>
                            )}
                        </SectionHeader>
                        {isExpanded && (
                            <SectionContent>
                                {displayItems.map((item) => (
                                    <ConstructItem
                                        key={item.id}
                                        accentColor={section.accentColor}
                                        onClick={() => handleItemClick(section.key, item)}
                                    >
                                        <ConstructItemIcon>
                                            <Icon name={section.icon} />
                                        </ConstructItemIcon>
                                        <ConstructItemName>
                                            {highlightName(item.name, query)}
                                        </ConstructItemName>
                                        {item.position && item.path && (
                                            <DeleteButton
                                                className="delete-btn"
                                                onClick={(e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    handleDelete(item);
                                                }}
                                            >
                                                <Codicon name="trash" iconSx={{ fontSize: 14 }} />
                                            </DeleteButton>
                                        )}
                                    </ConstructItem>
                                ))}
                            </SectionContent>
                        )}
                    </Section>
                );
            })}

            {/* Empty sections — shown only when not searching */}
            {!isSearching && emptySections.map(({ section }) => (
                <EmptySection
                    key={section.key}
                    accentColor={section.accentColor}
                >
                    <EmptySectionLeft>
                        <Icon name={section.icon} />
                        <EmptySectionLabel>{section.emptyMessage}</EmptySectionLabel>
                    </EmptySectionLeft>
                    <Button
                        appearance="icon"
                        onClick={() => handleAdd(section.key)}
                        buttonSx={{ padding: "2px 8px" }}
                    >
                        <Codicon name="add" sx={{ marginRight: 4 }} /> Add
                    </Button>
                </EmptySection>
            ))}
        </SectionsContainer>
    );
}

export default LibraryOverview;
