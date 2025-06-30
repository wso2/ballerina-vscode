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

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Codicon, COMPLETION_ITEM_KIND, Dropdown, getIcon, HelperPane, OptionProps, TextField, Typography } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { HelperPaneVariableInfo } from "@wso2/ballerina-side-panel";
import { LineRange, ConfigVariable, NodeProperties } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { convertToHelperPaneConfigurableVariable, filterHelperPaneVariables } from "../../../utils/bi";
import { URI, Utils } from "vscode-uri";
import { FieldValues, useForm } from "react-hook-form";
import { debounce } from "lodash";

type ConfigurablePageProps = {
    onChange: (value: string) => void;
};

namespace S {
    export const Form = styled.div`
        display: flex;
        flex-direction: column;
        gap: 8px;
        background-color: var(--vscode-menu-background);
        padding: 10px;
        border-radius: 4px;
    `

    export const FormBody = styled.div`
        display: flex;
        flex-direction: column;
        gap: 12px;
    `;

    export const ButtonPanel = styled.div`
        display: flex;
        margin-top: 20px;
        margin-left: auto;
        gap: 16px;
    `;
}

const getConfigVariable = (fileName: string, lineRange: LineRange, values?: FieldValues): ConfigVariable => {
    return {
        id: '',
        metadata: {
            label: 'Config',
            description: 'Create a configurable variable'
        },
        codedata: {
            node: 'CONFIG_VARIABLE',
            lineRange: {
                fileName: fileName,
                startLine: lineRange.startLine,
                endLine: lineRange.endLine
            }
        },
        returning: false,
        properties: {
            type: {
                metadata: {
                    label: 'Type',
                    description: 'Type of the variable'
                },
                valueType: 'TYPE',
                value: values?.type ?? '',
                optional: false,
                advanced: false,
                editable: true
            },
            variable: {
                metadata: {
                    label: 'Variable',
                    description: 'Name of the variable'
                },
                valueType: 'IDENTIFIER',
                value: values?.variable ?? '',
                valueTypeConstraint: 'Global',
                optional: false,
                advanced: false,
                editable: true
            },
            defaultable: {
                metadata: {
                    label: 'Default value',
                    description: 'Default value for the config, if empty your need to provide a value at runtime'
                },
                valueType: 'EXPRESSION',
                value: values?.defaultable ?? '',
                optional: true,
                advanced: true,
                editable: true
            }
        },
        branches: []
    };
};

export const ConfigurablePage = ({ onChange }: ConfigurablePageProps) => {
    const { rpcClient } = useRpcContext();
    const firstRender = useRef<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>("");
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [configurableInfo, setConfigurableInfo] = useState<HelperPaneVariableInfo | undefined>(undefined);
    const [filteredConfigurableInfo, setFilteredConfigurableInfo] = useState<HelperPaneVariableInfo | undefined>(
        undefined
    );
    const [confTypes, setConfTypes] = useState<OptionProps[]>([]);
    const [endLineRange, setEndLineRange] = useState<LineRange | undefined>();
    const [isValid, setIsValid] = useState<boolean>(false);
    const [configFilePath, setConfigFilePath] = useState<string>();

    const {
        register,
        handleSubmit,
        reset,
        getValues,
        setError,
        setValue,
        formState: { errors }
    } = useForm({
        mode: "onChange"
    });

    const getConfigurableVariableInfo = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            // Get project path
            rpcClient.getVisualizerLocation().then((location) => {
                const configFilePath = Utils.joinPath(URI.file(location.projectUri), 'config.bal').fsPath;
                setConfigFilePath(configFilePath);

                // Get end line range
                rpcClient
                    .getBIDiagramRpcClient()
                    .getEndOfFile({
                        filePath: configFilePath
                    })
                    .then((linePosition) => {
                        setEndLineRange({
                            startLine: linePosition,
                            endLine: linePosition
                        });

                        // Get visible variable types
                        rpcClient
                            .getBIDiagramRpcClient()
                            .getVisibleVariableTypes({
                                filePath: configFilePath,
                                position: linePosition
                            })
                            .then((response) => {
                                if (response.categories?.length) {
                                    const convertedConfigurableInfo = convertToHelperPaneConfigurableVariable(
                                        response.categories
                                    );
                                    setConfigurableInfo(convertedConfigurableInfo);
                                    setFilteredConfigurableInfo(convertedConfigurableInfo);
                                }
                                setIsLoading(false);
                            });
                    });
            });
        }, 150);
    }, [rpcClient]);

    const handleSaveConfigurables = async (values: FieldValues) => {
        const variable: ConfigVariable = getConfigVariable('config.bal', endLineRange, values);

        variable.properties.defaultable.value =
            values.defaultable === "" || values.defaultable === null ? "?" : values.defaultable;
        variable.properties.defaultable.optional = true;

        rpcClient
            .getBIDiagramRpcClient()
            .updateConfigVariables({
                configVariable: variable,
                configFilePath: configFilePath,
            })
            .then((response: any) => {
                console.log(">>> Config variables------", response);
                getConfigurableVariableInfo();
            });
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            getConfigurableVariableInfo();
        }
    }, []);

    const debounceFilterConfigurables = useCallback(
        debounce((searchText: string) => {
            setFilteredConfigurableInfo(filterHelperPaneVariables(configurableInfo, searchText));
            setIsLoading(false);
        }, 150),
        [configurableInfo, setFilteredConfigurableInfo, setIsLoading, filterHelperPaneVariables]
    );

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        setIsLoading(true);
        debounceFilterConfigurables(searchText);
    };

    const clearForm = () => {
        setIsFormVisible(false);
        reset();
    };

    const handleSave = (values: FieldValues) => {
        handleSaveConfigurables(values)
            .then(() => {
                setIsFormVisible(false);
                reset();
            })
            .catch((error) => {
                console.error("Failed to save variable:", error);
            });
    };

    useEffect(() => {
        if (isFormVisible) {
            rpcClient
                .getBIDiagramRpcClient()
                .getVisibleTypes({
                    filePath: configFilePath,
                    position: endLineRange?.startLine,
                    typeConstraint: "anydata"
                })
                .then((types) => {
                    const typesWithoutDuplicates = types?.filter(type => !type.labelDetails.detail.includes("Used"))
                    setConfTypes(
                        typesWithoutDuplicates.map((type) => ({
                            id: type.label,
                            content: type.label,
                            value: type.insertText
                        }))
                    );
                    setValue('type', typesWithoutDuplicates?.[0]?.label);
                });
        }
    }, [isFormVisible]);

    const fetchDiagnostics = useCallback(
        debounce(async () => {
            const configVariable = getConfigVariable(
                'config.bal',
                endLineRange
            );
            let isValid = true;
            for (const [key, value] of Object.entries(getValues())) {
                // HACK: skip diagnostics for defaultable property with an empty value
                if (key === 'defaultable' && value === '') {
                    continue;
                }

                const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
                    filePath: configFilePath,
                    context: {
                        expression: value,
                        startLine: endLineRange?.startLine,
                        offset: 0,
                        lineOffset: 0,
                        codedata: configVariable.codedata,
                        property: configVariable.properties[key as keyof NodeProperties]
                    }
                });

                if (response.diagnostics.length > 0) {
                    const diagnosticsMessage = response.diagnostics.map((d) => d.message).join('\n');
                    setError(key, { type: 'validate', message: diagnosticsMessage });
                    isValid = false;
                }
            }
            setIsValid(isValid);
        }, 150),
        [rpcClient, endLineRange, getValues, setError]
    );

    const validateInput = useCallback(() => {
        fetchDiagnostics();
    }, [fetchDiagnostics]);

    return (
        <>
            <HelperPane.Header
                searchValue={searchValue}
                onSearch={handleSearch}
                titleSx={{ fontFamily: 'GilmerRegular' }}
            />
            <HelperPane.Body loading={isLoading}>
                {!isFormVisible ? (
                    filteredConfigurableInfo?.category.map((category) => {
                        if (!category.items || category.items.length === 0) {
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
                                        getIcon={() => getIcon(COMPLETION_ITEM_KIND.Variable)}
                                    />
                                ))}
                            </HelperPane.Section>
                        );
                    })
                ) : endLineRange && (
                    <S.Form>
                        <Typography variant="body2" sx={{ fontFamily: 'GilmerMedium' }}>
                            Create New Configurable Variable
                        </Typography>
                        <S.FormBody>
                            <TextField
                                id="variable"
                                label="Name"
                                placeholder="Enter a name for the variable"
                                required
                                {...register('variable', {
                                    onChange: validateInput
                                })}
                                errorMsg={errors.variable?.message?.toString()}
                            />
                            <Dropdown
                                id="type"
                                label="Type"
                                items={confTypes}
                                {...register('type', {
                                    onChange: validateInput
                                })}
                            />
                            <TextField
                                id="defaultable"
                                label="Default Value"
                                placeholder="Enter default value for the variable"
                                {...register('defaultable', {
                                    onChange: validateInput
                                })}
                                errorMsg={errors.defaultable?.message?.toString()}
                            />
                        </S.FormBody>
                        <S.ButtonPanel>
                            <Button appearance="secondary" onClick={clearForm}>
                                Cancel
                            </Button>
                            <Button appearance="primary" onClick={handleSubmit(handleSave)} disabled={!isValid}>
                                Save
                            </Button>
                        </S.ButtonPanel>
                    </S.Form>
                )}
            </HelperPane.Body>
            {!isFormVisible && (
                <HelperPane.Footer>
                    <HelperPane.IconButton
                        title="Create New Configurable Variable"
                        getIcon={() => <Codicon name="add" />}
                        onClick={() => setIsFormVisible(true)}
                    />
                </HelperPane.Footer>
            )}
        </>
    );
};
