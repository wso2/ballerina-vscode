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

import { useEffect, useRef, useState } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { NodeList, Category as PanelCategory, FormField, FormValues } from "@wso2/ballerina-side-panel";
import {
    BIAvailableNodesRequest,
    Category,
    AvailableNode,
    LineRange,
    EVENT_TYPE,
    MACHINE_VIEW,
    FUNCTION_TYPE,
    ParentPopupData,
    BISearchRequest,
    CodeData,
    AgentToolRequest,
} from "@wso2/ballerina-core";

import {
    convertBICategoriesToSidePanelCategories,
    convertFunctionCategoriesToSidePanelCategories,
} from "../../../utils/bi";
import FormGeneratorNew from "../Forms/FormGeneratorNew";
import { RelativeLoader } from "../../../components/RelativeLoader";
import styled from "@emotion/styled";

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

export enum SidePanelView {
    NODE_LIST = "NODE_LIST",
    TOOL_FORM = "TOOL_FORM",
}

export interface BIFlowDiagramProps {
    projectPath: string;
    onSubmit: (data: AgentToolRequest) => void;
}

export function AIAgentSidePanel(props: BIFlowDiagramProps) {
    const { projectPath, onSubmit } = props;
    const { rpcClient } = useRpcContext();

    const [sidePanelView, setSidePanelView] = useState<SidePanelView>(SidePanelView.NODE_LIST);
    const [categories, setCategories] = useState<PanelCategory[]>([]);
    const [selectedNodeCodeData, setSelectedNodeCodeData] = useState<CodeData>(undefined);
    const [loading, setLoading] = useState<boolean>(false);

    const targetRef = useRef<LineRange>({ startLine: { line: 0, offset: 0 }, endLine: { line: 0, offset: 0 } });
    const initialCategoriesRef = useRef<PanelCategory[]>([]);
    const selectedNodeRef = useRef<AvailableNode>(undefined);
    useEffect(() => {
        fetchNodes();
    }, []);

    // Use effects to refresh the panel
    useEffect(() => {
        rpcClient.onParentPopupSubmitted((parent: ParentPopupData) => {
            console.log(">>> on parent popup submitted", parent);
            setLoading(true);
            //HACK: 3 seconds delay
            setTimeout(() => {
                fetchNodes();
            }, 3000);
        });
    }, [rpcClient]);

    const fetchNodes = () => {
        setLoading(true);
        const getNodeRequest: BIAvailableNodesRequest = {
            position: targetRef.current.startLine,
            filePath: projectPath,
        };
        rpcClient
            .getBIDiagramRpcClient()
            .getAvailableNodes(getNodeRequest)
            .then(async (response) => {
                console.log(">>> Available nodes", response);
                if (!response.categories) {
                    console.error(">>> Error getting available nodes", response);
                    return;
                }
                const connectionsCategory = response.categories.filter(
                    (item) => item.metadata.label === "Connections"
                ) as Category[];
                // remove connections which names start with _ underscore
                if (connectionsCategory.at(0)?.items) {
                    const filteredConnectionsCategory = connectionsCategory
                        .at(0)
                        ?.items.filter((item) => !item.metadata.label.startsWith("_"));
                    connectionsCategory.at(0).items = filteredConnectionsCategory;
                }
                const convertedCategories = convertBICategoriesToSidePanelCategories(connectionsCategory);
                console.log("convertedCategories", convertedCategories);

                const filteredFunctions = await handleSearchFunction("", FUNCTION_TYPE.REGULAR, false);
                console.log("filteredFunctions", filteredFunctions);

                const filteredCategories = convertedCategories.concat(filteredFunctions);
                setCategories(filteredCategories);
                console.log("filteredCategories", filteredCategories);
                initialCategoriesRef.current = filteredCategories; // Store initial categories
                setLoading(false);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handleSearchFunction = async (
        searchText: string,
        functionType: FUNCTION_TYPE,
        isSearching: boolean = true
    ) => {
        const request: BISearchRequest = {
            position: {
                startLine: targetRef.current.startLine,
                endLine: targetRef.current.endLine,
            },
            filePath: projectPath,
            queryMap: searchText.trim()
                ? {
                      q: searchText,
                      limit: 12,
                      offset: 0,
                      includeAvailableFunctions: "true",
                  }
                : undefined,
            searchKind: "FUNCTION",
        };
        const response = await rpcClient.getBIDiagramRpcClient().search(request);
        if (isSearching && !searchText) {
            setCategories(initialCategoriesRef.current); // Reset the categories list when the search input is empty
            return;
        }

        // HACK: filter response until library functions are supported from LS
        const filteredResponse = response.categories.filter((category) => {
            return category.metadata.label === "Current Integration";
        });

        // Remove agent tool functions from integration category
        const currentIntegrationCategory = filteredResponse.find((category) => category.metadata.label === "Current Integration");
        if (currentIntegrationCategory && Array.isArray(currentIntegrationCategory.items)) {
            currentIntegrationCategory.items = currentIntegrationCategory.items.filter((item) => {
                return !item.metadata?.data?.isAgentTool;
            });
        }

        if (isSearching && searchText) {
            setCategories(convertFunctionCategoriesToSidePanelCategories(filteredResponse, functionType));
            return;
        }
        if (!response || !filteredResponse) {
            return [];
        }
        return convertFunctionCategoriesToSidePanelCategories(filteredResponse, functionType);
    };

    const handleOnSelectNode = (nodeId: string, metadata?: any) => {
        const { node } = metadata as { node: AvailableNode };
        // default node
        console.log(">>> on select node", { nodeId, metadata });
        selectedNodeRef.current = node;
        setSelectedNodeCodeData(node.codedata);
        setSidePanelView(SidePanelView.TOOL_FORM);
    };

    const handleOnAddConnection = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.AddConnectionWizard,
                documentUri: projectPath,
            },
            isPopup: true,
        });
    };

    const handleToolSubmit = (data: FormValues) => {
        // Safely convert name to camelCase, handling any input
        const name = data["name"] || "";
        const cleanName = name.trim().replace(/[^a-zA-Z0-9]/g, "") || "newTool";

        // HACK: Remove new lines from description fields
        if (data.description) {
            data.description = data.description.replace(/\n/g, " ");
        }

        const toolModel: AgentToolRequest = {
            toolName: cleanName,
            description: data["description"],
            selectedCodeData: selectedNodeCodeData,
        };
        console.log("New Agent Tool:", toolModel);
        onSubmit(toolModel);
    };

    const fields: FormField[] = [
        {
            key: `name`,
            label: "Tool Name",
            type: "IDENTIFIER",
            valueType: "IDENTIFIER",
            optional: false,
            editable: true,
            documentation: "Enter the name of the tool.",
            value: "",
            valueTypeConstraint: "Global",
            enabled: true,
        },
        {
            key: `description`,
            label: "Description",
            type: "TEXTAREA",
            optional: true,
            editable: true,
            documentation: "Enter the description of the tool.",
            value: "",
            valueType: "STRING",
            valueTypeConstraint: "",
            enabled: true,
        },
    ];

    // add concert message to the fields if the tool is a function call
    let concertMessage = "";
    let concertRequired = false;
    let description = "";
    if (
        selectedNodeRef.current &&
        selectedNodeRef.current.codedata.node === "FUNCTION_CALL" &&
        !selectedNodeRef.current.metadata?.data?.isIsolatedFunction
    ) {
        concertMessage = `Convert ${selectedNodeRef.current.metadata.label} function to an isolated function`;
        concertRequired = true;
        description =
            "Only isolated functions can be used as tools. Isolated functions ensure predictable behavior by avoiding shared state.";
    }

    return (
        <>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && sidePanelView === SidePanelView.NODE_LIST && categories?.length > 0 && (
                <NodeList
                    categories={categories}
                    onSelect={handleOnSelectNode}
                    onAddConnection={handleOnAddConnection}
                    onSearchTextChange={(searchText) => handleSearchFunction(searchText, FUNCTION_TYPE.REGULAR, true)}
                    title={"Functions"}
                    searchPlaceholder={"Search library functions"}
                />
            )}
            {sidePanelView === SidePanelView.TOOL_FORM && (
                <FormGeneratorNew
                    fileName={projectPath}
                    targetLineRange={{ startLine: { line: 0, offset: 0 }, endLine: { line: 0, offset: 0 } }}
                    fields={fields}
                    onSubmit={handleToolSubmit}
                    submitText={"Save Tool"}
                    concertMessage={concertMessage}
                    concertRequired={concertRequired}
                    description={description}
                    helperPaneSide="left"
                />
            )}
        </>
    );
}
