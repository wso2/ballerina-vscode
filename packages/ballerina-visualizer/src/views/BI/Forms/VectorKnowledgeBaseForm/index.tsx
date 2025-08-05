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

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dropdown, OptionProps, ProgressRing, ThemeColors, Typography } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

import { FlowNode, LineRange, SubPanel, SubPanelView } from "@wso2/ballerina-core";
import {
    FormValues,
    ExpressionFormField,
    FormExpressionEditorProps,
    Form,
    FormField,
    FormImports,
} from "@wso2/ballerina-side-panel";
import { convertNodePropertiesToFormFields, getFormProperties, getImportsForFormFields } from "../../../../utils/bi";
import { cloneDeep } from "lodash";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import {
    createNodeWithUpdatedLineRange,
    processFormData,
    removeEmptyNodes,
    updateNodeWithProperties,
} from "../form-utils";

namespace S {
    export const Container = styled.div`
        display: flex;
        flex-direction: column;
        height: calc(100vh - 100px);
        min-height: 600px;
    `;

    export const ScrollableContent = styled.div`
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    `;

    export const Content = styled.div`
        display: flex;
        flex-direction: column;
        /* gap: 20px; */
        flex: 1;
    `;

    export const SectionTitle = styled.h3`
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: ${ThemeColors.ON_SURFACE};
    `;

    export const DropdownContainer = styled.div`
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;

    export const Footer = styled.div`
        display: flex;
        gap: 8px;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;
        padding: 16px;
        border-top: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        background: ${ThemeColors.SURFACE_DIM};
        flex-shrink: 0;
    `;

    export const FormWrapper = styled.div`
        margin-top: 12px;
        & > div:first-child {
            padding: 0px;
        }
    `;

    export const Divider = styled.div`
        height: 1px;
        background: ${ThemeColors.OUTLINE_VARIANT};
        margin-bottom: 20px;
    `;

    export const SpinnerContainer = styled.div`
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
    `;
}

interface VectorKnowledgeBaseFormProps {
    fileName: string;
    node: FlowNode;
    targetLineRange: LineRange;
    expressionEditor: FormExpressionEditorProps;
    showProgressIndicator?: boolean;
    onSubmit: (
        node?: FlowNode,
        openInDataMapper?: boolean,
        formImports?: FormImports,
        rawFormValues?: FormValues
    ) => void;
    openSubPanel?: (subPanel: SubPanel) => void;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    subPanelView?: SubPanelView;
    disableSaveButton?: boolean;
}

interface ComponentData {
    [key: string]: FlowNode;
}

export function VectorKnowledgeBaseForm(props: VectorKnowledgeBaseFormProps) {
    const {
        fileName,
        node,
        targetLineRange,
        expressionEditor,
        onSubmit,
        openSubPanel,
        updatedExpressionField,
        resetUpdatedExpressionField,
        subPanelView,
        showProgressIndicator,
        disableSaveButton,
    } = props;

    const { rpcClient } = useRpcContext();
    const [vectorStoreOptions, setVectorStoreOptions] = useState<OptionProps[]>([]);
    const [embeddingProviderOptions, setEmbeddingProviderOptions] = useState<OptionProps[]>([]);

    const [vectorStoreFields, setVectorStoreFields] = useState<FormField[]>([]);
    const [embeddingProviderFields, setEmbeddingProviderFields] = useState<FormField[]>([]);
    const [knowledgeBaseFields, setKnowledgeBaseFields] = useState<FormField[]>([]);
    const [formImports, setFormImports] = useState<FormImports>({});
    const [isVectorStoreFormValid, setIsVectorStoreFormValid] = useState(false);
    const [isEmbeddingProviderFormValid, setIsEmbeddingProviderFormValid] = useState(false);
    const [isKnowledgeBaseFormValid, setIsKnowledgeBaseFormValid] = useState(false);
    const [componentDataMap, setComponentDataMap] = useState<ComponentData>({});
    const [isInitialized, setIsInitialized] = useState(false);
    const [vectorStoreVariableName, setVectorStoreVariableName] = useState<string>("");
    const [embeddingProviderVariableName, setEmbeddingProviderVariableName] = useState<string>("");
    const [vectorStoreFormValues, setVectorStoreFormValues] = useState<FormValues>({});
    const [embeddingProviderFormValues, setEmbeddingProviderFormValues] = useState<FormValues>({});
    const [knowledgeBaseFormValues, setKnowledgeBaseFormValues] = useState<FormValues>({});
    const [isEditForm, setIsEditForm] = useState<boolean>(false);
    const [selectedVectorStoreOption, setSelectedVectorStoreOption] = useState<string>("");
    const [selectedEmbeddingProviderOption, setSelectedEmbeddingProviderOption] = useState<string>("");
    const [saving, setSaving] = useState<boolean>(false);

    const vectorStoreTemplateRef = useRef<FlowNode | null>(null);
    const embeddingProviderTemplateRef = useRef<FlowNode | null>(null);
    const vectorStoreLineRange = useRef<LineRange | null>(null);
    const embeddingProviderLineRange = useRef<LineRange | null>(null);

    useEffect(() => {
        // Check if this is an edit form
        const formProperties = getFormProperties(node);
        const vectorStoreValue = formProperties.vectorStore?.value as string;
        const embeddingModelValue = formProperties.embeddingModel?.value as string;
        const isEdit = !!(vectorStoreValue && embeddingModelValue);
        setIsEditForm(isEdit);

        if (isEdit) {
            editFormInit();
        } else {
            initializeForm();
            fetchAvailableComponents();
        }
        handleFormOpen();

        return () => {
            handleFormClose();
        };
    }, []);

    // Update knowledge base fields when variable names change
    useEffect(() => {
        if (vectorStoreVariableName && embeddingProviderVariableName && knowledgeBaseFields.length > 0) {
            updateKnowledgeBaseFields();
        }
    }, [vectorStoreVariableName, embeddingProviderVariableName]);

    const handleFormOpen = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidOpen({ filePath: fileName })
            .then(() => {
                console.log(">>> Vector Knowledge Base form opened");
            });
    };

    const handleFormClose = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidClose({ filePath: fileName })
            .then(() => {
                console.log(">>> Vector Knowledge Base form closed");
            });
    };

    const initializeForm = () => {
        // Initialize knowledge base form fields from the node
        const formProperties = getFormProperties(node);
        formProperties.vectorStore.hidden = true;
        formProperties.embeddingModel.hidden = true;
        const fields = convertNodePropertiesToFormFields(formProperties);
        setKnowledgeBaseFields(fields);
        setFormImports(getImportsForFormFields(fields));
    };

    const editFormInit = async () => {
        try {
            // Get the current vector store and embedding model values
            const formProperties = getFormProperties(node);
            const vectorStoreValue = formProperties.vectorStore?.value;
            const embeddingModelValue = formProperties.embeddingModel?.value;

            // Fetch module nodes to find existing components
            const moduleNodesResponse = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
            // Find the vector store and embedding provider nodes
            let vectorStoreNode: FlowNode | null = null;
            let embeddingProviderNode: FlowNode | null = null;

            // Search through module nodes to find matching variable names
            moduleNodesResponse.flowModel.connections.forEach((moduleNode) => {
                const moduleNodeVariableValue = moduleNode.properties?.variable?.value;
                const isStringValue = typeof moduleNodeVariableValue === "string";

                if (isStringValue && moduleNodeVariableValue === vectorStoreValue) {
                    if (
                        moduleNode.codedata.node === "VECTOR_STORE" ||
                        moduleNode.codedata.object?.includes("VectorStore")
                    ) {
                        vectorStoreNode = moduleNode;
                        vectorStoreTemplateRef.current = moduleNode;
                        vectorStoreLineRange.current = moduleNode.codedata.lineRange;
                        setVectorStoreVariableName(vectorStoreValue as string);
                    }
                }

                if (isStringValue && moduleNodeVariableValue === embeddingModelValue) {
                    if (
                        moduleNode.codedata.node === "EMBEDDING_PROVIDER" ||
                        moduleNode.codedata.object?.includes("EmbeddingProvider") ||
                        moduleNode.codedata.symbol?.includes("EmbeddingProvider")
                    ) {
                        embeddingProviderNode = moduleNode;
                        embeddingProviderTemplateRef.current = moduleNode;
                        embeddingProviderLineRange.current = moduleNode.codedata.lineRange;
                        setEmbeddingProviderVariableName(embeddingModelValue as string);
                    }
                }
            });

            if (vectorStoreNode && embeddingProviderNode) {
                // Process vector store fields
                const vectorStoreFormProperties = getFormProperties(vectorStoreNode);
                const vectorStoreProps = vectorStoreFormProperties as any;
                if (vectorStoreProps.variable) {
                    vectorStoreProps.variable.hidden = true;
                }
                if (vectorStoreProps.type) {
                    vectorStoreProps.type.hidden = true;
                }
                const vectorStoreFields = convertNodePropertiesToFormFields(vectorStoreFormProperties);
                setVectorStoreFields(vectorStoreFields);

                // Set existing vector store form values
                const vectorStoreExistingValues: FormValues = {};
                Object.keys(vectorStoreNode.properties || {}).forEach((key) => {
                    if (key !== "variable" && key !== "type") {
                        vectorStoreExistingValues[key] = (vectorStoreNode.properties as any)[key].value;
                    }
                });
                setVectorStoreFormValues(vectorStoreExistingValues);

                // Process embedding provider fields
                const embeddingProviderFormProperties = getFormProperties(embeddingProviderNode);
                const embeddingProviderProps = embeddingProviderFormProperties as any;
                if (embeddingProviderProps.variable) {
                    embeddingProviderProps.variable.hidden = true;
                }
                if (embeddingProviderProps.type) {
                    embeddingProviderProps.type.hidden = true;
                }
                const embeddingProviderFields = convertNodePropertiesToFormFields(embeddingProviderFormProperties);
                setEmbeddingProviderFields(embeddingProviderFields);

                // Set existing embedding provider form values
                const embeddingProviderExistingValues: FormValues = {};
                Object.keys(embeddingProviderNode.properties || {}).forEach((key) => {
                    if (key !== "variable" && key !== "type") {
                        embeddingProviderExistingValues[key] = (embeddingProviderNode.properties as any)[key].value;
                    }
                });
                setEmbeddingProviderFormValues(embeddingProviderExistingValues);
            }

            // Initialize knowledge base fields (same as create mode)
            const knowledgeBaseProps = formProperties as any;
            if (knowledgeBaseProps.vectorStore) {
                knowledgeBaseProps.vectorStore.hidden = true;
            }
            if (knowledgeBaseProps.embeddingModel) {
                knowledgeBaseProps.embeddingModel.hidden = true;
            }
            const knowledgeBaseFields = convertNodePropertiesToFormFields(formProperties);
            setKnowledgeBaseFields(knowledgeBaseFields);
            setFormImports(getImportsForFormFields(knowledgeBaseFields));

            // Set existing knowledge base form values
            const knowledgeBaseExistingValues: FormValues = {};
            Object.keys(node.properties || {}).forEach((key) => {
                if (key !== "vectorStore" && key !== "embeddingModel") {
                    knowledgeBaseExistingValues[key] = (node.properties as any)[key].value;
                }
            });
            setKnowledgeBaseFormValues(knowledgeBaseExistingValues);

            // load dropdown options and default selections
            fetchAvailableComponentsInEditMode(vectorStoreNode, embeddingProviderNode);

            setIsInitialized(true);
        } catch (error) {
            console.error("Error initializing edit form:", error);
            setIsInitialized(true); // Still set to prevent infinite loading
        }
    };

    const fetchAvailableComponents = async () => {
        try {
            // Fetch available vector stores
            const vectorStoreResponse = await rpcClient.getBIDiagramRpcClient().search({
                position: { startLine: targetLineRange.startLine, endLine: targetLineRange.endLine },
                filePath: fileName,
                queryMap: undefined,
                searchKind: "VECTOR_STORE",
            });

            const vectorStoreOptions: OptionProps[] = [];
            const vectorStoreDataMap: ComponentData = {};

            vectorStoreResponse.categories?.forEach((category) => {
                category.items?.forEach((item) => {
                    // Check if it's an AvailableNode (not a nested Category)
                    if ("codedata" in item && "enabled" in item) {
                        const flowNode = item as any; // AvailableNode extends FlowNode
                        vectorStoreOptions.push({
                            id: item.metadata.label,
                            content: item.metadata.label,
                            value: item.metadata.label,
                        });
                        vectorStoreDataMap[item.metadata.label] = flowNode;
                    }
                });
            });

            setVectorStoreOptions(vectorStoreOptions);

            // Fetch available embedding providers
            const embeddingProviderResponse = await rpcClient.getBIDiagramRpcClient().search({
                position: { startLine: targetLineRange.startLine, endLine: targetLineRange.endLine },
                filePath: fileName,
                queryMap: undefined,
                searchKind: "EMBEDDING_PROVIDER",
            });

            const embeddingProviderOptions: OptionProps[] = [];
            const embeddingProviderDataMap: ComponentData = {};

            embeddingProviderResponse.categories?.forEach((category) => {
                category.items?.forEach((item) => {
                    // Check if it's an AvailableNode (not a nested Category)
                    if ("codedata" in item && "enabled" in item) {
                        const flowNode = item as any; // AvailableNode extends FlowNode
                        embeddingProviderOptions.push({
                            id: item.metadata.label,
                            content: item.metadata.label,
                            value: item.metadata.label,
                        });
                        embeddingProviderDataMap[item.metadata.label] = flowNode;
                    }
                });
            });

            setEmbeddingProviderOptions(embeddingProviderOptions);
            const fullComponentDataMap = { ...vectorStoreDataMap, ...embeddingProviderDataMap };
            setComponentDataMap(fullComponentDataMap);

            // Set default selections and load their forms
            const defaultVectorStore = vectorStoreOptions.find((option) => {
                const content = option.content?.toString().toLowerCase() || "";
                return content.includes("memory") || content.includes("in-memory");
            });

            const defaultEmbeddingProvider = embeddingProviderOptions.find((option) => {
                const content = option.content?.toString().toLowerCase() || "";
                return content.includes("wso2") || content.includes("default");
            });

            // Load default vector store
            if (defaultVectorStore) {
                await handleVectorStoreSelect(defaultVectorStore.value, fullComponentDataMap);
            } else if (vectorStoreOptions.length > 0) {
                await handleVectorStoreSelect(vectorStoreOptions[0].value, fullComponentDataMap);
            }

            // Load default embedding provider
            if (defaultEmbeddingProvider) {
                await handleEmbeddingProviderSelect(defaultEmbeddingProvider.value, fullComponentDataMap);
            } else if (embeddingProviderOptions.length > 0) {
                await handleEmbeddingProviderSelect(embeddingProviderOptions[0].value, fullComponentDataMap);
            }

            setIsInitialized(true);
        } catch (error) {
            console.error("Error fetching available components:", error);
        }
    };

    const fetchAvailableComponentsInEditMode = async (vectorStoreNode: FlowNode, embeddingProviderNode: FlowNode) => {
        try {
            // Fetch available vector stores
            const vectorStoreResponse = await rpcClient.getBIDiagramRpcClient().search({
                position: { startLine: targetLineRange.startLine, endLine: targetLineRange.endLine },
                filePath: fileName,
                queryMap: undefined,
                searchKind: "VECTOR_STORE",
            });

            const vectorStoreOptions: OptionProps[] = [];
            const vectorStoreDataMap: ComponentData = {};

            vectorStoreResponse.categories?.forEach((category) => {
                category.items?.forEach((item) => {
                    // Check if it's an AvailableNode (not a nested Category)
                    if ("codedata" in item && "enabled" in item) {
                        const flowNode = item as any; // AvailableNode extends FlowNode
                        vectorStoreOptions.push({
                            id: item.metadata.label,
                            content: item.metadata.label,
                            value: item.metadata.label,
                        });
                        vectorStoreDataMap[item.metadata.label] = flowNode;
                        if (
                            flowNode.codedata.module === vectorStoreNode.codedata.module &&
                            flowNode.codedata.org === vectorStoreNode.codedata.org
                        ) {
                            setSelectedVectorStoreOption(item.metadata.label);
                        }
                    }
                });
            });

            setVectorStoreOptions(vectorStoreOptions);

            // Fetch available embedding providers
            const embeddingProviderResponse = await rpcClient.getBIDiagramRpcClient().search({
                position: { startLine: targetLineRange.startLine, endLine: targetLineRange.endLine },
                filePath: fileName,
                queryMap: undefined,
                searchKind: "EMBEDDING_PROVIDER",
            });

            const embeddingProviderOptions: OptionProps[] = [];
            const embeddingProviderDataMap: ComponentData = {};

            embeddingProviderResponse.categories?.forEach((category) => {
                category.items?.forEach((item) => {
                    // Check if it's an AvailableNode (not a nested Category)
                    if ("codedata" in item && "enabled" in item) {
                        const flowNode = item as any; // AvailableNode extends FlowNode
                        embeddingProviderOptions.push({
                            id: item.metadata.label,
                            content: item.metadata.label,
                            value: item.metadata.label,
                        });
                        embeddingProviderDataMap[item.metadata.label] = flowNode;
                        if (
                            flowNode.codedata.module === embeddingProviderNode.codedata.module &&
                            flowNode.codedata.org === embeddingProviderNode.codedata.org
                        ) {
                            setSelectedEmbeddingProviderOption(item.metadata.label);
                        }
                    }
                });
            });

            setEmbeddingProviderOptions(embeddingProviderOptions);
            const fullComponentDataMap = { ...vectorStoreDataMap, ...embeddingProviderDataMap };
            setComponentDataMap(fullComponentDataMap);
        } catch (error) {
            console.error("Error fetching available components:", error);
        }
    };

    const handleVectorStoreSelect = async (value: string, dataMap?: ComponentData) => {
        const currentDataMap = dataMap || componentDataMap;
        const vectorStoreNode = currentDataMap[value];
        if (vectorStoreNode) {
            vectorStoreTemplateRef.current = vectorStoreNode;
            setSelectedVectorStoreOption(value);

            // Get node template for the selected vector store to show its form
            try {
                const template = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                    filePath: fileName,
                    position: { line: targetLineRange.startLine.line, offset: 0 },
                    id: vectorStoreNode.codedata,
                });

                const variableName = `${template.flowNode.properties.variable.value || "vectorStore"}`;
                setVectorStoreVariableName(variableName);

                // Store template for later use in submission
                vectorStoreTemplateRef.current = template.flowNode;

                const formProperties = getFormProperties(template.flowNode);
                const props = formProperties as any;
                if (props.variable) {
                    props.variable.hidden = true;
                }
                if (props.type) {
                    props.type.hidden = true;
                }
                const fields = convertNodePropertiesToFormFields(formProperties);
                setVectorStoreFields(fields);

                // Update knowledge base fields with the vector store variable name
                updateKnowledgeBaseFields();
            } catch (error) {
                console.error("Error fetching vector store template:", error);
            }
        }
    };

    const handleEmbeddingProviderSelect = async (value: string, dataMap?: ComponentData) => {
        const currentDataMap = dataMap || componentDataMap;
        const embeddingProviderNode = currentDataMap[value];
        if (embeddingProviderNode) {
            embeddingProviderTemplateRef.current = embeddingProviderNode;
            setSelectedEmbeddingProviderOption(value);

            // Get node template for the selected embedding provider to show its form
            try {
                const template = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                    filePath: fileName,
                    position: { line: targetLineRange.startLine.line, offset: 0 },
                    id: embeddingProviderNode.codedata,
                });

                const variableName = `${template.flowNode.properties.variable.value || "embeddingProvider"}`;
                setEmbeddingProviderVariableName(variableName);

                // Store template for later use in submission
                embeddingProviderTemplateRef.current = template.flowNode;

                const formProperties = getFormProperties(template.flowNode);
                const props = formProperties as any;
                if (props.variable) {
                    props.variable.hidden = true;
                }
                if (props.type) {
                    props.type.hidden = true;
                }
                const fields = convertNodePropertiesToFormFields(formProperties);
                setEmbeddingProviderFields(fields);

                // Update knowledge base fields with the embedding provider variable name
                updateKnowledgeBaseFields();
            } catch (error) {
                console.error("Error fetching embedding provider template:", error);
            }
        }
    };

    const updateKnowledgeBaseFields = () => {
        // Update knowledge base fields with variable names from selected components
        if (knowledgeBaseFields.length > 0) {
            let hasChanges = false;
            const updatedFields = knowledgeBaseFields.map((field) => {
                if (field.key === "vectorStore" && vectorStoreVariableName && field.value !== vectorStoreVariableName) {
                    hasChanges = true;
                    return { ...field, value: vectorStoreVariableName };
                }
                if (
                    field.key === "embeddingModel" &&
                    embeddingProviderVariableName &&
                    field.value !== embeddingProviderVariableName
                ) {
                    hasChanges = true;
                    return { ...field, value: embeddingProviderVariableName };
                }
                return field;
            });

            if (hasChanges) {
                setKnowledgeBaseFields(updatedFields);
            }
        }
    };

    const mergeFormDataWithFlowNode = (data: FormValues, targetLineRange: LineRange): FlowNode => {
        const clonedNode = cloneDeep(node);
        const updatedNode = createNodeWithUpdatedLineRange(clonedNode, targetLineRange);
        const processedData = processFormData(data);
        const nodeWithUpdatedProps = updateNodeWithProperties(clonedNode, updatedNode, processedData, formImports);
        return removeEmptyNodes(nodeWithUpdatedProps);
    };

    const handleSubmit = async () => {
        if (!vectorStoreTemplateRef.current || !embeddingProviderTemplateRef.current) {
            console.error("Vector store and embedding provider must be selected");
            return;
        }

        if (!vectorStoreTemplateRef.current || !embeddingProviderTemplateRef.current) {
            console.error("Templates not loaded yet");
            return;
        }

        try {
            setSaving(true);
            // Use stored templates instead of fetching again
            const vectorStoreTemplate = vectorStoreTemplateRef.current;
            const embeddingProviderTemplate = embeddingProviderTemplateRef.current;

            // Merge vector store template with form values
            const vectorStoreNode = cloneDeep(vectorStoreTemplate);
            const vectorStoreUpdatedNode = updateNodeWithProperties(
                vectorStoreNode,
                vectorStoreNode,
                vectorStoreFormValues,
                formImports
            );
            // Set the variable name
            if (vectorStoreUpdatedNode.properties?.variable) {
                vectorStoreUpdatedNode.properties.variable.value = vectorStoreVariableName;
            }

            // Merge embedding provider template with form values
            const embeddingProviderNode = cloneDeep(embeddingProviderTemplate);
            const embeddingProviderUpdatedNode = updateNodeWithProperties(
                embeddingProviderNode,
                embeddingProviderNode,
                embeddingProviderFormValues,
                formImports
            );
            // Set the variable name
            if (embeddingProviderUpdatedNode.properties?.variable) {
                embeddingProviderUpdatedNode.properties.variable.value = embeddingProviderVariableName;
            }

            if (isEditForm) {
                if (!vectorStoreLineRange.current || !embeddingProviderLineRange.current) {
                    console.error("Vector store and embedding provider line range not found");
                    return;
                }
                // new vector store node
                const newVectorStoreNode = cloneDeep(vectorStoreUpdatedNode);
                newVectorStoreNode.codedata.lineRange = {
                    fileName: vectorStoreLineRange.current.fileName,
                    startLine: vectorStoreLineRange.current.startLine,
                    endLine: vectorStoreLineRange.current.endLine,
                };
                newVectorStoreNode.codedata.isNew = false;
                const newEmbeddingProviderNode = cloneDeep(embeddingProviderUpdatedNode);
                newEmbeddingProviderNode.codedata.lineRange = {
                    fileName: embeddingProviderLineRange.current.fileName,
                    startLine: embeddingProviderLineRange.current.startLine,
                    endLine: embeddingProviderLineRange.current.endLine,
                };
                newEmbeddingProviderNode.codedata.isNew = false;

                // save the vector store and embedding provider nodes
                const vectorStoreSourceCode = await rpcClient.getBIDiagramRpcClient().getSourceCode({
                    filePath: fileName,
                    flowNode: newVectorStoreNode,
                });
                console.log(">>> vector store source code updated", { newVectorStoreNode, vectorStoreSourceCode });
                const embeddingProviderSourceCode = await rpcClient.getBIDiagramRpcClient().getSourceCode({
                    filePath: fileName,
                    flowNode: newEmbeddingProviderNode,
                });
                console.log(">>> embedding provider source code updated", {
                    newEmbeddingProviderNode,
                    embeddingProviderSourceCode,
                });
            } else {
                // save the vector store and embedding provider nodes
                const vectorStoreSourceCode = await rpcClient.getBIDiagramRpcClient().getSourceCode({
                    filePath: fileName,
                    flowNode: vectorStoreUpdatedNode,
                });
                console.log(">>> vector store source code", { vectorStoreSourceCode });
                const embeddingProviderSourceCode = await rpcClient.getBIDiagramRpcClient().getSourceCode({
                    filePath: fileName,
                    flowNode: embeddingProviderUpdatedNode,
                });
                console.log(">>> embedding provider source code", { embeddingProviderSourceCode });
            }
            // Create knowledge base node with form values and references
            const combinedKnowledgeBaseData = {
                ...knowledgeBaseFormValues,
                vectorStore: vectorStoreVariableName,
                embeddingModel: embeddingProviderVariableName,
            };

            const knowledgeBaseNode = mergeFormDataWithFlowNode(combinedKnowledgeBaseData, targetLineRange);

            onSubmit(knowledgeBaseNode, false, formImports);
        } catch (error) {
            console.error("Error creating vector knowledge base:", error);
        } finally {
            setSaving(false);
        }
    };

    const isFormValid = useMemo(() => {
        return (
            vectorStoreTemplateRef.current &&
            embeddingProviderTemplateRef.current &&
            isVectorStoreFormValid &&
            isEmbeddingProviderFormValid &&
            isKnowledgeBaseFormValid &&
            vectorStoreVariableName &&
            embeddingProviderVariableName
        );
    }, [
        isVectorStoreFormValid,
        isEmbeddingProviderFormValid,
        isKnowledgeBaseFormValid,
        vectorStoreVariableName,
        embeddingProviderVariableName,
    ]);

    if (!isInitialized) {
        return (
            <S.Container>
                <S.ScrollableContent>
                    <S.SpinnerContainer>
                        <ProgressRing color={ThemeColors.PRIMARY} />
                    </S.SpinnerContainer>
                </S.ScrollableContent>
            </S.Container>
        );
    }

    return (
        <S.Container>
            <S.ScrollableContent>
                <S.Content>
                    <S.DropdownContainer>
                        <Dropdown
                            id="vector-store-dropdown"
                            label="Select Vector Store"
                            items={vectorStoreOptions}
                            onChange={(e) => handleVectorStoreSelect(e.target.value)}
                            placeholder="Choose a vector store..."
                            value={selectedVectorStoreOption}
                        />
                    </S.DropdownContainer>
                    <S.FormWrapper>
                        {vectorStoreFields.length > 0 ? (
                            <Form
                                formFields={vectorStoreFields}
                                fileName={fileName}
                                targetLineRange={targetLineRange}
                                selectedNode={vectorStoreTemplateRef.current?.codedata.node}
                                expressionEditor={expressionEditor}
                                openSubPanel={openSubPanel}
                                subPanelView={subPanelView}
                                updatedExpressionField={updatedExpressionField}
                                resetUpdatedExpressionField={resetUpdatedExpressionField}
                                hideSaveButton={true}
                                onValidityChange={setIsVectorStoreFormValid}
                                nestedForm={true}
                                compact={true}
                                onChange={(fieldKey, value, allValues) => {
                                    setVectorStoreFormValues(allValues);
                                }}
                            />
                        ) : (
                            <Typography variant="progress">Loading vector store configuration...</Typography>
                        )}
                    </S.FormWrapper>
                    <S.Divider />
                    <S.DropdownContainer>
                        <Dropdown
                            id="embedding-provider-dropdown"
                            label="Select Embedding Provider"
                            items={embeddingProviderOptions}
                            onChange={(e) => handleEmbeddingProviderSelect(e.target.value)}
                            placeholder="Choose an embedding provider..."
                            value={selectedEmbeddingProviderOption}
                        />
                    </S.DropdownContainer>

                    <S.FormWrapper>
                        {embeddingProviderFields.length > 0 ? (
                            <Form
                                formFields={embeddingProviderFields}
                                fileName={fileName}
                                targetLineRange={targetLineRange}
                                selectedNode={embeddingProviderTemplateRef.current?.codedata.node}
                                expressionEditor={expressionEditor}
                                openSubPanel={openSubPanel}
                                subPanelView={subPanelView}
                                updatedExpressionField={updatedExpressionField}
                                resetUpdatedExpressionField={resetUpdatedExpressionField}
                                hideSaveButton={true}
                                onValidityChange={setIsEmbeddingProviderFormValid}
                                nestedForm={true}
                                compact={true}
                                onChange={(fieldKey, value, allValues) => {
                                    setEmbeddingProviderFormValues(allValues);
                                }}
                            />
                        ) : (
                            <Typography variant="progress">Loading embedding provider configuration...</Typography>
                        )}
                    </S.FormWrapper>
                    <S.Divider />
                    {knowledgeBaseFields.length > 0 && (
                        <S.FormWrapper>
                            <Form
                                formFields={knowledgeBaseFields}
                                fileName={fileName}
                                targetLineRange={targetLineRange}
                                selectedNode={node.codedata.node}
                                expressionEditor={expressionEditor}
                                openSubPanel={openSubPanel}
                                subPanelView={subPanelView}
                                updatedExpressionField={updatedExpressionField}
                                resetUpdatedExpressionField={resetUpdatedExpressionField}
                                hideSaveButton={true}
                                onValidityChange={setIsKnowledgeBaseFormValid}
                                nestedForm={true}
                                compact={true}
                                onChange={(fieldKey, value, allValues) => {
                                    setKnowledgeBaseFormValues(allValues);
                                }}
                            />
                        </S.FormWrapper>
                    )}
                </S.Content>
            </S.ScrollableContent>

            <S.Footer>
                <Button
                    appearance="primary"
                    onClick={handleSubmit}
                    disabled={!isFormValid || showProgressIndicator || disableSaveButton || saving}
                >
                    {showProgressIndicator || saving ? <Typography variant="progress">Saving...</Typography> : "Save"}
                </Button>
            </S.Footer>
        </S.Container>
    );
}

export default VectorKnowledgeBaseForm;
