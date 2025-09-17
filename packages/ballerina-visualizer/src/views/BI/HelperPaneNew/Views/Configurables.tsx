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
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane";
import { COMPLETION_ITEM_KIND, Divider, getIcon, ThemeColors } from "@wso2/ui-toolkit";
import { ScrollableContainer } from "../Components/ScrollableContainer";
import DynamicModal from "../../../../components/Modal";
import FooterButtons from "../Components/FooterButtons";
import FormGenerator from "../../Forms/FormGenerator";
import { URI, Utils } from "vscode-uri";
import { POPUP_IDS, useModalStack } from "../../../../Context";

type ConfigVariablesState = {
    [category: string]: {
        [module: string]: ConfigVariable[];
    };
};

type ListItem = {
    name: string;
    items: any[]
}

type ConfigurablesPageProps = {
    onChange: (insertText: string | CompletionInsertText, isRecordConfigureChange?: boolean) => void;
    isInModal?: boolean;
    anchorRef: React.RefObject<HTMLDivElement>;
    fileName: string;
    targetLineRange: LineRange;
    onClose?: () => void;
}

type AddNewConfigFormProps = {
    isImportEnv: boolean;
    title: string;
}

export const Configurables = (props: ConfigurablesPageProps) => {
    const { onChange, onClose, fileName, targetLineRange } = props;

    const { rpcClient } = useRpcContext();
    const [configVariables, setConfigVariables] = useState<ConfigVariablesState>({});
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [configVarNode, setCofigVarNode] = useState<FlowNode>();
    const [isSaving, setIsSaving] = useState(false);
    const [packageInfo, setPackageInfo] = useState<TomlPackage>();
    const [isImportEnv, setIsImportEnv] = useState<boolean>(false);
    const [projectPathUri, setProjectPathUri] = useState<string>();

    const { addModal, closeModal } = useModalStack();

    useEffect(() => {
        const fetchNode = async () => {
            const node = await rpcClient.getBIDiagramRpcClient().getConfigVariableNodeTemplate({
                isNew: true,
                isEnvVariable: isImportEnv
            });
            setCofigVarNode(node.flowNode);
        };

        fetchNode();
    }, [isImportEnv]);

    useEffect(() => {
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
    }, [])

    const getProjectInfo = async () => {
        const projectPath = await rpcClient.getVisualizerLocation();
        setProjectPathUri(URI.file(projectPath.projectUri).fsPath);
    }

    const getConfigVariables = async () => {
        let data: ConfigVariablesState = {};
        let errorMsg: string = '';

        await rpcClient
            .getBIDiagramRpcClient()
            .getConfigVariablesV2({
                includeLibraries: false,
                projectPath: projectPathUri
            })
            .then((variables) => {
                data = (variables as any).configVariables;
                errorMsg = (variables as any).errorMsg;
            });

        setConfigVariables(data);
        setErrorMessage(errorMsg);
    };

    const handleSave = async (node: FlowNode) => {
        closeModal(POPUP_IDS.CONFIGURABLES);
        //TODO: Need to disable the form before saving and move form close to finally block
        setIsSaving(true);
        await rpcClient.getBIDiagramRpcClient().updateConfigVariablesV2({
            configFilePath: Utils.joinPath(URI.file(projectPathUri), 'config.bal').fsPath,
            configVariable: node,
            packageName: `${packageInfo.org}/${packageInfo.name}`,
            moduleName: "",
        }).finally(() => {
            setIsSaving(false);
            getConfigVariables();
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
        onChange(name, true)
        onClose && onClose();
    }

    const handleAddNewConfigurable = () => {
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
            <ScrollableContainer style={{ margin: '8px 0px' }}>
                {translateToArrayFormat(configVariables)
                    .filter(category =>
                        Array.isArray(category.items) &&
                        category.items.some(sub => Array.isArray(sub.items) && sub.items.length > 0)
                    )
                    .map(category => (
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
                                                        <SlidingPaneNavContainer
                                                            key={item.id}
                                                            onClick={() => { handleItemClicked(item?.properties?.variable?.value as string) }}
                                                        >
                                                            <ExpandableList.Item
                                                            >
                                                                {getIcon(COMPLETION_ITEM_KIND.Constant)}
                                                                {item?.properties?.variable?.value as ReactNode}
                                                            </ExpandableList.Item>
                                                        </SlidingPaneNavContainer>
                                                    ))}
                                                </div>
                                            </ExpandableList.Section>
                                        ) : (
                                            <div>
                                                {subCategory.items.map((item: ConfigVariable) => (
                                                    <SlidingPaneNavContainer key={item.id}
                                                        onClick={() => { handleItemClicked(item?.properties?.variable?.value as string) }}>
                                                        <ExpandableList.Item
                                                        >
                                                            {getIcon(COMPLETION_ITEM_KIND.Constant)}
                                                            {item?.properties?.variable?.value as ReactNode}
                                                        </ExpandableList.Item>
                                                    </SlidingPaneNavContainer>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    ))}
            </ScrollableContainer>

            <Divider sx={{ margin: "0px" }} />
            <FooterButtons onClick={handleAddNewConfigurable} startIcon='add' title="New Configurable" />
        </div>
    )
}
