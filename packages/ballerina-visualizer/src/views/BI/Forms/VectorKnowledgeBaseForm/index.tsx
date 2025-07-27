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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Button,
    Dropdown,
    FormExpressionEditorRef,
    OptionProps,
    ProgressIndicator,
    ProgressRing,
    ThemeColors,
    Typography,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

import { FlowNode, LineRange, SubPanel, SubPanelView, NodePosition } from "@wso2/ballerina-core";
import {
    FormValues,
    ExpressionFormField,
    FormExpressionEditorProps,
    Form,
    FormField,
    FormImports,
} from "@wso2/ballerina-side-panel";
import { FormStyles } from "../styles";
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
    submitText?: string;
}

interface SelectedComponents {
    vectorStore?: FlowNode;
    embeddingProvider?: FlowNode;
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
        submitText,
    } = props;

    const { rpcClient } = useRpcContext();
    const [vectorStoreOptions, setVectorStoreOptions] = useState<OptionProps[]>([]);
    const [embeddingProviderOptions, setEmbeddingProviderOptions] = useState<OptionProps[]>([]);
    const [selectedComponents, setSelectedComponents] = useState<SelectedComponents>({});
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

    const formRef = useRef<FormExpressionEditorRef>(null);
    const vectorStoreTemplateRef = useRef<FlowNode | null>(null);
    const embeddingProviderTemplateRef = useRef<FlowNode | null>(null);

    useEffect(() => {
        initializeForm();
        fetchAvailableComponents();
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

            console.log(">>> Available components loaded", {
                vectorStoreOptions,
                embeddingProviderOptions,
                componentDataMap: fullComponentDataMap,
            });

            // Set default selections and load their forms
            const defaultVectorStore = vectorStoreOptions.find((option) => {
                const content = option.content?.toString().toLowerCase() || "";
                return content.includes("memory") || content.includes("in-memory");
            });

            const defaultEmbeddingProvider = embeddingProviderOptions.find((option) => {
                const content = option.content?.toString().toLowerCase() || "";
                return content.includes("wso2") || content.includes("default");
            });

            console.log(">>> Default selections found", {
                defaultVectorStore,
                defaultEmbeddingProvider,
            });

            // Load default vector store
            if (defaultVectorStore) {
                console.log(">>> Loading default vector store:", defaultVectorStore.value);
                await handleVectorStoreSelect(defaultVectorStore.value, fullComponentDataMap);
            } else if (vectorStoreOptions.length > 0) {
                console.log(">>> Loading first vector store:", vectorStoreOptions[0].value);
                await handleVectorStoreSelect(vectorStoreOptions[0].value, fullComponentDataMap);
            }

            // Load default embedding provider
            if (defaultEmbeddingProvider) {
                console.log(">>> Loading default embedding provider:", defaultEmbeddingProvider.value);
                await handleEmbeddingProviderSelect(defaultEmbeddingProvider.value, fullComponentDataMap);
            } else if (embeddingProviderOptions.length > 0) {
                console.log(">>> Loading first embedding provider:", embeddingProviderOptions[0].value);
                await handleEmbeddingProviderSelect(embeddingProviderOptions[0].value, fullComponentDataMap);
            }

            setIsInitialized(true);
        } catch (error) {
            console.error("Error fetching available components:", error);
        }
    };

    const handleVectorStoreSelect = async (value: string, dataMap?: ComponentData) => {
        const currentDataMap = dataMap || componentDataMap;
        const vectorStoreNode = currentDataMap[value];
        console.log(">>> selected vector store", { value, vectorStoreNode, currentDataMap });
        if (vectorStoreNode) {
            setSelectedComponents((prev) => ({ ...prev, vectorStore: vectorStoreNode }));

            // Generate variable name for the vector store
            const variableName = `${vectorStoreNode.codedata.object?.toLowerCase() || "vectorStore"}`;
            setVectorStoreVariableName(variableName);
            console.log(">>> vector store variable name:", variableName);

            // Get node template for the selected vector store to show its form
            try {
                const template = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                    filePath: fileName,
                    position: { line: targetLineRange.startLine.line, offset: 0 },
                    id: vectorStoreNode.codedata,
                });
                console.log(">>> vector store template", { template });

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
        console.log(">>> selected embedding provider", { value, embeddingProviderNode, currentDataMap });
        if (embeddingProviderNode) {
            setSelectedComponents((prev) => ({ ...prev, embeddingProvider: embeddingProviderNode }));

            // Generate variable name for the embedding provider
            const variableName = `${embeddingProviderNode.codedata.object?.toLowerCase() || "embeddingProvider"}`;
            setEmbeddingProviderVariableName(variableName);
            console.log(">>> embedding provider variable name:", variableName);

            // Get node template for the selected embedding provider to show its form
            try {
                const template = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                    filePath: fileName,
                    position: { line: targetLineRange.startLine.line, offset: 0 },
                    id: embeddingProviderNode.codedata,
                });
                console.log(">>> embedding provider template", { template });

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
                console.log(">>> Updated knowledge base fields", updatedFields);
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
        if (!selectedComponents.vectorStore || !selectedComponents.embeddingProvider) {
            console.error("Vector store and embedding provider must be selected");
            return;
        }

        if (!vectorStoreTemplateRef.current || !embeddingProviderTemplateRef.current) {
            console.error("Templates not loaded yet");
            return;
        }

        try {
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

            console.log(">>> Submitting with form values", {
                vectorStoreFormValues,
                embeddingProviderFormValues,
                knowledgeBaseFormValues,
                vectorStoreNode: vectorStoreUpdatedNode,
                embeddingProviderNode: embeddingProviderUpdatedNode,
            });

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
        }
    };

    const isFormValid = useMemo(() => {
        return (
            selectedComponents.vectorStore &&
            selectedComponents.embeddingProvider &&
            isVectorStoreFormValid &&
            isEmbeddingProviderFormValid &&
            isKnowledgeBaseFormValid &&
            vectorStoreVariableName &&
            embeddingProviderVariableName
        );
    }, [
        selectedComponents,
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
                            value={selectedComponents.vectorStore ? selectedComponents.vectorStore.metadata?.label : ""}
                        />
                    </S.DropdownContainer>
                    <S.FormWrapper>
                        {vectorStoreFields.length > 0 ? (
                            <Form
                                formFields={vectorStoreFields}
                                fileName={fileName}
                                targetLineRange={targetLineRange}
                                selectedNode={selectedComponents.vectorStore?.codedata.node}
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
                                    console.log(">>> Vector Store form change", { fieldKey, value, allValues });
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
                            value={
                                selectedComponents.embeddingProvider
                                    ? selectedComponents.embeddingProvider.metadata?.label
                                    : ""
                            }
                        />
                    </S.DropdownContainer>

                    <S.FormWrapper>
                        {embeddingProviderFields.length > 0 ? (
                            <Form
                                formFields={embeddingProviderFields}
                                fileName={fileName}
                                targetLineRange={targetLineRange}
                                selectedNode={selectedComponents.embeddingProvider?.codedata.node}
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
                                    console.log(">>> Embedding Provider form change", { fieldKey, value, allValues });
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
                                    console.log(">>> Knowledge Base form change", { fieldKey, value, allValues });
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
                    disabled={!isFormValid || showProgressIndicator || disableSaveButton}
                >
                    {showProgressIndicator ? (
                        <Typography variant="progress">{submitText || "Save..."}</Typography>
                    ) : (
                        submitText || "Save"
                    )}
                </Button>
            </S.Footer>
        </S.Container>
    );
}

export default VectorKnowledgeBaseForm;
