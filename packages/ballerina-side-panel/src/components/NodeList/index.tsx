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
import {
    Button,
    Codicon,
    ProgressRing,
    SearchBox,
    SidePanelBody,
    Switch,
    TextArea,
    ThemeColors,
    Tooltip,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { BackIcon, CloseIcon, LogIcon } from "../../resources";
import { Category, Item, Node } from "./types";
import { cloneDeep, debounce } from "lodash";
import { GroupListSkeleton } from "../Skeletons";
import GroupList from "../GroupList";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

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
    `;

    export const StyledSearchInput = styled(SearchBox)`
        height: 30px;
    `;

    export const CategoryRow = styled.div<{ showBorder?: boolean }>`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        width: 100%;
        margin-top: 8px;
        margin-bottom: ${({ showBorder }) => (showBorder ? "20px" : "12px")};
        padding-bottom: 8px;
        border-bottom: ${({ showBorder }) => (showBorder ? `1px solid ${ThemeColors.OUTLINE_VARIANT}` : "none")};
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

    export const Grid = styled.div<{ columns: number }>`
        display: grid;
        grid-template-columns: repeat(${({ columns }) => columns}, 1fr);
        gap: 8px;
        width: 100%;
        margin-top: 8px;
    `;

    export const Title = styled.div<{}>`
        font-size: 14px;
        font-family: GilmerBold;
        text-wrap: nowrap;
        &:first {
            margin-top: 0;
        }
    `;

    export const SubTitle = styled.div<{}>`
        font-size: 12px;
        opacity: 0.9;
    `;

    export const BodyText = styled.div<{}>`
        font-size: 11px;
        opacity: 0.5;
    `;

    export const Component = styled.div<{ enabled?: boolean }>`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
        padding: 5px;
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 5px;
        height: 36px;
        cursor: ${({ enabled }) => (enabled ? "pointer" : "not-allowed")};
        font-size: 14px;
        ${({ enabled }) => !enabled && "opacity: 0.5;"}
        &:hover {
            ${({ enabled }) =>
                enabled &&
                `
                background-color: ${ThemeColors.PRIMARY_CONTAINER};
                border: 1px solid ${ThemeColors.HIGHLIGHT};
            `}
        }
    `;

    export const ComponentTitle = styled.div`
        white-space: nowrap;
        width: 124px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        word-break: break-word;
    `;

    export const IconContainer = styled.div`
        padding: 0 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        & svg {
            height: 16px;
            width: 16px;
        }
    `;

    export const HorizontalLine = styled.hr`
        width: 100%;
        border: 0;
        border-top: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    `;

    export const BackButton = styled(Button)`
        /* position: absolute;
        right: 10px; */
        border-radius: 5px;
    `;

    export const CloseButton = styled(Button)`
        position: absolute;
        right: 10px;
        border-radius: 5px;
    `;

    export const HighlightedButton = styled.div`
        margin-top: 10px;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 8px;
        padding: 6px 2px;
        color: ${ThemeColors.PRIMARY};
        border: 1px dashed ${ThemeColors.PRIMARY};
        border-radius: 5px;
        cursor: pointer;
        &:hover {
            border: 1px solid ${ThemeColors.PRIMARY};
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
        }
    `;

    export const AddConnectionButton = styled(Button)`
        display: flex;
        flex-direction: row;
        justify-content: center;
        width: 100%;
    `;

    export const AiContainer = styled.div`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
        margin-top: 20px;
    `;

    export const AdvancedSubcategoryContainer = styled.div`
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-top: 8px;
    `;

    export const AdvancedSubcategoryHeader = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 4px 12px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;

        &:hover {
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
        }

        &:hover > div:first-of-type {
            opacity: 1;
            color: ${ThemeColors.PRIMARY};
        }
    `;

    export const AdvancedSubTitle = styled.div`
        font-size: 12px;
        opacity: 0.7;
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        transition: all 0.2s ease;
    `;
}

interface NodeListProps {
    categories: Category[];
    showAiPanel?: boolean;
    title?: string;
    onSelect: (id: string, metadata?: any) => void;
    onSearchTextChange?: (text: string) => void;
    onAddConnection?: () => void;
    onAddFunction?: () => void;
    onAdd?: () => void;
    addButtonLabel?: string;
    onBack?: () => void;
    onClose?: () => void;
    searchPlaceholder?: string;
}

export function NodeList(props: NodeListProps) {
    const {
        categories,
        showAiPanel,
        title,
        onSelect,
        onSearchTextChange,
        onAddConnection,
        onAddFunction,
        onAdd,
        addButtonLabel,
        onBack,
        onClose,
        searchPlaceholder,
    } = props;

    const [searchText, setSearchText] = useState<string>("");
    const [showGeneratePanel, setShowGeneratePanel] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedMoreSections, setExpandedMoreSections] = useState<Record<string, boolean>>({});
    const { rpcClient } = useRpcContext();
    const [isNPSupported, setIsNPSupported] = useState(false);

    useEffect(() => {
        rpcClient
            .getCommonRpcClient()
            .isNPSupported()
            .then((supported) => {
                setIsNPSupported(supported);
            });
    }, []);

    useEffect(() => {
        if (onSearchTextChange) {
            setIsSearching(true);
            debouncedSearch(searchText);
            return () => debouncedSearch.cancel();
        }
    }, [searchText]);

    const handleSearch = (text: string) => {
        onSearchTextChange(text);
    };

    const debouncedSearch = debounce(handleSearch, 1100);

    const handleOnSearch = (text: string) => {
        setSearchText(text);
    };

    useEffect(() => {
        setIsSearching(false);
    }, [categories]);

    const toggleMoreSection = (sectionKey: string) => {
        setExpandedMoreSections((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey],
        }));
    };

    const handleAddNode = (node: Node, category?: string) => {
        onSelect(node.id, { node: node.metadata, category });
    };

    const handleAddConnection = () => {
        if (onAddConnection) {
            onAddConnection();
        }
    };

    const handleAddFunction = () => {
        if (onAddFunction) {
            onAddFunction();
        }
    };

    const handleAdd = () => {
        if (onAdd) {
            onAdd();
        }
    };

    const getNodesContainer = (items: (Node | Category)[], parentCategoryTitle?: string) => {
        const safeItems = items.filter((item) => item != null);
        const nodes = safeItems.filter((item): item is Node => "id" in item && !("title" in item));
        const subcategories = safeItems.filter((item): item is Category => "title" in item && "items" in item);

        return (
            <>
                <S.Grid columns={2}>
                    {nodes.map((node, index) => {
                        if (["NP_FUNCTION"].includes(node.id) && !isNPSupported) {
                            return;
                        }

                        return (
                            <S.Component
                                key={node.id + index}
                                enabled={node.enabled}
                                onClick={() => handleAddNode(node)}
                                title={node.label}
                            >
                                <S.IconContainer>{node.icon || <LogIcon />}</S.IconContainer>
                                <S.ComponentTitle
                                    ref={(el) => {
                                        if (el && el.scrollWidth > el.clientWidth) {
                                            el.style.fontSize = "13px";
                                            el.style.wordBreak = "break-word";
                                            el.style.whiteSpace = "nowrap";
                                        }
                                    }}
                                >
                                    {node.label}
                                </S.ComponentTitle>
                            </S.Component>
                        );
                    })}
                </S.Grid>
                {subcategories.map((subcategory, index) => {
                    const isMoreSubcategory = subcategory.title === "More";

                    if (isMoreSubcategory) {
                        const sectionKey = `${parentCategoryTitle}-${subcategory.title}`;
                        const isExpanded = expandedMoreSections[sectionKey] || searchText?.length > 0;

                        return (
                            <S.AdvancedSubcategoryContainer key={subcategory.title + index}>
                                <S.AdvancedSubcategoryHeader onClick={() => toggleMoreSection(sectionKey)}>
                                    <S.AdvancedSubTitle>{subcategory.title}</S.AdvancedSubTitle>
                                    <Button
                                        appearance="icon"
                                        sx={{
                                            transition: "all 0.2s ease",
                                            "&:hover": {
                                                backgroundColor: "transparent !important",
                                            },
                                        }}
                                    >
                                        <Codicon name={isExpanded ? "chevron-up" : "chevron-down"} />
                                    </Button>
                                </S.AdvancedSubcategoryHeader>
                                {isExpanded && <div>{getNodesContainer(subcategory.items, parentCategoryTitle)}</div>}
                            </S.AdvancedSubcategoryContainer>
                        );
                    } else {
                        return (
                            <S.CategoryRow key={subcategory.title + index} showBorder={false}>
                                <S.Row>
                                    <Tooltip content={subcategory.description}>
                                        <S.SubTitle>{subcategory.title}</S.SubTitle>
                                    </Tooltip>
                                </S.Row>
                                {subcategory.items &&
                                    subcategory.items.length > 0 &&
                                    getNodesContainer(subcategory.items, parentCategoryTitle)}
                            </S.CategoryRow>
                        );
                    }
                })}
            </>
        );
    };

    const getConnectionContainer = (categories: Category[]) => (
        <S.Grid columns={1}>
            {categories.map((category, index) =>
                category.isLoading ? (
                    <GroupListSkeleton key={"skeleton" + index} />
                ) : (
                    <GroupList
                        key={category.title + index + "tooltip"}
                        category={category}
                        expand={searchText?.length > 0}
                        onSelect={handleAddNode}
                    />
                ))
            }
        </S.Grid>
    );

    const getCategoryContainer = (groups: Category[], isSubCategory = false, parentCategoryTitle?: string) => {
        const callFunctionNode = groups
            .flatMap((group) => group?.items || [])
            .filter((item) => item != null)
            .find((item) => "id" in item && item.id === "FUNCTION");
        const content = (
            <>
                {groups.map((group, index) => {
                    const isConnectionCategory = group.title === "Connections";
                    const isProjectFunctionsCategory = group.title === "Current Integration";
                    const isDataMapperCategory = isProjectFunctionsCategory && title === "Data Mappers";
                    const isAgentCategory = group.title === "Agents";
                    const isNpFunctionCategory = isProjectFunctionsCategory && title === "Natural Functions";
                    const isModelProviderCategory = group.title === "Model Providers";
                    const isVectorStoreCategory = group.title === "Vector Stores";
                    const isEmbeddingProviderCategory = group.title === "Embedding Providers";
                    const isVectorKnowledgeBaseCategory = group.title === "Vector Knowledge Bases";
                    // Hide categories that don't have items, except for special categories that can add items
                    if (!group || !group.items || group.items.length === 0) {
                        // Only show empty categories if they have add functionality
                        if (
                            !isConnectionCategory &&
                            !isProjectFunctionsCategory &&
                            !isAgentCategory &&
                            !isNpFunctionCategory &&
                            !isModelProviderCategory &&
                            !isVectorStoreCategory &&
                            !isEmbeddingProviderCategory &&
                            !isVectorKnowledgeBaseCategory
                        ) {
                            return null;
                        }
                    }
                    if (searchText && (!group.items || group.items.length === 0)) {
                        return null;
                    }
                    // skip current integration category if onAddFunction is not provided and items are empty
                    if (!onAddFunction && isProjectFunctionsCategory && (!group.items || group.items.length === 0)) {
                        return null;
                    }

                    return (
                        <S.CategoryRow key={group.title + index} showBorder={!isSubCategory}>
                            <S.Row>
                                {isSubCategory && (
                                    <Tooltip content={group.description}>
                                        <S.SubTitle>{group.title}</S.SubTitle>
                                    </Tooltip>
                                )}
                                {!isSubCategory && (
                                    <>
                                        <S.Title>{group.title}</S.Title>
                                        <>
                                            {onAddConnection && isConnectionCategory && (
                                                <Button
                                                    appearance="icon"
                                                    tooltip="Add Connection"
                                                    onClick={handleAddConnection}
                                                >
                                                    <Codicon name="add" />
                                                </Button>
                                            )}
                                            {onAddFunction && isDataMapperCategory && (
                                                <Button
                                                    appearance="icon"
                                                    tooltip="Create Data Mapper"
                                                    onClick={handleAddFunction}
                                                >
                                                    <Codicon name="add" />
                                                </Button>
                                            )}
                                            {onAddFunction &&
                                                isProjectFunctionsCategory &&
                                                !isDataMapperCategory &&
                                                !isNpFunctionCategory && (
                                                    <Button
                                                        appearance="icon"
                                                        tooltip="Create Function"
                                                        onClick={handleAddFunction}
                                                    >
                                                        <Codicon name="add" />
                                                    </Button>
                                                )}
                                            {onAddFunction && isNpFunctionCategory && (
                                                <Button
                                                    appearance="icon"
                                                    tooltip="Create Natural Function"
                                                    onClick={handleAddFunction}
                                                >
                                                    <Codicon name="add" />
                                                </Button>
                                            )}
                                            {onAdd && addButtonLabel && (
                                                <Button
                                                    appearance="icon"
                                                    tooltip={addButtonLabel}
                                                    onClick={handleAdd}
                                                >
                                                    <Codicon name="add" />
                                                </Button>
                                            )}
                                        </>
                                    </>
                                )}
                            </S.Row>
                            {onAddConnection && isConnectionCategory && (!group.items || group.items.length === 0) && (
                                <S.HighlightedButton onClick={handleAddConnection}>
                                    <Codicon
                                        name="add"
                                        iconSx={{ fontSize: 12 }}
                                        sx={{ display: "flex", alignItems: "center" }}
                                    />
                                    Add Connection
                                </S.HighlightedButton>
                            )}
                            {onAddFunction &&
                                isProjectFunctionsCategory &&
                                (!group.items || group.items.length === 0) &&
                                !searchText &&
                                !isSearching && (
                                    <S.HighlightedButton onClick={handleAddFunction}>
                                        <Codicon name="add" iconSx={{ fontSize: 12 }} />
                                        {`Create ${
                                            isDataMapperCategory
                                                ? "Data Mapper"
                                                : isNpFunctionCategory
                                                ? "Natural Function"
                                                : "Function"
                                        }`}
                                    </S.HighlightedButton>
                                )}
                            {onAdd &&
                                addButtonLabel &&
                                (isModelProviderCategory || isVectorStoreCategory || isEmbeddingProviderCategory || isVectorKnowledgeBaseCategory) &&
                                (!group.items || group.items.length === 0) &&
                                !searchText &&
                                !isSearching && (
                                    <S.HighlightedButton onClick={handleAdd}>
                                        <Codicon name="add" iconSx={{ fontSize: 12 }} />
                                        {addButtonLabel}
                                    </S.HighlightedButton>
                                )}
                            {group.items &&
                            group.items.length > 0 &&
                            // 1. If parent group is "Connections", "Model Providers", "Vector Stores", "Embedding Providers", or "Vector Knowledge Bases" and ALL items don't have id, use getConnectionContainer
                            (group.title === "Connections" || group.title === "Model Providers" || group.title === "Vector Stores" || group.title === "Embedding Providers" || group.title === "Vector Knowledge Bases") &&
                            group.items.filter((item) => item != null).every((item) => !("id" in item))
                                ? getConnectionContainer(group.items as Category[])
                                : // 2. If ALL items don't have id (all are categories), use getCategoryContainer
                                group.items.filter((item) => item != null).every((item) => !("id" in item))
                                ? getCategoryContainer(
                                      group.items as Category[],
                                      true,
                                      !isSubCategory ? group.title : parentCategoryTitle
                                  )
                                : // 3. Otherwise (has items with id or mixed), use getNodesContainer
                                  getNodesContainer(
                                      group.items as (Node | Category)[],
                                      !isSubCategory ? group.title : parentCategoryTitle
                                  )}
                        </S.CategoryRow>
                    );
                })}
                {callFunctionNode && (
                    <S.AdvancedSubcategoryContainer key={"showMoreFunctions"}>
                        <S.AdvancedSubcategoryHeader onClick={() => handleAddNode(callFunctionNode as Node)}>
                            <S.AdvancedSubTitle>Show More Functions</S.AdvancedSubTitle>
                            <Button
                                appearance="icon"
                                sx={{
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                        backgroundColor: "transparent !important",
                                    },
                                }}
                            >
                                <Codicon name="chevron-right" />
                            </Button>
                        </S.AdvancedSubcategoryHeader>
                    </S.AdvancedSubcategoryContainer>
                )}
            </>
        );

        const isEmpty = React.Children.toArray(content.props.children).every((child) => child === null);
        return isEmpty && searchText ? <div style={{ paddingTop: "10px" }}>No matching results found</div> : content;
    };

    // filter out category items based on search text
    const filterItems = (items: Item[]): Item[] => {
        if (!items) return [];

        return items
            .filter((item) => item != null)
            .map((item) => {
                if ("items" in item && "title" in item) {
                    // This is a Category (like "More")
                    const filteredItems = filterItems(item.items);
                    const categoryMatches =
                        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
                        (item.description?.toLowerCase() || "").includes(searchText.toLowerCase());

                    // Keep the category if it matches or has matching items
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

    const filteredCategories = cloneDeep(categories).map((category) => {
        if (!category || !category.items || onSearchTextChange) {
            return category;
        }
        category.items = filterItems(category.items) || [];
        return category;
    });

    return (
        <S.Container>
            <S.HeaderContainer>
                <S.Row>
                    {showAiPanel && (
                        <Switch
                            leftLabel="Search"
                            rightLabel="Generate"
                            checked={showGeneratePanel}
                            checkedColor={ThemeColors.PRIMARY}
                            enableTransition={true}
                            onChange={() => {
                                setShowGeneratePanel(!showGeneratePanel);
                            }}
                            sx={{
                                margin: "auto",
                                zIndex: "2",
                                border: "unset",
                            }}
                            disabled={false}
                        />
                    )}
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
                {!showGeneratePanel && (
                    <S.Row>
                        <S.StyledSearchInput
                            value={searchText}
                            placeholder={searchPlaceholder || "Search"}
                            autoFocus={true}
                            onChange={handleOnSearch}
                            size={60}
                        />
                    </S.Row>
                )}
            </S.HeaderContainer>
            {isSearching && (
                <S.PanelBody>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <ProgressRing />
                    </div>
                </S.PanelBody>
            )}
            {!showGeneratePanel && !isSearching && (
                <S.PanelBody>{getCategoryContainer(filteredCategories)}</S.PanelBody>
            )}
            {showAiPanel && showGeneratePanel && (
                <S.PanelBody>
                    <S.AiContainer>
                        <S.Title>Describe what you want you want to do</S.Title>
                        <TextArea
                            rows={10}
                            placeholder={
                                "E.g. I need to add functionality to validate user input before saving to the database."
                            }
                            sx={{ width: "100%" }}
                        ></TextArea>
                        <Button>Generate</Button>
                    </S.AiContainer>
                </S.PanelBody>
            )}
        </S.Container>
    );
}

export default NodeList;
