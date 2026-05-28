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
import { BrowserEmptyMessage, BrowserItemContainer, BrowserItemLabel, BrowserLoaderContainer, BrowserSectionBody, BrowserSectionContainer, HelperPane, Typography, getIcon } from '@wso2/ui-toolkit';

import { TypeHelperCategory, TypeHelperItem } from '.';
import { EMPTY_SEARCH_RESULT_MSG, EMPTY_SEARCH_TEXT_MSG } from './constant';

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
            {loadingTypeBrowser ? (
                    <BrowserLoaderContainer>
                        <Typography variant="body3">Loading...</Typography>
                    </BrowserLoaderContainer>
                ) : typeBrowserTypes?.length > 0 ? (
                    typeBrowserTypes
                        .filter((category) => 
                            (category.items && category.items.length > 0) || 
                            (category.subCategory && category.subCategory.some(sub => sub.items && sub.items.length > 0))
                        )
                        .map((category) => (
                        <BrowserSectionContainer key={category.category}>
                            <Typography variant="h2" sx={{ margin: 0, fontFamily: 'GilmerMedium', fontSize: '16px', fontWeight: '600' }}>
                                {category.category}
                            </Typography>
                            <BrowserSectionBody columns={category.items?.length > 0 && category.subCategory?.length === 0 ? 3 : 1}>
                                {category.items?.length > 0 ? (
                                    category.items.map((item) => (
                                        <BrowserItemContainer
                                            key={`${category.category}-${item.name}`}
                                            onClick={() => onTypeItemClick(item)}
                                        >
                                            {getIcon(item.type)}
                                            <BrowserItemLabel>{item.name}</BrowserItemLabel>
                                        </BrowserItemContainer>
                                    ))
                                ) : (
                                    !category.subCategory?.length && (
                                        <BrowserEmptyMessage>
                                            No items found
                                        </BrowserEmptyMessage>
                                    )
                                )}
                                {category.subCategory?.filter(sub => sub.items && sub.items.length > 0).map((subCategory) => (
                                    <div key={`${category.category}-${subCategory.category}`} style={{ marginTop: '12px' }}>
                                        <Typography variant="body3" sx={{ fontStyle: "italic", marginBottom: '8px' }}>
                                            {subCategory.category}
                                        </Typography>
                                        <BrowserSectionBody columns={3}>
                                            {subCategory.items?.length > 0 ? (
                                                subCategory.items.map((item) => (
                                                    <BrowserItemContainer
                                                        key={`${subCategory.category}-${item.name}`}
                                                        onClick={() => onTypeItemClick(item)}
                                                    >
                                                        {getIcon(item.type)}
                                                        <BrowserItemLabel>{item.name}</BrowserItemLabel>
                                                    </BrowserItemContainer>
                                                ))
                                            ) : (
                                                <BrowserEmptyMessage>
                                                    No items found
                                                </BrowserEmptyMessage>
                                            )}
                                        </BrowserSectionBody>
                                    </div>
                                ))}
                            </BrowserSectionBody>
                        </BrowserSectionContainer>
                    ))
                ) : (
                    <BrowserEmptyMessage style={{ textAlign: 'center', padding: '20px' }}>
                        {searchValue !== "" ? EMPTY_SEARCH_RESULT_MSG : EMPTY_SEARCH_TEXT_MSG}
                    </BrowserEmptyMessage>
                )}
        </HelperPane.LibraryBrowser>
    );
};
