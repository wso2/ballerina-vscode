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

import { useEffect, useMemo, useState } from "react";
import {
    DIRECTORY_MAP,
    EVENT_TYPE,
    MACHINE_VIEW,
    ProjectStructure,
    ProjectStructureArtifactResponse,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, Icon, ThemeColors, Typography } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

// ── Layout ──────────────────────────────────────────────────────────────

const SectionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding: 16px;
    width: 100%;
`;

// ── Section panel ────────────────────────────────────────────────────────

const SectionPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
`;

const SectionInfo = styled.div`
    display: flex;
    flex-direction: column;
`;

const SectionTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SectionTitle = styled(Typography)`
    margin: 4px 0;
    font-size: 16px;
`;

const ItemCount = styled.span`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.6;
`;

const SectionDescription = styled.p`
    margin: 0;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

// ── Card grid ────────────────────────────────────────────────────────────

const CardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    width: 100%;
`;

// ── Artifact card (custom variant — supports ReactNode title for search highlight) ──

const ArtifactCardRoot = styled.div`
    padding: 12px;
    border-radius: 4px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    background-color: ${ThemeColors.SURFACE_DIM};
    cursor: pointer;
    &:hover {
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
        border-color: ${ThemeColors.HIGHLIGHT};
    }
`;

const ArtifactCardInner = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
`;

const ArtifactCardIconContainer = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    > div:first-child {
        width: 24px;
        height: 24px;
        font-size: 24px;
    }
`;

const ArtifactCardContent = styled.div`
    flex: 1;
    overflow: hidden;
`;

const ArtifactCardTitle = styled.p`
    font-size: 13px;
    font-weight: bold;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const HighlightMatch = styled.span`
    font-weight: 700;
    text-decoration: underline;
    text-decoration-color: ${ThemeColors.PRIMARY};
    text-underline-offset: 2px;
`;

// ── Empty-section "Add" card ─────────────────────────────────────────────

const AddArtifactCard = styled.div`
    padding: 12px;
    border-radius: 4px;
    border: 1px dashed ${ThemeColors.OUTLINE_VARIANT};
    background-color: transparent;
    cursor: pointer;
    opacity: 0.6;
    &:hover {
        opacity: 1;
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
        border-color: ${ThemeColors.PRIMARY};
        border-style: solid;
    }
`;

// ── Card wrapper with hover delete overlay ───────────────────────────────

const CardWrapper = styled.div`
    position: relative;
    &:hover .delete-overlay {
        display: flex;
    }
`;

const DeleteOverlay = styled.div`
    display: none;
    position: absolute;
    top: 8px;
    right: 8px;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 4px;
    cursor: pointer;
    color: ${ThemeColors.ON_SURFACE};
    background: var(--vscode-sideBar-background);
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    opacity: 0.9;
    z-index: 1;
    &:hover {
        color: ${ThemeColors.ERROR};
        background: color-mix(in srgb, ${ThemeColors.ERROR} 10%, var(--vscode-sideBar-background));
        border-color: color-mix(in srgb, ${ThemeColors.ERROR} 40%, transparent);
        opacity: 1;
    }
`;

// ── No-results label (search only) ───────────────────────────────────────

const NoResultsLabel = styled.span`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.6;
`;

// ── Config ──────────────────────────────────────────────────────────────

interface SectionConfig {
    key: DIRECTORY_MAP;
    title: string;
    icon: string;
    description: string;
    addLabel: string;
    addTooltip: string;
    /** Hides the section unless isNPSupported && experimentalEnabled */
    npOnly?: boolean;
}

const SECTIONS: SectionConfig[] = [
    {
        key: DIRECTORY_MAP.TYPE,
        title: "Types",
        icon: "bi-type",
        description: "Custom data types defined in your library.",
        addLabel: "Add a Type",
        addTooltip: "Add New Type",
    },
    {
        key: DIRECTORY_MAP.FUNCTION,
        title: "Functions",
        icon: "bi-function",
        description: "Reusable functions exposed by your library.",
        addLabel: "Add a Function",
        addTooltip: "Add New Function",
    },
    {
        key: DIRECTORY_MAP.DATA_MAPPER,
        title: "Data Mappers",
        icon: "dataMapper",
        description: "Data transformation mappings for your library.",
        addLabel: "Add a Data Mapper",
        addTooltip: "Add New Data Mapper",
    },
    {
        key: DIRECTORY_MAP.CONNECTION,
        title: "Connections",
        icon: "bi-connection",
        description: "Client connections to external services.",
        addLabel: "Add a Connection",
        addTooltip: "Add New Connection",
    },
    {
        key: DIRECTORY_MAP.CONFIGURABLE,
        title: "Configurations",
        icon: "bi-config",
        description: "Configurable values exposed by your library.",
        addLabel: "Add a Configuration",
        addTooltip: "Add New Configuration",
    },
    {
        key: DIRECTORY_MAP.NP_FUNCTION,
        title: "Natural Functions",
        icon: "bi-ai-function",
        description: "AI-powered functions written in natural language.",
        addLabel: "Add a Natural Function",
        addTooltip: "Add New Natural Function",
        npOnly: true,
    },
];

// ── Inline ArtifactCard component ────────────────────────────────────────

interface ArtifactCardProps {
    icon: React.ReactNode;
    title: string;
    query: string;
    onClick: () => void;
}

function ArtifactCard({ icon, title, query, onClick }: ArtifactCardProps) {
    const highlightedTitle = useMemo(() => {
        if (!query) return <>{title}</>;
        const idx = title.toLowerCase().indexOf(query);
        if (idx === -1) return <>{title}</>;
        return (
            <>
                {title.slice(0, idx)}
                <HighlightMatch>{title.slice(idx, idx + query.length)}</HighlightMatch>
                {title.slice(idx + query.length)}
            </>
        );
    }, [title, query]);

    return (
        <ArtifactCardRoot onClick={onClick}>
            <ArtifactCardInner>
                <ArtifactCardIconContainer>
                    {icon}
                </ArtifactCardIconContainer>
                <ArtifactCardContent>
                    <ArtifactCardTitle>{highlightedTitle}</ArtifactCardTitle>
                </ArtifactCardContent>
            </ArtifactCardInner>
        </ArtifactCardRoot>
    );
}

// ── Component ───────────────────────────────────────────────────────────

interface LibraryOverviewProps {
    projectStructure: ProjectStructure;
    searchQuery: string;
    isNPSupported: boolean;
}

export function LibraryOverview(props: LibraryOverviewProps) {
    const { projectStructure, searchQuery, isNPSupported } = props;
    const { rpcClient } = useRpcContext();
    const [experimentalEnabled, setExperimentalEnabled] = useState(false);

    useEffect(() => {
        rpcClient.getCommonRpcClient().experimentalEnabled().then(setExperimentalEnabled);
    }, [rpcClient]);

    const isSearching = searchQuery.trim().length > 0;
    const query = searchQuery.trim().toLowerCase();

    const showNaturalFunctions = isNPSupported && experimentalEnabled;

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

    const sectionsWithItems = useMemo(() => {
        return SECTIONS
            .filter((section) => !section.npOnly || showNaturalFunctions)
            .map((section) => {
                const allItems: ProjectStructureArtifactResponse[] = dirMap[section.key] ?? [];
                const filteredItems = isSearching
                    ? allItems.filter((item) => item.name.toLowerCase().includes(query))
                    : allItems;
                return { section, allItems, filteredItems };
            });
    }, [dirMap, query, isSearching, showNaturalFunctions]);

    return (
        <SectionsContainer>
            {sectionsWithItems.map(({ section, allItems, filteredItems }) => {
                const displayItems = isSearching ? filteredItems : allItems;
                const hasItems = displayItems.length > 0;
                const isEmptyBeforeSearch = allItems.length === 0;

                return (
                    <SectionPanel key={section.key} id={`section-${section.key}`}>
                        <SectionHeader>
                            <SectionInfo>
                                <SectionTitleRow>
                                    <SectionTitle variant="h2">{section.title}</SectionTitle>
                                    {allItems.length > 0 && (
                                        <ItemCount>
                                            {isSearching
                                                ? `${filteredItems.length}/${allItems.length}`
                                                : allItems.length}
                                        </ItemCount>
                                    )}
                                </SectionTitleRow>
                                <SectionDescription>{section.description}</SectionDescription>
                            </SectionInfo>
                            <span title={section.addTooltip}>
                                <Button
                                    appearance="icon"
                                    onClick={() => handleAdd(section.key)}
                                    buttonSx={{ padding: "4px 8px" }}
                                >
                                    <Codicon name="add" sx={{ marginRight: 4 }} /> Add
                                </Button>
                            </span>
                        </SectionHeader>

                        <CardGrid>
                            {hasItems && displayItems.map((item) => (
                                <CardWrapper key={item.id}>
                                    <ArtifactCard
                                        icon={<Icon name={section.icon} />}
                                        title={item.name}
                                        query={query}
                                        onClick={() => handleItemClick(section.key, item)}
                                    />
                                    {item.position && item.path && (
                                        <DeleteOverlay
                                            className="delete-overlay"
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                handleDelete(item);
                                            }}
                                        >
                                            <Codicon name="trash" iconSx={{ fontSize: 16 }} />
                                        </DeleteOverlay>
                                    )}
                                </CardWrapper>
                            ))}

                            {/* Show dashed Add card only when not searching and section is empty */}
                            {isEmptyBeforeSearch && !isSearching && (
                                <AddArtifactCard onClick={() => handleAdd(section.key)}>
                                    <ArtifactCardInner>
                                        <ArtifactCardIconContainer>
                                            <Codicon name="add" iconSx={{ fontSize: 24, width: 24, height: 24 }} />
                                        </ArtifactCardIconContainer>
                                        <ArtifactCardContent>
                                            <ArtifactCardTitle>{section.addLabel}</ArtifactCardTitle>
                                        </ArtifactCardContent>
                                    </ArtifactCardInner>
                                </AddArtifactCard>
                            )}

                            {/* No search results */}
                            {isSearching && !hasItems && (
                                <NoResultsLabel>
                                    No matching {section.title.toLowerCase()}
                                </NoResultsLabel>
                            )}
                        </CardGrid>
                    </SectionPanel>
                );
            })}
        </SectionsContainer>
    );
}

export default LibraryOverview;
