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

import { RefObject, useEffect, useRef, useState } from 'react';
import { COMPLETION_ITEM_KIND, getIcon, HelperPane } from '@wso2/ui-toolkit';
import { HelperPaneCompletionItem, HelperPaneFunctionInfo } from '@wso2/ballerina-side-panel';
import { CompletionInsertText } from '@wso2/ballerina-core';

type LibraryBrowserProps = {
    anchorRef: RefObject<HTMLDivElement>;
    isLoading: boolean;
    libraryBrowserInfo: HelperPaneFunctionInfo;
    setFilterText: (filterText: string) => void;
    onBack: () => void;
    onClose: () => void;
    onChange: (insertText: CompletionInsertText) => void;
    onFunctionItemSelect: (item: HelperPaneCompletionItem) => Promise<CompletionInsertText>;
};

export const LibraryBrowser = ({
    anchorRef,
    isLoading,
    libraryBrowserInfo,
    setFilterText,
    onBack,
    onClose,
    onChange,
    onFunctionItemSelect
}: LibraryBrowserProps) => {
    const firstRender = useRef<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>('');

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            setFilterText('');
        }
    }, []);

    const handleSearch = (searchText: string) => {
        setFilterText(searchText);
        setSearchValue(searchText);
    };

    const handleFunctionItemSelect = async (item: HelperPaneCompletionItem) => {
        const { value, cursorOffset } = await onFunctionItemSelect(item);
        onChange({ value, cursorOffset });
        onClose();
    };

    return (
        <HelperPane.LibraryBrowser
            anchorRef={anchorRef}
            loading={isLoading}
            searchValue={searchValue}
            onSearch={handleSearch}
            onClose={onBack}
            title='Function Browser'
            titleSx={{ fontFamily: 'GilmerRegular' }}
        >
            {libraryBrowserInfo?.category.map((category) => (
                <HelperPane.LibraryBrowserSection
                    key={category.label}
                    title={category.label}
                    titleSx={{ fontFamily: 'GilmerMedium' }}
                    {...(category.items?.length > 0 && category.subCategory?.length === 0 && {
                        columns: 4
                    })}
                >
                    {category.items?.map((item) => (
                        <HelperPane.CompletionItem
                            key={`${category.label}-${item.label}`}
                            label={item.label}
                            type={item.type}
                            getIcon={() => getIcon(COMPLETION_ITEM_KIND.Function)}
                            onClick={async () => await handleFunctionItemSelect(item)}
                        />
                    ))}
                    {category.subCategory?.map((subCategory) => (
                        <HelperPane.LibraryBrowserSubSection
                            key={`${category.label}-${subCategory.label}`}
                            title={subCategory.label}
                            columns={4}
                        >
                            {subCategory.items?.map((item) => (
                                <HelperPane.CompletionItem
                                    key={`${category.label}-${subCategory.label}-${item.label}`}
                                    label={item.label}
                                    getIcon={() => getIcon(COMPLETION_ITEM_KIND.Function)}
                                    onClick={async () => await handleFunctionItemSelect(item)}
                                />
                            ))}
                        </HelperPane.LibraryBrowserSubSection>
                    ))}
                </HelperPane.LibraryBrowserSection>
            ))}
        </HelperPane.LibraryBrowser>
    );
};
