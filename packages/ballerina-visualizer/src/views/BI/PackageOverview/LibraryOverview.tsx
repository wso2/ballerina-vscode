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

import { useMemo, useState } from "react";
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

// ── Layout ──────────────────────────────────────────────────────────────

const SectionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    width: 100%;
`;

const ColumnsLayout = styled.div`
    display: flex;
    gap: 12px;
    align-items: stretch;
`;

const PrimaryColumn = styled.div`
    flex: 2;
    position: relative;
    min-width: 0;
`;

const PrimaryColumnInner = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: stretch;
`;

const SecondaryColumn = styled.div`
    flex: 3;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
`;

// ── Section ─────────────────────────────────────────────────────────────

const Section = styled.div<{ vertical?: boolean }>`
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    overflow: hidden;
    background: var(--vscode-sideBar-background);
    ${(props: { vertical?: boolean }) => props.vertical ? "flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column;" : ""}
`;

const SectionHeader = styled.div<{ accentColor: string }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 12px;
    user-select: none;
    background-color: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 6%, transparent);
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SectionTitle = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: ${ThemeColors.ON_SURFACE};
`;

const ItemCount = styled.span`
    font-size: 11px;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.6;
`;

const SectionContent = styled.div<{ vertical?: boolean }>`
    display: flex;
    flex-wrap: ${(props: { vertical?: boolean }) => props.vertical ? "nowrap" : "wrap"};
    flex-direction: ${(props: { vertical?: boolean }) => props.vertical ? "column" : "row"};
    gap: 6px;
    padding: 12px 12px;
    ${(props: { vertical?: boolean }) => props.vertical ? "flex: 1; overflow-y: auto;" : ""}
`;

// ── Empty state label ────────────────────────────────────────────────────

const EmptySectionLabel = styled.span`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.7;
`;


// ── Construct chip ──────────────────────────────────────────────────────

const ConstructItem = styled.div<{ accentColor: string; fullWidth?: boolean }>`
    display: ${(props: { fullWidth?: boolean }) => props.fullWidth ? "flex" : "inline-flex"};
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 25%, transparent);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: ${(props: { accentColor: string }) => props.accentColor};
    background: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 12%, transparent);
    &:hover {
        background: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 20%, transparent);
        border-color: color-mix(in srgb, ${(props: { accentColor: string }) => props.accentColor} 40%, transparent);
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

const ConstructItemName = styled.span<{ flex?: boolean }>`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    ${(props: { flex?: boolean }) => props.flex ? "flex: 1; min-width: 0;" : "max-width: 160px;"}
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
    opacity: 0.7;
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
    addTooltip: string;
    column: "primary" | "secondary";
}

const SECTIONS: SectionConfig[] = [
    {
        key: DIRECTORY_MAP.TYPE,
        title: "Types",
        icon: "bi-type",
        emptyMessage: "No types yet",
        accentColor: "var(--vscode-charts-purple)",
        addTooltip: "Add New Type",
        column: "primary",
    },
    {
        key: DIRECTORY_MAP.CONFIGURABLE,
        title: "Configurations",
        icon: "bi-config",
        emptyMessage: "No configurations yet",
        accentColor: "var(--vscode-charts-yellow)",
        addTooltip: "Add New Configuration",
        column: "primary",
    },
    {
        key: DIRECTORY_MAP.CONNECTION,
        title: "Connections",
        icon: "bi-connection",
        emptyMessage: "No connections yet",
        accentColor: "var(--vscode-charts-blue)",
        addTooltip: "Add New Connection",
        column: "secondary",
    },
    {
        key: DIRECTORY_MAP.FUNCTION,
        title: "Functions",
        icon: "bi-function",
        emptyMessage: "No functions yet",
        accentColor: "var(--vscode-charts-green)",
        addTooltip: "Add New Function",
        column: "secondary",
    },
    {
        key: DIRECTORY_MAP.NP_FUNCTION,
        title: "Natural Functions",
        icon: "bi-ai-function",
        emptyMessage: "No natural functions yet",
        accentColor: "var(--vscode-charts-orange)",
        addTooltip: "Add New Natural Function",
        column: "secondary",
    },
    {
        key: DIRECTORY_MAP.DATA_MAPPER,
        title: "Data Mappers",
        icon: "dataMapper",
        emptyMessage: "No data mappers yet",
        accentColor: "var(--vscode-charts-lines)",
        addTooltip: "Add New Data Mapper",
        column: "secondary",
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
    searchQuery: string;
}

export function LibraryOverview(props: LibraryOverviewProps) {
    const { projectStructure, searchQuery } = props;
    const { rpcClient } = useRpcContext();

    const isSearching = searchQuery.trim().length > 0;

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

    const primarySections = sectionsWithItems.filter((s) => s.section.column === "primary");
    const secondarySections = sectionsWithItems.filter((s) => s.section.column === "secondary");

    const renderSection = (
        { section, allItems, filteredItems }: typeof sectionsWithItems[number],
        vertical?: boolean,
    ) => {
        const displayItems = isSearching ? filteredItems : allItems;
        const hasItems = displayItems.length > 0;

        return (
            <Section key={section.key} id={`section-${section.key}`} vertical={vertical}>
                <SectionHeader accentColor={section.accentColor}>
                    <SectionHeaderLeft>
                        <Icon name={section.icon} sx={{ fontSize: 18, width: 18, height: 18 }} />
                        <SectionTitle>{section.title}</SectionTitle>
                        {hasItems && (
                            <ItemCount>
                                ({isSearching ? `${filteredItems.length}/${allItems.length}` : allItems.length})
                            </ItemCount>
                        )}
                    </SectionHeaderLeft>
                    <span title={section.addTooltip}>
                        <Button
                            appearance="icon"
                            onClick={() => handleAdd(section.key)}
                            buttonSx={{ padding: "2px 8px" }}
                        >
                            <Codicon name="add" sx={{ marginRight: 4 }} /> Add
                        </Button>
                    </span>
                </SectionHeader>
                {hasItems && (
                    <SectionContent vertical={vertical}>
                        {displayItems.map((item) => (
                            <ConstructItem
                                key={item.id}
                                accentColor={section.accentColor}
                                fullWidth={vertical}
                                onClick={() => handleItemClick(section.key, item)}
                            >
                                <ConstructItemIcon>
                                    <Icon name={section.icon} />
                                </ConstructItemIcon>
                                <ConstructItemName flex={vertical}>
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
                {!hasItems && (
                    <SectionContent vertical={vertical}>
                        <EmptySectionLabel>
                            {isSearching ? `No matching ${section.title.toLowerCase()}` : section.emptyMessage}
                        </EmptySectionLabel>
                    </SectionContent>
                )}
            </Section>
        );
    };

    return (
        <SectionsContainer>
            <ColumnsLayout>
                <PrimaryColumn>
                    <PrimaryColumnInner>
                        {primarySections.map((s) => renderSection(s, true))}
                    </PrimaryColumnInner>
                </PrimaryColumn>
                <SecondaryColumn>
                    {secondarySections.map((s) => renderSection(s))}
                </SecondaryColumn>
            </ColumnsLayout>
        </SectionsContainer>
    );
}

export default LibraryOverview;
