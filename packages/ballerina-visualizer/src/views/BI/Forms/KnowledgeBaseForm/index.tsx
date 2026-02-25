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
import { Codicon } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

import { EditorConfig, FlowNode, LineRange, SubPanel, SubPanelView } from "@wso2/ballerina-core";
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
import { SidePanelView } from "../../FlowDiagram/PanelManager";
import { ConnectionKind } from "../../../../components/ConnectionSelector";
import { URI, Utils } from "vscode-uri";

const DEFAULT_CHUNKER_VALUE = "\"AUTO\"";

namespace S {
    export const Container = styled.div<{ footerActionButton?: boolean }>`
        display: flex;
        flex-direction: column;
        height: ${(props: { footerActionButton?: boolean }) => props.footerActionButton ? "100%" : "calc(100vh - 60px)"};
        min-height: ${(props: { footerActionButton?: boolean }) => props.footerActionButton ? "0" : "600px"};
        max-height: ${(props: { footerActionButton?: boolean }) => props.footerActionButton ? "100%" : "none"};
        overflow: ${(props: { footerActionButton?: boolean }) => props.footerActionButton ? "hidden" : "auto"};
    `;

    export const ScrollableContent = styled.div`
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
    `;

    export const Content = styled.div`
        display: flex;
        flex-direction: column;
        flex: 1;
    `;

    export const FormWrapper = styled.div`
        & > div:first-child {
            padding: 0px;
        }
    `;
}

interface KnowledgeBaseFormProps {
    fileName: string;
    node: FlowNode;
    targetLineRange: LineRange;
    expressionEditor: FormExpressionEditorProps;
    showProgressIndicator?: boolean;
    onSubmit: (
        node?: FlowNode,
        editorConfig?: EditorConfig,
        formImports?: FormImports,
        rawFormValues?: FormValues
    ) => void;
    openSubPanel?: (subPanel: SubPanel) => void;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    subPanelView?: SubPanelView;
    disableSaveButton?: boolean;
    navigateToPanel?: (panel: SidePanelView, connectionKind?: ConnectionKind) => void;
    footerActionButton?: boolean;
}

export function KnowledgeBaseForm(props: KnowledgeBaseFormProps) {
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
        footerActionButton
    } = props;

    const { rpcClient } = useRpcContext();
    const [knowledgeBaseFields, setKnowledgeBaseFields] = useState<FormField[]>([]);
    const [formImports, setFormImports] = useState<FormImports>({});
    const [isFormValid, setIsFormValid] = useState(true);
    const [knowledgeBaseFormValues, setKnowledgeBaseFormValues] = useState<FormValues>({});
    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        initializeForm();
        handleFormOpen();
        return () => {
            handleFormClose();
        };
    }, []);

    const handleFormOpen = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidOpen({ filePath: fileName })
            .then(() => {
                console.log(">>> Knowledge Base form opened");
            });
    };

    const handleFormClose = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidClose({ filePath: fileName })
            .then(() => {
                console.log(">>> Knowledge Base form closed");
            });
    };

    const getConnectionKind = (fieldName: string): ConnectionKind | undefined => {
        switch (fieldName) {
            case "vectorStore":
                return "VECTOR_STORE";
            case "embeddingModel":
                return "EMBEDDING_PROVIDER";
            case "chunker":
                return "CHUNKER";
            default:
                return undefined;
        }
    };

    const initializeForm = async () => {
        const formProperties = getFormProperties(node);
        const fields = convertNodePropertiesToFormFields(formProperties);
        const actionFields = ["vectorStore", "embeddingModel", "chunker"];
        fields.forEach((field) => {
            const originalName = field?.codedata?.originalName;
            if (actionFields.includes(originalName)) {
                field.type = "ACTION_EXPRESSION";
                field.types = [{ fieldType: "ACTION_EXPRESSION", selected: false }];
                field.advanced = false;
                field.actionCallback = () => {
                    props.navigateToPanel?.(SidePanelView.CONNECTION_SELECT, getConnectionKind(originalName));
                };
                field.actionLabel = <><Codicon name="add" />{`Create New ${field?.label}`}</>;
                field.imports = node?.properties?.type?.imports;
            }
            if (originalName === "chunker") {
                // hack: set default value for chunker field
                field.defaultValue = DEFAULT_CHUNKER_VALUE;
                field.advanced = true;
            }
        });
        setKnowledgeBaseFields(fields);
        setFormImports(getImportsForFormFields(fields));
    };

    const updateNodePropertyValue = (fieldKey: string, value: any): void => {
        if (node.properties && node.properties[fieldKey as keyof typeof node.properties]) {
            node.properties[fieldKey as keyof typeof node.properties].value = value;
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
        try {
            setSaving(true);
            const knowledgeBaseNode = mergeFormDataWithFlowNode(knowledgeBaseFormValues, targetLineRange);
            onSubmit(knowledgeBaseNode, undefined, formImports);
        } catch (error) {
            console.error("Error creating vector knowledge base:", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <S.Container footerActionButton={footerActionButton}>
            <S.ScrollableContent>
                <S.Content>
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
                                hideSaveButton={false}
                                nestedForm={!footerActionButton}
                                footerActionButton={footerActionButton}
                                onSubmit={handleSubmit}
                                disableSaveButton={!isFormValid}
                                isSaving={showProgressIndicator || saving}
                                onChange={(fieldKey, value, allValues) => {
                                    updateNodePropertyValue(fieldKey, value);
                                    const isValid = allValues["vectorStore"] !== "" && allValues["embeddingModel"] !== "";
                                    setIsFormValid(isValid);
                                    setKnowledgeBaseFormValues(allValues);
                                }}
                            />
                        </S.FormWrapper>
                    )}
                </S.Content>
            </S.ScrollableContent>
        </S.Container>
    );
}

export default KnowledgeBaseForm;
