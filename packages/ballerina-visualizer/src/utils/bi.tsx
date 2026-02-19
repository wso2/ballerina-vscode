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
import { AddNodeVisitor, RemoveNodeVisitor, NodeIcon, traverseFlow, ConnectorIcon, AIModelIcon } from "@wso2/bi-diagram";
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
    VisibleType,
    VisibleTypeItem,
    Item,
    FunctionKind,
    functionKinds,
    Diagnostic,
    FUNCTION_TYPE,
    FunctionNode,
    FocusFlowDiagramView,
    FOCUS_FLOW_DIAGRAM_VIEW,
    Imports,
    ColorThemeKind,
    CompletionInsertText,
    SubPanel,
    SubPanelView,
    NodeMetadata,
    Type,
    getPrimaryInputType,
    isTemplateType,
    DropdownType,
    isDropDownType,
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
import { COMPLETION_ITEM_KIND, CompletionItem, CompletionItemKind, convertCompletionItemKind, FnSignatureDocumentation, VSCodeColors } from "@wso2/ui-toolkit";
import { FunctionDefinition, STNode } from "@wso2/syntax-tree";
import { DocSection } from "../components/ExpressionEditor";

// @ts-ignore
import ballerina from "../languages/ballerina.js";
import { FUNCTION_REGEX } from "../resources/constants";
import { ConnectionKind, getConnectionKindConfig } from "../components/ConnectionSelector";
import { ConnectionListItem } from "@wso2/wso2-platform-core";
hljs.registerLanguage("ballerina", ballerina);

export const BALLERINA_INTEGRATOR_ISSUES_URL = "https://github.com/wso2/product-ballerina-integrator/issues";

function convertAvailableNodeToPanelNode(node: AvailableNode, functionType?: FUNCTION_TYPE): PanelNode {
    // Check if node should be filtered based on function type
    if (functionType === FUNCTION_TYPE.REGULAR && (node.metadata.data as NodeMetadata)?.isDataMappedFunction) {
        return undefined;
    }
    if (functionType === FUNCTION_TYPE.EXPRESSION_BODIED && !(node.metadata.data as NodeMetadata)?.isDataMappedFunction) {
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
    const items: PanelItem[] = category.items
        ?.map((item) => {
            if ("codedata" in item) {
                return convertAvailableNodeToPanelNode(item as AvailableNode, functionType);
            } else {
                return convertDiagramCategoryToSidePanelCategory(item as Category, functionType);
            }
        })
        .filter((item) => {
            if (item === undefined) {
                return false;
            }
            if ((item as PanelCategory).items !== undefined) {
                return (item as PanelCategory).items.length > 0;
            }
            return true;
        });

    // HACK: use the icon of the first item in the category
    const icon = category.items.at(0)?.metadata.icon;
    const codedata = (category.items.at(0) as AvailableNode)?.codedata;
    const connectorType = (category?.metadata?.data as NodeMetadata)?.connectorType;

    return {
        title: category.metadata.label,
        description: category.metadata.description,
        icon: <ConnectorIcon url={icon} style={{ width: "20px", height: "20px", fontSize: "20px" }} codedata={codedata} connectorType={connectorType} />,
        items: items,
    };
}

/** Map devant connection details with BI connection and to figure out which Devant connection are not used */
export function enrichCategoryWithDevant(
    connections: ConnectionListItem[] = [],
    panelCategories: PanelCategory[] = [],
    importingConn?: ConnectionListItem
): PanelCategory[] {
    const updated = panelCategories?.map((category) => {
        if (category.title === "Connections") {
            const usedConnIds: string[] = [];
            const mappedCategoryItems = category.items?.map((categoryItem) => {
                const matchingDevantConn = connections.find((conn) => conn.name?.replaceAll("-", "_").replaceAll(" ", "_") === (categoryItem as PanelCategory)?.title)
                if(matchingDevantConn) {
                    usedConnIds.push(matchingDevantConn.groupUuid);
                    return { ...categoryItem, devant: matchingDevantConn, unusedDevantConn: false }
                }
                return categoryItem;
            });
            const unusedCategoryItems: PanelCategory[] = connections
                .filter((conn) => !usedConnIds.includes(conn.groupUuid))
                .map((conn) => ({
                    title: conn.name?.replaceAll("-","_").replaceAll(" ","_"),
                    items: [] as PanelItem[],
                    description: "Unused Devant connection",
                    devant: conn,
                    unusedDevantConn: true,
                    isLoading: importingConn?.name === conn.name,
                }));
            return {
                ...category,
                items: [...mappedCategoryItems, ...unusedCategoryItems],
            };
        }
        return category;
    });
    return updated;
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

export function convertModelProviderCategoriesToSidePanelCategories(categories: Category[]): PanelCategory[] {
    const panelCategories = categories.map((category) => convertDiagramCategoryToSidePanelCategory(category));
    panelCategories.forEach((category) => {
        category.items?.forEach((item) => {
            if ((item as PanelNode).metadata?.codedata) {
                const codedata = (item as PanelNode).metadata.codedata;
                const iconType = codedata?.module == "ai" ? codedata.object : codedata?.module;
                item.icon = <AIModelIcon type={iconType} codedata={codedata} />;
            } else if (((item as PanelCategory).items.at(0) as PanelNode)?.metadata?.codedata) {
                const codedata = ((item as PanelCategory).items.at(0) as PanelNode)?.metadata.codedata;
                const iconType = codedata?.module == "ai" ? codedata.object : codedata?.module;
                item.icon = <AIModelIcon type={iconType} codedata={codedata} />;
            }
        });
    });
    return panelCategories;
}

export function convertVectorStoreCategoriesToSidePanelCategories(categories: Category[]): PanelCategory[] {
    return convertCategoriesToSidePanelCategoriesWithIcon(categories, (codedata) => {
        return <AIModelIcon type={codedata?.module} codedata={codedata} />;
    });
}

export function convertEmbeddingProviderCategoriesToSidePanelCategories(categories: Category[]): PanelCategory[] {
    return convertModelProviderCategoriesToSidePanelCategories(categories);
}

export function convertKnowledgeBaseCategoriesToSidePanelCategories(categories: Category[]): PanelCategory[] {
    return convertCategoriesToSidePanelCategoriesWithIcon(categories, (codedata) => {
        if ((codedata?.module as string).includes("azure")) {
            return <AIModelIcon type="ai.azure" />;
        }
        return <NodeIcon type={codedata?.node} size={24} />
    });
}

export function convertCategoriesToSidePanelCategoriesWithIcon(
    categories: Category[],
    iconFactory: (codedata: any) => React.ReactElement
): PanelCategory[] {
    const panelCategories = categories.map((category) => convertDiagramCategoryToSidePanelCategory(category));
    panelCategories.forEach((category) => {
        category.items?.forEach((item) => {
            if ((item as PanelNode).metadata?.codedata) {
                const codedata = (item as PanelNode).metadata.codedata;
                item.icon = iconFactory(codedata);
            } else if (((item as PanelCategory).items.at(0) as PanelNode)?.metadata?.codedata) {
                const codedata = ((item as PanelCategory).items.at(0) as PanelNode)?.metadata.codedata;
                item.icon = iconFactory(codedata);
            }
        });
    });
    return panelCategories;
}

export function convertDataLoaderCategoriesToSidePanelCategories(categories: Category[]): PanelCategory[] {
    return convertCategoriesToSidePanelCategoriesWithIcon(categories, (codedata) => (
        <NodeIcon type={codedata?.node} size={24} />
    ));
}

export function convertChunkerCategoriesToSidePanelCategories(categories: Category[]): PanelCategory[] {
    return convertCategoriesToSidePanelCategoriesWithIcon(categories, (codedata) => (
        <NodeIcon type={codedata?.node} size={24} />
    ));
}

export function convertMemoryStoreCategoriesToSidePanelCategories(categories: Category[]): PanelCategory[] {
    return convertCategoriesToSidePanelCategoriesWithIcon(categories, (codedata) => (
        <NodeIcon type={codedata?.node} size={24} />
    ));
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

                if (getPrimaryInputType(expression.types)?.fieldType === "REPEATABLE_PROPERTY") {
                    handleRepeatableProperty(expression, formField);
                }

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
        type: getPrimaryInputType(property.types)?.fieldType ?? "",
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
        items: getFormFieldItems(property, connections),
        itemOptions: property.itemOptions,
        diagnostics: property.diagnostics?.diagnostics || [],
        types: property.types,
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
        getPrimaryInputType(expression.types)?.fieldType === "IDENTIFIER" &&
        expression.metadata.label === "Connection"
    ) {
        return false;
    }
    return expression.editable;
}

function getFormFieldValue(expression: Property, clientName?: string) {
    if (clientName && getPrimaryInputType(expression.types)?.fieldType === "IDENTIFIER" && expression.metadata.label === "Connection") {
        console.log(">>> client name as set field value", clientName);
        return clientName;
    }
    return expression.value as string;
}

function getFormFieldItems(expression: Property, connections: FlowNode[]): string[] {
    if (getPrimaryInputType(expression.types)?.fieldType === "IDENTIFIER" && expression.metadata.label === "Connection") {
        return connections.map((connection) => connection.properties?.variable?.value as string);
    } else if (expression.types?.length > 1 && (getPrimaryInputType(expression.types)?.fieldType === "MULTIPLE_SELECT" || getPrimaryInputType(expression.types)?.fieldType === "SINGLE_SELECT")) {
        return expression.types?.map(inputType => inputType.ballerinaType) as string[];
    } else if (expression.types?.length === 1 && isDropDownType(expression.types[0])) {
        return (expression.types[0] as DropdownType).options.map((option) => option.value);
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
                expression.imports = formImports?.[key];
                expression.modified = dirtyFields?.hasOwnProperty(key);

                const dataValue = values[key];
                const primaryType = getPrimaryInputType(expression.types);
                if (primaryType?.fieldType === "REPEATABLE_PROPERTY" && isTemplateType(primaryType)) {
                    const template = primaryType?.template;
                    expression.value = {};
                    // Go through the parameters array
                    for (const [repeatKey, repeatValue] of Object.entries(dataValue)) {
                        // Create a deep copy for each iteration
                        const valueConstraint = JSON.parse(JSON.stringify(template));
                        // Fill the values of the parameter constraint
                        for (const [paramKey, param] of Object.entries((valueConstraint as any).value as NodeProperties)) {
                            param.value = (repeatValue as any).formValues[paramKey] || "";
                        }
                        (expression.value as any)[(repeatValue as any).key] = valueConstraint;
                    }
                } else {
                    expression.value = dataValue;
                }

            }
        }
    }

    return updatedNodeProperties;
}

function getConnectionDisplayName(connectionKind?: ConnectionKind): string {
    if (!connectionKind) return 'Connection';
    try {
        const config = getConnectionKindConfig(connectionKind);
        return config.displayName;
    } catch {
        return 'Connection';
    }
}

export function getContainerTitle(view: SidePanelView, activeNode: FlowNode, clientName?: string, connectionKind?: ConnectionKind): string {
    switch (view) {
        case SidePanelView.NODE_LIST:
            return ""; // Show switch instead of title
        case SidePanelView.CONNECTION_CONFIG:
            return `Configure ${getConnectionDisplayName(connectionKind)}`;
        case SidePanelView.CONNECTION_SELECT:
            return `Select ${getConnectionDisplayName(connectionKind)}`;
        case SidePanelView.CONNECTION_CREATE:
            return `Create ${getConnectionDisplayName(connectionKind)}`;
        case SidePanelView.AGENT_MEMORY_MANAGER:
            return "Configure Memory";
        case SidePanelView.AGENT_TOOL:
            return "Configure Tool";
        case SidePanelView.ADD_TOOL:
            return "Add Tool";
        case SidePanelView.ADD_MCP_SERVER:
            return "Add MCP Server";
        case SidePanelView.EDIT_MCP_SERVER:
            return "Edit MCP Server";
        case SidePanelView.NEW_TOOL:
            return "Add New Tool";
        case SidePanelView.NEW_TOOL_FROM_CONNECTION:
            return "Create Tool from Connection";
        case SidePanelView.NEW_TOOL_FROM_FUNCTION:
            return "Create Tool from Function";
        case SidePanelView.FORM:
            if (!activeNode) {
                return "";
            }
            if (activeNode.codedata?.node === "AGENT_CALL" || activeNode.codedata?.node === "AGENT_RUN") {
                return `AI Agent`;
            }
            if (activeNode.codedata?.node === "KNOWLEDGE_BASE" && activeNode.codedata?.object === "VectorKnowledgeBase") {
                return `ai: Vector Knowledge Base`;
            }
            if (
                activeNode.codedata?.node === "REMOTE_ACTION_CALL" ||
                activeNode.codedata?.node === "RESOURCE_ACTION_CALL"
            ) {
                return `${clientName || activeNode.properties.connection.value} → ${activeNode.metadata.label}`;
            } else if (activeNode.codedata?.node === "DATA_MAPPER_CALL") {
                return `${activeNode.codedata?.module ? activeNode.codedata?.module + " :" : ""} ${activeNode.codedata.symbol
                    }`;
            }
            return `${activeNode.codedata?.module ? activeNode.codedata?.module + " :" : ""} ${activeNode.metadata.label
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

export function enrichFormTemplatePropertiesWithValues(
    formProperties: NodeProperties,
    formTemplateProperties: NodeProperties
) {
    const enrichedFormTemplateProperties = cloneDeep(formTemplateProperties);

    for (const key in formProperties) {
        if (formProperties.hasOwnProperty(key)) {
            const formProperty = formProperties[key as NodePropertyKey];
            if (
                formProperty &&
                enrichedFormTemplateProperties[key as NodePropertyKey] != null
            ) {
                // Copy the value from formProperties to formTemplateProperties
                enrichedFormTemplateProperties[key as NodePropertyKey].value = formProperty.value;

                if (formProperty.hasOwnProperty('editable')) {
                    enrichedFormTemplateProperties[key as NodePropertyKey].editable = formProperty.editable;
                    enrichedFormTemplateProperties[key as NodePropertyKey].codedata = formProperty?.codedata;
                }

                if (formProperty.diagnostics) {
                    enrichedFormTemplateProperties[key as NodePropertyKey].diagnostics = formProperty.diagnostics;
                }

                if (formProperty.types) {
                    enrichedFormTemplateProperties[key as NodePropertyKey].types = formProperty.types;
                }
            }
        }
    }

    return enrichedFormTemplateProperties;
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
    const labelDetails = completion.labelDetails;

    return {
        tag,
        label,
        value,
        description,
        kind,
        sortText,
        additionalTextEdits,
        cursorOffset,
        labelDetails
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
    if (!signatureHelp) {
        return undefined;
    }
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
        labelDetails: type.labelDetails,
    }));
}

export function convertItemsToCompletionItems(items: Item[]): CompletionItem[] {
    items = items.filter(item => item !== null) as Item[];
    //TODO: Need labelDetails from the LS for proper conversion
    return items.map((item) => ({
        label: item.metadata.label,
        value: item.metadata.label,
        kind: COMPLETION_ITEM_KIND.TypeParameter,
        insertText: item.metadata.label
    }));
}

export function convertRecordTypeToCompletionItem(type: Type): CompletionItem {
    const label = type?.name ?? "";
    const value = label;
    const kind = "struct";
    const description = type?.metadata?.description;
    const labelDetails = (() => {
        const descriptionText = "Record";
        return descriptionText ? { description: descriptionText } : undefined;
    })();

    return {
        label,
        value,
        kind,
        description,
        labelDetails,
        sortText: label?.toLowerCase?.() || label,
    };
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
    if (category.toLocaleLowerCase().includes("current")) {
        return functionKinds.CURRENT;
    } else if (category.toLocaleLowerCase().includes("imported")) {
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
    const primaryInputType = getPrimaryInputType(property.types);
    if (isTemplateType(primaryInputType)) {
        for (const [paramKey, param] of Object.entries((primaryInputType.template).value as NodeProperties)) {
            const paramField = convertNodePropertyToFormField(paramKey, param);
            paramFields.push(paramField);
        }
    }

    // Create existing parameter values
    const paramValues = Object.entries(property.value as NodeProperties).map(([paramValueKey, paramValue], index) =>
        createParameterValue(index, paramValueKey, paramValue as any) // TODO: Fix this any type with actual type
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

export function convertConfig(properties: NodeProperties, skipKeys: string[] = [], sortKeys: boolean = true): FormField[] {
    const formFields: FormField[] = [];
    const sortedKeys = sortKeys ? Object.keys(properties).sort() : Object.keys(properties);

    for (const key of sortedKeys) {
        if (skipKeys.includes(key)) {
            continue;
        }
        const property = properties[key as keyof NodeProperties];
        const formField = convertNodePropertyToFormField(key, property);

        if (getPrimaryInputType(property.types)?.fieldType === "REPEATABLE_PROPERTY") {
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
export function calculateExpressionOffsets(
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
 * Filter out "undefined symbol" diagnostics when the symbol is a known Tool Input parameter
 * @param diagnostics - Array of diagnostics to filter
 * @param toolInputParameterNames - Array of Tool Input parameter names to exclude from diagnostics
 * @returns Filtered diagnostics array
 */
export function filterToolInputSymbolDiagnostics(
    diagnostics: Diagnostic[],
    toolInputs?: { type: string, variable: string }[]
): Diagnostic[] {
    if (!toolInputs || toolInputs.length === 0) {
        return diagnostics;
    }

    return diagnostics.filter((diagnostic) => {
        // Only filter "undefined symbol" diagnostics
        if (!diagnostic.message.includes('undefined symbol')) {
            return true;
        }

        // Extract symbol name from message like "undefined symbol 'code'"
        const match = diagnostic.message.match(/['"`]([^'"`]+)['"`]/);
        if (!match) {
            return true; // Keep diagnostic if we can't parse it
        }

        const symbolName = match[1];
        // Filter out if symbol is a Tool Input parameter
        return !toolInputs.some(input => input.variable === symbolName);
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

export function getSubPanelWidth(subPanel: SubPanel) {
    if (!subPanel?.view) {
        return undefined;
    }
    switch (subPanel.view) {
        case SubPanelView.ADD_NEW_FORM:
        case SubPanelView.HELPER_PANEL:
            return 400;
        default:
            return undefined;
    }
}
