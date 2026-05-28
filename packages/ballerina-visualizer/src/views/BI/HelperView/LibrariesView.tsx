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

import { Category, FUNCTION_TYPE, LineRange, LogIcon, NodePosition, BISearchRequest } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Category as PanelCategory, GroupList, Node, ExpressionFormField } from "@wso2/ballerina-side-panel";

import { useEffect, useState } from "react";
import { convertFunctionCategoriesToSidePanelCategories } from "../../../utils/bi";
import { ProgressRing, SearchBox, SidePanelBody, Tooltip, Typography, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import React from "react";
import { debounce } from "lodash";
import { PanelBody } from ".";

interface LibrariesViewProps {
    filePath: string;
    position: LineRange;
    updateFormField: (data: ExpressionFormField) => void;
    editorKey: string;

}

namespace S {
    export const Container = styled.div<{}>`
        width: 100%;
    `;

    export const HeaderContainer = styled.div<{}>`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
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
        margin-bottom: ${({ showBorder }: { showBorder?: boolean }) => (showBorder ? "20px" : "12px")};
        padding-bottom: 8px;
        border-bottom: ${({ showBorder }: { showBorder?: boolean }) => (showBorder ? `1px solid ${ThemeColors.OUTLINE_VARIANT}` : "none")};
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
        grid-template-columns: repeat(${({ columns }: { columns: number }) => columns}, 1fr);
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



    export const HorizontalLine = styled.hr`
        width: 100%;
        border: 0;
        border-top: 1px solid ${ThemeColors.OUTLINE_VARIANT};
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

}

export const LibraryComponent = styled.div`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
        padding: 5px;
        height: 25px;
        cursor: pointer;
        &:hover {
                background-color: ${ThemeColors.SURFACE_CONTAINER};
        }
`;

export const LibraryName = styled(Typography)`
    variant: body3;
    margin: 0px 5px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    width: 124px;
    word-break: break-all;
`;



export const IconContainer = styled.div`
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        & svg {
            height: 14px;
            width: 14px;
            fill: ${ThemeColors.ON_SURFACE};
            stroke: ${ThemeColors.ON_SURFACE};
        }
    `;

export function LibrariesView(props: LibrariesViewProps) {
    const { filePath, position, updateFormField, editorKey } = props;
    const { rpcClient } = useRpcContext();
    const [categories, setCategories] = useState<PanelCategory[]>([]);
    const [searchText, setSearchText] = useState<string>("");
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        setIsSearching(true);
        debouncedSearch(searchText);
        return () => debouncedSearch.cancel();
    }, [searchText]);


    const handleSearchFunction = async (searchText: string) => {
        const request: BISearchRequest = {
            position: {
                startLine: position.startLine,
                endLine: position.endLine,
            },
            filePath: filePath,
            queryMap: searchText.trim()
                ? {
                    q: searchText,
                    limit: 12,
                    offset: 0,
                }
                : undefined,
            searchKind: "FUNCTION",
        };
        console.log(">>> Search function request", request);
        setIsSearching(true);
        rpcClient
            .getBIDiagramRpcClient()
            .search(request)
            .then((response) => {
                console.log(">>> Searched List of functions", response);
                setCategories(
                    convertFunctionCategoriesToSidePanelCategories(response.categories as Category[], FUNCTION_TYPE.ALL)
                );
            })
            .finally(() => {
                setIsSearching(false);
            });
    };

    const debouncedSearch = debounce(handleSearchFunction, 1100);

    const handleOnSearch = (text: string) => {
        setSearchText(text);
    };

    useEffect(() => {
        setIsSearching(false);
    }, [categories]);



    useEffect(() => {
        // Fetch libraries
        setIsSearching(true);
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                position: { startLine: position.startLine, endLine: position.startLine },
                filePath: filePath,
                queryMap: undefined,
                searchKind: "FUNCTION",
            })
            .then((response) => {
                console.log(">>> List of functions", response);
                setCategories(
                    convertFunctionCategoriesToSidePanelCategories(response.categories as Category[], FUNCTION_TYPE.ALL)
                );
            })
            .finally(() => {
                setIsSearching(false);
            });
    }, [filePath, position]);




    function handleAddFunction(node: Node): void {
        console.log("====== Add Function", node);
        // TODO: Pass codedata and get the function signature/name from LS
        const functionSignature = node?.metadata?.codedata?.module 
            ? node.metadata.codedata.module.includes('.')
                ? `${node.metadata.codedata.module.split('.').pop()}:${node.metadata.codedata.symbol}` 
                : `${node.metadata.codedata.module}:${node.metadata.codedata.symbol}`
            : node.metadata?.codedata?.symbol;
        const updateData: ExpressionFormField = {
            value: functionSignature + "(",
            key: editorKey,
            cursorPosition: { line: position.endLine.line, offset: position.endLine.offset }
        }
        updateFormField(updateData);
    }


    const getNodesContainer = (nodes: Node[]) => (
        <S.Grid columns={2}>
            {nodes.map((node, index) => {
                return (
                    // <S.Component key={node.id + index} enabled={node.enabled} onClick={() => handleAddFunction(node)}>
                    //     <S.IconContainer>{node.icon || <LogIcon />}</S.IconContainer>
                    //     <S.ComponentTitle>{node.label}</S.ComponentTitle>
                    // </S.Component>
                    <LibraryComponent onClick={() => handleAddFunction(node)}>
                        <IconContainer>
                            {node.icon || <LogIcon />}
                        </IconContainer>
                        <LibraryName>
                            {node.label}
                        </LibraryName>
                    </LibraryComponent>
                );
            })}
        </S.Grid>
    );

    const getFunctionContainer = (categories: PanelCategory[]) => (
        <S.Grid columns={1}>
            {categories.map((category, index) => (
                <GroupList
                    key={category.title + index + "tooltip"}
                    category={category}
                    expand={searchText?.length > 0}
                    onSelect={handleAddFunction}
                />
            ))}
        </S.Grid>
    );


    const getCategoryContainer = (groups: PanelCategory[], isSubCategory = false) => {
        const content = (
            <>
                {groups.map((group, index) => {
                    const isProjectFunctionsCategory = group.title === "Project";
                    if ((!group || group?.items?.length === 0) && !isProjectFunctionsCategory) {
                        return null;
                    }
                    if (searchText && group?.items?.length === 0) {
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
                                    </>
                                )}
                            </S.Row>
                            {group.items.length > 0 && "id" in group.items.at(0)
                                ? getNodesContainer(group.items as Node[])
                                : isProjectFunctionsCategory
                                    ? getFunctionContainer(group.items as PanelCategory[])
                                    : getCategoryContainer(group.items as PanelCategory[], true)}
                        </S.CategoryRow>
                    );
                })}
            </>
        );

        // Check if the content is empty
        const isEmpty = React.Children.toArray(content.props.children).every((child) => child === null);

        return isEmpty ? <div style={{ paddingTop: "10px" }}>No matching results found</div> : content;
    };

    return (
        <PanelBody>
            <S.HeaderContainer>
                <S.Row>
                    <S.StyledSearchInput
                        value={searchText}
                        placeholder="Search"
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
            {!isSearching && categories.length > 0 && (
                <div style={{ height: "calc(100vh - 100px)", width: "380px", overflow: "scroll" }}>{getCategoryContainer(categories)}</div>
            )}
        </PanelBody>

    );
}
