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
    gap: 16px;
`;

const SearchContainer = styled.div`
    width: 100%;
`;

const CategorySection = styled.div`
    margin-top: 16px;
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
    max-height: 50vh;
    overflow-y: auto;
`;

const TypeItem = styled.div`
    display: flex;
    flex-direction: column;
    padding: 12px 16px;
    background-color: var(--vscode-list-inactiveSelectionBackground);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
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
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
`;

const EmptyState = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    color: var(--vscode-descriptionForeground);
`;

interface BrowseTypesTabProps {
    basicTypes: TypeHelperCategory[];
    importedTypes: TypeHelperCategory[];
    loading?: boolean;
    onSearchTypeHelper: (searchText: string, isType?: boolean) => void;
    onTypeItemClick: (item: TypeHelperItem) => Promise<any>;
    onClose: () => void;
    onTypeSelect: (type: Type) => void;
}

export function BrowseTypesTab(props: BrowseTypesTabProps) {
    const {
        basicTypes,
        importedTypes,
        loading,
        onSearchTypeHelper,
        onTypeItemClick,
        onClose,
        onTypeSelect
    } = props;

    const [searchText, setSearchText] = useState<string>('');
    const [selectedType, setSelectedType] = useState<TypeHelperItem | null>(null);
    const [isSelecting, setIsSelecting] = useState<boolean>(false);

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
            {selectedType && (
                <div style={{ marginTop: '16px' }}>
                    <TextField
                        id="selected-type"
                        label="Selected Type"
                        value={selectedType.name}
                        readOnly
                    />
                </div>
            )}

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
                    {/* {importedTypes && importedTypes.length > 0 && renderTypeItems(importedTypes)} */}
                    {(!basicTypes || basicTypes.length === 0) && (
                        <EmptyState>
                            <Typography variant="body3">No types found</Typography>
                        </EmptyState>
                    )}
                </>
            )}

            <Footer>
                <Button onClick={onClose} disabled={isSelecting}>
                    Cancel
                </Button>
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

