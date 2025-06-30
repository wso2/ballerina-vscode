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
import {
    Category as PanelCategory,
    Node as PanelNode,
    Item as PanelItem,
    FormField,
    FormValues,
    ParameterValue,
    Parameter,
    FormImports,
} from "@wso2/ballerina-side-panel";
import { AddNodeVisitor, RemoveNodeVisitor, NodeIcon, traverseFlow, ConnectorIcon } from "@wso2/bi-diagram";
import {
    Category,
    AvailableNode,
    NodeProperties,
    NodePropertyKey,
    FlowNode,
    Property,
    Flow,
    Branch,
    LineRange,
    ExpressionCompletionItem,
    Trigger,
    FunctionField,
    SignatureHelpResponse,
    TriggerNode,
    VisibleType,
    VisibleTypeItem,
    Item,
    FunctionKind,
    functionKinds,
    TRIGGER_CHARACTERS,
    Diagnostic,
    FUNCTION_TYPE,
    FunctionNode,
    FocusFlowDiagramView,
    FOCUS_FLOW_DIAGRAM_VIEW,
    Imports,
    ColorThemeKind,
    CompletionInsertText,
} from "@wso2/ballerina-core";
import {
    HelperPaneVariableInfo,
    HelperPaneFunctionInfo,
    HelperPaneFunctionCategory,
    HelperPaneCompletionItem,
} from "@wso2/ballerina-side-panel";
import { SidePanelView } from "../views/BI/FlowDiagram/PanelManager";
import { cloneDeep } from "lodash";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import hljs from "highlight.js";
import { COMPLETION_ITEM_KIND, CompletionItem, CompletionItemKind, convertCompletionItemKind, FnSignatureDocumentation } from "@wso2/ui-toolkit";
import { FunctionDefinition, STNode } from "@wso2/syntax-tree";
import { DocSection } from "../components/ExpressionEditor";

// @ts-ignore
import ballerina from "../languages/ballerina.js";
import { FUNCTION_REGEX } from "../resources/constants";
hljs.registerLanguage("ballerina", ballerina);

function convertAvailableNodeToPanelNode(node: AvailableNode, functionType?: FUNCTION_TYPE): PanelNode {
    // Check if node should be filtered based on function type
    if (functionType === FUNCTION_TYPE.REGULAR && node.metadata.data?.isDataMappedFunction) {
        return undefined;
    }
    if (functionType === FUNCTION_TYPE.EXPRESSION_BODIED && !node.metadata.data?.isDataMappedFunction) {
        return undefined;
    }

    // Return common panel node structure
    return {
        id: node.codedata.node,
        label: node.metadata.label,
        description: node.metadata.description,
        enabled: node.enabled,
        metadata: node,
        icon: (
            <NodeIcon
                type={functionType === FUNCTION_TYPE.EXPRESSION_BODIED ? "DATA_MAPPER_CALL" : node.codedata.node}
                size={16}
            />
        ),
    };
}

function convertDiagramCategoryToSidePanelCategory(category: Category, functionType?: FUNCTION_TYPE): PanelCategory {
    if (category.metadata.label !== "Current Integration" && functionType === FUNCTION_TYPE.EXPRESSION_BODIED) {
        // Skip out of scope data mapping functions
        return;
    }
    const items: PanelItem[] = category.items
        ?.map((item) => {
            if ("codedata" in item) {
                return convertAvailableNodeToPanelNode(item as AvailableNode, functionType);
            } else {
                return convertDiagramCategoryToSidePanelCategory(item as Category);
            }
        })
        .filter((item) => item !== undefined);

    // HACK: use the icon of the first item in the category
    const icon = category.items.at(0)?.metadata.icon;

    return {
        title: category.metadata.label,
        description: category.metadata.description,
        icon: <ConnectorIcon url={icon} style={{ width: "20px", height: "20px", fontSize: "20px" }} />,
        items: items,
    };
}

export function convertBICategoriesToSidePanelCategories(categories: Category[]): PanelCategory[] {
    const panelCategories = categories.map((category) => convertDiagramCategoryToSidePanelCategory(category));
    const connectorCategory = panelCategories.find((category) => category.title === "Connections");
    if (connectorCategory && !connectorCategory.items.length) {
        connectorCategory.description = "No connections available. Click below to add a new connector.";
    }
    return panelCategories;
}

export function convertFunctionCategoriesToSidePanelCategories(
    categories: Category[],
    functionType: FUNCTION_TYPE
): PanelCategory[] {
    const panelCategories = categories
        .map((category) => convertDiagramCategoryToSidePanelCategory(category, functionType))
        .filter((category) => category !== undefined);
    const functionCategory = panelCategories.find((category) => category.title === "Project");
    if (functionCategory && !functionCategory.items.length) {
        functionCategory.description = "No functions defined. Click below to create a new function.";
    }
    return panelCategories;
}

export function convertNodePropertiesToFormFields(
    nodeProperties: NodeProperties,
    connections?: FlowNode[],
    clientName?: string
): FormField[] {
    const formFields: FormField[] = [];

    for (const key in nodeProperties) {
        if (nodeProperties.hasOwnProperty(key)) {
            const expression = nodeProperties[key as NodePropertyKey];
            if (expression) {
                const formField: FormField = convertNodePropertyToFormField(key, expression, connections, clientName);
                formFields.push(formField);
            }
        }
    }

    return formFields;
}

export function convertNodePropertyToFormField(
    key: string,
    property: Property,
    connections?: FlowNode[],
    clientName?: string
): FormField {
    const formField: FormField = {
        key,
        label: property.metadata?.label || "",
        type: property.valueType,
        optional: property.optional,
        advanced: property.advanced,
        placeholder: property.placeholder,
        defaultValue: property.defaultValue as string,
        editable: isFieldEditable(property, connections, clientName),
        enabled: true,
        hidden: property.hidden,
        documentation: property.metadata?.description || "",
        value: getFormFieldValue(property, clientName),
        advanceProps: convertNodePropertiesToFormFields(property.advanceProperties),
        valueType: property.valueType,
        items: getFormFieldItems(property, connections),
        diagnostics: property.diagnostics?.diagnostics || [],
        valueTypeConstraint: property.valueTypeConstraint,
        lineRange: property?.codedata?.lineRange,
        metadata: property.metadata,
        codedata: property.codedata,
        imports: property.imports
    };
    return formField;
}

function isFieldEditable(expression: Property, connections?: FlowNode[], clientName?: string) {
    if (
        connections &&
        clientName &&
        expression.valueType === "Identifier" &&
        expression.metadata.label === "Connection"
    ) {
        return false;
    }
    return expression.editable;
}

function getFormFieldValue(expression: Property, clientName?: string) {
    if (clientName && expression.valueType === "Identifier" && expression.metadata.label === "Connection") {
        console.log(">>> client name as set field value", clientName);
        return clientName;
    }
    return expression.value as string;
}

function getFormFieldValueType(expression: Property): string | undefined {
    if (Array.isArray(expression.valueTypeConstraint)) {
        return undefined;
    }

    if (expression.valueTypeConstraint) {
        return expression.valueTypeConstraint;
    }

    return expression.valueType;
}

function getFormFieldItems(expression: Property, connections: FlowNode[]): string[] {
    if (expression.valueType === "Identifier" && expression.metadata.label === "Connection") {
        return connections.map((connection) => connection.properties?.variable?.value as string);
    } else if (expression.valueType === "MULTIPLE_SELECT" || expression.valueType === "SINGLE_SELECT") {
        return expression.valueTypeConstraint as string[];
    }
    return undefined;
}

export function getFormProperties(flowNode: FlowNode): NodeProperties {
    if (flowNode.properties) {
        return flowNode.properties;
    }

    if (flowNode.branches?.at(0)?.properties) {
        // TODO: Handle multiple branches
        return flowNode.branches.at(0).properties;
    }

    return {};
}

export function getRegularFunctions(functions: Category[]): Category[] {
    return functions;
}

export function getDataMappingFunctions(functions: Category[]): Category[] {
    return functions
        .filter((category) => category.metadata.label === "Current Integration")
        .filter((category) => category.items.length > 0);
}

export function updateNodeProperties(
    values: FormValues,
    nodeProperties: NodeProperties,
    formImports: FormImports,
    dirtyFields?: any
): NodeProperties {
    const updatedNodeProperties: NodeProperties = { ...nodeProperties };

    for (const key in values) {
        if (values.hasOwnProperty(key) && updatedNodeProperties.hasOwnProperty(key)) {
            const expression = updatedNodeProperties[key as NodePropertyKey];
            if (expression) {
                expression.value = values[key];
                expression.imports = formImports[key];
                expression.modified = dirtyFields?.hasOwnProperty(key);
            }
        }
    }

    return updatedNodeProperties;
}

export function getContainerTitle(view: SidePanelView, activeNode: FlowNode, clientName?: string): string {
    switch (view) {
        case SidePanelView.NODE_LIST:
            return ""; // Show switch instead of title
        case SidePanelView.NEW_AGENT:
            return "AI Agent";
        case SidePanelView.AGENT_MODEL:
            return "Configure LLM Model";
        case SidePanelView.AGENT_MEMORY_MANAGER:
            return "Configure Memory";
        case SidePanelView.AGENT_TOOL:
            return "Configure Tool";
        case SidePanelView.ADD_TOOL:
            return "Add Tool";
        case SidePanelView.NEW_TOOL:
            return "Create New Tool";
        case SidePanelView.AGENT_CONFIG:
            return "Configure Agent";
        case SidePanelView.FORM:
            if (!activeNode) {
                return "";
            }
            if (
                activeNode.codedata?.node === "REMOTE_ACTION_CALL" ||
                activeNode.codedata?.node === "RESOURCE_ACTION_CALL"
            ) {
                return `${clientName || activeNode.properties.connection.value} → ${activeNode.metadata.label}`;
            } else if (activeNode.codedata?.node === "DATA_MAPPER_CALL") {
                return `${activeNode.codedata?.module ? activeNode.codedata?.module + " :" : ""} ${
                    activeNode.codedata.symbol
                }`;
            }
            return `${activeNode.codedata?.module ? activeNode.codedata?.module + " :" : ""} ${
                activeNode.metadata.label
            }`;
        default:
            return "";
    }
}

export function addDraftNodeToDiagram(flowModel: Flow, parent: FlowNode | Branch, target: LineRange) {
    const newFlowModel = cloneDeep(flowModel);
    console.log(">>> addDraftNodeToDiagram", { newFlowModel, parent, target });

    const draftNode: FlowNode = {
        id: "draft",
        metadata: {
            label: "Draft",
            description: "Draft Node",
        },
        codedata: {
            node: "DRAFT",
            lineRange: {
                fileName: newFlowModel.fileName,
                ...target,
            },
        },
        branches: [],
        returning: false,
    };

    const addNodeVisitor = new AddNodeVisitor(newFlowModel, parent as FlowNode, draftNode);
    traverseFlow(newFlowModel, addNodeVisitor);
    const newFlow = addNodeVisitor.getUpdatedFlow();
    console.log(">>> new model with draft node", { newFlow });
    return newFlow;
}

export function removeDraftNodeFromDiagram(flowModel: Flow) {
    const newFlowModel = cloneDeep(flowModel);
    const draftNodeId = "draft";
    console.log(">>> removeDraftNodeFromDiagram", newFlowModel, draftNodeId);
    const removeNodeVisitor = new RemoveNodeVisitor(newFlowModel, draftNodeId);
    traverseFlow(newFlowModel, removeNodeVisitor);
    const newFlow = removeNodeVisitor.getUpdatedFlow();
    return newFlow;
}

export function enrichFormPropertiesWithValueConstraint(
    formProperties: NodeProperties,
    formTemplateProperties: NodeProperties
) {
    const enrichedFormProperties = cloneDeep(formProperties);

    for (const key in formTemplateProperties) {
        if (formTemplateProperties.hasOwnProperty(key)) {
            const expression = formTemplateProperties[key as NodePropertyKey];
            if (expression) {
                const valConstraint = formTemplateProperties[key as NodePropertyKey]?.valueTypeConstraint;
                if (valConstraint && enrichedFormProperties[key as NodePropertyKey]) {
                    enrichedFormProperties[key as NodePropertyKey].valueTypeConstraint = valConstraint;
                }
            }
        }
    }

    return enrichedFormProperties;
}

function getEnrichedValue(kind: CompletionItemKind, value: string): CompletionInsertText {
    if (kind === COMPLETION_ITEM_KIND.Function) {
        const fnMatch = value.match(FUNCTION_REGEX);

        const enrichedValue = `${fnMatch?.groups?.label ?? value}()`;
        return {
            value: enrichedValue,
            ...(fnMatch?.groups?.args && { cursorOffset: enrichedValue.length - 1 })
        };
    }

    return { value };
}

export function convertBalCompletion(completion: ExpressionCompletionItem): CompletionItem {
    const labelArray = completion.label.split("/");
    const tag = labelArray.length > 1 ? labelArray.slice(0, -1).join("/") : undefined;
    const label = labelArray[labelArray.length - 1];
    const kind = convertCompletionItemKind(completion.kind);
    const { value, cursorOffset } = getEnrichedValue(kind, completion.insertText);
    const description = completion.detail;
    const sortText = completion.sortText;
    const additionalTextEdits = completion.additionalTextEdits;

    return {
        tag,
        label,
        value,
        description,
        kind,
        sortText,
        additionalTextEdits,
        cursorOffset
    };
}

export function updateLineRange(lineRange: LineRange, offset: number) {
    if (
        lineRange.startLine.line === 0 &&
        lineRange.startLine.offset === 0 &&
        lineRange.endLine.line === 0 &&
        lineRange.endLine.offset === 0
    ) {
        return {
            startLine: {
                line: lineRange.startLine.line,
                offset: lineRange.startLine.offset + offset,
            },
            endLine: {
                line: lineRange.endLine.line,
                offset: lineRange.endLine.offset + offset,
            },
        };
    }
    return lineRange;
}

/**
 * Remove duplicate diagnostics based on the range and message
 * @param diagnostics The diagnostics array to remove duplicates from
 * @returns The unique diagnostics array
 */
export function removeDuplicateDiagnostics(diagnostics: Diagnostic[]) {
    const uniqueDiagnostics = diagnostics?.filter((diagnostic, index, self) => {
        return (
            self.findIndex((item) => {
                const itemRange = item.range;
                const diagnosticRange = diagnostic.range;
                return (
                    itemRange.start.line === diagnosticRange.start.line &&
                    itemRange.start.character === diagnosticRange.start.character &&
                    itemRange.end.line === diagnosticRange.end.line &&
                    itemRange.end.character === diagnosticRange.end.character &&
                    item.message === diagnostic.message
                );
            }) === index
        );
    });

    return uniqueDiagnostics;
}

// TRIGGERS RELATED HELPERS
export function convertTriggerServiceTypes(trigger: Trigger): Record<string, FunctionField> {
    const response: Record<string, FunctionField> = {};
    for (const key in trigger.serviceTypes) {
        const serviceType = trigger.serviceTypes[key];
        response[serviceType.name] = { checked: trigger.serviceTypes.length === 1, required: false, serviceType };
    }
    return response;
}

export function convertTriggerListenerConfig(trigger: TriggerNode): FormField[] {
    const formFields: FormField[] = [];
    for (const key in trigger.listener.properties) {
        const expression = trigger.listener.properties[key];
        const formField: FormField = {
            key: key,
            label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (str) => str.toUpperCase()),
            type: expression.valueType,
            documentation: "",
            ...expression,
        };
        formFields.push(formField);
    }
    return formFields;
}

export function updateTriggerListenerConfig(formFields: FormField[], trigger: TriggerNode): TriggerNode {
    formFields.forEach((field) => {
        const value = field.value as string;
        trigger.listener.properties[field.key].value = value;
        if (value && value.length > 0) {
            trigger.listener.properties[field.key].enabled = true;
        }
    });
    return trigger;
}

export function convertTriggerServiceConfig(trigger: TriggerNode): FormField[] {
    const formFields: FormField[] = [];
    for (const key in trigger.properties) {
        const expression = trigger.properties[key];
        const formField: FormField = {
            ...expression,
            key: key,
            label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (str) => str.toUpperCase()),
            type: expression.valueType,
            groupNo: expression.metadata.groupNo,
            groupName: expression.metadata.groupName,
            value: checkArrayValue(expression.value),
            documentation: "",
        };
        formFields.push(formField);
    }
    return formFields;
}

function checkArrayValue(fieldValue: string): string[] | string {
    try {
        const parsedValue = JSON.parse(fieldValue);
        // Check if parsedValue is an array
        if (Array.isArray(parsedValue)) {
            return parsedValue; // Return the array if it's valid
        }
    } catch (error) {
        // Do nothing.
    }
    return fieldValue;
}

export function updateTriggerServiceConfig(formFields: FormField[], trigger: TriggerNode): TriggerNode {
    formFields.forEach((field) => {
        const value = field.value as string;
        trigger.properties[field.key].value = value;
        if (value) {
            trigger.properties[field.key].enabled = true;
        }
    });
    return trigger;
}

export function convertTriggerFunctionsConfig(trigger: Trigger): Record<string, FunctionField> {
    const response: Record<string, FunctionField> = {};

    for (const service in trigger.serviceTypes) {
        const functions = trigger.serviceTypes[service].functions;
        for (const key in functions) {
            const triggerFunction = functions[key];
            const formFields: FormField[] = [];
            if (functions.hasOwnProperty(key)) {
                for (const param in triggerFunction.parameters) {
                    const expression = triggerFunction.parameters[param];
                    const formField: FormField = {
                        key: expression.name,
                        label: expression.name
                            .replace(/([a-z])([A-Z])/g, "$1 $2")
                            .replace(/^./, (str) => str.toUpperCase()),
                        documentation: expression?.documentation,
                        optional: expression?.optional,
                        type: expression?.typeName,
                        editable: true,
                        enabled: true,
                        value: expression.defaultTypeName,
                        valueTypeConstraint: "",
                    };
                    formFields.push(formField);
                }
            }
            const isRadio = !!triggerFunction.group;
            if (isRadio) {
                if (!response[triggerFunction.group.name]) {
                    response[triggerFunction.group.name] = {
                        radioValues: [],
                        required: !triggerFunction.optional,
                        functionType: { name: "" },
                    };
                }
                // Always set the first function as default
                response[triggerFunction.group.name].functionType.name = functions[0].name;
                response[triggerFunction.group.name].radioValues.push(triggerFunction.name);
            } else {
                response[triggerFunction.name] = {
                    checked: !triggerFunction.optional,
                    required: !triggerFunction.optional,
                    fields: formFields,
                    functionType: triggerFunction,
                };
            }
        }
    }
    return response;
}

/**
 * Custom rendering for <code> blocks with syntax highlighting
 */
const MarkdownCodeRenderer = {
    code({ inline, className, children }: { inline?: boolean; className?: string; children: React.ReactNode }) {
        const codeContent = (Array.isArray(children) ? children.join("") : children) ?? "";
        const match = /language-(\w+)/.exec(className || "");

        if (!inline && match) {
            const language = match[1];

            // Apply syntax highlighting if language is registered
            if (hljs.getLanguage(language)) {
                return (
                    <pre style={{ border: '1px solid var(--vscode-editorIndentGuide-background)' }}>
                        <code
                            className={`hljs ${language}`}
                            dangerouslySetInnerHTML={{
                                __html: hljs.highlight(codeContent.toString(), { language }).value,
                            }}
                        />
                    </pre>
                );
            }

            // Fallback: render as plain text
            return (
                <pre>
                    <code className="hljs">{codeContent}</code>
                </pre>
            );
        }

        // Inline code with word wrapping
        return (
            <code className={className}>
                {children}
            </code>
        );
    },
};

export function injectHighlightTheme(theme: ColorThemeKind) {
    let extractedTheme: string;
    switch (theme) {
        case ColorThemeKind.Light:
        case ColorThemeKind.HighContrastLight:
            extractedTheme = "light";
            break;
        default:
            extractedTheme = "dark";
            break;
    }
    
    const existingTheme = document.getElementById("hljs-theme");
    if (existingTheme) existingTheme.remove();

    const themeLink = document.createElement("link");
    themeLink.id = "hljs-theme";
    themeLink.rel = "stylesheet";
    themeLink.href =
        extractedTheme === "light"
            ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/stackoverflow-light.min.css"
            : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/stackoverflow-dark.min.css";
    document.head.appendChild(themeLink);

    // Add background override once
    if (!document.getElementById("hljs-override")) {
        const overrideStyle = document.createElement("style");
        overrideStyle.id = "hljs-override";
        overrideStyle.innerHTML = `.hljs { background: var(--vscode-editor-background) !important; }`;
        document.head.appendChild(overrideStyle);
    }
};

async function getDocumentation(fnDescription: string, argsDescription: string[]): Promise<FnSignatureDocumentation> {
    const extractArgDocumentation = (arg: string) => {
        const argMatch = arg.match(/^\*\*Parameter\*\*\s*(.*)/);
        if (argMatch) {
            return `- ${argMatch[1]}`;
        }
        return `- ${arg}`;
    };

    return {
        fn: (
            <DocSection>
                <ReactMarkdown rehypePlugins={[rehypeRaw]} components={MarkdownCodeRenderer}>
                    {fnDescription}
                </ReactMarkdown>
            </DocSection>
        ),
        args: 
            <>
                {argsDescription.map((arg) => (
                    <DocSection key={arg}>
                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {extractArgDocumentation(arg)}
                        </ReactMarkdown>
                    </DocSection>
                ))}
            </>
        ,
    };
};

export async function convertToFnSignature(signatureHelp: SignatureHelpResponse) {
    const currentSignature = signatureHelp.signatures[0];
    if (!currentSignature) {
        return undefined;
    }

    const fnText = currentSignature.label;
    const fnMatch = fnText.match(FUNCTION_REGEX);

    if (!fnMatch) {
        return undefined;
    }
    const label = fnMatch.groups?.label;

    let args: string[] = [];
    if (fnMatch.groups?.args !== '') {
        // For functions with arguments
        args = fnMatch.groups?.args.split(',').map((arg) => arg.trim());
    }

    let documentation: FnSignatureDocumentation;
    if (signatureHelp.signatures[0]?.documentation) {
        documentation = await getDocumentation(
            signatureHelp.signatures[0].documentation.value,
            signatureHelp.signatures[0].parameters?.map((param) => param.documentation?.value ?? "") ?? []
        );
    }

    return {
        label,
        args,
        currentArgIndex: signatureHelp.activeParameter,
        documentation,
    };
}

export function convertToVisibleTypes(types: VisibleTypeItem[], isFetchingTypesForDM?: boolean): CompletionItem[] {
    types = types.filter(type => type !== null);
    if (isFetchingTypesForDM) {
        types = types.filter(type => isDMSupportedType(type));
    }
    return types.map((type) => ({
        label: type.label,
        value: type.insertText,
        kind: convertCompletionItemKind(type.kind),
        insertText: type.insertText,
    }));
}

export const clearDiagramZoomAndPosition = () => {
    localStorage.removeItem("diagram-file-path");
    localStorage.removeItem("diagram-zoom-level");
    localStorage.removeItem("diagram-offset-x");
    localStorage.removeItem("diagram-offset-y");
};

export const convertToHelperPaneVariable = (variables: VisibleType[]): HelperPaneVariableInfo => {
    return {
        category: variables
            .filter((variable) => variable.name !== "Configurable Variables")
            .map((variable) => ({
                label: variable.name,
                items: variable.types.map((item) => ({
                    label: item.name,
                    type: item.type.typeName,
                    insertText: item.name,
                })),
            })),
    };
};

export const filterHelperPaneVariables = (
    variables: HelperPaneVariableInfo,
    filterText: string
): HelperPaneVariableInfo => {
    const filteredCategories = variables.category.map((category) => {
        const filteredItems = category.items.filter((item) =>
            item.label.toLowerCase().includes(filterText.toLowerCase())
        );
        return {
            ...category,
            items: filteredItems,
        };
    });

    return {
        category: filteredCategories,
    };
};

export const convertToHelperPaneConfigurableVariable = (variables: VisibleType[]): HelperPaneVariableInfo => {
    return {
        category: variables
            .filter((variable) => variable.name === "Configurable Variables")
            .map((variable) => ({
                label: variable.name,
                items: variable.types.map((item) => ({
                    label: item.name,
                    type: item.type.value,
                    insertText: item.name,
                })),
            })),
    };
};

const isCategoryType = (item: Item): item is Category => {
    return !(item as AvailableNode)?.codedata;
};

export const getFunctionItemKind = (category: string): FunctionKind => {
    if (category.includes("Current")) {
        return functionKinds.CURRENT;
    } else if (category.includes("Imported")) {
        return functionKinds.IMPORTED;
    } else {
        return functionKinds.AVAILABLE;
    }
};

export const convertToHelperPaneFunction = (functions: Category[]): HelperPaneFunctionInfo => {
    const response: HelperPaneFunctionInfo = {
        category: [],
    };
    for (const category of functions) {
        const categoryKind = getFunctionItemKind(category.metadata.label);
        const items: HelperPaneCompletionItem[] = [];
        const subCategory: HelperPaneFunctionCategory[] = [];
        for (const categoryItem of category?.items) {
            if (isCategoryType(categoryItem)) {
                subCategory.push({
                    label: categoryItem.metadata.label,
                    items: categoryItem.items.map((item) => ({
                        label: item.metadata.label,
                        insertText: item.metadata.label,
                        kind: categoryKind,
                        codedata: !isCategoryType(item) && item.codedata,
                    })),
                });
            } else {
                items.push({
                    label: categoryItem.metadata.label,
                    insertText: categoryItem.metadata.label,
                    kind: categoryKind,
                    codedata: categoryItem.codedata,
                });
            }
        }

        const categoryItem: HelperPaneFunctionCategory = {
            label: category.metadata.label,
            items: items.length ? items : undefined,
            subCategory: subCategory.length ? subCategory : undefined,
        };
        response.category.push(categoryItem);
    }
    return response;
};

export function extractFunctionInsertText(template: string): CompletionInsertText {
    const match = template.match(FUNCTION_REGEX);
    const label = match?.groups?.label;

    if (!label) {
        return { value: template };
    }

    return {
        value: `${label}()`,
        ...(match?.groups?.args && { cursorOffset: -1 })
    };
}

function createParameterValue(index: number, paramValueKey: string, paramValue: ParameterValue): Parameter {
    const name = paramValue.value.variable.value;
    const type = paramValue.value.type.value;
    const variableLineRange = (paramValue.value.variable as any).codedata?.lineRange;
    const variableEditable = (paramValue.value.variable as any).editable;
    const parameterDescription = paramValue.value.parameterDescription?.value;

    return {
        id: index,
        icon: "",
        key: paramValueKey,
        value: `${type} ${name}`,
        identifierEditable: variableEditable,
        identifierRange: variableLineRange,
        formValues: {
            variable: name,
            type: type,
            parameterDescription: parameterDescription,
        },
    };
}

function handleRepeatableProperty(property: Property, formField: FormField): void {
    const paramFields: FormField[] = [];

    // Create parameter fields
    for (const [paramKey, param] of Object.entries((property.valueTypeConstraint as any).value as NodeProperties)) {
        const paramField = convertNodePropertyToFormField(paramKey, param);
        paramFields.push(paramField);
    }

    // Set up parameter manager properties
    formField.valueType = "PARAM_MANAGER";
    formField.type = "PARAM_MANAGER";

    // Create existing parameter values
    const paramValues = Object.entries(property.value as NodeProperties).map(([paramValueKey, paramValue], index) =>
        createParameterValue(index, paramValueKey, paramValue as ParameterValue)
    );

    formField.paramManagerProps = {
        paramValues,
        formFields: paramFields,
        handleParameter: handleParamChange,
    };

    formField.value = paramValues;

    function handleParamChange(param: Parameter) {
        const name = `${param.formValues["variable"]}`;
        const type = `${param.formValues["type"]} `;
        const defaultValue =
            Object.keys(param.formValues).indexOf("defaultable") > -1 && `${param.formValues["defaultable"]} `;
        let value = `${type} ${name} `;
        if (defaultValue) {
            value += ` = ${defaultValue} `;
        }
        return {
            ...param,
            key: name,
            value: value,
        };
    }
}

export function convertConfig(properties: NodeProperties, skipKeys: string[] = []): FormField[] {
    const formFields: FormField[] = [];
    const sortedKeys = Object.keys(properties).sort();

    for (const key of sortedKeys) {
        if (skipKeys.includes(key)) {
            continue;
        }
        const property = properties[key as keyof NodeProperties];
        const formField = convertNodePropertyToFormField(key, property);

        if (property.valueType === "REPEATABLE_PROPERTY") {
            handleRepeatableProperty(property, formField);
        }

        formFields.push(formField);
    }

    return formFields;
}

export function isNaturalFunction(node: STNode, view: FocusFlowDiagramView): node is FunctionDefinition {
    return view === FOCUS_FLOW_DIAGRAM_VIEW.NP_FUNCTION;
}

export function getFlowNodeForNaturalFunction(node: FunctionNode): FlowNode {
    const flowNode: FlowNode = {
        ...node,
        codedata: { ...node.codedata, node: "NP_FUNCTION" },
        branches: [],
    };
    return flowNode;
}

/**
 * Returns the line and the character offset of the expression
 *
 * @param expression
 * @returns { lineOffset: number, charOffset: number }
 */
export function getInfoFromExpressionValue(
    expression: string,
    cursorPosition: number
): { lineOffset: number, charOffset: number } {
    const effectiveExpression = expression.slice(0, cursorPosition);
    const lines = effectiveExpression.split(/\n/g);
    const lineCount = lines.length - 1;
    const charOffset = lines[lineCount].length;

    return {
        lineOffset: lineCount,
        charOffset: charOffset
    };
}

export const getImportsForProperty = (key: string, imports: FormImports): Imports | undefined => {
    if (!imports) {
        return undefined;
    }

    return imports[key];
};

export function getImportsForFormFields(formFields: FormField[]): FormImports {
    const imports: FormImports = {};
    for (const field of formFields) {
        if (field.imports) {
            imports[field.key] = field.imports;
        }
    }
    return imports;
}

/**
 * Filters the unsupported diagnostics for local connections
 * @param diagnostics - Diagnostics to filter
 * @returns Filtered diagnostics
 */
export function filterUnsupportedDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
    return diagnostics.filter((diagnostic) => {
        return !diagnostic.message.startsWith('unknown type') && !diagnostic.message.startsWith('undefined module');
    });
}

/**
 * Check if the type is supported by the data mapper
 * 
 * @param type - The type to check
 * @returns Whether the type is supported by the data mapper
 */
export const isDMSupportedType = (type: VisibleTypeItem) => {
    // HACK: This is a temporary solution to filter out types that are not supported by the data mapper which should be handled by the LS.
    if (
        type.labelDetails.description === "Nil" ||
        type.labelDetails.description === "Byte" ||
        type.labelDetails.description === "Map"
    ) {
        return false;
    }

    return true;
};
