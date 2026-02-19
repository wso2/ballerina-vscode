/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { cloneDeep } from "lodash";

import {
    EditorConfig,
    FlowNode,
    InputType,
    LineRange,
    SubPanel,
    SubPanelView,
} from "@wso2/ballerina-core";
import {
    ExpressionFormField,
    Form,
    FormExpressionEditorProps,
    FormField,
    FormImports,
    FormValues,
} from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

import { getImportsForFormFields } from "../../../../utils/bi";
import { createNodeWithUpdatedLineRange, processFormData, removeEmptyNodes, updateNodeWithProperties } from "../form-utils";

type SendEventFieldKeys = {
    workflowName?: string;
    eventName?: string;
    eventData?: string;
};

type WorkflowEventDefinition = {
    name: string;
    type: string;
};

const WORKFLOW_KEY_CANDIDATES = ["workflowName", "workflow"];
const EVENT_NAME_KEY_CANDIDATES = ["eventName", "event"];
const EVENT_DATA_KEY_CANDIDATES = ["eventData", "payload", "data"];

const getLabel = (field?: FormField) => `${field?.metadata?.label ?? field?.label ?? ""}`.toLowerCase();

const normalizeStringValue = (value: unknown): string => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.replace(/^"(.*)"$/, "$1");
    }
    if (value && typeof value === "object") {
        const optionValue = (value as any).value ?? (value as any).label ?? (value as any).id;
        if (typeof optionValue === "string") {
            const trimmed = optionValue.trim();
            return trimmed.replace(/^"(.*)"$/, "$1");
        }
    }
    return "";
};

const getSendEventFieldKeys = (fields: FormField[]): SendEventFieldKeys => {
    const workflowName =
        fields.find((field) => WORKFLOW_KEY_CANDIDATES.includes(field.key))?.key ??
        fields.find((field) => getLabel(field).includes("workflow"))?.key;

    const eventName =
        fields.find((field) => EVENT_NAME_KEY_CANDIDATES.includes(field.key))?.key ??
        fields.find((field) => {
            const label = getLabel(field);
            return label.includes("event") && label.includes("name");
        })?.key;

    const eventData =
        fields.find((field) => EVENT_DATA_KEY_CANDIDATES.includes(field.key))?.key ??
        fields.find((field) => {
            const label = getLabel(field);
            return label.includes("event") && (label.includes("data") || label.includes("payload"));
        })?.key;

    return { workflowName, eventName, eventData };
};

const extractWorkflowEvents = (response: any): WorkflowEventDefinition[] => {
    const events =
        response?.events ??
        response?.output?.events ??
        response?.result?.events ??
        response?.result?.output?.events;
    if (!Array.isArray(events)) {
        return [];
    }

    return events
        .filter((event) => event && typeof event.name === "string" && event.name.trim().length > 0)
        .map((event) => ({
            name: event.name,
            type: typeof event.type === "string" && event.type.trim().length > 0 ? event.type : "anydata",
        }));
};

const updateEventDataTypes = (types: InputType[] | undefined, ballerinaType: string): InputType[] => {
    if (!types?.length) {
        return [{ fieldType: "EXPRESSION", ballerinaType, selected: true } as InputType];
    }

    let selectedAssigned = false;
    return types.map((type, index) => {
        const shouldSelect = !selectedAssigned && (type.selected || index === 0);
        if (shouldSelect) {
            selectedAssigned = true;
            return { ...type, selected: true, ballerinaType };
        }
        return { ...type, selected: false };
    });
};

interface SendEventFormProps {
    fileName: string;
    node: FlowNode;
    targetLineRange: LineRange;
    expressionEditor: FormExpressionEditorProps;
    formFields: FormField[];
    showProgressIndicator?: boolean;
    submitText?: string;
    disableSaveButton?: boolean;
    subPanelView?: SubPanelView;
    openSubPanel?: (subPanel: SubPanel) => void;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    footerActionButton?: boolean;
    scopeFieldAddon?: React.ReactNode;
    projectPath?: string;
    injectedComponents?: {
        component: React.ReactNode;
        index: number;
    }[];
    onSubmit: (node?: FlowNode, editorConfig?: EditorConfig, formImports?: FormImports, rawFormValues?: FormValues) => void;
    onChange?: (fieldKey: string, value: any, allValues: FormValues) => void;
}

export function SendEventForm(props: SendEventFormProps) {
    const {
        fileName,
        node,
        formFields: initialFields,
        targetLineRange,
        expressionEditor,
        showProgressIndicator,
        submitText,
        disableSaveButton,
        subPanelView,
        openSubPanel,
        updatedExpressionField,
        resetUpdatedExpressionField,
        footerActionButton,
        scopeFieldAddon,
        projectPath,
        injectedComponents,
        onSubmit,
        onChange,
    } = props;

    const { rpcClient } = useRpcContext();

    const [formFields, setFormFields] = useState<FormField[]>(initialFields);
    const [formImports, setFormImports] = useState<FormImports>(getImportsForFormFields(initialFields));
    const [isLoadingWorkflowEvents, setIsLoadingWorkflowEvents] = useState<boolean>(false);
    const [workflowEventTypes, setWorkflowEventTypes] = useState<Record<string, string>>({});
    const workflowRef = useRef<string>("");
    const initialFieldsRef = useRef<FormField[]>(initialFields);

    useEffect(() => {
        initialFieldsRef.current = initialFields;
        setFormFields(initialFields);
        setFormImports(getImportsForFormFields(initialFields));
        setIsLoadingWorkflowEvents(false);
        setWorkflowEventTypes({});
        workflowRef.current = "";
    }, [initialFields]);

    const fieldKeys = useMemo(() => getSendEventFieldKeys(formFields), [formFields]);

    const applySendEventFields = useCallback((workflowName: string, events: WorkflowEventDefinition[], preferredEventName?: string) => {
        setFormFields((prevFields) => {
            const keys = getSendEventFieldKeys(prevFields);
            if (!keys.eventName && !keys.eventData) {
                return prevFields;
            }

            const eventNames = events.map((event) => event.name);
            const selectedEventName =
                preferredEventName && eventNames.includes(preferredEventName)
                    ? preferredEventName
                    : eventNames[0] || "";
            const selectedEventType = events.find((event) => event.name === selectedEventName)?.type ?? "anydata";
            const hasWorkflow = workflowName.length > 0;

            const initialEventNameField = keys.eventName
                ? initialFieldsRef.current.find((field) => field.key === keys.eventName)
                : undefined;
            const initialEventDataField = keys.eventData
                ? initialFieldsRef.current.find((field) => field.key === keys.eventData)
                : undefined;

            return prevFields.map((field) => {
                if (field.key === keys.workflowName) {
                    return { ...field, editable: true, value: workflowName };
                }
                if (field.key === keys.eventName) {
                    if (events.length === 0) {
                        const fallbackField = initialEventNameField ?? field;
                        return {
                            ...field,
                            type: fallbackField.type,
                            types: cloneDeep(fallbackField.types),
                            items: fallbackField.items,
                            itemOptions: fallbackField.itemOptions,
                            editable: false,
                            value: preferredEventName ?? field.value,
                        };
                    }
                    return {
                        ...field,
                        type: "SINGLE_SELECT",
                        types: [{ fieldType: "SINGLE_SELECT", selected: true } as InputType],
                        editable: true,
                        items: eventNames,
                        itemOptions: eventNames.map((eventName) => ({
                            id: eventName,
                            content: eventName,
                            value: eventName,
                        })),
                        value: selectedEventName,
                    };
                }
                if (field.key === keys.eventData) {
                    if (!hasWorkflow) {
                        return { ...field, editable: false };
                    }
                    if (!selectedEventName) {
                        const fallbackField = initialEventDataField ?? field;
                        return {
                            ...field,
                            editable: false,
                            type: fallbackField.type,
                            types: cloneDeep(fallbackField.types),
                        };
                    }
                    return {
                        ...field,
                        editable: true,
                        types: updateEventDataTypes(field.types, selectedEventType),
                    };
                }
                return field;
            });
        });
    }, []);

    const updateSendEventDataType = useCallback((eventName: string) => {
        const selectedType = workflowEventTypes[eventName];
        if (!selectedType) {
            return;
        }

        setFormFields((prevFields) => {
            const keys = getSendEventFieldKeys(prevFields);
            return prevFields.map((field) => {
                if (field.key === keys.eventName) {
                    return { ...field, value: eventName };
                }
                if (field.key === keys.eventData) {
                    return {
                        ...field,
                        editable: true,
                        types: updateEventDataTypes(field.types, selectedType),
                    };
                }
                return field;
            });
        });
    }, [workflowEventTypes]);

    const fetchWorkflowEvents = useCallback(
        async (workflowName: string, preferredEventName?: string) => {
            const normalizedWorkflowName = normalizeStringValue(workflowName);
            workflowRef.current = normalizedWorkflowName;

            if (!normalizedWorkflowName) {
                setWorkflowEventTypes({});
                applySendEventFields("", [], "");
                setIsLoadingWorkflowEvents(false);
                return;
            }

            try {
                setIsLoadingWorkflowEvents(true);
                console.log(">>> requesting workflowManager/getAllEvents", { workflowName: normalizedWorkflowName, filePath: fileName });
                const response = await rpcClient.getBIDiagramRpcClient().getAllEvents({
                    workflowName: normalizedWorkflowName,
                    filePath: fileName,
                });
                console.log(">>> received workflowManager/getAllEvents response", response);

                const events = extractWorkflowEvents(response);
                setWorkflowEventTypes(
                    events.reduce<Record<string, string>>((acc, event) => {
                        acc[event.name] = event.type;
                        return acc;
                    }, {})
                );
                applySendEventFields(normalizedWorkflowName, events, preferredEventName);
            } catch (error) {
                console.error("Error fetching workflow events: ", error);
                setWorkflowEventTypes({});
                applySendEventFields(normalizedWorkflowName, [], "");
            } finally {
                setIsLoadingWorkflowEvents(false);
            }
        },
        [applySendEventFields, rpcClient]
    );

    useEffect(() => {
        if (!fieldKeys.workflowName) {
            return;
        }
        const workflowName = normalizeStringValue(formFields.find((field) => field.key === fieldKeys.workflowName)?.value);
        if (!workflowName || workflowName === workflowRef.current) {
            return;
        }
        const preferredEventName = fieldKeys.eventName
            ? normalizeStringValue(formFields.find((field) => field.key === fieldKeys.eventName)?.value)
            : "";
        void fetchWorkflowEvents(workflowName, preferredEventName);
    }, [fieldKeys, formFields, fetchWorkflowEvents]);

    const handleFormChange = (fieldKey: string, value: any, allValues: FormValues) => {
        onChange?.(fieldKey, value, allValues);

        if (!fieldKeys.workflowName || !fieldKeys.eventName) {
            return;
        }

        if (fieldKey === fieldKeys.workflowName) {
            const selectedWorkflow = normalizeStringValue(value);
            if (selectedWorkflow === workflowRef.current) {
                return;
            }
            void fetchWorkflowEvents(selectedWorkflow, normalizeStringValue(allValues[fieldKeys.eventName]));
            return;
        }

        if (fieldKey === fieldKeys.eventName && !isLoadingWorkflowEvents) {
            updateSendEventDataType(normalizeStringValue(value));
        }
    };

    const mergeFormDataWithFlowNode = (data: FormValues, dirtyFields?: any): FlowNode => {
        const clonedNode = cloneDeep(node);
        const updatedNode = createNodeWithUpdatedLineRange(clonedNode, targetLineRange);
        const processedData = processFormData(data);
        const nodeWithUpdatedProps = updateNodeWithProperties(clonedNode, updatedNode, processedData, formImports, dirtyFields);

        if (nodeWithUpdatedProps.properties && fieldKeys.eventData) {
            const eventDataField = formFields.find((field) => field.key === fieldKeys.eventData);
            const nodeProperties = nodeWithUpdatedProps.properties as Record<string, any>;
            if (eventDataField?.types?.length && nodeProperties[fieldKeys.eventData]) {
                nodeProperties[fieldKeys.eventData].types = cloneDeep(eventDataField.types);
            }
        }

        return removeEmptyNodes(nodeWithUpdatedProps);
    };

    const handleOnSubmit = (data: FormValues, dirtyFields: any) => {
        const updatedNode = mergeFormDataWithFlowNode(data, dirtyFields);
        const editorConfig = data["editorConfig"];
        onSubmit(updatedNode, editorConfig, formImports, data);
    };

    const notSupportedLabel =
        "This statement is not supported in low-code yet. Please use the Ballerina source code to modify it accordingly.";
    const baseInfoLabel = node.codedata.node === "EXPRESSION" ? notSupportedLabel : node.metadata.description;
    const infoLabel = isLoadingWorkflowEvents ? `${baseInfoLabel}\nLoading workflow events...` : baseInfoLabel;

    return (
        <Form
            formFields={formFields}
            projectPath={projectPath}
            selectedNode={node.codedata.node}
            onSubmit={handleOnSubmit}
            openSubPanel={openSubPanel}
            subPanelView={subPanelView}
            expressionEditor={expressionEditor}
            targetLineRange={targetLineRange}
            fileName={fileName}
            isSaving={showProgressIndicator}
            submitText={submitText}
            updatedExpressionField={updatedExpressionField}
            resetUpdatedExpressionField={resetUpdatedExpressionField}
            infoLabel={infoLabel}
            disableSaveButton={disableSaveButton || isLoadingWorkflowEvents}
            footerActionButton={footerActionButton}
            formImports={formImports}
            scopeFieldAddon={scopeFieldAddon}
            onChange={handleFormChange}
            injectedComponents={injectedComponents}
        />
    );
}

export default SendEventForm;
