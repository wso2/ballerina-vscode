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

import React, { useState, useMemo } from 'react';
import { Type } from '@wso2/ballerina-core';
import { ThemeColors, SearchBox, Typography, Codicon, Icon, Tooltip } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';

const ViewWrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
`;

const Container = styled.div`
    padding: 0 20px;
    width: 100%;
`;

const TopBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 10;
`;

const BodyText = styled.p`
    font-size: 14px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0 0 8px;
    opacity: 0.8;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin-top: 32px;
    width: 100%;
`;

const StyledSearchInput = styled(SearchBox)`
    height: 30px;
`;

const ListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
    height: calc(100vh - 280px);
    overflow-y: scroll;
    padding-top: 8px;
`;

const GridContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px;
    width: 100%;
`;

const NodeCard = styled.div`
    gap: 16px;
    max-width: 42rem;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    background-color: ${ThemeColors.SURFACE_DIM};
    cursor: pointer;
    &:hover {
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
        border: 1px solid ${ThemeColors.HIGHLIGHT};
    }
`;

const CardContainer = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
`;

const IconContainer = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-top: 1px;
`;

const ContentContainer = styled.div`
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const NodeTitle = styled.p`
    font-size: 13px;
    color: ${ThemeColors.ON_SURFACE};
    font-weight: bold;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
`;

const NodeTypeBadge = styled.span`
    padding: 2px 0px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
    color: ${ThemeColors.PRIMARY};
    margin-top: 4px;
    display: inline-block;
`;

const EmptyState = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    flex-direction: column;
    gap: 20px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    
    .codicon {
        font-size: 24px;
        margin-bottom: 0.5rem;
    }
`;

interface NodeSelectorProps {
    nodes: Type[];
    onNodeSelect: (nodeId: string) => void;
}

export function NodeSelector({ nodes, onNodeSelect }: NodeSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort nodes based on search term
    const filteredNodes = useMemo(() => {
        let filtered = nodes;

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = nodes.filter(node =>
                node.name.toLowerCase().includes(term) ||
                node.metadata?.description?.toLowerCase().includes(term)
            );
        }

        // Sort alphabetically
        return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [nodes, searchTerm]);

    const handleOnSearch = (text: string) => {
        setSearchTerm(text);
    };

    const formatNodeType = (nodeType: string) => {
        return nodeType.toLowerCase().charAt(0).toUpperCase() + nodeType.toLowerCase().slice(1);
    };

    return (
        <ViewWrapper>
            <Container>
                <TopBar>
                    <Typography variant="h2">Select a Type</Typography>
                </TopBar>

                <BodyText>
                    {nodes.length} types detected. Select a type for a focused dependency diagram.
                </BodyText>

                <Row>
                    <StyledSearchInput
                        value={searchTerm}
                        placeholder="Search types"
                        autoFocus={true}
                        onChange={handleOnSearch}
                        size={60}
                        sx={{ width: "100%" }}
                    />
                </Row>

                <ListContainer>
                    {filteredNodes.length === 0 ? (
                        <EmptyState>
                            <Codicon name="search" />
                            <div>No types found</div>
                        </EmptyState>
                    ) : (
                        <GridContainer>
                            {filteredNodes.map((node) => (
                                <NodeCard
                                    key={node.name}
                                    onClick={() => onNodeSelect(node.name)}
                                >
                                    <CardContainer>
                                        <IconContainer>
                                            <Icon name="bi-type" iconSx={{
                                                color: ThemeColors.ON_SURFACE_VARIANT,
                                                fontSize: '14px'
                                            }} />
                                        </IconContainer>
                                        <ContentContainer>
                                            <Tooltip content={node.name} position="top">
                                                <NodeTitle>
                                                    {node.name}
                                                </NodeTitle>
                                            </Tooltip>
                                            <NodeTypeBadge>
                                                {formatNodeType(node.codedata?.node || 'Type')}
                                            </NodeTypeBadge>
                                        </ContentContainer>
                                    </CardContainer>
                                </NodeCard>
                            ))}
                        </GridContainer>
                    )}
                </ListContainer>
            </Container>
        </ViewWrapper>
    );
}
