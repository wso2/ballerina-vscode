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
    categoryId: number;
    sampleId: number;
    title: string;
    description: string;
    identifier: string;
    isEnabled: boolean;
}

interface Category {
    id: number;
    title: string;
    icon: string;
}

// Map category titles to codicon names
const ICON_MAP: Record<string, string> = {
    "Automation": "bi-task",
    "AI Agent": "bi-ai-agent",
    "File Integration": "file",
    "Integration as API": "bi-globe",
    "Integration": "Event",
    "Default": "bi-globe"
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

export function SamplesView() {
    const { rpcClient } = useRpcContext();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [samples, setSamples] = useState<Sample[]>([]);
    const [filteredSamples, setFilteredSamples] = useState<Sample[]>([]);
    const [filteredSamplesCopy, setFilteredSamplesCopy] = useState<Sample[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingSamples, setIsLoadingSamples] = useState(true);
    const [samplesError, setSamplesError] = useState<string | null>(null);

    // Fetch samples from GitHub
    useEffect(() => {
        const fetchSamples = async () => {
            try {
                setIsLoadingSamples(true);
                setSamplesError(null);
                const response = await fetch(
                    "https://devant-cdn.wso2.com/bi-samples/v1/info.json"
                );
                if (!response.ok) {
                    throw new Error(`Failed to fetch samples at the moment. Please try again later.`);
                }

                const data = await response.json();

                // Parse categories from tuple format: [id, title, icon]
                const categoriesList: Category[] = [];
                if (data.categories && Array.isArray(data.categories)) {
                    for (let i = 0; i < data.categories.length; i++) {
                        const cat: Category = {
                            id: data.categories[i][0],
                            title: data.categories[i][1],
                            icon: data.categories[i][2]
                        };
                        categoriesList.push(cat);
                    }
                }

                // Parse samples from tuple format: [categoryId, sampleId, title, description, identifier, isEnabled]
                const samplesList: Sample[] = [];
                if (data.Samples && Array.isArray(data.Samples)) {
                    for (let i = 0; i < data.Samples.length; i++) {
                        const sample: Sample = {
                            categoryId: data.Samples[i][0],
                            sampleId: data.Samples[i][1],
                            title: data.Samples[i][2],
                            description: data.Samples[i][3],
                            identifier: data.Samples[i][4],
                            isEnabled: data.Samples[i][5]
                        };
                        // Filter only enabled samples
                        if (sample.isEnabled) {
                            samplesList.push(sample);
                        }
                    }
                }

                // Add "All" category at the beginning
                const categoriesWithAll = [{ id: 0, title: "All", icon: "" }, ...categoriesList];
                setCategories(categoriesWithAll);
                setSamples(samplesList);
                setFilteredSamples(samplesList);
                setFilteredSamplesCopy(samplesList);
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
    }, [rpcClient]);

    // Handle category filter change
    useEffect(() => {
        if (selectedCategory === "All") {
            setFilteredSamples(samples);
            setFilteredSamplesCopy(samples);
        } else {
            const categoryId = categories.find(cat => cat.title === selectedCategory)?.id;
            if (categoryId !== undefined) {
                const filteredData = samples.filter(sample => sample.categoryId === categoryId);
                setFilteredSamples(filteredData);
                setFilteredSamplesCopy(filteredData);
            }
        }
    }, [selectedCategory, samples, categories]);

    // Handle search filter
    useEffect(() => {
        if (searchQuery !== "") {
            const filteredData = filteredSamplesCopy.filter(sample =>
                sample.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sample.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredSamples(filteredData);
        } else {
            setFilteredSamples(filteredSamplesCopy);
        }
    }, [searchQuery, filteredSamplesCopy]);

    const handleDownload = async (identifier: string) => {
        try {
            const request: SampleDownloadRequest = {
                zipFileName: identifier
            };
            await rpcClient.getCommonRpcClient().downloadSelectedSampleFromGithub(request);
        } catch (error) {
            console.error("Error downloading sample:", error);
            rpcClient.getCommonRpcClient().showErrorMessage({
                message: `Error while downloading the sample: ${error instanceof Error ? error.message : String(error)}`
            });
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
                            <option key={category.id} value={category.title}>
                                {category.title}
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
                    {filteredSamples.sort((a, b) => a.sampleId - b.sampleId).map((sample) => {
                        const category = categories.find(cat => cat.id === sample.categoryId);
                        const categoryTitle = category?.title || "Default";
                        const iconName = ICON_MAP[categoryTitle] || ICON_MAP.Default;
                        const iconColor = CATEGORY_COLOR_MAP[categoryTitle] || CATEGORY_COLOR_MAP.Default;
                        return (
                            <SampleCard key={sample.identifier} onClick={() => handleDownload(sample.identifier)}>
                                <SampleIconContainer iconColor={iconColor}>
                                    <Icon name={iconName} iconSx={{ fontSize: 24, color: "#FFFFFF" }} />
                                </SampleIconContainer>
                                <SampleCardTitle>{sample.title}</SampleCardTitle>
                                <SampleCardDescription>{sample.description}</SampleCardDescription>
                                <SampleDownloadButton
                                    appearance="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(sample.identifier);
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
