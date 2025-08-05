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

import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import {
    Codicon,
    Divider,
    getIcon,
    HelperPane,
    HelperPaneCustom,
    HelperPaneHeight,
    SearchBox,
    ThemeColors,
    Typography
} from '@wso2/ui-toolkit';
import { TypeHelperOperator } from '..';
import { TypeHelperCategory, TypeHelperItem } from '.';
import { TypeBrowser } from './TypeBrowser';
import { getTypeCreateText, isTypePanelOpen } from './utils';
import ExpandableList from './ExpandableList';
import { ScrollableContainer, SlidingPaneNavContainer, SlidingWindow } from '@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane';

/* Constants */
const PANEL_TABS = {
    TYPES: 0,
    OPERATORS: 1
} as const;

/* Types */
type TypeHelperComponentProps = {
    open: boolean;
    currentType: string;
    currentCursorPosition: number;
    loading?: boolean;
    loadingTypeBrowser?: boolean;
    referenceTypes: TypeHelperCategory[];
    basicTypes: TypeHelperCategory[];
    importedTypes: TypeHelperCategory[];
    operators: TypeHelperOperator[];
    typeBrowserTypes: TypeHelperCategory[];
    typeBrowserRef: React.RefObject<HTMLDivElement>;
    typeHelperHeight?: HelperPaneHeight;
    onChange: (newType: string, newCursorPosition: number) => void;
    onSearchTypeHelper: (searchText: string, isType: boolean) => void;
    onSearchTypeBrowser: (searchText: string) => void;
    onTypeItemClick: (item: TypeHelperItem) => Promise<string>;
    onTypeCreate?: (typeName?: string) => void;
    onClose: () => void;
    onCloseCompletions?: () => void;
};

type StyleBase = {
    sx?: React.CSSProperties;
};

/* Styles */
namespace S {
    export const Container = styled.div<StyleBase>`
        position: absolute;
        z-index: 2001;
        filter: drop-shadow(0 3px 8px rgb(0 0 0 / 0.2));

        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }

        ${(props) => props.sx && { ...props.sx }}
    `;

    export const OperatorContainer = styled.div`
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;

    export const Operator = styled.div`
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 2px 4px;
        cursor: pointer;

        &:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
    `;

    export const OptionIcon = styled.div`
        margin-top: 2px;
    `;

    export const CategoryContainer = styled.div`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
    `;

    export const ItemContainer = styled.div`
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    `;

    export const Item = styled.div`
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 8px;
        border-radius: 4px;
    `;

    export const FooterContainer = styled.div`
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
}

export const TypeHelperComponent = (props: TypeHelperComponentProps) => {
    const {
        open,
        typeHelperHeight = "full",
        currentType,
        currentCursorPosition,
        typeBrowserRef,
        loading = false,
        loadingTypeBrowser = false,
        referenceTypes,
        basicTypes,
        importedTypes,
        operators,
        typeBrowserTypes,
        onChange,
        onSearchTypeHelper,
        onSearchTypeBrowser,
        onTypeItemClick,
        onTypeCreate,
        onClose,
        onCloseCompletions
    } = props;
    const [searchValue, setSearchValue] = useState<string>('');
    const [isTypeBrowserOpen, setIsTypeBrowserOpen] = useState<boolean>(false);
    const [activePanelIndex, setActivePanelIndex] = useState<number>(PANEL_TABS.TYPES);
    const newTypeName = useRef<string>('');

    const handleOperatorClick = (operator: TypeHelperOperator) => {
        if (operator.insertType === 'global') {
            if (operator.insertLocation === 'start') {
                onChange(
                    operator.insertText + ' ' + currentType.trimStart(),
                    currentCursorPosition + operator.insertText.length + 1
                );
            } else {
                onChange(currentType.trimEnd() + operator.insertText, currentCursorPosition);
            }
        } else {
            const suffixRegex = /^[a-zA-Z0-9_']*/;
            const suffixMatch = currentType.slice(currentCursorPosition).match(suffixRegex);

            if (suffixMatch) {
                const newCursorPosition = currentCursorPosition + suffixMatch[0].length;
                onChange(
                    currentType.slice(0, newCursorPosition) +
                    operator.insertText +
                    currentType.slice(newCursorPosition),
                    newCursorPosition + operator.insertText.length
                );
            }
        }
    };

    const handleTypeItemClick = (item: TypeHelperItem) => {
        const prefixRegex = /[a-zA-Z0-9_':]*$/;
        const suffixRegex = /^[a-zA-Z0-9_':]*/;
        const prefixMatch = currentType.slice(0, currentCursorPosition).match(prefixRegex);
        const suffixMatch = currentType.slice(currentCursorPosition).match(suffixRegex);
        const prefixCursorPosition = currentCursorPosition - (prefixMatch?.[0]?.length ?? 0);
        const suffixCursorPosition = currentCursorPosition + (suffixMatch?.[0]?.length ?? 0);

        onChange(
            currentType.slice(0, prefixCursorPosition) + item.insertText + currentType.slice(suffixCursorPosition),
            prefixCursorPosition + item.insertText.length
        );

        onCloseCompletions?.();
    };

    const handleTypeBrowserItemClick = async (item: TypeHelperItem) => {
        const prefixRegex = /[a-zA-Z0-9_':]*$/;
        const suffixRegex = /^[a-zA-Z0-9_':]*/;
        const prefixMatch = currentType.slice(0, currentCursorPosition).match(prefixRegex);
        const suffixMatch = currentType.slice(currentCursorPosition).match(suffixRegex);
        const prefixCursorPosition = currentCursorPosition - (prefixMatch?.[0]?.length ?? 0);
        const suffixCursorPosition = currentCursorPosition + (suffixMatch?.[0]?.length ?? 0);

        try {
            const updateText = await onTypeItemClick(item);
            if (updateText) {
                onChange(
                    currentType.slice(0, prefixCursorPosition) + updateText + currentType.slice(suffixCursorPosition),
                    prefixCursorPosition + updateText.length
                );
            }
        } catch (error) {
            console.error(error);
        }

        // Close the type browser
        onClose();

        onCloseCompletions?.();
    }

    const handleHelperPaneSearch = (searchText: string) => {
        setSearchValue(searchText);
        onSearchTypeHelper(searchText, isTypePanelOpen(activePanelIndex));
    };

    useEffect(() => {
        if (open) {
            onSearchTypeHelper(searchValue, isTypePanelOpen(activePanelIndex));
        }
    }, [activePanelIndex, open]);

    return (
        <HelperPaneCustom >
            <SlidingWindow>
                <HelperPane.Body>
                    <SearchBox sx={{ width: "100%", marginBottom: '10px' }} placeholder='Search' autoFocus={true} value={searchValue} onChange={handleHelperPaneSearch} />
                    {loading ? (
                        <HelperPane.Loader rows={3} columns={1} sections={3} />
                    ) : (
                        basicTypes?.length > 0 && (
                            <>
                                <ScrollableContainer>
                                    {basicTypes.map((category) => (
                                        <ExpandableList.Section sx={{ marginTop: '20px' }} key={category.category} title={category.category} level={1}>
                                            <div style={{ marginTop: '10px' }}>
                                                {category.items.map((item) => (
                                                    <SlidingPaneNavContainer>
                                                        <ExpandableList.Item
                                                            key={`${category.category}-${item.name}`}
                                                            sx={{ color: ThemeColors.ON_SURFACE }}
                                                            onClick={() => handleTypeItemClick(item)}
                                                        >
                                                            {getIcon(item.type)}
                                                            {item.name}
                                                        </ExpandableList.Item>
                                                    </SlidingPaneNavContainer>
                                                ))}
                                            </div>
                                        </ExpandableList.Section>
                                    ))}
                                    {importedTypes?.[0]?.subCategory?.length > 0 && (
                                        <HelperPane.CollapsibleSection title="Imported Types" defaultCollapsed={true}>
                                            {importedTypes.map((category) => (
                                                <ExpandableList.Section sx={{ marginTop: '20px' }} key={category.category} title={category.category} level={1}>
                                                    {category.subCategory?.map((subCategory) => (
                                                        <ExpandableList.Section sx={{ marginTop: '10px' }} key={category.category} title={subCategory.category} level={0}>
                                                            <div style={{ marginTop: '10px' }}>
                                                                {subCategory.items?.map((item) => (

                                                                    <SlidingPaneNavContainer>
                                                                        <ExpandableList.Item
                                                                            key={subCategory.category}
                                                                            sx={{ color: ThemeColors.ON_SURFACE }}
                                                                            onClick={() => handleTypeBrowserItemClick(item)}
                                                                        >
                                                                            {getIcon(item.type)}
                                                                            {item.name}
                                                                        </ExpandableList.Item>
                                                                    </SlidingPaneNavContainer>

                                                                ))}
                                                            </div>
                                                        </ExpandableList.Section>
                                                    ))}
                                                </ExpandableList.Section>
                                            ))}
                                        </HelperPane.CollapsibleSection>
                                    )}
                                </ScrollableContainer>
                            </>
                        )
                    )}
                    <div style={{ marginTop: "auto" }}>
                        <Divider />
                        <S.FooterContainer>
                            {onTypeCreate && (
                                <HelperPane.IconButton
                                    title={getTypeCreateText(currentType, referenceTypes, newTypeName)}
                                    getIcon={() => <Codicon name="add" />}
                                    onClick={() => onTypeCreate(newTypeName.current)}
                                />
                            )}
                            <HelperPane.IconButton
                                title="Open type browser"
                                getIcon={() => <Codicon name="library" />}
                                onClick={() => setIsTypeBrowserOpen(true)}
                            />
                        </S.FooterContainer>
                    </div>
                </HelperPane.Body>
            </SlidingWindow>

            {/* Type browser */}
            {isTypeBrowserOpen && (
                <TypeBrowser
                    typeBrowserRef={typeBrowserRef}
                    loadingTypeBrowser={loadingTypeBrowser}
                    typeBrowserTypes={typeBrowserTypes}
                    onSearchTypeBrowser={onSearchTypeBrowser}
                    onTypeItemClick={handleTypeBrowserItemClick}
                    onClose={() => setIsTypeBrowserOpen(false)}
                />
            )}
        </HelperPaneCustom>
    );
};

