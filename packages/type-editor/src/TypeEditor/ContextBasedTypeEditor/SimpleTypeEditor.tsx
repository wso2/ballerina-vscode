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
import { Button, TextField, Typography } from '@wso2/ui-toolkit';
import { TypeHelperCategory, TypeHelperItem } from '../../TypeHelper';

const Footer = styled.div`
    display: flex;
    gap: 8px;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    margin-top: 8px;
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

interface SimpleTypeEditorProps {
    typeName: string; // Just the type name/kind (e.g., "string", "int")
    basicTypes: TypeHelperCategory[];
    importedTypes: TypeHelperCategory[];
    onTypeItemClick: (item: TypeHelperItem) => Promise<any>;
    isSaving?: boolean;
    onSave: (type: string) => void;
    onSearchTypeHelper: (searchText: string, isType?: boolean) => void;

    
}

export const SimpleTypeEditor: React.FC<SimpleTypeEditorProps> = ({
    typeName,
    basicTypes,
    importedTypes,
    onTypeItemClick,
    onSave,
    isSaving: isSavingProp,
    onSearchTypeHelper
}) => {
    const [selectedType, setSelectedType] = useState<string>(typeName);

    // Flatten categories to get all items (both basic and imported)
    const flatBasicTypes = basicTypes.flatMap(category => category.items);
    const flatImportedTypes = importedTypes.flatMap(category => category.items);
    const allTypes = [...flatBasicTypes, ...flatImportedTypes];

    const isSaving = isSavingProp || false;

    useEffect(() => {
        onSearchTypeHelper('', true);
    }, []);

    const handleSearchChange = (value: string) => {
        // setSearchText(value);
        onSearchTypeHelper(value, true);
    };

    // Update selected type when typeName prop changes
    useEffect(() => {
        setSelectedType(typeName);
    }, [typeName, basicTypes, importedTypes]);

    const handleTypeClick = async (item: TypeHelperItem) => {
        setSelectedType(item.name);
        
        try {
            // Call onTypeItemClick to handle imports if needed
            await onTypeItemClick(item);
        } catch (error) {
            console.error('Error changing type:', error);
        }
    };

    const handleSave = () => {
        if (onSave) {
            // For primitive/imported types, just call onSave with the selected type name
            onSave(selectedType);
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
                                backgroundColor: selectedType === item.name
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
        <>
            <div style={{ padding: '16px 0' }}>
                <TextField
                    id="type-selector"
                    label="Type"
                    description="Select the type from the list below"
                    value={selectedType}
                    readOnly
                />
                <div style={{ marginTop: '16px' }}>
                    {basicTypes && basicTypes.length > 0 && renderTypeItems(basicTypes)}
                    {importedTypes && importedTypes.length > 0 && renderTypeItems(importedTypes)}
                </div>
            </div>
            
            {onSave && (
                <Footer>
                    <Button
                        data-testid="simple-type-save"
                        onClick={handleSave}
                        disabled={!selectedType || isSaving}
                    >
                        {isSaving ? <Typography variant="progress">Saving...</Typography> : "Save"}
                    </Button>
                </Footer>
            )}
        </>
    );
};

