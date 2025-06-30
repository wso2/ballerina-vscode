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

import React, { RefObject, useRef, useState } from 'react';

import { CheckBox, CheckBoxGroup, ClickAwayListener, Codicon } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';

const DropDownContainer = styled.div({
    position: "absolute",
    top: "100%",
    right: "0",
    zIndex: 5,
    backgroundColor: "var(--vscode-sideBar-background)",
    padding: "5px"
});

const SearchBoxOptionsContainer = styled.div({
    display: "flex",
    flexDirection: "row"
});

interface HeaderSearchBoxOptionsProps {
    searchTerm: string;
    searchInputRef: RefObject<HTMLInputElement>;
    searchOptions: string[];
    searchOptionsData: { value: string, label: string }[];
    handleSearchOptions: (options: string[]) => void;
    handleOnSearchTextClear: () => void;
}

export function HeaderSearchBoxOptions(props: HeaderSearchBoxOptionsProps) {
    const {
        searchTerm,
        searchInputRef,
        searchOptions,
        handleSearchOptions,
        handleOnSearchTextClear,
        searchOptionsData
    } = props;

    const [showSearchOptions, setShowSearchOptions] = useState(false);
    const showSearchOptionsRef = useRef(null);

    const handleSearchOptionsChange = (checked: boolean, value: string) => {
        if (checked) {
            if (searchOptions.indexOf(value) === -1) {
                handleSearchOptions([value, ...searchOptions]);
            }
        } else {
            handleSearchOptions(searchOptions.filter(option => option !== value));
        }
        searchInputRef.current.shadowRoot.querySelector('input').focus();
    };

    return (
        <SearchBoxOptionsContainer>
            {searchTerm && (
                <Codicon
                    name="close"
                    onClick={handleOnSearchTextClear}
                    sx={{ marginRight: "5px" }}
                />
            )}

            <div>
                <div ref={showSearchOptionsRef}>
                    <Codicon
                        name={showSearchOptions ? "chevron-up" : "chevron-down"}
                        onClick={() => setShowSearchOptions(!showSearchOptions)}
                    />
                </div>
                <ClickAwayListener
                    onClickAway={() => { setShowSearchOptions(false); }}
                    anchorEl={showSearchOptionsRef.current}
                >
                    {showSearchOptions && (
                        <DropDownContainer>
                            <CheckBoxGroup direction="vertical">
                                {searchOptionsData.map((item) => (
                                    <CheckBox
                                        checked={searchOptions.indexOf(item.value) > -1}
                                        label={item.label}
                                        onChange={(checked) => {
                                            handleSearchOptionsChange(checked, item.value);
                                        }}
                                        value={item.value}
                                    />
                                ))}
                            </CheckBoxGroup>
                        </DropDownContainer>
                    )}
                </ClickAwayListener>
            </div>
        </SearchBoxOptionsContainer>
    );
};
