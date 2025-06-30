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

import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    EVENT_TYPE,
    ColorThemeKind,
    FlowNode,
    LineRange,
    NodePosition,
    SubPanel,
    VisualizerLocation,
    TRIGGER_CHARACTERS,
    TriggerCharacter,
    FormDiagnostics,
    TextEdit,
    SubPanelView,
    LinePosition,
    ExpressionProperty,
    Type,
    RecordTypeField,
    Imports
} from "@wso2/ballerina-core";
import {
    FormField,
    FormValues,
    Form,
    ExpressionFormField,
    FormExpressionEditorProps,
    PanelContainer,
    FormImports,
} from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import {
    Button,
    CompletionItem,
    FormExpressionEditorRef,
    HelperPaneHeight,
    ThemeColors,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

import {
    convertBalCompletion,
    convertNodePropertiesToFormFields,
    convertToFnSignature,
    convertToVisibleTypes,
    enrichFormPropertiesWithValueConstraint,
    filterUnsupportedDiagnostics,
    getFormProperties,
    getImportsForFormFields,
    getInfoFromExpressionValue,
    injectHighlightTheme,
    removeDuplicateDiagnostics,
    updateLineRange,
} from "../../../../utils/bi";
import IfForm from "../IfForm";
import { cloneDeep, debounce } from "lodash";
import {
    createNodeWithUpdatedLineRange,
    processFormData,
    removeEmptyNodes,
    updateNodeWithProperties,
} from "../form-utils";
import ForkForm from "../ForkForm";
import { getHelperPane } from "../../HelperPane";
import { FormTypeEditor } from "../../TypeEditor";
import { getTypeHelper } from "../../TypeHelper";
import { EXPRESSION_EXTRACTION_REGEX } from "../../../../constants";
import MatchForm from "../MatchForm";

interface TypeEditorState {
    isOpen: boolean;
    fieldKey?: string; // Optional, to store the key of the field being edited
    newTypeValue?: string;
}

interface FormProps {
    fileName: string;
    node: FlowNode;
    nodeFormTemplate?: FlowNode; // used in edit forms
    connections?: FlowNode[];
    clientName?: string;
    targetLineRange: LineRange;
    projectPath?: string;
    editForm?: boolean;
    isGraphql?: boolean;
    submitText?: string;
    onSubmit: (node?: FlowNode, isDataMapper?: boolean, formImports?: FormImports) => void;
    showProgressIndicator?: boolean;
    subPanelView?: SubPanelView;
    openSubPanel?: (subPanel: SubPanel) => void;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    disableSaveButton?: boolean;
    actionButtonConfig?: {
        actionLabel: string;
        description?: string; // Optional description explaining what the action button does
        callback: () => void;
    };
}

// Styled component for the action button description
const ActionButtonDescription = styled.div`
    font-size: var(--vscode-font-size);
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-bottom: 8px;
    line-height: 1.4;
`;

// Styled component for the action button container
const ActionButtonContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

// Styled component for the action button
const StyledActionButton = styled(Button)`
    width: 100%;
    & > vscode-button {
        width: 100%;
    }
`;

export function FormGenerator(props: FormProps) {
    const {
        fileName,
        node,
        nodeFormTemplate,
        connections,
        clientName,
        targetLineRange,
        projectPath,
        editForm,
        showProgressIndicator,
        isGraphql,
        onSubmit,
        subPanelView,
        openSubPanel,
        updatedExpressionField,
        resetUpdatedExpressionField,
        disableSaveButton,
        actionButtonConfig,
        submitText,
    } = props;

    const { rpcClient } = useRpcContext();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formImports, setFormImports] = useState<FormImports>({});
    const [typeEditorState, setTypeEditorState] = useState<TypeEditorState>({ isOpen: false, newTypeValue: "" });
    const [visualizableFields, setVisualizableFields] = useState<string[]>([]);
    const [recordTypeFields, setRecordTypeFields] = useState<RecordTypeField[]>([]);

    /* Expression editor related state and ref variables */
    const prevCompletionFetchText = useRef<string>("");
    const [completions, setCompletions] = useState<CompletionItem[]>([]);
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>([]);
    const [types, setTypes] = useState<CompletionItem[]>([]);
    const [filteredTypes, setFilteredTypes] = useState<CompletionItem[]>([]);
    const expressionOffsetRef = useRef<number>(0); // To track the expression offset on adding import statements

    useEffect(() => {
        if (rpcClient) {
            // Set current theme
            rpcClient
                .getVisualizerRpcClient()
                .getThemeKind()
                .then((theme) => {
                    injectHighlightTheme(theme);
                });

            // Update highlight theme when theme changes
            rpcClient.onThemeChanged((theme) => {
                injectHighlightTheme(theme);
            });
        }
    }, [rpcClient]);

    useEffect(() => {
        if (!node) {
            return;
        }
        if (node.codedata.node === "IF") {
            return;
        }
        initForm();
        handleFormOpen();

        return () => {
            handleFormClose();
        };
    }, [node]);

    const handleFormOpen = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidOpen({ filePath: fileName })
            .then(() => {
                console.log(">>> Form opened");
            });
    };

    const handleFormClose = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidClose({ filePath: fileName })
            .then(() => {
                console.log(">>> Form closed");
            });
    };

    const initForm = () => {
        const formProperties = getFormProperties(node);
        let enrichedNodeProperties;
        if (nodeFormTemplate) {
            const formTemplateProperties = getFormProperties(nodeFormTemplate);
            enrichedNodeProperties = enrichFormPropertiesWithValueConstraint(formProperties, formTemplateProperties);
            console.log(">>> Form properties", { formProperties, formTemplateProperties, enrichedNodeProperties });
        }
        if (Object.keys(formProperties).length === 0) {
            // update node position
            node.codedata.lineRange = {
                ...targetLineRange,
                fileName: fileName,
            };
            // add node to source code
            onSubmit();
            return;
        }

        // hide connection property if node is a REMOTE_ACTION_CALL or RESOURCE_ACTION_CALL node
        if (node.codedata.node === "REMOTE_ACTION_CALL" || node.codedata.node === "RESOURCE_ACTION_CALL") {
            if (enrichedNodeProperties?.connection) {
                enrichedNodeProperties.connection.optional = true;
            } else if (formProperties?.connection) {
                formProperties.connection.optional = true;
            }
        }

        rpcClient
            .getInlineDataMapperRpcClient()
            .getVisualizableFields({ filePath: fileName, flowNode: node, position: targetLineRange.startLine })
            .then((res) => {
                setVisualizableFields(res.visualizableProperties);
            });

        // Extract fields with typeMembers where kind is RECORD_TYPE
        const recordTypeFields = Object.entries(formProperties)
            .filter(([_, property]) =>
                property.typeMembers &&
                property.typeMembers.some(member => member.kind === "RECORD_TYPE")
            )
            .map(([key, property]) => ({
                key,
                property,
                recordTypeMembers: property.typeMembers.filter(member => member.kind === "RECORD_TYPE")
            }));

        setRecordTypeFields(recordTypeFields);
        console.log(">>> Fields with RECORD_TYPE:", recordTypeFields);

        // get node properties
        const fields = convertNodePropertiesToFormFields(enrichedNodeProperties || formProperties, connections, clientName);
        setFields(fields);
        setFormImports(getImportsForFormFields(fields));
    };

    const handleOnSubmit = (data: FormValues, dirtyFields: any) => {
        console.log(">>> on form generator submit", data);
        if (node && targetLineRange) {
            const updatedNode = mergeFormDataWithFlowNode(data, targetLineRange, dirtyFields);
            console.log(">>> Updated node", updatedNode);

            const isDataMapperFormUpdate = data["isDataMapperFormUpdate"];
            onSubmit(updatedNode, isDataMapperFormUpdate, formImports);
        }
    };

    const mergeFormDataWithFlowNode = (data: FormValues, targetLineRange: LineRange, dirtyFields?: any): FlowNode => {
        const clonedNode = cloneDeep(node);
        // Create updated node with new line range
        const updatedNode = createNodeWithUpdatedLineRange(clonedNode, targetLineRange);

        // assign to a existing variable
        const processedData = processFormData(data);

        // Update node properties
        const nodeWithUpdatedProps = updateNodeWithProperties(clonedNode, updatedNode, processedData, formImports, dirtyFields);

        // check all nodes and remove empty nodes
        return removeEmptyNodes(nodeWithUpdatedProps);
    };

    const handleOpenView = async (filePath: string, position: NodePosition) => {
        console.log(">>> open view: ", { filePath, position });
        const context: VisualizerLocation = {
            documentUri: filePath,
            position: position,
        };
        await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    };

    const handleOpenTypeEditor = (isOpen: boolean, f: FormValues, editingField?: FormField) => {
        // Get f.value and assign that value to field value
        const updatedFields = fields.map((field) => {
            const updatedField = { ...field };
            if (f[field.key]) {
                updatedField.value = f[field.key];
            }
            return updatedField;
        });
        setFields(updatedFields);
        setTypeEditorState({ isOpen, fieldKey: editingField?.key, newTypeValue: f[editingField?.key] });
    };

    const handleUpdateImports = (key: string, imports: Imports) => {
        const importKey = Object.keys(imports)?.[0];
        if (Object.keys(formImports).includes(key)) {
            if (importKey && !Object.keys(formImports[key]).includes(importKey)) {
                const updatedImports = { ...formImports, [key]: { ...formImports[key], ...imports } };
                setFormImports(updatedImports);
            }
        } else {
            const updatedImports = { ...formImports, [key]: imports };
            setFormImports(updatedImports);
        }
    }

    /* Expression editor related functions */
    const handleExpressionEditorCancel = () => {
        setFilteredCompletions([]);
        setCompletions([]);
        setFilteredTypes([]);
    };

    const debouncedRetrieveCompletions = useCallback(
        debounce(
            async (
                value: string,
                property: ExpressionProperty,
                offset: number,
                triggerCharacter?: string
            ) => {
                let expressionCompletions: CompletionItem[] = [];
                const { parentContent, currentContent } = value
                    .slice(0, offset)
                    .match(EXPRESSION_EXTRACTION_REGEX)?.groups ?? {};
                if (
                    completions.length > 0 &&
                    !triggerCharacter &&
                    parentContent === prevCompletionFetchText.current
                ) {
                    expressionCompletions = completions
                        .filter((completion) => {
                            const lowerCaseText = currentContent.toLowerCase();
                            const lowerCaseLabel = completion.label.toLowerCase();

                            return lowerCaseLabel.includes(lowerCaseText);
                        })
                        .sort((a, b) => a.sortText.localeCompare(b.sortText));
                } else {
                    const { lineOffset, charOffset } = getInfoFromExpressionValue(value, offset);
                    let completions = await rpcClient.getBIDiagramRpcClient().getExpressionCompletions({
                        filePath: fileName,
                        context: {
                            expression: value,
                            startLine: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                            lineOffset: lineOffset,
                            offset: charOffset,
                            codedata: node.codedata,
                            property: property
                        },
                        completionContext: {
                            triggerKind: triggerCharacter ? 2 : 1,
                            triggerCharacter: triggerCharacter as TriggerCharacter
                        }
                    });

                    // Convert completions to the ExpressionEditor format
                    let convertedCompletions: CompletionItem[] = [];
                    completions?.forEach((completion) => {
                        if (completion.detail) {
                            // HACK: Currently, completion with additional edits apart from imports are not supported
                            // Completions that modify the expression itself (ex: member access)
                            convertedCompletions.push(convertBalCompletion(completion));
                        }
                    });
                    setCompletions(convertedCompletions);

                    if (triggerCharacter) {
                        expressionCompletions = convertedCompletions;
                    } else {
                        expressionCompletions = convertedCompletions
                            .filter((completion) => {
                                const lowerCaseText = currentContent.toLowerCase();
                                const lowerCaseLabel = completion.label.toLowerCase();

                                return lowerCaseLabel.includes(lowerCaseText);
                            })
                            .sort((a, b) => a.sortText.localeCompare(b.sortText));
                    }
                }

                prevCompletionFetchText.current = parentContent ?? "";
                setFilteredCompletions(expressionCompletions);
            },
            250
        ),
        [rpcClient, completions, fileName, targetLineRange, node]
    );

    const handleRetrieveCompletions = useCallback(
        async (
            value: string,
            property: ExpressionProperty,
            offset: number,
            triggerCharacter?: string
        ) => {
            await debouncedRetrieveCompletions(value, property, offset, triggerCharacter);

            if (triggerCharacter) {
                await debouncedRetrieveCompletions.flush();
            }
        },
        [debouncedRetrieveCompletions]
    );

    const debouncedGetVisibleTypes = useCallback(
        debounce(
            async (
                value: string,
                cursorPosition: number,
                fetchReferenceTypes: boolean,
                valueTypeConstraint?: string
            ) => {
                let visibleTypes: CompletionItem[] = types;
                if (!types.length) {
                    const types = await rpcClient.getBIDiagramRpcClient().getVisibleTypes({
                        filePath: fileName,
                        position: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                        ...(valueTypeConstraint && { typeConstraint: valueTypeConstraint })
                    });

                    const isFetchingTypesForDM = valueTypeConstraint === "json";
                    visibleTypes = convertToVisibleTypes(types, isFetchingTypesForDM);
                    setTypes(visibleTypes);
                }

                if (!fetchReferenceTypes) {
                    const effectiveText = value.slice(0, cursorPosition);
                    let filteredTypes = visibleTypes.filter((type) => {
                        const lowerCaseText = effectiveText.toLowerCase();
                        const lowerCaseLabel = type.label.toLowerCase();

                        return lowerCaseLabel.includes(lowerCaseText);
                    });
                    setFilteredTypes(filteredTypes);
                }
            },
            250
        ),
        [rpcClient, types, fileName, targetLineRange]
    );

    const handleGetVisibleTypes = useCallback(
        async (value: string, cursorPosition: number, fetchReferenceTypes?: boolean, valueTypeConstraint?: string) => {
            await debouncedGetVisibleTypes(value, cursorPosition, fetchReferenceTypes, valueTypeConstraint);
        },
        [debouncedGetVisibleTypes]
    );

    const extractArgsFromFunction = async (value: string, property: ExpressionProperty, cursorPosition: number) => {
        const { lineOffset, charOffset } = getInfoFromExpressionValue(value, cursorPosition);
        const signatureHelp = await rpcClient.getBIDiagramRpcClient().getSignatureHelp({
            filePath: fileName,
            context: {
                expression: value,
                startLine: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                lineOffset: lineOffset,
                offset: charOffset,
                codedata: node.codedata,
                property: property,
            },
            signatureHelpContext: {
                isRetrigger: false,
                triggerKind: 1,
            },
        });

        return await convertToFnSignature(signatureHelp);
    };

    const handleExpressionFormDiagnostics = useCallback(
        debounce(
            async (
                showDiagnostics: boolean,
                expression: string,
                key: string,
                property: ExpressionProperty,
                setDiagnosticsInfo: (diagnostics: FormDiagnostics) => void,
                shouldUpdateNode?: boolean,
                variableType?: string
            ) => {
                if (!showDiagnostics) {
                    setDiagnosticsInfo({ key, diagnostics: [] });
                    return;
                }

                // HACK: For variable nodes, update the type value in the node
                if (shouldUpdateNode) {
                    node.properties["type"].value = variableType || "any";
                }

                try {
                    const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
                        filePath: fileName,
                        context: {
                            expression: expression,
                            startLine: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                            lineOffset: 0,
                            offset: 0,
                            codedata: node.codedata,
                            property: property,
                        },
                    });

                    let uniqueDiagnostics = removeDuplicateDiagnostics(response.diagnostics);

                    // HACK: filter unknown module and undefined type diagnostics for local connections
                    uniqueDiagnostics = filterUnsupportedDiagnostics(uniqueDiagnostics);

                    setDiagnosticsInfo({ key, diagnostics: uniqueDiagnostics });
                } catch (error) {
                    // Remove diagnostics if LS crashes
                    console.error(">>> Error getting expression diagnostics", error);
                    setDiagnosticsInfo({ key, diagnostics: [] });
                }

            },
            250
        ),
        [rpcClient, fileName, targetLineRange, node]
    );

    const handleCompletionItemSelect = async (
        value: string,
        fieldKey: string,
        additionalTextEdits?: TextEdit[]
    ) => {
        if (additionalTextEdits?.[0]?.newText) {
            const response = await rpcClient.getBIDiagramRpcClient().updateImports({
                filePath: fileName,
                importStatement: additionalTextEdits[0].newText,
            });
            expressionOffsetRef.current += response.importStatementOffset;

            if (response.prefix && response.moduleId) {
                const importStatement = {
                    [response.prefix]: response.moduleId
                }
                handleUpdateImports(fieldKey, importStatement);
            }
        }
        debouncedRetrieveCompletions.cancel();
        debouncedGetVisibleTypes.cancel();
        handleExpressionEditorCancel();
    };

    const handleExpressionEditorBlur = () => {
        handleExpressionEditorCancel();
    };

    const onTypeEditorClosed = () => {
        setTypeEditorState({ isOpen: false });
    };

    const onTypeChange = async (type: Type) => {
        const updatedFields = fields.map((field) => {
            if (field.key === typeEditorState.fieldKey) {
                return { ...field, value: type.name };
            }
            return field;
        });
        setFields(updatedFields);
        setTypeEditorState({ isOpen: false });
    };

    const handleGetHelperPane = (
        fieldKey: string,
        exprRef: RefObject<FormExpressionEditorRef>,
        anchorRef: RefObject<HTMLDivElement>,
        defaultValue: string,
        value: string,
        onChange: (value: string, updatedCursorPosition: number) => void,
        changeHelperPaneState: (isOpen: boolean) => void,
        helperPaneHeight: HelperPaneHeight,
        recordTypeField?: RecordTypeField,
        isAssignIdentifier?: boolean
    ) => {
        const handleHelperPaneClose = () => {
            debouncedRetrieveCompletions.cancel();
            changeHelperPaneState(false);
            handleExpressionEditorCancel();
        }

        return getHelperPane({
            fieldKey: fieldKey,
            fileName: fileName,
            targetLineRange: updateLineRange(targetLineRange, expressionOffsetRef.current),
            exprRef: exprRef,
            anchorRef: anchorRef,
            onClose: handleHelperPaneClose,
            defaultValue: defaultValue,
            currentValue: value,
            onChange: onChange,
            helperPaneHeight: helperPaneHeight,
            recordTypeField: recordTypeField,
            isAssignIdentifier: isAssignIdentifier,
            updateImports: handleUpdateImports
        });
    };

    const handleGetTypeHelper = (
        fieldKey: string,
        valueTypeConstraint: string,
        typeBrowserRef: RefObject<HTMLDivElement>,
        currentType: string,
        currentCursorPosition: number,
        typeHelperState: boolean,
        onChange: (newType: string, newCursorPosition: number) => void,
        changeHelperPaneState: (isOpen: boolean) => void,
        typeHelperHeight: HelperPaneHeight,
        onTypeCreate: () => void,
    ) => {
        const handleCreateNewType = (typeName: string) => {
            onTypeCreate();
            setTypeEditorState({ isOpen: true, newTypeValue: typeName, fieldKey: fieldKey });
        }

        const handleCloseCompletions = () => {
            debouncedGetVisibleTypes.cancel();
            handleExpressionEditorCancel();
        }

        return getTypeHelper({
            fieldKey: fieldKey,
            valueTypeConstraint: valueTypeConstraint,
            typeBrowserRef: typeBrowserRef,
            filePath: fileName,
            targetLineRange: updateLineRange(targetLineRange, expressionOffsetRef.current),
            currentType: currentType,
            currentCursorPosition: currentCursorPosition,
            helperPaneHeight: typeHelperHeight,
            typeHelperState: typeHelperState,
            onChange: onChange,
            changeTypeHelperState: changeHelperPaneState,
            updateImports: handleUpdateImports,
            onTypeCreate: handleCreateNewType,
            onCloseCompletions: handleCloseCompletions
        });
    }

    const expressionEditor = useMemo(() => {
        return {
            completions: filteredCompletions,
            triggerCharacters: TRIGGER_CHARACTERS,
            retrieveCompletions: handleRetrieveCompletions,
            extractArgsFromFunction: extractArgsFromFunction,
            types: filteredTypes,
            referenceTypes: types,
            retrieveVisibleTypes: handleGetVisibleTypes,
            getHelperPane: handleGetHelperPane,
            getTypeHelper: handleGetTypeHelper,
            getExpressionFormDiagnostics: handleExpressionFormDiagnostics,
            onCompletionItemSelect: handleCompletionItemSelect,
            onBlur: handleExpressionEditorBlur,
            onCancel: handleExpressionEditorCancel,
            helperPaneOrigin: "left",
            helperPaneHeight: "full",
        } as FormExpressionEditorProps;
    }, [
        filteredCompletions,
        types,
        filteredTypes,
        handleRetrieveCompletions,
        extractArgsFromFunction,
        handleGetVisibleTypes,
        handleGetHelperPane,
        handleExpressionFormDiagnostics,
        handleCompletionItemSelect,
        handleExpressionEditorBlur,
        handleExpressionEditorCancel,
    ]);

    const fetchVisualizableFields = async (filePath: string, flowNode: FlowNode, position: LinePosition) => {
        const res = await rpcClient
            .getInlineDataMapperRpcClient()
            .getVisualizableFields({ filePath, flowNode, position });
        setVisualizableFields(res.visualizableProperties);
    };

    const handleTypeCreate = (typeName?: string) => {
        setTypeEditorState({ isOpen: true, newTypeValue: typeName, fieldKey: typeEditorState.fieldKey });
    };

    // handle if node form
    if (node?.codedata.node === "IF") {
        return (
            <IfForm
                fileName={fileName}
                node={node}
                targetLineRange={targetLineRange}
                expressionEditor={expressionEditor}
                showProgressIndicator={showProgressIndicator}
                onSubmit={onSubmit}
                openSubPanel={openSubPanel}
                updatedExpressionField={updatedExpressionField}
                subPanelView={subPanelView}
                resetUpdatedExpressionField={resetUpdatedExpressionField}
            />
        );
    }

    // handle match node form
    if (node?.codedata.node === "MATCH") {
        return (
            <MatchForm
                fileName={fileName}
                node={node}
                targetLineRange={targetLineRange}
                expressionEditor={expressionEditor}
                onSubmit={onSubmit}
                showProgressIndicator={showProgressIndicator}
                openSubPanel={openSubPanel}
                updatedExpressionField={updatedExpressionField}
                subPanelView={subPanelView}
                resetUpdatedExpressionField={resetUpdatedExpressionField}
            />
        );
    }

    // handle fork node form
    if (node?.codedata.node === "FORK") {
        return (
            <ForkForm
                fileName={fileName}
                node={node}
                targetLineRange={targetLineRange}
                expressionEditor={expressionEditor}
                showProgressIndicator={showProgressIndicator}
                onSubmit={onSubmit}
                openSubPanel={openSubPanel}
                updatedExpressionField={updatedExpressionField}
                resetUpdatedExpressionField={resetUpdatedExpressionField}
                subPanelView={subPanelView}
            />
        );
    }

    if (!node) {
        console.log(">>> Node is undefined");
        return null;
    }

    // customize info label based on the node type
    const notSupportedLabel =
        "This statement is not supported in low-code yet. Please use the Ballerina source code to modify it accordingly.";
    const infoLabel = node.codedata.node === "EXPRESSION" ? notSupportedLabel : node.metadata.description;

    // Create action button from config if provided
    const actionButton = actionButtonConfig ? (
        <ActionButtonContainer>
            {actionButtonConfig.description && (
                <ActionButtonDescription>{actionButtonConfig.description}</ActionButtonDescription>
            )}
            <StyledActionButton appearance="secondary" onClick={actionButtonConfig.callback}>
                {actionButtonConfig.actionLabel}
            </StyledActionButton>
        </ActionButtonContainer>
    ) : undefined;

    // default form
    return (
        <>
            {fields && fields.length > 0 && (
                <Form
                    formFields={fields}
                    projectPath={projectPath}
                    selectedNode={node.codedata.node}
                    openRecordEditor={handleOpenTypeEditor}
                    onSubmit={handleOnSubmit}
                    openView={handleOpenView}
                    openSubPanel={openSubPanel}
                    subPanelView={subPanelView}
                    expressionEditor={expressionEditor}
                    targetLineRange={targetLineRange}
                    fileName={fileName}
                    isSaving={showProgressIndicator}
                    submitText={submitText}
                    updatedExpressionField={updatedExpressionField}
                    resetUpdatedExpressionField={resetUpdatedExpressionField}
                    mergeFormDataWithFlowNode={mergeFormDataWithFlowNode}
                    handleVisualizableFields={fetchVisualizableFields}
                    visualizableFields={visualizableFields}
                    infoLabel={infoLabel}
                    disableSaveButton={disableSaveButton}
                    actionButton={actionButton}
                    recordTypeFields={recordTypeFields}
                    isInferredReturnType={!!node.codedata?.inferredReturnType}
                    formImports={formImports}
                />
            )}
            {typeEditorState.isOpen && (
                <PanelContainer title={"New Type"} show={true} onClose={onTypeEditorClosed}>
                    <FormTypeEditor
                        newType={true}
                        newTypeValue={typeEditorState.newTypeValue}
                        isGraphql={isGraphql}
                        onTypeChange={onTypeChange}
                        onTypeCreate={handleTypeCreate}
                    />
                </PanelContainer>
            )}
        </>
    );
}

export default FormGenerator;
