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

import { CompletionInsertText, ConfigVariable, FlowNode, LineRange, TomlPackage } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ReactNode, useEffect, useState } from "react";
import ExpandableList from "../Components/ExpandableList";
import { Button, CheckBox, Divider, SearchBox, TextField, Typography } from "@wso2/ui-toolkit";
import { ScrollableContainer } from "../Components/ScrollableContainer";
import FooterButtons from "../Components/FooterButtons";
import FormGenerator from "../../Forms/FormGenerator";
import { URI, Utils } from "vscode-uri";
import { POPUP_IDS, useModalStack } from "../../../../Context";
import { HelperPaneIconType, getHelperPaneIcon } from "../utils/iconUtils";
import { HelperPaneListItem } from "../Components/HelperPaneListItem";
import { TypeIndicator } from "../Components/TypeIndicator";
import { EmptyItemsPlaceHolder } from "../Components/EmptyItemsPlaceHolder";
import { HelperPaneCustom } from "@wso2/ui-toolkit";
import { useHelperPaneNavigation } from "../hooks/useHelperPaneNavigation";
import { BreadcrumbNavigation } from "../Components/BreadcrumbNavigation";
import { InputMode } from "@wso2/ballerina-side-panel";

type ConfigVariablesState = {
    [category: string]: {
        [module: string]: ConfigVariable[];
    };
};

type ListItem = {
    name: string;
    items: any[]
}

export type ConfigurablesPageProps = {
    onChange: (insertText: string | CompletionInsertText, isRecordConfigureChange?: boolean) => void;
    isInModal?: boolean;
    anchorRef: React.RefObject<HTMLDivElement>;
    fileName: string;
    targetLineRange: LineRange;
    onClose?: () => void;
    inputMode?: InputMode;
    excludedConfigs?: string[];
    onAddNewConfigurable?: (refreshConfigVariables: () => Promise<void>) => void;
    showAddNew?: boolean;
}


export const Configurables = (props: ConfigurablesPageProps) => {
    const { onChange, onClose, fileName, targetLineRange, excludedConfigs = [], onAddNewConfigurable, showAddNew = true } = props;

    const { rpcClient } = useRpcContext();
    const { breadCrumbSteps, navigateToNext, navigateToBreadcrumb, isAtRoot } = useHelperPaneNavigation("Configurables");
    const [configVariables, setConfigVariables] = useState<ListItem[]>([]);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [configVarNode, setCofigVarNode] = useState<FlowNode>();
    const [isSaving, setIsSaving] = useState(false);
    const [packageInfo, setPackageInfo] = useState<TomlPackage>();
    const [isImportEnv, setIsImportEnv] = useState<boolean>(false);
    const [projectPathUri, setProjectPathUri] = useState<string>();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showContent, setShowContent] = useState<boolean>(false);
    const [searchValue, setSearchValue] = useState<string>("");

    const { addModal, closeModal } = useModalStack();

    useEffect(() => {
        const fetchNode = async () => {
            const node = await rpcClient.getBIDiagramRpcClient().getConfigVariableNodeTemplate({
                isNew: true,
                isEnvVariable: isImportEnv
            });
            if (fileName.includes("/tests/")) {
                if (!node.flowNode.codedata.data) {
                    node.flowNode.codedata.data = {};
                }
                node.flowNode.codedata.data["filePath"] = fileName;
            }
            setCofigVarNode(node.flowNode);
        };

        fetchNode();
    }, [isImportEnv]);

    useEffect(() => {
        setConfigVariables([]);
        getConfigVariables()
        getProjectInfo()
        const fetchTomlValues = async () => {
            try {
                const tomValues = await rpcClient.getCommonRpcClient().getCurrentProjectTomlValues();
                setPackageInfo(tomValues?.package);
            } catch (error) {
                console.error("Failed to fetch TOML values:", error);
                setPackageInfo({
                    org: "",
                    name: "",
                    version: "",
                    title: ""
                });
            }
        };

        fetchTomlValues();
    }, [excludedConfigs])

    const getProjectInfo = async () => {
        const visualizerContext = await rpcClient.getVisualizerLocation();
        setProjectPathUri(URI.file(visualizerContext.projectPath).fsPath);
    }

    const getConfigVariables = async () => {
        let data: ConfigVariablesState = {};
        let errorMsg: string = '';

        setIsLoading(true);

        // Only apply minimum loading time if we don't have any config variables yet
        const shouldShowMinLoader = Object.keys(configVariables).length === 0 && !showContent;
        const minLoadingTime = shouldShowMinLoader ? new Promise(resolve => setTimeout(resolve, 500)) : Promise.resolve();

        await Promise.all([
            rpcClient
                .getBIDiagramRpcClient()
                .getConfigVariablesV2({
                    includeLibraries: false,
                    projectPath: projectPathUri
                })
                .then((variables) => {
                    data = (variables as any).configVariables;
                    errorMsg = (variables as any).errorMsg;
                }),
            minLoadingTime
        ]).finally(() => {
            setIsLoading(false);
            setShowContent(true);
        });

        let configVariablesArr = translateToArrayFormat(data).filter(data =>
            Array.isArray(data.items) &&
            data.items.some(sub => Array.isArray(sub.items) && sub.items.length > 0)
        );

        configVariablesArr =  configVariablesArr.map(category => ({
            ...category,
            items: category.items.map(subCategory => ({
                ...subCategory,
                items: subCategory.items.filter((item: ConfigVariable) => {
                    const value = item?.properties?.variable?.value as string;
                    return !excludedConfigs.includes(value);
                })
            })).filter(subCategory => subCategory.items.length > 0)
        })).filter(category => category.items.length > 0);


        setConfigVariables(configVariablesArr);
        setErrorMessage(errorMsg);
    };

    const handleSave = async (node: FlowNode) => {
        closeModal(POPUP_IDS.CONFIGURABLES);
        //TODO: Need to disable the form before saving and move form close to finally block
        setIsSaving(true);
        node.properties.defaultValue.modified = true;
        await rpcClient.getBIDiagramRpcClient().updateConfigVariablesV2({
            configFilePath: Utils.joinPath(URI.file(projectPathUri), 'config.bal').fsPath,
            configVariable: node,
            packageName: `${packageInfo.org}/${packageInfo.name}`,
            moduleName: "",
        }).finally(() => {
            setIsSaving(false);
            getConfigVariables();
            onChange(node.properties.variable.value as string, false);
        });
    };

    const translateToArrayFormat = (object: object): ListItem[] => {
        if (Array.isArray(object)) return object;
        const keys = Object.keys(object);
        return keys.map((key): { name: string; items: object[] } => {
            return {
                name: key,
                items: translateToArrayFormat((object as Record<string, object>)[key])
            }
        });
    }

    const handleItemClicked = (name: string) => {
        onChange(name, false)
        onClose && onClose();
    }

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
    };

    const handleAddNewConfigurable = () => {
        // Use override if provided
        if (onAddNewConfigurable) {
            onAddNewConfigurable(getConfigVariables);
            return;
        }

        addModal(
            <FormGenerator
                fileName={fileName}
                node={configVarNode}
                connections={[]}
                targetLineRange={targetLineRange}
                projectPath={projectPathUri}
                editForm={false}
                onSubmit={handleSave}
                showProgressIndicator={false}
                resetUpdatedExpressionField={() => { }}
                isInModal={true}
            />, POPUP_IDS.CONFIGURABLES, "New Configurable", 650)

        onClose && onClose();
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
        }}>
            <BreadcrumbNavigation
                breadCrumbSteps={breadCrumbSteps}
                onNavigateToBreadcrumb={(step) => navigateToBreadcrumb(step)}
            />
            {(() => {
                const filteredCategories = translateToArrayFormat(configVariables)
                    .filter(category =>
                        Array.isArray(category.items) &&
                        category.items.some(sub => Array.isArray(sub.items) && sub.items.length > 0)
                    );

                // Count total items across all categories
                const totalItemsCount = filteredCategories.reduce((total, category) => {
                    return total + category.items.reduce((subTotal, subCategory) => {
                        return subTotal + (subCategory.items?.length || 0);
                    }, 0);
                }, 0);

                return (
                    <>
                        {totalItemsCount >= 6 && (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "3px 8px", gap: '5px' }}>
                                <SearchBox sx={{ width: "100%" }} placeholder='Search' value={searchValue} onChange={handleSearch} />
                            </div>
                        )}
                    </>
                );
            })()}

            <ScrollableContainer style={{ margin: '8px 0px' }}>
                {isLoading || !showContent ? (
                    <HelperPaneCustom.Loader />
                ) : (
                    <>
                        {(() => {
                            let filteredCategories = configVariables;
                            // Apply search filter if search value exists
                            if (searchValue && searchValue.trim()) {
                                filteredCategories = filteredCategories.map(category => ({
                                    ...category,
                                    items: category.items.map(subCategory => ({
                                        ...subCategory,
                                        items: subCategory.items.filter((item: ConfigVariable) =>
                                            (item?.properties?.variable?.value as string)?.toLowerCase().includes(searchValue.toLowerCase())
                                        )
                                    })).filter(subCategory => subCategory.items.length > 0)
                                })).filter(category => category.items.length > 0);
                            }

                            if (filteredCategories.length === 0) {
                                return <EmptyItemsPlaceHolder message={searchValue ? "No configurables found for your search" : "No configurables found"} />;
                            }

                            return (
                                <>
                                    {filteredCategories.map(category => (
                                        <div >
                                            {category.items
                                                .filter(subCategory => subCategory.items && subCategory.items.length > 0)
                                                .map(subCategory => (
                                                    <div key={subCategory.name}>
                                                        {subCategory.name !== '' ? (
                                                            <ExpandableList.Section
                                                                key={subCategory.name}
                                                                title={subCategory.name}
                                                                level={0}
                                                            >
                                                                <div style={{ marginTop: '10px' }}>
                                                                    {subCategory.items.map((item: ConfigVariable) => (
                                                                        <HelperPaneListItem
                                                                            key={item.id}
                                                                            onClick={() => { handleItemClicked(item?.properties?.variable?.value as string) }}
                                                                        >
                                                                            {getHelperPaneIcon(HelperPaneIconType.CONFIGURABLE)}
                                                                            <Typography variant="body3" sx={{ flex: 1, mr: 1 }}>
                                                                                {item?.properties?.variable?.value as ReactNode}
                                                                            </Typography>
                                                                            <TypeIndicator>
                                                                                {item?.properties?.type?.value as ReactNode}
                                                                            </TypeIndicator>
                                                                        </HelperPaneListItem>
                                                                    ))}
                                                                </div>
                                                            </ExpandableList.Section>
                                                        ) : (
                                                            <div>
                                                                {subCategory.items.map((item: ConfigVariable) => (
                                                                    <HelperPaneListItem
                                                                        key={item.id}
                                                                        onClick={() => { handleItemClicked(item?.properties?.variable?.value as string) }}
                                                                    >
                                                                        {getHelperPaneIcon(HelperPaneIconType.CONFIGURABLE)}
                                                                        <Typography variant="body3" sx={{ flex: 1, mr: 1 }}>
                                                                            {item?.properties?.variable?.value as ReactNode}
                                                                        </Typography>
                                                                        <TypeIndicator>
                                                                            {item?.properties?.type?.value as ReactNode}
                                                                        </TypeIndicator>
                                                                    </HelperPaneListItem>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    ))}
                                </>
                            );
                        })()}
                    </>
                )}
            </ScrollableContainer>

            {showAddNew && (
                <>
                    <Divider sx={{ margin: "0px" }} />
                    <div style={{ margin: '4px 0' }}>
                        <FooterButtons onClick={handleAddNewConfigurable} title="New Configurable" />
                    </div>
                </>
            )}
        </div>
    )
}
