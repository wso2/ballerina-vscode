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

import { HelperPaneHeight, Overlay, ThemeColors } from "@wso2/ui-toolkit";

import { RefObject, useRef } from 'react';

import { debounce } from 'lodash';
import { useCallback, useState } from 'react';
import { LineRange } from '@wso2/ballerina-core';
import {
    TypeHelperCategory,
    TypeHelperComponent,
    TypeHelperItem,
    TypeHelperOperator
} from '@wso2/type-editor';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { filterOperators, filterTypes, getImportedTypes, getTypeBrowserTypes, getTypes } from '../TypeEditor/utils';
import { TYPE_HELPER_OPERATORS } from '../TypeEditor/constants';
import { useMutation } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { LoadingRing } from "../../../components/Loader";
import styled from "@emotion/styled";

const LoadingContainer = styled.div`
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    z-index: 5000;
`;

type TypeHelperProps = {
    fieldKey: string;
    valueTypeConstraint: string;
    typeBrowserRef: RefObject<HTMLDivElement>;
    filePath: string;
    targetLineRange: LineRange;
    currentType: string;
    currentCursorPosition: number;
    helperPaneHeight: HelperPaneHeight;
    typeHelperState: boolean;
    onChange: (newType: string, newCursorPosition: number) => void;
    changeTypeHelperState: (isOpen: boolean) => void;
    updateImports: (key: string, imports: {[key: string]: string}) => void;
    onTypeCreate: (typeName: string) => void;
    onCloseCompletions?: () => void;
};

const TypeHelperEl = (props: TypeHelperProps) => {
    const {
        fieldKey,
        valueTypeConstraint,
        typeHelperState,
        filePath,
        targetLineRange,
        currentType,
        currentCursorPosition,
        helperPaneHeight,
        onChange,
        changeTypeHelperState,
        typeBrowserRef,
        updateImports,
        onTypeCreate,
        onCloseCompletions
    } = props;

    const { rpcClient } = useRpcContext();

    const [loading, setLoading] = useState<boolean>(false);
    const [loadingTypeBrowser, setLoadingTypeBrowser] = useState<boolean>(false);

    const [basicTypes, setBasicTypes] = useState<TypeHelperCategory[]>([]);
    const [importedTypes, setImportedTypes] = useState<TypeHelperCategory[]>([]);
    const [filteredBasicTypes, setFilteredBasicTypes] = useState<TypeHelperCategory[]>([]);
    const [filteredOperators, setFilteredOperators] = useState<TypeHelperOperator[]>([]);
    const [filteredTypeBrowserTypes, setFilteredTypeBrowserTypes] = useState<TypeHelperCategory[]>([]);

    const fetchedInitialTypes = useRef<boolean>(false);

    const debouncedSearchTypeHelper = useCallback(
        debounce((searchText: string, isType: boolean) => {
            if (isType && !fetchedInitialTypes.current) {
                if (rpcClient) {
                    rpcClient
                        .getBIDiagramRpcClient()
                        .getVisibleTypes({
                            filePath: filePath,
                            position: {
                                line: targetLineRange.startLine.line,
                                offset: targetLineRange.startLine.offset
                            },
                            ...(valueTypeConstraint && { typeConstraint: valueTypeConstraint })
                        })
                        .then((types) => {
                            const isFetchingTypesForDM = valueTypeConstraint === "json";
                            const basicTypes = getTypes(types, isFetchingTypesForDM);
                            setBasicTypes(basicTypes);
                            setFilteredBasicTypes(basicTypes);
                            fetchedInitialTypes.current = true;

                            /* Get imported types */
                            rpcClient
                                .getBIDiagramRpcClient()
                                .search({
                                    filePath: filePath,
                                    position: targetLineRange,
                                    queryMap: {
                                        q: '',
                                        offset: 0,
                                        limit: 1000
                                    },
                                    searchKind: 'TYPE'
                                })
                                .then((response) => {
                                    const importedTypes = getImportedTypes(response.categories);
                                    setImportedTypes(importedTypes);
                                })
                                .finally(() => {
                                    setLoading(false);
                                });
                        })
                        .catch((error) => {
                            console.error(error);
                            setLoading(false);
                        });
                }
            } else if (isType) {
                setFilteredBasicTypes(filterTypes(basicTypes, searchText));
                rpcClient
                    .getBIDiagramRpcClient()
                    .search({
                        filePath: filePath,
                        position: targetLineRange,
                        queryMap: {
                            q: searchText,
                            offset: 0,
                            limit: 1000
                        },
                        searchKind: 'TYPE'
                    })
                    .then((response) => {
                        const importedTypes = getImportedTypes(response.categories);
                        setImportedTypes(importedTypes);
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            } else {
                setFilteredOperators(filterOperators(TYPE_HELPER_OPERATORS, searchText));
                setLoading(false);
            }
        }, 150),
        [basicTypes, filePath, targetLineRange]
    );

    const handleSearchTypeHelper = useCallback(
        (searchText: string, isType: boolean) => {
            setLoading(true);
            debouncedSearchTypeHelper(searchText, isType);
        },
        [debouncedSearchTypeHelper, basicTypes]
    );

    const debouncedSearchTypeBrowser = useCallback(
        debounce((searchText: string) => {
            if (rpcClient) {
                rpcClient
                    .getBIDiagramRpcClient()
                    .search({
                        filePath: filePath,
                        position: targetLineRange,
                        queryMap: {
                            q: searchText,
                            offset: 0,
                            limit: 1000
                        },
                        searchKind: 'TYPE'
                        })
                    .then((response) => {
                        setFilteredTypeBrowserTypes(getTypeBrowserTypes(response.categories));
                    })
                    .finally(() => {
                        setLoadingTypeBrowser(false);
                    });
            }
        }, 150),
        [filePath, targetLineRange]
    );

    const handleSearchTypeBrowser = useCallback(
        (searchText: string) => {
            setLoadingTypeBrowser(true);
            debouncedSearchTypeBrowser(searchText);
        },
        [debouncedSearchTypeBrowser]
    );

    const { mutateAsync: addFunction, isPending: isAddingType  } = useMutation({
        mutationFn: (item: TypeHelperItem) => 
            rpcClient.getBIDiagramRpcClient().addFunction({
                filePath: filePath,
                codedata: item.codedata,
                kind: item.kind,
                searchKind: 'TYPE'
            })
    });

    const handleTypeItemClick = async (item: TypeHelperItem) => {
        const response = await addFunction(item);

        if (response) {
            const importStatement = {
                [response.prefix]: response.moduleId
            };
            updateImports(fieldKey, importStatement);
            return response.template;
        }

        return '';
    };

    const handleTypeHelperClose = () => {
        changeTypeHelperState(false);
    };

    const handleTypeCreate = (typeName?: string) => {
        changeTypeHelperState(false);
        onTypeCreate(typeName || 'MyType');
    };

    return (
        <>
            <TypeHelperComponent
                open={typeHelperState}
                currentType={currentType}
                currentCursorPosition={currentCursorPosition}
                loading={loading}
                loadingTypeBrowser={loadingTypeBrowser}
                referenceTypes={basicTypes}
                basicTypes={filteredBasicTypes}
                importedTypes={importedTypes}
                operators={filteredOperators}
                typeBrowserTypes={filteredTypeBrowserTypes}
                typeBrowserRef={typeBrowserRef}
                typeHelperHeight={helperPaneHeight}
                onChange={onChange}
                onSearchTypeHelper={handleSearchTypeHelper}
                onSearchTypeBrowser={handleSearchTypeBrowser}
                onTypeItemClick={handleTypeItemClick}
                onClose={handleTypeHelperClose}
                onTypeCreate={handleTypeCreate}
                onCloseCompletions={onCloseCompletions}
            />
            {isAddingType && createPortal(
                <>
                    <Overlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 5000 }} />
                    <LoadingContainer> <LoadingRing /> </LoadingContainer>
                </>
                , document.body
            )}
        </>
    );
};

export const getTypeHelper = (props: TypeHelperProps) => {
    return (
        <TypeHelperEl {...props} />
    );
};
