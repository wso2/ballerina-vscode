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

import { GetRecordConfigResponse, GetRecordConfigRequest, LineRange, RecordTypeField, TypeField, RecordSourceGenRequest, RecordSourceGenResponse, GetRecordModelFromSourceRequest, GetRecordModelFromSourceResponse, ExpressionProperty, NodeKind } from "@wso2/ballerina-core";
import { Dropdown, HelperPane, Typography, Button, HelperPaneHeight, FormExpressionEditorRef, ErrorBanner, ProgressRing, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useEffect, useRef, useState, RefObject } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { RecordConfigView } from "./RecordConfigView";
import { ChipExpressionEditorComponent, Context as FormContext, HelperpaneOnChangeOptions, FieldProvider, FormField, FormExpressionEditorProps, getPropertyFromFormField } from "@wso2/ballerina-side-panel";
import { useForm } from "react-hook-form";
import { debounce } from "lodash";
import ReactMarkdown from "react-markdown";

type ConfigureRecordPageProps = {
    fileName: string;
    targetLineRange?: LineRange;
    onChange: (value: string, isRecordConfigureChange: boolean) => void;
    currentValue: string;
    recordTypeField: RecordTypeField;
    onClose: () => void;
    getHelperPane: (
        fieldKey: string,
        exprRef: RefObject<FormExpressionEditorRef>,
        anchorRef: RefObject<HTMLDivElement>,
        defaultValue: string,
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        changeHelperPaneState: (isOpen: boolean) => void,
        helperPaneHeight: HelperPaneHeight,
        recordTypeField?: RecordTypeField,
        isAssignIdentifier?: boolean,
        defaultValueTypeConstraint?: string,
    ) => React.ReactNode;
    field?: FormField;
    triggerCharacters: readonly string[];
    formContext: {
        expressionEditor: FormExpressionEditorProps;
        popupManager: {
            addPopup: (modal: React.ReactNode, id: string, title: string, height?: number, width?: number, onClose?: () => void) => void;
            removeLastPopup: () => void;
            closePopup: (id: string) => void;
        };
        nodeInfo: {
            kind: NodeKind;
        };
    };
};

export const LabelContainer = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingBottom: '20px'
});

export const TwoColumnLayout = styled.div({
    display: 'flex',
    gap: '16px',
    height: '500px'
});

export const LeftColumn = styled.div({
    flex: '1',
    minWidth: '300px',
    overflow: 'auto',
    position: 'relative'
});

export const RightColumn = styled.div({
    flex: '1',
    minWidth: '300px',
    borderLeft: '1px solid var(--vscode-panel-border)',
    paddingLeft: '16px',
    display: 'flex',
    flexDirection: 'column'
});

export const LoadingOverlay = styled.div({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--vscode-editor-background)',
    opacity: 0.5,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
});

export const ExpressionEditorContainer = styled.div({
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
});

export const ExpressionEditorLabel = styled.div({
    fontSize: 'var(--vscode-font-size)',
    color: 'var(--vscode-foreground)',
    fontWeight: 500,
    marginBottom: '8px'
});

export const ExpressionEditorDocumentation = styled.div({
    fontSize: 'var(--vscode-font-size)',
    color: 'var(--vscode-descriptionForeground)',
    marginTop: '4px',
    marginBottom: '8px',
    '& p': {
        margin: 0,
        marginBottom: '4px'
    }
});

export const ButtonContainer = styled.div({
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '16px'
});

export function ConfigureRecordPage(props: ConfigureRecordPageProps) {
    const { fileName, onChange, currentValue, recordTypeField, onClose, targetLineRange, getHelperPane, field, triggerCharacters, formContext } = props;
    const { rpcClient } = useRpcContext();

    const [recordModel, setRecordModel] = useState<TypeField[]>([]);
    const [selectedMemberName, setSelectedMemberName] = useState<string>("");
    const firstRender = useRef<boolean>(true);
    const sourceCode = useRef<string>(currentValue);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // Local state for expression value - only update form on save/close
    const [localExpressionValue, setLocalExpressionValue] = useState<string>(currentValue);
    // Diagnostics state
    const [formDiagnostics, setFormDiagnostics] = useState<any[]>(field?.diagnostics || []);

    // Refs for helper pane
    const exprRef = useRef<FormExpressionEditorRef>(null);
    const anchorRef = useRef<HTMLDivElement>(null);

    // Ref to track the latest expression value that should be synced
    // This prevents intermediate values from overwriting the final value
    const latestExpressionToSyncRef = useRef<string>(localExpressionValue);

    // Adapter to match ChipExpressionBaseComponent's signature by providing a default property from recordTypeField.
    const wrappedExtractArgsFromFunction = formContext.expressionEditor.extractArgsFromFunction
        ? async (value: string, cursorPosition: number) => {
            // Create a default property from recordTypeField
            const defaultProperty: ExpressionProperty = {
                metadata: recordTypeField.property?.metadata,
                valueType: recordTypeField.property?.valueType,
                value: value,
                optional: recordTypeField.property?.optional,
                editable: recordTypeField.property?.editable,
                advanced: recordTypeField.property?.advanced,
                placeholder: recordTypeField.property?.placeholder,
                valueTypeConstraint: recordTypeField.property?.valueTypeConstraint,
                codedata: recordTypeField.property?.codedata,
                imports: recordTypeField.property?.imports,
                diagnostics: recordTypeField.property?.diagnostics
            };
            return await formContext.expressionEditor.extractArgsFromFunction(value, defaultProperty, cursorPosition);
        }
        : undefined;

    // Create form context for ChipExpressionBaseComponent
    const { control, watch, setValue, getValues, register, unregister, setError, clearErrors, formState } = useForm();

    const formContextValue = {
        form: {
            control,
            watch,
            setValue,
            getValues,
            register,
            unregister,
            setError,
            clearErrors,
            formState
        },
        expressionEditor: formContext.expressionEditor,
        targetLineRange: targetLineRange || { startLine: { line: 1, offset: 0 }, endLine: { line: 1, offset: 0 } },
        fileName: fileName,
        popupManager: formContext.popupManager,
        nodeInfo: formContext.nodeInfo
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            if (currentValue) {
                getExistingRecordModel();
            } else {
                getNewRecordModel();
            }

            // Fetch initial diagnostics if value exists
            if (currentValue && formContext.expressionEditor.getExpressionFormDiagnostics && targetLineRange) {
                fetchDiagnostics(currentValue);
            }
        } else if (currentValue !== sourceCode.current) {
            // Close helper pane if user changed the value in the expression editor
            onClose();
        }
    }, [currentValue]);

    const fetchRecordModelFromSource = async (currentValue: string) => {
        setIsLoading(true);
        let org = "";
        let module = "";
        let version = "";
        let packageInfo = "";

        if (recordTypeField.recordTypeMembers[0].packageInfo?.length > 0) {
            const parts = recordTypeField.recordTypeMembers[0].packageInfo.split(':');
            if (parts.length === 3) {
                [org, module, version] = parts;
                packageInfo = recordTypeField.recordTypeMembers[0].packageInfo;
            }
        } else {
            const tomValues = await rpcClient.getCommonRpcClient().getCurrentProjectTomlValues();
            org = tomValues?.package?.org || "";
            module = tomValues?.package?.name || "";
            version = tomValues?.package?.version || "";
        }
        packageInfo = `${org}:${module}:${version}`;
        recordTypeField.recordTypeMembers[0].packageInfo = packageInfo;
        const getRecordModelFromSourceRequest: GetRecordModelFromSourceRequest = {
            filePath: fileName,
            typeMembers: recordTypeField.recordTypeMembers,
            expr: currentValue
        }

        const getRecordModelFromSourceResponse: GetRecordModelFromSourceResponse =
            await rpcClient.getBIDiagramRpcClient().getRecordModelFromSource(getRecordModelFromSourceRequest);
        console.log(">>> getRecordModelFromSourceResponse", getRecordModelFromSourceResponse);
        const newRecordModel = getRecordModelFromSourceResponse.recordConfig;

        if (newRecordModel) {
            const recordConfig: TypeField = {
                name: newRecordModel.name,
                ...newRecordModel
            }

            setRecordModel([recordConfig]);
            setSelectedMemberName(newRecordModel.name);
        }

        setIsLoading(false);
    }

    const getExistingRecordModel = async () => {
        await fetchRecordModelFromSource(currentValue);
    };

    const getNewRecordModel = async () => {
        setIsLoading(true);
        const defaultSelection = recordTypeField.recordTypeMembers[0];
        setSelectedMemberName(defaultSelection.type);

        let org = "";
        let module = "";
        let version = "";
        let packageName = "";

        if (defaultSelection?.packageInfo.length > 0) {
            const parts = defaultSelection.packageInfo.split(':');
            if (parts.length === 3) {
                [org, module, version] = parts;
                packageName = defaultSelection.packageName;
            }
        } else {
            const tomValues = await rpcClient.getCommonRpcClient().getCurrentProjectTomlValues();
            org = tomValues?.package?.org || "";
            module = tomValues?.package?.name || "";
            version = tomValues?.package?.version || "";
            packageName = tomValues?.package?.name || "";
        }

        const request: GetRecordConfigRequest = {
            filePath: fileName,
            codedata: {
                org: org,
                module: module,
                version: version,
                packageName: packageName,
            },
            typeConstraint: defaultSelection.type,
        }
        const typeFieldResponse: GetRecordConfigResponse = await rpcClient.getBIDiagramRpcClient().getRecordConfig(request);
        console.log(">>> GetRecordConfigResponse", typeFieldResponse);
        if (typeFieldResponse.recordConfig) {
            const recordConfig: TypeField = {
                name: defaultSelection.type,
                ...typeFieldResponse.recordConfig
            }

            setRecordModel([recordConfig]);
        }
        setIsLoading(false);
    }

    const handleMemberChange = async (value: string) => {
        const member = recordTypeField.recordTypeMembers.find(m => m.type === value);
        if (member) {
            setIsLoading(true);
            setSelectedMemberName(member.type);

            let org = "";
            let module = "";
            let version = "";

            // Parse packageInfo if it exists
            if (member.packageInfo) {
                const parts = member.packageInfo.split(':');
                if (parts.length === 3) {
                    [org, module, version] = parts;
                }
            }

            const request: GetRecordConfigRequest = {
                filePath: fileName,
                codedata: {
                    org: org,
                    module: module,
                    version: version,
                    packageName: member?.packageName,
                },
                typeConstraint: member.type,
            }

            const typeFieldResponse: GetRecordConfigResponse = await rpcClient.getBIDiagramRpcClient().getRecordConfig(request);
            if (typeFieldResponse.recordConfig) {

                const recordConfig: TypeField = {
                    name: member.type,
                    ...typeFieldResponse.recordConfig
                }

                setRecordModel([recordConfig]);
            }
        }

        setIsLoading(false);
    };

    const handleModelChange = async (updatedModel: TypeField[]) => {
        const request: RecordSourceGenRequest = {
            filePath: fileName,
            type: updatedModel[0]
        }
        const recordSourceResponse: RecordSourceGenResponse = await rpcClient.getBIDiagramRpcClient().getRecordSource(request);
        console.log(">>> recordSourceResponse", recordSourceResponse);

        if (recordSourceResponse.recordValue !== undefined) {
            const content = recordSourceResponse.recordValue;
            sourceCode.current = content;
            // Update local expression value (which updates the ExpressionEditor on the right)
            // Also update latestExpressionToSyncRef to prevent outdated syncs
            latestExpressionToSyncRef.current = content;
            setLocalExpressionValue(content);

        }
    }

    const handleSave = () => {
        // Update the form with the current local expression value
        onChange(localExpressionValue, true);
        onClose();
    }

    // Debounced function to fetch diagnostics
    const fetchDiagnostics = useRef(
        debounce(async (value: string) => {
            if (!formContext.expressionEditor.getExpressionFormDiagnostics || !targetLineRange) {
                return;
            }

            const fieldKey = field?.key || "expression";
            const property: ExpressionProperty = {
                metadata: recordTypeField?.property?.metadata,
                valueType: recordTypeField?.property?.valueType,
                value: value,
                optional: recordTypeField?.property?.optional || false,
                editable: recordTypeField?.property?.editable !== false,
                advanced: recordTypeField?.property?.advanced,
                placeholder: recordTypeField?.property?.placeholder,
                valueTypeConstraint: recordTypeField?.property?.valueTypeConstraint,
                codedata: recordTypeField?.property?.codedata,
                imports: recordTypeField?.property?.imports,
                diagnostics: recordTypeField?.property?.diagnostics
            };

            // Create a callback to update diagnostics in the field
            const handleSetDiagnosticsInfo = (diagnosticsInfo: { key: string; diagnostics: any[] }) => {
                const diagnostics = diagnosticsInfo?.diagnostics || [];
                setFormDiagnostics(diagnostics);
            };

            await formContext.expressionEditor.getExpressionFormDiagnostics(
                !field?.optional || value !== '',
                value,
                fieldKey,
                property,
                handleSetDiagnosticsInfo,
                false, // isVariableNode
                undefined // typeValue
            );
        }, 300)
    ).current;

    // Function to sync expression changes to record model
    // This function fetches diagnostics first, then syncs if there are no errors
    const syncExpressionToModel = async (expressionValue: string) => {
        // Check if this is still the latest value to sync (user may have typed more)
        if (expressionValue !== latestExpressionToSyncRef.current) {
            return;
        }


        // First, fetch diagnostics for the expression
        if (!formContext.expressionEditor.getExpressionFormDiagnostics || !targetLineRange) {
            console.log(">>> Cannot fetch diagnostics, skipping sync");
            return;
        }

        const fieldKey = field?.key || "expression";
        const property: ExpressionProperty = {
            metadata: recordTypeField?.property?.metadata,
            valueType: recordTypeField?.property?.valueType,
            value: expressionValue,
            optional: recordTypeField?.property?.optional || false,
            editable: recordTypeField?.property?.editable !== false,
            advanced: recordTypeField?.property?.advanced,
            placeholder: recordTypeField?.property?.placeholder,
            valueTypeConstraint: recordTypeField?.property?.valueTypeConstraint,
            codedata: recordTypeField?.property?.codedata,
            imports: recordTypeField?.property?.imports,
            diagnostics: recordTypeField?.property?.diagnostics
        };

        // Fetch diagnostics and wait for them
        let diagnostics: any[] = [];
        const diagnosticsPromise = new Promise<any[]>((resolve) => {
            const handleSetDiagnosticsInfo = (diagnosticsInfo: { key: string; diagnostics: any[] }) => {
                const diags = diagnosticsInfo?.diagnostics || [];
                setFormDiagnostics(diags);
                resolve(diags);
            };

            formContext.expressionEditor.getExpressionFormDiagnostics(
                !field?.optional || expressionValue !== '',
                expressionValue,
                fieldKey,
                property,
                handleSetDiagnosticsInfo,
                false, // isVariableNode
                undefined // typeValue
            );
        });

        diagnostics = await diagnosticsPromise;

        // Check again if this is still the latest value (user may have typed more while waiting for diagnostics)
        if (expressionValue !== latestExpressionToSyncRef.current) {
            return;
        }

        // Check if there are any error diagnostics (severity === 1 indicates error)
        // Only sync if there are no errors
        const hasErrors = diagnostics.some((d: any) => d.severity === 1);

        if (hasErrors) {
            return;
        }

        // Check if the expression differs from the sourceCode (which represents the record model's expression)
        if (expressionValue !== sourceCode.current) {

            // Parse the expression to update the record model
            await fetchRecordModelFromSource(expressionValue);
            // Update sourceCode to match the new expression value
            sourceCode.current = expressionValue;
        }
    };

    // Debounced function to sync expression to model when localExpressionValue changes
    const debouncedSyncExpressionToModel = useRef(
        debounce(async (expressionValue: string) => {
            await syncExpressionToModel(expressionValue);
        }, 500)
    ).current;

    // Effect to watch localExpressionValue and trigger sync when it differs from sourceCode
    useEffect(() => {
        // Only sync if localExpressionValue differs from sourceCode
        if (localExpressionValue !== sourceCode.current) {
            // Update the latest expression to sync ref
            latestExpressionToSyncRef.current = localExpressionValue;
            debouncedSyncExpressionToModel(localExpressionValue);
        }
    }, [localExpressionValue, debouncedSyncExpressionToModel]);

    const handleExpressionChange = (updatedValue: string, updatedCursorPosition: number) => {
        // Update local expression value when user edits in the ExpressionEditor
        setLocalExpressionValue(updatedValue);

        // Fetch diagnostics (debounced) - this will update formDiagnostics state
        // The sync will be triggered by the useEffect that watches localExpressionValue
        fetchDiagnostics(updatedValue);

        // Fetch completions when user types - this ensures variable suggestions are available
        if (formContext.expressionEditor.retrieveCompletions && field) {
            const property = getPropertyFromFormField({
                ...field,
                value: updatedValue
            });
            formContext.expressionEditor.retrieveCompletions(
                updatedValue,
                property,
                updatedCursorPosition
            );
        }
    }

    // Create a wrapper for getHelperPane that adapts to ChipExpressionBaseComponent's signature
    // and updates local expression value
    const wrappedGetHelperPane = getHelperPane
        ? (value: string, onChange: (value: string, options?: HelperpaneOnChangeOptions) => void, helperPaneHeight: HelperPaneHeight) => {
            const wrappedOnChange = (newValue: string, options?: HelperpaneOnChangeOptions) => {
                onChange(newValue, options);
                // Update local expression value
                setLocalExpressionValue(newValue);
            };

            // Call getHelperPane with all required parameters including refs
            return getHelperPane(
                field?.key || "expression",
                exprRef,
                anchorRef,
                "",
                value,
                wrappedOnChange,
                () => { }, // changeHelperPaneState - no-op since ChipExpressionBaseComponent handles it
                helperPaneHeight,
                recordTypeField,
                false, // isAssignIdentifier
                typeof recordTypeField?.property?.valueTypeConstraint === 'string'
                    ? recordTypeField.property.valueTypeConstraint
                    : undefined
            );
        }
        : undefined;

    return (
        <>
            <HelperPane.Body sx={{ zIndex: 2000 }} >
                <TwoColumnLayout>
                    <LeftColumn>
                        {isLoading && (
                            <LoadingOverlay>
                                <ProgressRing color={ThemeColors.PRIMARY} />
                            </LoadingOverlay>
                        )}
                        {recordTypeField?.recordTypeMembers.length > 1 && (
                            <LabelContainer>
                                <Dropdown
                                    id="type-selector"
                                    label="Type"
                                    value={selectedMemberName}
                                    items={recordTypeField.recordTypeMembers.map((member) => ({
                                        label: member.type,
                                        value: member.type
                                    }))}
                                    onValueChange={(value) => handleMemberChange(value)}
                                />
                            </LabelContainer>
                        )}
                        {selectedMemberName && recordModel?.length > 0 ?
                            (
                                <RecordConfigView
                                    recordModel={recordModel}
                                    onModelChange={handleModelChange}
                                />
                            ) : (
                                <Typography variant="body3">Record construction assistance is unavailable.</Typography>
                            )}
                    </LeftColumn>
                    <RightColumn>
                        <ExpressionEditorContainer>
                            <div>
                                <ExpressionEditorLabel>
                                    {field?.label || "Expression"}
                                </ExpressionEditorLabel>
                                {field?.documentation && (
                                    <ExpressionEditorDocumentation>
                                        <ReactMarkdown>{field.documentation}</ReactMarkdown>
                                    </ExpressionEditorDocumentation>
                                )}
                            </div>
                            <FormContext.Provider value={formContextValue}>
                                <FieldProvider
                                    initialField={field ? {
                                        ...field,
                                        value: localExpressionValue
                                    } : {
                                        key: "expression",
                                        label: "Expression",
                                        type: "EXPRESSION",
                                        value: localExpressionValue,
                                        optional: false,
                                        valueTypeConstraint: typeof recordTypeField?.property?.valueTypeConstraint === 'string'
                                            ? recordTypeField.property.valueTypeConstraint
                                            : "",
                                        metadata: recordTypeField?.property?.metadata,
                                        editable: true,
                                        documentation: "",
                                        enabled: true
                                    }}
                                    triggerCharacters={triggerCharacters}
                                >
                                    <div ref={anchorRef}>
                                        <ChipExpressionEditorComponent
                                            completions={formContext.expressionEditor.completions}
                                            onChange={handleExpressionChange}
                                            value={localExpressionValue}
                                            fileName={fileName}
                                            targetLineRange={targetLineRange}
                                            extractArgsFromFunction={wrappedExtractArgsFromFunction}
                                            getHelperPane={wrappedGetHelperPane}
                                            sx={{ height: "350px" }}
                                            isExpandedVersion={false}                                            
                                        />
                                        {formDiagnostics && formDiagnostics.length > 0 && (
                                            <ErrorBanner errorMsg={formDiagnostics.map((d: any) => d.message).join(', ')} />
                                        )}
                                    </div>
                                </FieldProvider>
                            </FormContext.Provider>
                        </ExpressionEditorContainer>
                        <ButtonContainer>
                            <Button appearance="primary" onClick={handleSave}>
                                Save
                            </Button>
                        </ButtonContainer>
                    </RightColumn>
                </TwoColumnLayout>

            </HelperPane.Body>
        </>
    );
}
