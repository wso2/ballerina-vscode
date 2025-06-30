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
// tslint:disable: jsx-no-multiline-js
import React from "react";

import { css } from "@emotion/css";

import { useDMSearchStore } from "../../../../../store/store";

interface SearchHighlightRootProps extends SearchHighlightProps{
    searchText: string;
}

interface SearchHighlightProps {
    children: string;
}

const useStyles = () => ({
    highlighted: css({ background: "var(--vscode-editor-findMatchHighlightBackground)" }),
});

function SearchHighlight({ children, searchText }: SearchHighlightRootProps) {
    const classes = useStyles();
    const parts = children.split(new RegExp(`(${escapeRegExp(searchText)})`, 'gi'));
    return (
        <>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    {part.toLowerCase() === searchText.toLowerCase() ? (
                        <span className={classes.highlighted} data-testid={`search-highlight`}>{part}</span>
                    ) : (
                        part
                    )}
                </React.Fragment>
            ))}
        </>
    );
}

export function InputSearchHighlight({ children }: SearchHighlightProps) {
    const inputSearch = useDMSearchStore((state) => state.inputSearch);
    return <SearchHighlight searchText={inputSearch}>{children}</SearchHighlight>
}

export function OutputSearchHighlight({ children }: SearchHighlightProps) {
    const outputSearch = useDMSearchStore((state) => state.outputSearch);
    return <SearchHighlight searchText={outputSearch}>{children}</SearchHighlight>
}

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
