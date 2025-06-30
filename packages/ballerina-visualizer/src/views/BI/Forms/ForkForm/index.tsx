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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Codicon, FormExpressionEditorRef, LinkButton, ThemeColors, Typography } from "@wso2/ui-toolkit";

import {
    FlowNode,
    Branch,
    LineRange,
    SubPanel,
    SubPanelView,
    FormDiagnostics,
    Diagnostic,
    ExpressionProperty,
} from "@wso2/ballerina-core";
import {
    FormValues,
    ExpressionEditor,
    ExpressionFormField,
    FormExpressionEditorProps,
} from "@wso2/ballerina-side-panel";
import { FormStyles } from "../styles";
import { convertNodePropertyToFormField, removeDuplicateDiagnostics } from "../../../../utils/bi";
import { cloneDeep, debounce } from "lodash";
import { RemoveEmptyNodesVisitor, traverseNode } from "@wso2/bi-diagram";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

interface ForkFormProps {
    fileName: string;
    node: FlowNode;
    targetLineRange: LineRange;
    expressionEditor: FormExpressionEditorProps;
    onSubmit: (node?: FlowNode) => void;
    openSubPanel: (subPanel: SubPanel) => void;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    subPanelView?: SubPanelView;
    showProgressIndicator?: boolean;
}

export function ForkForm(props: ForkFormProps) {
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
    } = props;
    const {
        watch,
        control,
        getValues,
        setValue,
        handleSubmit,
        setError,
        clearErrors,
        formState: { isValidating },
    } = useForm<FormValues>();

    const { rpcClient } = useRpcContext();
    const [activeEditor, setActiveEditor] = useState<number>(0);
    const [branches, setBranches] = useState<Branch[]>(cloneDeep(node.branches));
    const [diagnosticsInfo, setDiagnosticsInfo] = useState<FormDiagnostics[] | undefined>(undefined);

    const exprRef = useRef<FormExpressionEditorRef>(null);

    const handleFormOpen = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidOpen({ filePath: fileName })
            .then(() => {
                console.log(">>> If form opened");
            });
    };

    const handleFormClose = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidClose({ filePath: fileName })
            .then(() => {
                console.log(">>> If form closed");
            });
    };

    useEffect(() => {
        if (updatedExpressionField) {
            const currentValue = getValues(updatedExpressionField.key);

            if (currentValue !== undefined) {
                const cursorPosition =
                    exprRef.current?.shadowRoot?.querySelector("textarea")?.selectionStart ?? currentValue.length;
                const newValue =
                    currentValue.slice(0, cursorPosition) +
                    updatedExpressionField.value +
                    currentValue.slice(cursorPosition);

                setValue(updatedExpressionField.key, newValue);
                resetUpdatedExpressionField && resetUpdatedExpressionField();
            }
        }
    }, [updatedExpressionField]);

    useEffect(() => {
        handleFormOpen();
        branches.forEach((branch, index) => {
            if (branch.properties?.variable) {
                const variableValue = branch.properties.variable.value;
                setValue(`branch-${index}`, variableValue || "");
            }
        });

        return () => {
            handleFormClose();
        };
    }, []);

    const handleSetDiagnosticsInfo = (diagnostics: FormDiagnostics) => {
        const otherDiagnostics = diagnosticsInfo?.filter((item) => item.key !== diagnostics.key) || [];
        setDiagnosticsInfo([...otherDiagnostics, diagnostics]);
    };

    const handleOnSave = (data: FormValues) => {
        if (node && targetLineRange) {
            let updatedNode = cloneDeep(node);

            if (!updatedNode.codedata.lineRange) {
                updatedNode.codedata.lineRange = {
                    ...node.codedata.lineRange,
                    startLine: targetLineRange.startLine,
                    endLine: targetLineRange.endLine,
                };
            }

            branches.forEach((branch, index) => {
                const variableValue = data[`branch-${index}`]?.trim();
                if (variableValue) {
                    branch.properties.variable.value = variableValue;
                }
            });

            updatedNode.branches = branches;

            // check all nodes and remove empty nodes
            const removeEmptyNodeVisitor = new RemoveEmptyNodesVisitor(updatedNode);
            traverseNode(updatedNode, removeEmptyNodeVisitor);
            const updatedNodeWithoutEmptyNodes = removeEmptyNodeVisitor.getNode();

            console.log(">>> updatedNodeWithoutEmptyNodes", updatedNodeWithoutEmptyNodes);

            onSubmit(updatedNodeWithoutEmptyNodes);
        }
    };

    const addNewWorker = () => {
        // create new branch obj
        const newBranch: Branch = {
            label: "branch-" + branches.length,
            kind: "worker",
            codedata: {
                node: "WORKER",
                lineRange: null,
            },
            repeatable: "ONE_OR_MORE",
            properties: {
                variable: {
                    metadata: {
                        label: "Worker " + (branches.length + 1),
                        description: "Name of the worker",
                    },
                    valueType: "IDENTIFIER",
                    value: "worker" + (branches.length + 1),
                    optional: false,
                    editable: true,
                    advanced: false,
                },
                type: {
                    metadata: {
                        label: "Return Type",
                        description: "Return type of the function/worker",
                    },
                    valueType: "TYPE",
                    value: "",
                    optional: true,
                    editable: true,
                    advanced: false,
                },
            },
            children: [],
        };

        setValue(`branch-${branches.length}`, "worker" + (branches.length + 1));
        // add new branch to end of the current branches
        setBranches([...branches, newBranch]);
    };

    const removeWorker = (index: number) => {
        // Prevent removal if this is the last branch
        if (branches.length <= 2) {
            return;
        }

        // Remove the branch at the specified index
        const updatedBranches = branches.filter((_, i) => i !== index);
        setBranches(updatedBranches);

        for (let i = index + 1; i < branches.length; i++) {
            const value = getValues(`branch-${i}`);
            setValue(`branch-${i - 1}`, value);
        }
    };

    const handleExpressionEditorDiagnostics = useCallback(debounce(async (
        showDiagnostics: boolean,
        expression: string,
        key: string,
        property: ExpressionProperty
    ) => {
        if (!showDiagnostics) {
            handleSetDiagnosticsInfo({ key, diagnostics: [] });
            return;
        }

        const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
            filePath: fileName,
            context: {
                expression: expression,
                startLine: targetLineRange.startLine,
                lineOffset: 0,
                offset: 0,
                codedata: undefined,
                property: property,
            },
        });

        const uniqueDiagnostics = removeDuplicateDiagnostics(response.diagnostics);
        handleSetDiagnosticsInfo({ key, diagnostics: uniqueDiagnostics });
    }, 250),
        [rpcClient, fileName, targetLineRange, node, handleSetDiagnosticsInfo]
    );

    const handleEditorFocus = (currentActive: number) => {
        const isActiveSubPanel = subPanelView !== SubPanelView.UNDEFINED;
        if (isActiveSubPanel && activeEditor !== currentActive) {
            openSubPanel && openSubPanel({ view: SubPanelView.UNDEFINED });
        }
        setActiveEditor(currentActive);
    };

    const isValid = useMemo(() => {
        if (!diagnosticsInfo) {
            return true;
        }

        let hasDiagnostics: boolean = true;
        for (const diagnosticsInfoItem of diagnosticsInfo) {
            const key = diagnosticsInfoItem.key;
            if (!key) {
                continue;
            }

            const diagnostics: Diagnostic[] = diagnosticsInfoItem.diagnostics || [];
            if (diagnostics.length === 0) {
                clearErrors(key);
                continue;
            } else {
                const diagnosticsMessage = diagnostics.map((d) => d.message).join("\n");
                setError(key, { type: "validate", message: diagnosticsMessage });

                // If the severity is not ERROR, don't invalidate
                const hasErrorDiagnostics = diagnostics.some((d) => d.severity === 1);
                if (hasErrorDiagnostics) {
                    hasDiagnostics = false;
                } else {
                    continue;
                }
            }
        }

        return hasDiagnostics;
    }, [diagnosticsInfo]);

    const disableSaveButton = !isValid || isValidating || showProgressIndicator;

    // TODO: support multiple type fields
    return (
        <FormStyles.Container>
            {branches.map((branch, index) => {
                if (branch.properties?.variable) {
                    const field = convertNodePropertyToFormField(`branch-${index}`, branch.properties.variable);
                    field.label = "Worker " + (index + 1); // TODO: remove this
                    return (
                        <FormStyles.Row key={field.key}>
                            <ExpressionEditor
                                {...expressionEditor}
                                ref={exprRef}
                                control={control}
                                field={field}
                                watch={watch}
                                openSubPanel={openSubPanel}
                                targetLineRange={targetLineRange}
                                fileName={fileName}
                                onRemove={branches.length > 2 ? () => removeWorker(index) : undefined}
                                completions={activeEditor === index ? expressionEditor.completions : []}
                                triggerCharacters={expressionEditor.triggerCharacters}
                                retrieveCompletions={expressionEditor.retrieveCompletions}
                                extractArgsFromFunction={expressionEditor.extractArgsFromFunction}
                                getExpressionEditorDiagnostics={handleExpressionEditorDiagnostics}
                                onFocus={() => handleEditorFocus(index)}
                                onCompletionItemSelect={expressionEditor.onCompletionItemSelect}
                                onCancel={expressionEditor.onCancel}
                                onBlur={expressionEditor.onBlur}
                            />
                        </FormStyles.Row>
                    );
                }
            })}

            <LinkButton onClick={addNewWorker} sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4 }}>
                <Codicon name={"add"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                Add Worker
            </LinkButton>

            {onSubmit && (
                <FormStyles.Footer>
                    <Button appearance="primary" onClick={handleSubmit(handleOnSave)} disabled={disableSaveButton}>
                        {showProgressIndicator ? <Typography variant="progress">Saving...</Typography> : "Save"}
                    </Button>
                </FormStyles.Footer>
            )}
        </FormStyles.Container>
    );
}

export default ForkForm;
