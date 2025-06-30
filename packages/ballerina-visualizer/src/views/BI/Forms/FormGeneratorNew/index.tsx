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
    LineRange,
    NodePosition,
    SubPanel,
    VisualizerLocation,
    TRIGGER_CHARACTERS,
    TriggerCharacter,
    Type,
    TextEdit,
    NodeKind,
    ExpressionProperty,
    RecordTypeField,
    FormDiagnostics,
    Imports
} from "@wso2/ballerina-core";
import {
    FormField,
    FormValues,
    Form,
    ExpressionFormField,
    FormExpressionEditorProps,
    PanelContainer,
    FormImports
} from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { CompletionItem, FormExpressionEditorRef, HelperPaneHeight, Overlay, ThemeColors } from "@wso2/ui-toolkit";

import {
    convertBalCompletion,
    convertToFnSignature,
    convertToVisibleTypes,
    filterUnsupportedDiagnostics,
    getImportsForFormFields,
    getInfoFromExpressionValue,
    injectHighlightTheme,
    removeDuplicateDiagnostics,
    updateLineRange
} from "../../../../utils/bi";
import { debounce, set } from "lodash";
import { getHelperPane } from "../../HelperPane";
import { FormTypeEditor } from "../../TypeEditor";
import { getTypeHelper } from "../../TypeHelper";
import { EXPRESSION_EXTRACTION_REGEX } from "../../../../constants";

interface TypeEditorState {
    isOpen: boolean;
    field?: FormField; // Optional, to store the field being edited
    newTypeValue?: string;
}

interface FormProps {
    fileName: string;
    fields: FormField[];
    targetLineRange: LineRange;
    projectPath?: string;
    submitText?: string;
    cancelText?: string;
    onBack?: () => void;
    editForm?: boolean;
    isGraphqlEditor?: boolean;
    onSubmit: (data: FormValues, formImports?: FormImports) => void;
    isSaving?: boolean;
    isActiveSubPanel?: boolean;
    openSubPanel?: (subPanel: SubPanel) => void;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    selectedNode?: NodeKind;
    nestedForm?: boolean;
    compact?: boolean;
    helperPaneSide?: 'right' | 'left';
    recordTypeFields?: RecordTypeField[];
    disableSaveButton?: boolean;
    concertMessage?: string;
    concertRequired?: boolean;
    description?: string;
}

export function FormGeneratorNew(props: FormProps) {
    const {
        fileName,
        fields,
        targetLineRange,
        projectPath,
        submitText,
        cancelText,
        onBack,
        onSubmit,
        isSaving,
        isGraphqlEditor,
        openSubPanel,
        updatedExpressionField,
        resetUpdatedExpressionField,
        selectedNode,
        nestedForm,
        compact = false,
        helperPaneSide,
        recordTypeFields,
        disableSaveButton = false,
        concertMessage,
        concertRequired,
        description
    } = props;

    const { rpcClient } = useRpcContext();

    const [typeEditorState, setTypeEditorState] = useState<TypeEditorState>({ isOpen: false, newTypeValue: "" });

    /* Expression editor related state and ref variables */
    const prevCompletionFetchText = useRef<string>("");
    const [completions, setCompletions] = useState<CompletionItem[]>([]);
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>([]);
    const [types, setTypes] = useState<CompletionItem[]>([]);
    const [filteredTypes, setFilteredTypes] = useState<CompletionItem[]>([]);
    const expressionOffsetRef = useRef<number>(0); // To track the expression offset on adding import statements

    const [fieldsValues, setFields] = useState<FormField[]>(fields);
    const [formImports, setFormImports] = useState<FormImports>({});

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
        if (fields) {
            setFields(fields);
            setFormImports(getImportsForFormFields(fields));
        }
    }, [fields]);

    useEffect(() => {
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
                console.log('>>> Form opened');
            });
    };

    const handleFormClose = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .formDidClose({ filePath: fileName })
            .then(() => {
                console.log('>>> Form closed');
            });
    };

    const handleOpenView = async (filePath: string, position: NodePosition) => {
        console.log(">>> open view: ", { filePath, position });
        const context: VisualizerLocation = {
            documentUri: filePath,
            position: position,
        };
        await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    };

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
                            codedata: undefined,
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
        [rpcClient, completions, fileName, targetLineRange]
    );

    const handleRetrieveCompletions = useCallback(async (
        value: string,
        property: ExpressionProperty,
        offset: number,
        triggerCharacter?: string
    ) => {
        await debouncedRetrieveCompletions(value, property, offset, triggerCharacter);

        if (triggerCharacter) {
            await debouncedRetrieveCompletions.flush();
        }
    }, [debouncedRetrieveCompletions]);

    const debouncedGetVisibleTypes = useCallback(
        debounce(
            async (
                value: string,
                cursorPosition: number,
                fetchReferenceTypes?: boolean,
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

    const handleCompletionItemSelect = async (
        value: string,
        fieldKey: string,
        additionalTextEdits?: TextEdit[]
    ) => {
        if (additionalTextEdits?.[0].newText) {
            const response = await rpcClient.getBIDiagramRpcClient().updateImports({
                filePath: fileName,
                importStatement: additionalTextEdits[0].newText
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

                try {
                    const field = fields.find(f => f.key === key);
                    if (field) {
                        const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
                            filePath: fileName,
                            context: {
                                expression: expression,
                                startLine: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                                lineOffset: 0,
                                offset: 0,
                                codedata: field.codedata,
                                property: property,
                            },
                        });

                        let uniqueDiagnostics = removeDuplicateDiagnostics(response.diagnostics);
                        // HACK: filter unknown module and undefined type diagnostics for local connections
                        uniqueDiagnostics = filterUnsupportedDiagnostics(uniqueDiagnostics);
                        
                        setDiagnosticsInfo({ key, diagnostics: uniqueDiagnostics });
                    }
                } catch (error) {
                    // Remove diagnostics if LS crashes
                    console.error(">>> Error getting expression diagnostics", error);
                    setDiagnosticsInfo({ key, diagnostics: [] });
                }

            },
            250
        ),
        [rpcClient, fileName, targetLineRange]
    );

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
        const formField = fieldsValues.find(f => f.key === fieldKey);
        const handleCreateNewType = (typeName: string) => {
            onTypeCreate();
            setTypeEditorState({ isOpen: true, newTypeValue: typeName, field: formField });
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

    const handleTypeChange = async (type: Type) => {
        setTypeEditorState({ isOpen: false });

        if (typeEditorState.field) {
            const updatedFields = fieldsValues.map(field => {
                if (field.key === typeEditorState.field.key) {
                    // Only handle parameter type if editingField is a parameter
                    if (typeEditorState.field.type === 'PARAM_MANAGER'
                        && field.type === 'PARAM_MANAGER'
                        && field.paramManagerProps.formFields
                    ) {
                        return {
                            ...field,
                            paramManagerProps: {
                                ...field.paramManagerProps,
                                formFields: field?.paramManagerProps?.formFields.map(subField =>
                                    subField.key === 'type' ? { ...subField, value: type.name } : subField
                                )
                            }
                        };
                    }
                    // Handle regular fields
                    return {
                        ...field,
                        value: type.name
                    };
                }
                return field;
            });
            setFields(updatedFields);
        }
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
        setTypeEditorState({ isOpen, field: editingField, newTypeValue: f[editingField?.key] });
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

    const defaultType = (): Type => {
        if (typeEditorState.field.type === 'PARAM_MANAGER') {
            return {
                name: typeEditorState.newTypeValue || "MyType",
                editable: true,
                metadata: {
                    label: "",
                    description: "",
                },
                codedata: {
                    node: "RECORD",
                },
                properties: {},
                members: [],
                includes: [] as string[],
                allowAdditionalFields: false
            };
        }
        return {
            name: typeEditorState.newTypeValue || "MyType",
            editable: true,
            metadata: {
                label: "",
                description: ""
            },
            codedata: {
                node: "CLASS"
            },
            properties: {},
            members: [],
            includes: [] as string[],
            functions: []
        };
    }

    const onCloseTypeEditor = () => {
        setTypeEditorState({ isOpen: false });
    };

    const extractArgsFromFunction = async (value: string, property: ExpressionProperty, cursorPosition: number) => {
        const { lineOffset, charOffset } = getInfoFromExpressionValue(value, cursorPosition);
        const signatureHelp = await rpcClient.getBIDiagramRpcClient().getSignatureHelp({
            filePath: fileName,
            context: {
                expression: value,
                startLine: updateLineRange(targetLineRange, expressionOffsetRef.current).startLine,
                lineOffset: lineOffset,
                offset: charOffset,
                codedata: undefined,
                property: property,
            },
            signatureHelpContext: {
                isRetrigger: false,
                triggerKind: 1,
            },
        });

        return await convertToFnSignature(signatureHelp);
    };

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
            helperPaneOrigin: helperPaneSide || "right",
            helperPaneHeight: "3/4"
        } as FormExpressionEditorProps;
    }, [
        filteredCompletions,
        filteredTypes,
        handleRetrieveCompletions,
        extractArgsFromFunction,
        handleGetVisibleTypes,
        handleGetHelperPane,
        handleCompletionItemSelect,
        handleExpressionEditorBlur,
        handleExpressionEditorCancel
    ]);

    const handleSubmit = (values: FormValues) => {
        onSubmit(values, formImports);
    };

    const handleTypeCreate = (typeName?: string) => {
        setTypeEditorState({ isOpen: true, newTypeValue: typeName, field: typeEditorState.field });
    };

    const renderTypeEditor = (isGraphql: boolean) => (
        <>
            <PanelContainer
                title={"New Type"}
                show={true}
                onClose={onCloseTypeEditor}
            >
                <FormTypeEditor
                    newType={true}
                    onTypeChange={handleTypeChange}
                    newTypeValue={typeEditorState.newTypeValue}
                    onTypeCreate={handleTypeCreate}
                    {...(isGraphql && { type: defaultType(), isGraphql: true })}
                />
            </PanelContainer>
            <Overlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 1000 }} />
        </>
    );

    // default form
    return (
        <>
            {fields && fields.length > 0 && (
                <Form
                    nestedForm={nestedForm}
                    formFields={fieldsValues}
                    projectPath={projectPath}
                    openRecordEditor={handleOpenTypeEditor}
                    onCancelForm={onBack}
                    submitText={submitText}
                    cancelText={cancelText}
                    onSubmit={handleSubmit}
                    isSaving={isSaving}
                    openView={handleOpenView}
                    openSubPanel={openSubPanel}
                    expressionEditor={expressionEditor}
                    targetLineRange={targetLineRange}
                    fileName={fileName}
                    updatedExpressionField={updatedExpressionField}
                    resetUpdatedExpressionField={resetUpdatedExpressionField}
                    selectedNode={selectedNode}
                    compact={compact}
                    recordTypeFields={recordTypeFields}
                    disableSaveButton={disableSaveButton}
                    concertMessage={concertMessage}
                    concertRequired={concertRequired}
                    infoLabel={description}
                    formImports={formImports}
                />
            )}
            {typeEditorState.isOpen && (
                renderTypeEditor(isGraphqlEditor)
            )}
        </>
    );
}

export default FormGeneratorNew;
