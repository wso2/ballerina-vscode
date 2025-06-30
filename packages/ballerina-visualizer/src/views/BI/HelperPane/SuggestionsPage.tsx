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

import { debounce } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { LineRange } from "@wso2/ballerina-core";
import { HelperPaneVariableInfo } from "@wso2/ballerina-side-panel";
import { COMPLETION_ITEM_KIND, CompletionItemKind, getIcon, HelperPane } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { convertToHelperPaneVariable, filterHelperPaneVariables } from "../../../utils/bi";

type SuggestionsPageProps = {
    fileName: string;
    targetLineRange: LineRange;
    defaultValue: string;
    onChange: (value: string) => void;
};

export const SuggestionsPage = ({ fileName, targetLineRange, defaultValue, onChange }: SuggestionsPageProps) => {
    const { rpcClient } = useRpcContext();
    const firstRender = useRef<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>("");
    const [variableInfo, setVariableInfo] = useState<HelperPaneVariableInfo | undefined>(undefined);
    const [filteredVariableInfo, setFilteredVariableInfo] = useState<HelperPaneVariableInfo | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const getVariableInfo = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            rpcClient
                .getBIDiagramRpcClient()
                .getVisibleVariableTypes({
                    filePath: fileName,
                    position: {
                        line: targetLineRange.startLine.line,
                        offset: targetLineRange.startLine.offset
                    }
                })
                .then((response) => {
                    if (response.categories?.length) {
                        const convertedHelperPaneVariable = convertToHelperPaneVariable(response.categories);
                        setVariableInfo(convertedHelperPaneVariable);
                        setFilteredVariableInfo(convertedHelperPaneVariable);
                    }
                })
                .then(() => setIsLoading(false));
        }, 150);
    }, [rpcClient, fileName, targetLineRange]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            getVariableInfo();
        }
    }, []);

    const debounceFilterVariables = useCallback(
        debounce((searchText: string) => {
            setFilteredVariableInfo(filterHelperPaneVariables(variableInfo, searchText));
            setIsLoading(false);
        }, 150),
        [variableInfo, setFilteredVariableInfo, setIsLoading, filterHelperPaneVariables]
    );

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        setIsLoading(true);
        debounceFilterVariables(searchText);
    };

    return (
        <>
            <HelperPane.Header
                searchValue={searchValue}
                onSearch={handleSearch}
                titleSx={{ fontFamily: "GilmerRegular" }}
            />
            <HelperPane.Body>
                {defaultValue && (
                    <HelperPane.Section
                        title="Suggestions"
                        titleSx={{ fontFamily: "GilmerMedium" }}
                    >
                        <HelperPane.CompletionItem
                            label={defaultValue}
                            onClick={() => onChange(defaultValue)}
                            getIcon={() => getIcon(COMPLETION_ITEM_KIND.Snippet)}
                        />
                    </HelperPane.Section>
                )}
                {isLoading ? (
                    <HelperPane.Loader />
                ) : (
                    filteredVariableInfo?.category.map((category) => {
                        if (category.items.length === 0) {
                            return null;
                        }

                        return (
                            <HelperPane.Section
                                key={category.label}
                                title={category.label}
                                titleSx={{ fontFamily: 'GilmerMedium' }}
                            >
                                {category.items.map((item) => (
                                    <HelperPane.CompletionItem
                                        key={`${category.label}-${item.label}`}
                                        label={item.label}
                                        type={item.type}
                                        onClick={() => onChange(item.label)}
                                        getIcon={() => getIcon(item.type as CompletionItemKind)}
                                    />
                                ))}
                            </HelperPane.Section>
                        );
                    })
                )}
            </HelperPane.Body>
        </>
    );
};
