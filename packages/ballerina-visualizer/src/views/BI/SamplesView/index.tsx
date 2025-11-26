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

import React, { useState, useMemo, useEffect } from "react";
import { EVENT_TYPE, MACHINE_VIEW, SampleDownloadRequest } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import styled from "@emotion/styled";
import { Button, Codicon, Icon, ThemeColors, Typography } from "@wso2/ui-toolkit";
import { IconButton } from "../ImportIntegration/styles";


const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 80px 120px;
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
`;

const SamplesSubtitle = styled.p`
    font-size: 14px;
    line-height: 1.4;
    font-weight: 400;
    color: var(--vscode-descriptionForeground);
    margin: 0 0 24px 0;
`;

const SearchAndFilterContainer = styled.div`
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    align-items: center;
    flex-wrap: wrap;
`;

const SearchBar = styled.div`
    flex: 1;
    min-width: 200px;
    position: relative;
    display: flex;
    align-items: center;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 8px 12px 8px 36px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 2px;
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
`;

const CategoryFilter = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CategoryLabel = styled.label`
    font-size: 13px;
    color: var(--vscode-foreground);
    white-space: nowrap;
`;

const CategorySelect = styled.select`
    padding: 8px 12px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 2px;
    color: var(--vscode-input-foreground);
    font-size: 13px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    
    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
`;

const SamplesGrid = styled.div`
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px 20px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    overflow-y: auto;
    max-height: calc(100vh - 300px);
    min-height: 400px;
    
    @media (max-width: 1200px) {
        grid-template-columns: repeat(3, 1fr);
    }
    
    @media (max-width: 900px) {
        grid-template-columns: repeat(2, 1fr);
    }
    
    @media (max-width: 600px) {
        grid-template-columns: 1fr;
    }
`;

const SampleCard = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    min-height: 200px;
    
    &:hover {
        border-color: ${ThemeColors.PRIMARY};
        box-shadow: 0 0 0 2px ${ThemeColors.PRIMARY_CONTAINER};
    }
`;

interface SampleIconContainerProps {
    iconColor?: string;
}

const SampleIconContainer = styled.div<SampleIconContainerProps>`
    width: 48px;
    height: 48px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    background-color: ${(props: SampleIconContainerProps) => props.iconColor || ThemeColors.SURFACE_CONTAINER};
    flex-shrink: 0;
    > div {
        width: unset;
        height: unset;
    }
`;

const SampleCardTitle = styled.h3`
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: var(--vscode-foreground);
    line-height: 1.3;
`;

const SampleCardDescription = styled.p`
    font-size: 13px;
    line-height: 1.4;
    margin: 0 0 16px 0;
    color: var(--vscode-descriptionForeground);
    flex: 1;
`;

const SampleDownloadButton = styled(Button)`
    height: 32px;
    font-size: 13px;
    font-weight: 400;
    border-radius: 2px;
    align-self: flex-start;
    margin-top: auto;
`;

interface Sample {
    id: string;
    category: string;
    title: string;
    description: string;
    icon: string;
    zipUrl: string;
    isEnabled: boolean;
}

// Map icon names from JSON to codicon names
const ICON_MAP: Record<string, string> = {
    automation: "bi-task",
    ai: "bi-ai-agent",
    file: "file",
    api: "bi-globe",
    integration: "Event",
    default: "bi-globe"
};

// Map categories to icon colors
const CATEGORY_COLOR_MAP: Record<string, string> = {
    "Automation": "#4A90E2",
    "File Integration": "#FF8C42",
    "Integration": "#52C41A",
    "AI Agent": "#9C27B0",
    "Integration as API": "#00BCD4",
    "Default": "#4A90E2"
};

interface SamplesViewProps {
    // Samples view props are not needed
}

export function SamplesView() {
    const { rpcClient } = useRpcContext();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [samples, setSamples] = useState<Sample[]>([]);
    const [isLoadingSamples, setIsLoadingSamples] = useState(true);
    const [samplesError, setSamplesError] = useState<string | null>(null);

    // Fetch samples from GitHub
    useEffect(() => {
        const fetchSamples = async () => {
            try {
                setIsLoadingSamples(true);
                setSamplesError(null);
                const response = await fetch(
                    "https://raw.githubusercontent.com/wso2/integration-samples/refs/heads/main/ballerina-integrator/samples/meta.json"
                );
                if (!response.ok) {
                    throw new Error(`Failed to fetch samples at the moment. Please try again later.`);
                }
                const data: Sample[] = await response.json();
                // Filter only enabled samples
                const enabledSamples = data.filter((sample) => sample.isEnabled);
                setSamples(enabledSamples);
            } catch (error) {
                rpcClient.getCommonRpcClient().openExternalUrl({
                    url: "https://bi.docs.wso2.com/integration-guides/integration-as-api/message-transformation/",
                });
                console.error("Error fetching samples:", error);
                setSamplesError(error instanceof Error ? error.message : "Failed to load samples");
            } finally {
                setIsLoadingSamples(false);
            }
        };

        fetchSamples();
    }, []);

    const categories = useMemo(() => {
        const uniqueCategories = Array.from(new Set(samples.map((s) => s.category)));
        return ["All", ...uniqueCategories];
    }, [samples]);

    const filteredSamples = useMemo(() => {
        return samples.filter((sample) => {
            const matchesSearch =
                sample.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sample.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "All" || sample.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory, samples]);

    const handleDownload = async (sampleId: string) => {
        try {
            const request: SampleDownloadRequest = {
                zipFileName: sampleId
            };
            await rpcClient.getCommonRpcClient().downloadSelectedSampleFromGithub(request);
        } catch (error) {
            console.error("Error downloading sample:", error);
        }
    };

    const handleBack = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIWelcome,
            },
        });
    };

    return (
        <FormContainer>
            <TitleContainer>
                <IconButton onClick={handleBack}>
                    <Icon name="bi-arrow-back" iconSx={{ color: "var(--vscode-foreground)" }} />
                </IconButton>
                <Typography variant="h2">Samples</Typography>
            </TitleContainer>
            <SamplesSubtitle>Choose a sample from the list below to get started.</SamplesSubtitle>

            <SearchAndFilterContainer>
                <SearchBar>
                    <SearchIcon>
                        <Codicon name="search" iconSx={{ fontSize: 16 }} />
                    </SearchIcon>
                    <SearchInput
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </SearchBar>
                <CategoryFilter>
                    <CategoryLabel>Category:</CategoryLabel>
                    <CategorySelect
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </CategorySelect>
                </CategoryFilter>
            </SearchAndFilterContainer>

            {isLoadingSamples ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--vscode-descriptionForeground)" }}>
                    Loading samples...
                </div>
            ) : samplesError ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--vscode-errorForeground)" }}>
                    {samplesError}
                </div>
            ) : filteredSamples.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--vscode-descriptionForeground)" }}>
                    No samples found matching your search criteria.
                </div>
            ) : (
                <SamplesGrid>
                    {filteredSamples.map((sample) => {
                        const iconName = ICON_MAP[sample.icon] || ICON_MAP.default;
                        const iconColor = CATEGORY_COLOR_MAP[sample.category] || CATEGORY_COLOR_MAP.Default;
                        return (
                            <SampleCard key={sample.id} onClick={() => handleDownload(sample.id)}>
                                <SampleIconContainer iconColor={iconColor}>
                                    <Icon name={iconName} iconSx={{ fontSize: 24, color: "#FFFFFF" }} />
                                </SampleIconContainer>
                                <SampleCardTitle>{sample.title}</SampleCardTitle>
                                <SampleCardDescription>{sample.description}</SampleCardDescription>
                                <SampleDownloadButton
                                    appearance="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(sample.id);
                                    }}
                                >
                                    Download
                                </SampleDownloadButton>
                            </SampleCard>
                        );
                    })}
                </SamplesGrid>
            )}
        </FormContainer>
    );
}
