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

import React, { useEffect, useState } from "react";
import { Button, ProgressRing, SearchBox, SidePanelBody, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { BackIcon, CloseIcon, LogIcon } from "../../resources";
import { Category, Item, Node } from "../NodeList/types";
import { cloneDeep, debounce } from "lodash";

namespace S {
    export const Container = styled.div<{}>`
        width: 100%;
    `;

    export const HeaderContainer = styled.div<{}>`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px;
    `;

    export const PanelBody = styled(SidePanelBody)`
        height: calc(100vh - 100px);
        padding-top: 0;
        overflow-y: auto;
    `;

    export const StyledSearchInput = styled(SearchBox)`
        height: 30px;
    `;

    export const CategorySection = styled.div<{}>`
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-bottom: 24px;
    `;

    export const CategoryTitle = styled.div<{}>`
        font-size: 14px;
        font-family: GilmerBold;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    export const CategoryDescription = styled.div<{}>`
        font-size: 12px;
        opacity: 0.7;
        margin-bottom: 16px;
    `;

    export const CardsContainer = styled.div<{}>`
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
    `;

    export const Card = styled.div<{ enabled?: boolean }>`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 8px;
        cursor: ${({ enabled }) => (enabled ? "pointer" : "not-allowed")};
        transition: all 0.2s ease;
        background-color: ${ThemeColors.SURFACE};
        min-height: 60px;

        ${({ enabled }) => !enabled && "opacity: 0.5;"}

        &:hover {
            ${({ enabled }) =>
                enabled &&
                `
                background-color: ${ThemeColors.PRIMARY_CONTAINER};
                border: 1px solid ${ThemeColors.PRIMARY};
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            `}
        }
    `;

    export const CardIcon = styled.div`
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 6px;
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
        flex-shrink: 0;

        & svg {
            height: 20px;
            width: 20px;
        }

        & img {
            height: 20px;
            width: 20px;
            border-radius: 2px;
        }
    `;

    export const CardContent = styled.div`
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-width: 0;
    `;

    export const CardTitle = styled.div`
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 4px;
        color: ${ThemeColors.ON_SURFACE};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `;

    export const CardDescription = styled.div`
        font-size: 12px;
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        opacity: 0.8;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    `;

    export const Row = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
        margin-bottom: 4px;
        width: 100%;
    `;

    export const LeftAlignRow = styled(Row)`
        justify-content: flex-start;
    `;

    export const BackButton = styled(Button)`
        border-radius: 5px;
    `;

    export const CloseButton = styled(Button)`
        position: absolute;
        right: 10px;
        border-radius: 5px;
    `;

    export const EmptyState = styled.div`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 16px;
        text-align: center;
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        opacity: 0.7;
    `;

    export const EmptyStateText = styled.div`
        font-size: 14px;
        margin-bottom: 8px;
    `;

    export const EmptyStateSubText = styled.div`
        font-size: 12px;
        opacity: 0.8;
    `;

    export const AddButton = styled(Button)`
        border-radius: 5px;
    `;
}

export interface CardListProps {
    categories: Category[];
    title?: string;
    searchPlaceholder?: string;
    onSelect: (id: string, metadata?: any) => void;
    onSearch?: (text: string) => void;
    onBack?: () => void;
    onClose?: () => void;
}

function CardList(props: CardListProps) {
    const { categories, title, searchPlaceholder, onSelect, onSearch, onBack, onClose } = props;

    const [searchText, setSearchText] = useState<string>("");
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (onSearch) {
            setIsSearching(true);
            debouncedSearch(searchText);
            return () => debouncedSearch.cancel();
        }
    }, [searchText]);

    const handleSearch = (text: string) => {
        if (onSearch) {
            onSearch(text);
        }
    };

    const debouncedSearch = debounce(handleSearch, 500);

    const handleOnSearch = (text: string) => {
        setSearchText(text);
    };

    useEffect(() => {
        setIsSearching(false);
    }, [categories]);

    const handleCardClick = (node: Node) => {
        onSelect(node.id, { node: node.metadata });
    };

    // Filter items based on search text (only if no onSearch prop - local filtering)
    const filterItems = (items: Item[]): Item[] => {
        if (!items || onSearch) return items || []; // If onSearch is provided, don't filter locally

        return items
            .filter((item) => item != null)
            .map((item) => {
                if ("items" in item && "title" in item) {
                    // This is a Category
                    const filteredItems = filterItems(item.items);
                    const categoryMatches =
                        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
                        (item.description?.toLowerCase() || "").includes(searchText.toLowerCase());

                    if (categoryMatches || filteredItems.length > 0) {
                        return {
                            ...item,
                            items: filteredItems,
                        };
                    }
                    return null;
                } else if ("id" in item && "label" in item) {
                    // This is a Node
                    const lowerCaseTitle = item.label.toLowerCase();
                    const lowerCaseDescription = item.description?.toLowerCase() || "";
                    const lowerCaseSearchText = searchText.toLowerCase();

                    if (
                        lowerCaseTitle.includes(lowerCaseSearchText) ||
                        lowerCaseDescription.includes(lowerCaseSearchText)
                    ) {
                        return item;
                    }
                    return null;
                }
                return null;
            })
            .filter(Boolean) as Item[];
    };

    const renderCards = (items: Item[]) => {
        const nodes = items.filter((item): item is Node => item != null && "id" in item && "label" in item);

        if (nodes.length === 0) {
            return (
                <S.EmptyState>
                    <S.EmptyStateText>No items found</S.EmptyStateText>
                    <S.EmptyStateSubText>Try adjusting your search or explore different categories</S.EmptyStateSubText>
                </S.EmptyState>
            );
        }

        return (
            <S.CardsContainer>
                {nodes.map((node, index) => (
                    <S.Card key={node.id + index} enabled={node.enabled} onClick={() => handleCardClick(node)} title={node.description}>
                        <S.CardIcon>{node.icon ? node.icon : <LogIcon />}</S.CardIcon>
                        <S.CardContent>
                            <S.CardTitle>{node.label}</S.CardTitle>
                            {node.description && <S.CardDescription>{node.description}</S.CardDescription>}
                        </S.CardContent>
                    </S.Card>
                ))}
            </S.CardsContainer>
        );
    };

    const filteredCategories = onSearch
        ? categories
        : cloneDeep(categories).map((category) => {
              if (!category || !category.items) {
                  return category;
              }
              category.items = filterItems(category.items) || [];
              return category;
          });

    const hasContent = filteredCategories.some((category) => category?.items && category.items.length > 0);
    const shouldShowHeaderActions = (onBack && title) || onClose;
    return (
        <S.Container>
            <S.HeaderContainer>
                {shouldShowHeaderActions && (
                    <S.Row>
                        {onBack && title && (
                            <S.LeftAlignRow>
                                <S.BackButton appearance="icon" onClick={onBack}>
                                    <BackIcon />
                                </S.BackButton>
                                {title}
                            </S.LeftAlignRow>
                        )}
                        {onClose && (
                            <S.CloseButton appearance="icon" onClick={onClose}>
                                <CloseIcon />
                            </S.CloseButton>
                        )}
                    </S.Row>
                )}
                <S.Row>
                    <S.StyledSearchInput
                        value={searchText}
                        placeholder={searchPlaceholder || "Search"}
                        autoFocus={true}
                        onChange={handleOnSearch}
                        size={60}
                    />
                </S.Row>
            </S.HeaderContainer>

            {isSearching && (
                <S.PanelBody>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <ProgressRing />
                    </div>
                </S.PanelBody>
            )}

            {!isSearching && (
                <S.PanelBody>
                    {!hasContent ? (
                        <S.EmptyState>
                            <S.EmptyStateText>No results found</S.EmptyStateText>
                            <S.EmptyStateSubText>Try adjusting your search terms</S.EmptyStateSubText>
                        </S.EmptyState>
                    ) : (
                        filteredCategories.map((category, index) => {
                            if (!category?.items || category.items.length === 0) {
                                return null;
                            }

                            return (
                                <S.CategorySection key={category.title + index}>
                                    <S.CategoryTitle>{category.title}</S.CategoryTitle>
                                    {category.description && (
                                        <S.CategoryDescription>{category.description}</S.CategoryDescription>
                                    )}
                                    {renderCards(category.items)}
                                </S.CategorySection>
                            );
                        })
                    )}
                </S.PanelBody>
            )}
        </S.Container>
    );
}

export { CardList };
export default CardList;
