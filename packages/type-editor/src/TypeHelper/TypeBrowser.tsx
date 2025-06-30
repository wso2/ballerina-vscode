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

import React, { RefObject, useEffect, useRef, useState } from 'react';
import { Codicon, getIcon, HelperPane } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';

import { TypeHelperCategory, TypeHelperItem } from '.';
import { EMPTY_SEARCH_RESULT_MSG, EMPTY_SEARCH_TEXT_MSG } from './constant';

const SearchMsg = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: var(--vscode-descriptionForeground)
`;

type TypeBrowserProps = {
    typeBrowserRef: RefObject<HTMLDivElement>;
    loadingTypeBrowser: boolean;
    typeBrowserTypes: TypeHelperCategory[];
    onSearchTypeBrowser: (searchText: string) => void;
    onTypeItemClick: (item: TypeHelperItem) => Promise<void>;
    onClose: () => void;
};

export const TypeBrowser = (props: TypeBrowserProps) => {
    const {
        typeBrowserRef,
        loadingTypeBrowser,
        typeBrowserTypes,
        onSearchTypeBrowser,
        onTypeItemClick,
        onClose
    } = props;

    const firstRender = useRef<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>('');

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        onSearchTypeBrowser(searchText);
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            onSearchTypeBrowser('');
            return;
        }
    }, [typeBrowserTypes]);

    return (
        <HelperPane.LibraryBrowser
            anchorRef={typeBrowserRef}
            loading={loadingTypeBrowser}
            searchValue={searchValue}
            onSearch={handleSearch}
            onClose={onClose}
            title="Type Browser"
            titleSx={{ fontFamily: 'GilmerRegular' }}
        >
            {typeBrowserTypes?.length > 0 ? (
                typeBrowserTypes.map((category) => (
                    <HelperPane.Section
                        key={category.category}
                        title={category.category}
                        titleSx={{ fontFamily: 'GilmerMedium' }}
                        {...(category.items?.length > 0 &&
                            category.subCategory?.length === 0 && {
                                columns: 4
                            })}
                    >
                        {category.items?.map((item) => (
                            <HelperPane.CompletionItem
                                key={`${category.category}-${item.name}`}
                                label={item.name}
                                getIcon={() => getIcon(item.type)}
                                onClick={() => onTypeItemClick(item)}
                            />
                        ))}
                        {category.subCategory?.map((subCategory) => (
                            <HelperPane.LibraryBrowserSubSection
                                key={subCategory.category}
                                title={subCategory.category}
                                columns={4}
                            >
                                {subCategory.items?.map((item) => (
                                    <HelperPane.CompletionItem
                                        key={`${subCategory.category}-${item.name}`}
                                        label={item.name}
                                        getIcon={() => getIcon(item.type)}
                                        onClick={() => onTypeItemClick(item)}
                                    />
                                ))}
                            </HelperPane.LibraryBrowserSubSection>
                        ))}
                    </HelperPane.Section>
                ))
            ) : (
                <SearchMsg>
                    <Codicon name='search' sx={{ marginRight: '10px' }} />
                    <p>
                        {searchValue !== "" ? EMPTY_SEARCH_RESULT_MSG : EMPTY_SEARCH_TEXT_MSG}
                    </p>
                </SearchMsg>
            )}
        </HelperPane.LibraryBrowser>
    );
};
