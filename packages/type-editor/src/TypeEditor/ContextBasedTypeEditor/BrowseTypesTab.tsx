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

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Button, TextField, Typography, ProgressRing } from '@wso2/ui-toolkit';
import { TypeHelperCategory, TypeHelperItem } from '../../TypeHelper';
import { Type } from '@wso2/ballerina-core';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
`;

const ContentArea = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    gap: 16px;
    padding-bottom: 16px;
`;

const LabelText = styled(Typography)`
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
`;

const SelectedTypeLabel = styled.div`
    padding: 12px 16px;
    border: 1px solid var(--vscode-editorIndentGuide-background);
    border-radius: 4px;
`;

const SelectedTypeText = styled(Typography)`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const SearchContainer = styled.div`
    width: 100%;
    margin-bottom: 8px;
`;

const CategorySection = styled.div`
    margin-top: 8px;
`;

const TypesContainer = styled.div`
    border: 1px solid var(--vscode-editorIndentGuide-background);
    border-radius: 4px;
    padding: 8px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 40vh;
    overflow: scroll;
`;

const CategoryTitle = styled(Typography)`
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    padding-bottom: 10px;
`;

const TypeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    flex: 1;
`;

const TypeItem = styled.div`
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    background-color: var(--vscode-list-inactiveSelectionBackground);
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    border: 1px solid transparent;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
    }

    &:active {
        background-color: var(--vscode-list-activeSelectionBackground);
    }
`;

const TypeName = styled(Typography)`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-foreground);
    margin-bottom: 4px;
`;

const TypeDescription = styled(Typography)`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const Footer = styled.div`
    display: flex;
    gap: 8px;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    flex: 1;
`;

const EmptyState = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    color: var(--vscode-descriptionForeground);
    flex: 1;
`;

interface BrowseTypesTabProps {
    basicTypes: TypeHelperCategory[];
    importedTypes: TypeHelperCategory[];
    loading?: boolean;
    onSearchTypeHelper: (searchText: string, isType?: boolean) => void;
    onTypeItemClick: (item: TypeHelperItem) => Promise<any>;
    onTypeSelect: (type: Type) => void;
    simpleType?: string;
}

export function BrowseTypesTab(props: BrowseTypesTabProps) {
    const {
        basicTypes,
        importedTypes,
        loading,
        onSearchTypeHelper,
        onTypeItemClick,
        onTypeSelect,
        simpleType
    } = props;

    const [searchText, setSearchText] = useState<string>('');
    const [selectedType, setSelectedType] = useState<TypeHelperItem | null>(null);
    const [isSelecting, setIsSelecting] = useState<boolean>(false);

    // Set initial selected type if simpleType is provided
    useEffect(() => {
        if (simpleType && !selectedType) {
            setSelectedType({ 
                name: simpleType, 
                insertText: simpleType
            } as unknown as TypeHelperItem);
        }
    }, [simpleType]);

    // Trigger search when component mounts
    useEffect(() => {
        onSearchTypeHelper('', true);
    }, []);

    const handleSearchChange = (value: string) => {
        setSearchText(value);
        onSearchTypeHelper(value, true);
    };

    const handleTypeClick = (item: TypeHelperItem) => {
        setSelectedType(item);
    };

    const handleSelectType = async () => {
        if (!selectedType) return;

        setIsSelecting(true);
        try {
            const response = await onTypeItemClick(selectedType);

            // Create a Type object from the selected item
            const type: Type = {
                name: selectedType.name,
                editable: false,
                metadata: {
                    label: selectedType.name,
                    description: selectedType.labelDetails?.description || '',
                },
                codedata: selectedType.codedata as any,
                properties: {},
                members: [],
                includes: []
            };

            onTypeSelect(type);
        } catch (error) {
            console.error('Error selecting type:', error);
        } finally {
            setIsSelecting(false);
        }
    };

    const renderTypeItems = (categories: TypeHelperCategory[]) => {
        if (!categories || categories.length === 0) {
            return null;
        }

        return categories.map((category, categoryIndex) => (
            <CategorySection key={categoryIndex}>
                {category.category && (
                    <CategoryTitle variant="body3">{category.category}</CategoryTitle>
                )}
                <TypeList>
                    {category.items.map((item, itemIndex) => (
                        <TypeItem
                            key={itemIndex}
                            onClick={() => handleTypeClick(item)}
                            style={{
                                backgroundColor: selectedType?.name === item.name
                                    ? 'var(--vscode-list-activeSelectionBackground)'
                                    : undefined
                            }}
                        >
                            <TypeName variant="body2">{item.name}</TypeName>
                        </TypeItem>
                    ))}
                </TypeList>
            </CategorySection>
        ));
    };

    return (
        <Container>
            <ContentArea>
                <SelectedTypeLabel>
                    <TextField
                        id="selected-type"
                        label="Selected Type"
                        value={selectedType?.name}
                        placeholder="Select a type from the list below"
                        readOnly
                    />
                </SelectedTypeLabel>

                <TypesContainer>
                    <SearchContainer>
                        <TextField
                            value={searchText}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search types..."
                            autoFocus
                        />
                    </SearchContainer>
                    {loading ? (
                        <LoadingContainer>
                            <ProgressRing />
                        </LoadingContainer>
                    ) : (
                        <>
                            {basicTypes && basicTypes.length > 0 && renderTypeItems(basicTypes)}
                            {(!basicTypes || basicTypes.length === 0) && (
                                <EmptyState>
                                    <Typography variant="body3">No types found</Typography>
                                </EmptyState>
                            )}
                        </>
                    )}
                </TypesContainer>
            </ContentArea>

            <Footer>
                <Button
                    onClick={handleSelectType}
                    disabled={!selectedType || isSelecting}
                >
                    {isSelecting ? <Typography variant="progress">Selecting...</Typography> : 'Select Type'}
                </Button>
            </Footer>
        </Container>
    );
}

