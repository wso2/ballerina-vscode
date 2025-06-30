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

import React, { useEffect, useState, useCallback, useMemo } from "react";
import styled from "@emotion/styled";
import { ConfigVariable } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, ErrorBanner, Icon, SplitView, TextField, Tooltip, TreeView, TreeViewItem, Typography, View, ViewContent } from "@wso2/ui-toolkit";
import { AddForm } from "../AddConfigurableVariables";
import { TopNavigationBar } from "../../../../components/TopNavigationBar";
import { TitleBar } from "../../../../components/TitleBar";
import ConfigurableItem from "../ConfigurableItem";

const Container = styled.div`
    width: 100%;
    padding: 10px 0px 10px 8px;
    height: calc(100vh - 220px);
    overflow-y: auto;
`;

const SearchStyle = {
    width: '100%',

    '& > vscode-text-field': {
        width: '100%',
        borderRadius: '5px'
    },
};

const EmptyReadmeContainer = styled.div`
    display: flex;
    margin: 80px 0px;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    height: 100%;
`;

const Description = styled(Typography)`
    color: var(--vscode-descriptionForeground);
`;

const ButtonWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    font-size: 10px;
    width: auto;
    margin-left: 15px;
`;

const ConfigValueField = styled.div`
    display: flex;
`;

const TitleBoxShadow = styled.div`
    box-shadow: var(--vscode-scrollbar-shadow) 0 6px 6px -6px inset;
    height: 3px;
`;

const TitleContent = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    gap: 40px;
`;

const ConfigNameTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    height: 20px;
    color: var(--vscode-settings-headerForeground);
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
`;

const searchIcon = (<Codicon name="search" sx={{ cursor: "auto" }} />);

export interface ConfigProps {
    fileName: string;
    org: string;
    package: string;
}

interface CategoryWithModules {
    name: string;
    modules: string[];
}

type ConfigVariablesState = {
    [category: string]: {
        [module: string]: ConfigVariable[];
    };
};

interface PackageModuleState {
    category: string;
    module: string;
}

const Overlay = styled.div`
    position: fixed;
    width: 100vw;
    height: 100vh;
    background: var(--vscode-settings-rowHoverBackground);
    z-index: 1000;
`;

export function ViewConfigurableVariables(props?: ConfigProps) {

    const { rpcClient } = useRpcContext();
    const [configVariables, setConfigVariables] = useState<ConfigVariablesState>({});
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isAddConfigVariableFormOpen, setAddConfigVariableFormOpen] = useState<boolean>(false);
    const [searchValue, setSearchValue] = React.useState<string>('');
    const [categoriesWithModules, setCategoriesWithModules] = useState<CategoryWithModules[]>([]);
    const [selectedModule, setSelectedModule] = useState<PackageModuleState>(null);
    const integrationCategory = `${props.org}/${props.package}`;

    useEffect(() => {
        getConfigVariables();
    }, [props]);

    useEffect(() => {
        if (categoriesWithModules.length > 0 && !selectedModule) {
            const initialCategory = categoriesWithModules[0];
            const initialModule = initialCategory.modules[0];

            // Only set initial module if none is selected
            setSelectedModule({
                category: initialCategory.name,
                module: initialModule
            });
        }
    }, [categoriesWithModules, selectedModule]);

    const getFilteredConfigVariables = useCallback(() => {
        if (!searchValue || searchValue.trim() === '') {
            return configVariables;
        }

        const searchLower = searchValue.toLowerCase();
        const filteredData: ConfigVariablesState = {};

        // Filter through all categories and modules
        Object.keys(configVariables).forEach(category => {
            const categoryModules: { [module: string]: ConfigVariable[] } = {};

            Object.keys(configVariables[category]).forEach(module => {
                // Filter variables that match the search term
                const filteredVariables = configVariables[category][module].filter(variable =>
                    // Match by variable name
                    (variable.properties.variable.value?.toString().toLowerCase().includes(searchLower))
                );

                if (filteredVariables.length > 0) {
                    categoryModules[module] = filteredVariables;
                }
            });

            if (Object.keys(categoryModules).length > 0) {
                filteredData[category] = categoryModules;
            }
        });

        return filteredData;
    }, [configVariables, searchValue]);

    const filteredConfigVariables = useMemo(() => getFilteredConfigVariables(), [getFilteredConfigVariables]);

    const filteredCategoriesWithModules = useMemo(() => {
        return Object.keys(filteredConfigVariables).map(category => ({
            name: category,
            modules: Object.keys(filteredConfigVariables[category])
        }));
    }, [filteredConfigVariables]);

    // Set selected module to first module in filtered results when search changes
    useEffect(() => {
        if (searchValue && filteredCategoriesWithModules.length > 0 && filteredCategoriesWithModules[0].modules.length > 0) {
            const firstCategory = filteredCategoriesWithModules[0];
            const firstModule = firstCategory.modules[0];
            setSelectedModule({
                category: firstCategory.name,
                module: firstModule
            });
        }
    }, [filteredCategoriesWithModules, searchValue]);

    const moduleWarningCount = useCallback((category: string, module: string) => {
        if (!configVariables?.[category]?.[module]) {
            return 0;
        }

        return configVariables[category][module].filter(variable => (
            !variable?.properties?.defaultValue?.value &&
            !variable?.properties?.configValue?.value
        )).length;
    }, [configVariables]);

    const categoryWarningCount = useCallback((category: string) => {
        if (!configVariables?.[category]) {
            return 0;
        }

        return Object.keys(configVariables[category]).reduce((total, module) => {
            return total + moduleWarningCount(category, module);
        }, 0);
    }, [configVariables, moduleWarningCount]);

    const handleSearch = (e: string) => {
        setSearchValue(e);
    }

    const handleModuleSelect = (category: string, module: string) => {
        setSelectedModule({ category, module });
    };

    const handleOpenConfigFile = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .OpenConfigTomlRequest({ filePath: props.fileName });
    }

    const handleAddConfigVariableFormOpen = () => {
        setAddConfigVariableFormOpen(true);
    };

    const handleFormClose = () => {
        setAddConfigVariableFormOpen(false);
    };

    const handleFormSubmit = async () => {
        getConfigVariables();
    }

    const handleOnDeleteConfigVariable = async (index: number) => {
        if (!selectedModule) return;

        const variables = searchValue ?
            filteredConfigVariables[selectedModule.category]?.[selectedModule.module] :
            configVariables[selectedModule.category]?.[selectedModule.module];

        const variable = variables?.[index];
        if (!variable) return;

        rpcClient
            .getBIDiagramRpcClient()
            .deleteConfigVariableV2({
                configFilePath: props.fileName,
                configVariable: variable,
                packageName: selectedModule.category,
                moduleName: selectedModule.module
            })
            .then((response) => {
                if (response.textEdits) {
                    console.log("Successfully deleted configurable variable");
                } else {
                    console.error(">>> Error updating source code", response);
                }
            })
            .finally(() => {
                getConfigVariables();
            });
    };

    const getConfigVariables = async () => {

        let data: ConfigVariablesState = {};
        let errorMsg: string = '';

        await rpcClient
            .getBIDiagramRpcClient()
            .getConfigVariablesV2()
            .then((variables) => {
                data = (variables as any).configVariables;
                errorMsg = (variables as any).errorMsg;
            });

        setConfigVariables(data);
        setErrorMessage(errorMsg);

        // Only set initial selected module if none is selected
        if (!selectedModule) {
            // Extract and set the available categories with their modules
            const extractedCategories = Object.keys(data).map(category => ({
                name: category,
                modules: Object.keys(data[category])
            }));
            setCategoriesWithModules(extractedCategories);

            const initialCategory = extractedCategories[0].name;
            const initialModule = extractedCategories[0].modules[0];
            setSelectedModule({
                category: initialCategory,
                module: initialModule
            });
        }
    };

    const updateErrorMessage = (message: string) => {
        setErrorMessage(message);
    };

    const categoryDisplay = selectedModule?.category === integrationCategory ? 'Integration' : selectedModule?.category;
    const title = selectedModule?.module ? `${categoryDisplay} : ${selectedModule?.module}` : categoryDisplay;

    let renderVariables: ConfigVariablesState = configVariables;
    if (searchValue) {
        renderVariables = getFilteredConfigVariables();
    }

    return (
        <View>
            <TopNavigationBar />
            <TitleBar title="Configurable Variables" subtitle="View and manage configurable variables" actions={
                <div style={{ display: "flex", gap: '12px', alignItems: 'center' }}>
                    {errorMessage &&
                        <Tooltip content={errorMessage}>
                            <Codicon name="error"
                                sx={{
                                    marginLeft: 5,
                                    color: 'var(--vscode-editorError-foreground)'
                                }}
                                iconSx={{
                                    fontSize: '16px'
                                }}
                            />
                        </Tooltip>
                    }
                    <Button appearance="secondary" onClick={handleOpenConfigFile}>
                        <Icon sx={{ marginRight: 5, paddingTop: '2px' }} name="editIcon" />Edit in Config.toml
                    </Button>
                </div>
            } />
            {isAddConfigVariableFormOpen && <Overlay data-testid="config-overlay" />}
            <ViewContent padding>
                <div style={{ height: 'calc(100vh - 220px)' }}>
                    {/* Search bar and filters */}
                    <SearchContainer>
                        <TextField
                            sx={SearchStyle}
                            placeholder="Search Configurables"
                            value={searchValue}
                            onTextChange={handleSearch}
                            icon={{
                                iconComponent: searchIcon,
                                position: 'start',
                            }}
                            autoFocus={true}
                        />
                    </SearchContainer>
                    <div style={{ width: "auto" }}>
                        <SplitView defaultWidths={[20, 80]}>
                            {/* Left side tree view */}
                            <div id={`package-treeview`} style={{ padding: "10px 0 50px 0" }}>
                                {/* Display integration category first */}
                                {(searchValue ? filteredCategoriesWithModules : categoriesWithModules)
                                    .filter(category => category.name === integrationCategory)
                                    .map((category, index) => (
                                        <TreeView
                                            key={category.name}
                                            rootTreeView
                                            id={category.name}
                                            expandByDefault={true}
                                            onSelect={() => {
                                                if (category.modules.length > 0) {
                                                    handleModuleSelect(category.name, category.modules[0]);
                                                }
                                            }}
                                            treeViewElementSX={{
                                                border: selectedModule?.category === category.name && selectedModule?.module === ""
                                                    ? '1px solid var(--vscode-focusBorder)'
                                                    : 'none'
                                            }}
                                            content={
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        height: '22px',
                                                        alignItems: 'center',
                                                    }}>
                                                    <Typography
                                                        variant="body3"
                                                        sx={{
                                                            fontWeight: selectedModule?.category === category.name && selectedModule?.module === ""
                                                                ? 'bold' : 'normal'
                                                        }}
                                                    >
                                                        Integration
                                                    </Typography>
                                                    {categoryWarningCount(category.name) > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            <Codicon name="warning"
                                                                sx={{
                                                                    marginLeft: 5,
                                                                    fontSize: '0.8em',
                                                                    color: 'var(--vscode-editorWarning-foreground)'
                                                                }}
                                                            />
                                                            <span
                                                                style={{
                                                                    marginLeft: 3,
                                                                    color: 'var(--vscode-editorWarning-foreground)',
                                                                    fontSize: '0.85em'
                                                                }}>
                                                                {categoryWarningCount(category.name)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            }
                                        >
                                            {category.modules.filter(moduleName => moduleName !== "").map((moduleName) => (
                                                <TreeViewItem
                                                    key={`${category.name}-${moduleName}`}
                                                    id={`${category.name}-${moduleName}`}
                                                    sx={{
                                                        backgroundColor: 'transparent',
                                                        paddingLeft: '35px',
                                                        height: '25px',
                                                        border: selectedModule?.category === category.name && selectedModule?.module === moduleName
                                                            ? '1px solid var(--vscode-focusBorder)'
                                                            : 'none'
                                                    }}
                                                    selectedId={`${category.name}-${moduleName}`}
                                                >
                                                    <div
                                                        style={{ display: 'flex', height: '20px', alignItems: 'center' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleModuleSelect(category.name, moduleName);
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body3"
                                                            sx={{
                                                                fontWeight: selectedModule?.category === category.name && selectedModule?.module === moduleName
                                                                    ? 'bold' : 'normal'
                                                            }}
                                                        >
                                                            {moduleName}
                                                        </Typography>
                                                        {moduleWarningCount(category.name, moduleName) > 0 && (
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                <Codicon
                                                                    name="warning"
                                                                    sx={{
                                                                        marginLeft: 5,
                                                                        fontSize: '0.8em',
                                                                        color: 'var(--vscode-editorWarning-foreground)'
                                                                    }}
                                                                />
                                                                <span style={{ marginLeft: 3, color: 'var(--vscode-editorWarning-foreground)', fontSize: '0.85em' }}>
                                                                    {moduleWarningCount(category.name, moduleName)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TreeViewItem>
                                            ))}
                                        </TreeView>
                                    ))}

                                {/* Group all other categories under "Imported libraries" */}
                                {(searchValue ? filteredCategoriesWithModules : categoriesWithModules)
                                    .filter(category => category.name !== integrationCategory).length > 0 && (
                                        <TreeView
                                            rootTreeView
                                            id="imported-libraries"
                                            expandByDefault={true}
                                            content={
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        height: '22px',
                                                        alignItems: 'center',
                                                    }}>
                                                    <Typography
                                                        variant="body3"
                                                        sx={{
                                                            fontWeight: 'normal'
                                                        }}
                                                    >
                                                        Imported libraries
                                                    </Typography>
                                                </div>
                                            }
                                        >
                                            {/* Map all non-integration categories */}
                                            {(searchValue ? filteredCategoriesWithModules : categoriesWithModules)
                                                .filter(category => category.name !== integrationCategory)
                                                .map((category, index) => (
                                                    <TreeViewItem
                                                        key={category.name}
                                                        id={category.name}
                                                        sx={{
                                                            backgroundColor: 'transparent',
                                                            paddingLeft: '35px',
                                                            height: '25px',
                                                            border: selectedModule?.category === category.name
                                                                ? '1px solid var(--vscode-focusBorder)'
                                                                : 'none',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        selectedId={category.name}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                height: '22px',
                                                                alignItems: 'center'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleModuleSelect(category.name, "");
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="body3"
                                                                sx={{
                                                                    fontWeight: selectedModule?.category === category.name && selectedModule?.module === ""
                                                                        ? 'bold' : 'normal'
                                                                }}
                                                            >
                                                                {category.name}
                                                            </Typography>
                                                            {categoryWarningCount(category.name) > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                    <Codicon name="warning"
                                                                        sx={{
                                                                            marginLeft: 5,
                                                                            fontSize: '0.8em',
                                                                            color: 'var(--vscode-editorWarning-foreground)'
                                                                        }}
                                                                    />
                                                                    <span
                                                                        style={{
                                                                            marginLeft: 3,
                                                                            color: 'var(--vscode-editorWarning-foreground)',
                                                                            fontSize: '0.85em'
                                                                        }}>
                                                                        {categoryWarningCount(category.name)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TreeViewItem>
                                                ))}
                                        </TreeView>
                                    )}
                            </div>
                            {/* Right side view */}
                            <div style={{ height: '100%' }}>
                                <>
                                    {!renderVariables ?
                                        <ErrorBanner errorMsg={"Error fetching config variables"} />
                                        : searchValue && filteredCategoriesWithModules.length === 0 ?
                                            <EmptyReadmeContainer>
                                                <Icon
                                                    name="searchIcon"
                                                    sx={{
                                                        fontSize: '3em',
                                                        color: 'var(--vscode-descriptionForeground)',
                                                        marginBottom: '10px'
                                                    }} />
                                                <Description variant="body2">
                                                    No configurable variables found matching "{searchValue}" in any module
                                                </Description>
                                                <Button appearance="secondary" onClick={() => setSearchValue('')}>
                                                    Clear Search
                                                </Button>
                                            </EmptyReadmeContainer>
                                            : <>
                                                <div
                                                    id="TitleDiv"
                                                    style={{
                                                        position: "sticky", top: 0, color: "var(--vscode-editor-foreground)",
                                                        backgroundColor: "var(--vscode-editor-background)"
                                                    }}>
                                                    <TitleContent>
                                                        <Typography
                                                            variant="h2"
                                                            sx={{
                                                                padding: "0px 0 0 20px",
                                                                margin: "10px 0px",
                                                                color: "var(--vscode-foreground)"
                                                            }}>
                                                            {title}
                                                        </Typography>
                                                        {/* Only show Add Config button at the top when the module has configurations */}
                                                        {selectedModule &&
                                                            renderVariables[selectedModule?.category]?.[selectedModule?.module]?.length > 0 &&
                                                            selectedModule.category === integrationCategory && (
                                                                <Button
                                                                    sx={{ display: 'flex', justifySelf: 'flex-end' }}
                                                                    appearance="primary"
                                                                    onClick={handleAddConfigVariableFormOpen}
                                                                >
                                                                    <Codicon name="add" sx={{ marginRight: 5 }} />Add Config
                                                                </Button>
                                                            )}
                                                    </TitleContent>
                                                    <TitleBoxShadow />
                                                </div>
                                                <Container>
                                                    {selectedModule && (
                                                        <>
                                                            {/* Check if the selected module exists in the variables */}
                                                            {renderVariables[selectedModule?.category] &&
                                                                renderVariables[selectedModule?.category][selectedModule?.module] && (
                                                                    <div key={`${selectedModule?.category}-${selectedModule?.module}`}>
                                                                        {renderVariables[selectedModule?.category][selectedModule?.module].length > 0 ? (
                                                                            /* Variables under this selected module */
                                                                            renderVariables[selectedModule?.category][selectedModule?.module].map((variable, index) => (
                                                                                <ConfigurableItem
                                                                                    key={`${selectedModule.category}-${selectedModule.module}-${index}`}
                                                                                    variable={variable}
                                                                                    integrationCategory={integrationCategory}
                                                                                    packageName={selectedModule.category}
                                                                                    moduleName={selectedModule.module}
                                                                                    index={index}
                                                                                    fileName={props.fileName}
                                                                                    onDeleteConfigVariable={handleOnDeleteConfigVariable}
                                                                                    onFormSubmit={handleFormSubmit}
                                                                                    updateErrorMessage={updateErrorMessage}
                                                                                />
                                                                            ))
                                                                        ) : (
                                                                            // No variables in this module (not search related)
                                                                            <EmptyReadmeContainer>
                                                                                <Description variant="body2">
                                                                                    No configurable variables found in this module
                                                                                </Description>
                                                                                <Button
                                                                                    appearance="primary"
                                                                                    onClick={handleAddConfigVariableFormOpen}>
                                                                                    <Codicon name="add" sx={{ marginRight: 5 }} />
                                                                                    Add Config
                                                                                </Button>
                                                                            </EmptyReadmeContainer>
                                                                        )}
                                                                    </div>
                                                                )
                                                            }
                                                        </>
                                                    )}
                                                    {isAddConfigVariableFormOpen && selectedModule &&
                                                        <AddForm
                                                            isOpen={isAddConfigVariableFormOpen}
                                                            onClose={handleFormClose}
                                                            onSubmit={handleFormSubmit}
                                                            title={`Add Configurable Variable`}
                                                            filename={props.fileName}
                                                            packageName={selectedModule.category}
                                                            moduleName={selectedModule.module}
                                                        />
                                                    }
                                                </Container >
                                            </>
                                    }
                                </>
                            </div>
                        </SplitView>
                    </div>
                </div>
            </ViewContent>
        </View>
    );
}

export default ViewConfigurableVariables;
