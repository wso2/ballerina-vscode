/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { CodeAction, Diagnostic, DocumentSymbol, SymbolInformation, TextDocumentItem, WorkspaceEdit } from "vscode-languageserver-types";
import { CMDiagnostics, ComponentModel } from "./component";
import { DocumentIdentifier, LinePosition, LineRange, NOT_SUPPORTED_TYPE, Position, Range } from "./common";
import { BallerinaConnectorInfo, BallerinaExampleCategory, BallerinaModuleResponse, BallerinaModulesRequest, BallerinaTrigger, BallerinaTriggerInfo, BallerinaConnector, ExecutorPosition, ExpressionRange, JsonToRecordMapperDiagnostic, MainTriggerModifyRequest, NoteBookCellOutputValue, NotebookCellMetaInfo, OASpec, PackageSummary, PartialSTModification, ResolvedTypeForExpression, ResolvedTypeForSymbol, STModification, SequenceModel, SequenceModelDiagnostic, ServiceTriggerModifyRequest, SymbolDocumentation, XMLToRecordConverterDiagnostic, TypeField, ComponentInfo } from "./ballerina";
import { ModulePart, STNode } from "@wso2/syntax-tree";
import { CodeActionParams, DefinitionParams, DocumentSymbolParams, ExecuteCommandParams, InitializeParams, InitializeResult, LocationLink, RenameParams } from "vscode-languageserver-protocol";
import { Category, Flow, FlowNode, CodeData, ConfigVariable, FunctionNode, Property, PropertyTypeMemberInfo, DIRECTORY_MAP, Imports } from "./bi";
import { ConnectorRequest, ConnectorResponse } from "../rpc-types/connector-wizard/interfaces";
import { SqFlow } from "../rpc-types/sequence-diagram/interfaces";
import { FieldType, FunctionModel, ListenerModel, ServiceClassModel, ServiceModel } from "./service";
import { CDModel } from "./component-diagram";
import { IDMModel, Mapping } from "./inline-data-mapper";
import { SCOPE } from "../state-machine-types";

export interface DidOpenParams {
    textDocument: TextDocumentItem;
}

export interface DidCloseParams {
    textDocument: {
        uri: string;
    };
}

export interface DidChangeParams {
    textDocument: {
        uri: string;
        version: number;
    };
    contentChanges: [
        {
            text: string;
        }
    ];
}

export interface CompletionParams {
    textDocument: {
        uri: string;
    };
    position: {
        character: number;
        line: number;
    };
    context: {
        triggerKind: number;
    };
}

export interface Completion {
    detail: string;
    insertText: string;
    insertTextFormat: number;
    kind: number;
    label: string;
    additionalTextEdits?: TextEdit[];
    documentation?: string;
    sortText?: string;
    filterText?: string;
}

export interface TextEdit {
    newText: string,
    range: {
        end: {
            character: number;
            line: number;
        },
        start: {
            character: number;
            line: number;
        }
    }
}

export interface DidChangeWatchedFileParams {
    changes: Change[];
}

export interface Change {
    uri: string;
    type: number;
}

// <-------- BALLERINA RELATED --------->

interface BallerinaCapability {
    name: string;
    [key: string]: boolean | string;
}

export interface BallerinaInitializeParams {
    ballerinaClientCapabilities: BallerinaCapability[];
}

export interface BallerinaInitializeResult {
    ballerinaServerCapabilities: BallerinaCapability[];
}

export interface ComponentModelsParams {
    documentUris: string[];
}

export interface ComponentModels {
    componentModels: {
        [key: string]: ComponentModel;
    };
    diagnostics: CMDiagnostics[];
}

export interface PersistERModelParams {
    documentUri: string;
}

export interface PersistERModel {
    persistERModel: {
        [key: string]: ComponentModel;
    };
    diagnostics: CMDiagnostics[];
}

export interface DiagnosticsParams {
    documentIdentifier: {
        uri: string;
    };
}

export interface Diagnostics {
    uri: string;
    diagnostics: Diagnostic[];
}

export interface ExpressionType {
    documentIdentifier: {
        uri: string;
    };
    types: string[];
}

export interface ConnectorsParams extends BallerinaModulesRequest { }

export interface Connectors {
    central: BallerinaConnector[];
    local?: BallerinaConnector[];
    error?: string;
}

export interface TriggersParams extends BallerinaModulesRequest { }

export interface Triggers extends BallerinaModuleResponse {
    central: BallerinaTrigger[];
    error?: string;
}

export interface ConnectorParams extends BallerinaConnector { }

export interface Connector extends BallerinaConnectorInfo {
    error?: string;
}

export interface TriggerParams {
    id?: string;
    orgName?: string;
    packageName?: string;
}

export interface Trigger extends BallerinaTriggerInfo {
    error?: string;
}

export interface RecordParams {
    org: string;
    module: string;
    version: string;
    name: string;
}

export interface BallerinaRecord {
    org: string;
    module: string;
    version: string;
    name: string;
    ast?: STNode;
    error?: any;
}

export interface STModifyParams {
    documentIdentifier: { uri: string; };
    astModifications: STModification[];
}

export interface BallerinaSTParams {
    lineRange: Range;
    documentIdentifier: DocumentIdentifier;
}

export type TriggerModifyParams = MainTriggerModifyRequest | ServiceTriggerModifyRequest;

export interface SymbolInfoParams {
    textDocumentIdentifier: {
        uri: string;
    },
    position: {
        line: number;
        character: number;
    }
}

export interface SymbolInfo {
    symbolKind: string,
    documentation: SymbolDocumentation
}

export interface TypeFromExpressionParams {
    documentIdentifier: {
        uri: string;
    };
    expressionRanges: ExpressionRange[];
}

export interface TypesFromExpression {
    types: ResolvedTypeForExpression[];
}

export interface TypeFromSymbolParams {
    documentIdentifier: {
        uri: string;
    };
    positions: LinePosition[];
}

export interface TypesFromSymbol {
    types: ResolvedTypeForSymbol[];
}

export interface TypesFromFnDefinitionParams {
    documentIdentifier: {
        uri: string;
    };
    fnPosition: LinePosition;
    returnTypeDescPosition: LinePosition;
}

export interface VisibleVariableTypesParams {
    filePath: string;
    position: LinePosition;
}

export interface VisibleVariableTypes {
    categories: VisibleType[];
}

export interface VisibleType {
    name: string;
    types: TypeWithIdentifier[];
}

export interface TypeWithIdentifier {
    name: string;
    type: TypeField;
}

export interface InlineDataMapperModelRequest {
    filePath: string;
    flowNode: FlowNode;
    propertyKey: string;
    position: LinePosition;
}

export interface InlineDataMapperSourceRequest extends InlineDataMapperModelRequest {
    mappings: Mapping[];
}

export interface VisualizableFieldsRequest {
    filePath: string;
    flowNode: FlowNode;
    position: LinePosition;
}

export interface InlineDataMapperModelResponse {
    mappingsModel: IDMModel;
}

export interface InlineDataMapperSourceResponse {
    source: string;
}

export interface VisualizableFieldsResponse {
    visualizableProperties: string[];
}

export interface AddArrayElementRequest {
    filePath: string;
    flowNode: FlowNode;
    position: LinePosition;
    propertyKey: string;
    targetField: string;
}

export interface GraphqlDesignServiceParams {
    filePath: string;
    startLine: LinePosition;
    endLine: LinePosition;
}

export interface GraphqlDesignService {
    graphqlDesignModel: any;
    isIncompleteModel: boolean;
    errorMsg: string;
}

export interface SyntaxTreeParams {
    documentIdentifier: {
        uri: string;
    };
}

export interface SyntaxTree {
    syntaxTree: ModulePart | STNode;
    parseSuccess: boolean;
    source?: string;
    defFilePath?: string;
}

export interface BallerinaExampleListParams {
    filter?: string;
}

export interface BallerinaExampleList {
    samples: Array<BallerinaExampleCategory>;
}

export interface BallerinaProjectParams {
    documentIdentifier: DocumentIdentifier;
}

export interface BallerinaProject {
    kind?: string;
    path?: string;
    version?: string;
    author?: string;
    packageName?: string;
    orgName?: string;
}

export interface BallerinaPackagesParams {
    documentIdentifiers: DocumentIdentifier[];
}

export interface BallerinaProjectComponents {
    packages?: PackageSummary[];
}

export interface PackageConfigSchema {
    configSchema: any;
}

export interface SyntaxTreeNodeParams {
    documentIdentifier: DocumentIdentifier;
    range: Range;
}

export interface SyntaxTreeNode {
    kind: string;
}

export interface SequenceDiagramModelParams {
    filePath: string;
    startLine: LinePosition;
    endLine: LinePosition;
}

export type SequenceDiagramModel = {
    sequenceDiagram: SequenceModel;
    modelDiagnostic?: SequenceModelDiagnostic
};

export interface ExecutorPositions {
    executorPositions?: ExecutorPosition[];
}

// Test Manager related interfaces 

export interface TestsDiscoveryRequest {
    filePath: string;
}

export interface TestsDiscoveryResponse {
    result?: Map<string, FunctionTreeNode[]>;
    errorMsg?: string;
    stacktrace?: string;
}

export interface FunctionTreeNode {
    functionName: string;
    lineRange: FunctionLineRange;
    kind: string;
    groups: string[];
}

export interface FunctionLineRange {
    fileName: string;
    startLine: LinePosition;
    endLine: LinePosition;
}

export interface ICPEnabledRequest {
    projectPath: string;
}

export interface ICPEnabledResponse {
    enabled?: boolean;
    errorMsg?: string;
    stacktrace?: string;
}

export interface GetTestFunctionRequest {
    filePath: string;
    functionName: string;
}

export interface AddOrUpdateTestFunctionRequest {
    filePath: string;
    function: TestFunction;
}

export interface TestSourceEditResponse {
    textEdits?: {
        [key: string]: TextEdit[];
    };
    errorMsg?: string;
    stacktrace?: string;
}

export interface GetTestFunctionResponse {
    function?: TestFunction;
    errorMsg?: string;
    stacktrace?: string;
}

export interface TestFunctionMetadata {
    label?: string;
    description?: string;
}

export interface Codedata {
    lineRange?: FunctionLineRange;
}

export interface ValueProperty {
    metadata?: TestFunctionMetadata;
    codedata?: Codedata;
    valueType?: string;
    valueTypeConstraint?: any;
    originalName?: string;
    value?: any;
    placeholder?: string;
    optional?: boolean;
    editable?: boolean;
    advanced?: boolean;
    imports?: Imports;
}

export interface FunctionParameter {
    type?: ValueProperty;
    variable?: ValueProperty;
    defaultValue?: ValueProperty;
    optional?: boolean;
    editable?: boolean;
    advanced?: boolean;
}

export interface Annotation {
    metadata?: TestFunctionMetadata;
    codedata?: Codedata;
    org?: string;
    module?: string;
    name?: string;
    fields?: ValueProperty[];
}

export interface TestFunction {
    metadata?: TestFunctionMetadata;
    codedata?: Codedata;
    functionName?: ValueProperty;
    returnType?: ValueProperty;
    parameters?: FunctionParameter[];
    annotations?: Annotation[];
    editable?: boolean;
}

// End of Test Manager related interfaces

export interface JsonToRecordParams {
    jsonString: string;
    recordName: string;
    isRecordTypeDesc: boolean;
    isClosed: boolean;
    forceFormatRecordFields?: boolean;
    prefix?: string;
    filePathUri?: string;
}

export interface TypeDataWithReferences {
    types: {
        type: Type;
        refs: string[];
    }[];
}

export interface JsonToRecord {
    codeBlock: string;
    diagnostics?: JsonToRecordMapperDiagnostic[];
}

export interface XMLToRecordParams {
    xmlValue: string;
    isRecordTypeDesc?: boolean;
    isClosed?: boolean;
    forceFormatRecordFields?: boolean;
    prefix?: string;
    filePath?: string;
}

export interface XMLToRecord {
    codeBlock: string;
    diagnostics?: XMLToRecordConverterDiagnostic[];
}

export interface NoteBookCellOutputParams {
    source: string;
}

export interface NoteBookCellOutput {
    shellValue?: NoteBookCellOutputValue;
    errors: string[];
    diagnostics: string[];
    metaInfo?: NotebookCellMetaInfo;
    consoleOut: string;
}

export interface NotebookFileSource {
    content: string;
    filePath: string;
}

export interface NotebookVariable {
    name: string;
    type: string;
    value: string;
}

export interface NotebookDeleteDclnParams {
    varToDelete: string;
}

export interface PartialSTParams {
    codeSnippet: string;
    stModification?: PartialSTModification;
}

export interface PartialST {
    syntaxTree: STNode;
}

export interface OpenAPIConverterParams {
    documentFilePath: string;
    enableBalExtension?: boolean;
}

export interface OpenAPISpec {
    content: OASpec[];
    error?: string;
}

// <------ OTHERS -------

export interface PerformanceAnalyzerParams {
    documentIdentifier: DocumentIdentifier;
    isWorkerSupported: boolean;
}

export interface PerformanceAnalyzer {
    resourcePos: Range;
    endpoints: any;
    actionInvocations: any;
    type: string;
    message: string;
    name: string;
}

export interface BallerinaServerCapability {
    name: string;
    [key: string]: boolean | string;
}

export interface ProjectDiagnosticsRequest {
    projectRootIdentifier: DocumentIdentifier;
}

export interface ProjectDiagnosticsResponse {
    errorDiagnosticMap?: Map<string, Diagnostic[]>;
}

export interface MainFunctionParamsRequest {
    projectRootIdentifier: DocumentIdentifier;
}

export interface MainFunctionParamsResponse {
    hasMain: boolean;
    params?: TypeBindingPair[];
    restParams?: TypeBindingPair;
}

export interface TypeBindingPair {
    type: string;
    paramName: string;
    defaultValue?: string;
}

// <------------ EXTENDED LANG CLIENT INTERFACE --------->



// <------------ BI INTERFACES --------->
export interface BIFlowModelRequest {
    filePath: string;
    startLine: LinePosition;
    endLine: LinePosition;
    forceAssign?: boolean;
}

export interface BISuggestedFlowModelRequest extends BIFlowModelRequest {
    text: string;
    position: LinePosition;
}

export type BIFlowModelResponse = {
    flowModel?: Flow;
    errorMsg?: string;
    stacktrace?: string;
};

export interface BISourceCodeRequest {
    filePath: string;
    flowNode: FlowNode | FunctionNode;
    isConnector?: boolean;
    isFunctionNodeUpdate?: boolean;
}

export type BISourceCodeResponse = {
    textEdits: {
        [key: string]: TextEdit[];
    };
};

export type BIDeleteByComponentInfoRequest = {
    filePath: string;
    component: ComponentInfo;
}

export type BIDeleteByComponentInfoResponse = {
    textEdits: {
        [key: string]: TextEdit[];
    };
};

export interface BIAvailableNodesRequest {
    position: LinePosition;
    filePath: string;
}

export type BIAvailableNodesResponse = {
    categories: Category[];
};

export interface BIGetVisibleVariableTypesRequest {
    filePath: string;
    position: LinePosition;
}

export interface BIGetVisibleVariableTypesResponse {
    categories: VisibleType[];
}

export interface BINodeTemplateRequest {
    position: LinePosition;
    filePath: string;
    id: CodeData;
    forceAssign?: boolean;
}

export type BINodeTemplateResponse = {
    flowNode: FlowNode;
};

export interface BIModuleNodesRequest {
    filePath: string;
}

export type BIModuleNodesResponse = {
    flowModel: Flow;
};

export type SearchQueryParams = {
    q?: string;
    limit?: number;
    offset?: number;
    includeAvailableFunctions?: string;
}

export type SearchKind = 'FUNCTION' | 'CONNECTOR' | 'TYPE' | "NP_FUNCTION";

export type BISearchRequest = {
    position: LineRange;
    filePath: string;
    queryMap: SearchQueryParams;
    searchKind: SearchKind;
}

export type BISearchResponse = {
    categories: Category[];
}

export type BIGetEnclosedFunctionRequest = {
    filePath: string;
    position: LinePosition;
    findClass?: boolean;
}

export type BIGetEnclosedFunctionResponse = {
    filePath: string;
    startLine: LinePosition;
    endLine: LinePosition;
}

export type BIConnectorsRequest = {
    queryMap: SearchQueryParams;
}

export type BIConnectorsResponse = {
    categories: Category[];
}

export type ServiceFromOASRequest = {
    openApiContractPath: string;
    projectPath: string;
    port: number;
}

export type ServiceFromOASResponse = {
    service: {
        fileName: string,
        startLine: LinePosition;
        endLine: LinePosition;
    },
    errorMsg?: string;
}

export interface ConfigVariableRequest {
    projectPath: string;
    includeLibraries?: boolean;
}

export type ConfigVariableResponse = {
    configVariables: ConfigVariable[];
    errorMsg?: any;
}

export interface UpdateConfigVariableRequest {
    configFilePath: string;
    configVariable: ConfigVariable;
}

export interface UpdateConfigVariableResponse {

}

export interface UpdateConfigVariableRequestV2 {
    configFilePath: string;
    configVariable: FlowNode | FunctionNode;
    packageName: string;
    moduleName: string;
}

export type UpdateConfigVariableResponseV2 = {
    textEdits: {
        [key: string]: TextEdit[];
    };
    errorMsg?: any;
};

export interface DeleteConfigVariableRequestV2 {
    configFilePath: string;
    configVariable: FlowNode | FunctionNode;
    packageName: string;
    moduleName: string;
}

export type DeleteConfigVariableResponseV2 = {
    textEdits: {
        [key: string]: TextEdit[];
    };
    errorMsg?: any;
};

export interface GetConfigVariableNodeTemplateRequest {
    isNew: boolean;
}

export interface OpenConfigTomlRequest {
    filePath: string
}

export interface BICopilotContextRequest {
    position: LinePosition;
    filePath: string;
}

export interface BICopilotContextResponse {
    prefix: string;
    suffix: string;
}

export interface BIDesignModelRequest {
    projectPath: string;
}

export type BIDesignModelResponse = {
    designModel: CDModel;
};

export interface SequenceModelRequest {
    filePath: string;
    startLine: LinePosition;
    endLine: LinePosition;
}

export type SequenceModelResponse = {
    sequenceDiagram: SqFlow;
};

export interface ComponentsFromContent {
    content: string;
}

export enum TriggerKind {
    INVOKED = 1,
    TRIGGER_CHARACTER = 2,
    TRIGGER_FOR_INCOMPLETE_COMPLETIONS = 3,
}

export const TRIGGER_CHARACTERS = [':', '.', '>', '@', '/', '\\', '?'] as const;

export type TriggerCharacter = typeof TRIGGER_CHARACTERS[number];

export type ExpressionProperty = Property;

export interface ExpressionEditorContext {
    expression: string;
    startLine: LinePosition;
    offset: number;
    lineOffset: number;
    codedata: CodeData;
    property: ExpressionProperty;
}

export interface ExpressionCompletionsRequest {
    filePath: string;
    context: ExpressionEditorContext;
    completionContext: {
        triggerKind: TriggerKind;
        triggerCharacter?: TriggerCharacter;
    };
}

export interface ExpressionCompletionItem {
    label: string;
    kind: number;
    detail: string;
    sortText: string;
    filterText: string;
    insertText: string;
    insertTextFormat: number;
    additionalTextEdits?: TextEdit[];
}

export type ExpressionCompletionsResponse = ExpressionCompletionItem[];

export interface SignatureHelpRequest {
    filePath: string;
    context: ExpressionEditorContext;
    signatureHelpContext: {
        isRetrigger: boolean;
        triggerCharacter?: TriggerCharacter;
        triggerKind: number;
    }
}

export interface SignatureInfo {
    label: string;
    documentation: {
        kind: string;
        value: string;
    };
    parameters: {
        label: number[];
        documentation: {
            kind: string;
            value: string;
        }
    }[];
}

export interface SignatureHelpResponse {
    signatures: SignatureInfo[];
    activeSignature: number;
    activeParameter: number;
}

export interface VisibleTypesRequest {
    filePath: string;
    position: LinePosition;
    typeConstraint?: string;
}

export interface VisibleTypeItem {
    insertText: string;
    kind: number;
    label: string;
    labelDetails: {
        description: string;
        detail: string;
    }
}

export type VisibleTypesResponse = VisibleTypeItem[];

export interface ReferenceLSRequest {
    textDocument: {
        uri: string;
    };
    position: {
        character: number;
        line: number;
    };
    context: {
        includeDeclaration: boolean;
    };
}
export interface Reference {
    uri: string;
    range: Range;
}

export interface ExpressionDiagnosticsRequest {
    filePath: string;
    context: ExpressionEditorContext;
}

export interface ExpressionDiagnosticsResponse {
    diagnostics: Diagnostic[];
}

export interface UpdateImportsRequest {
    filePath: string;
    importStatement: string;
}

export interface ImportsInfoResponse {
    prefix: string;
    moduleId: string;
}

export interface UpdateImportsResponse extends ImportsInfoResponse {
    importStatementOffset: number;
}

export const functionKinds = {
    CURRENT: 'CURRENT',
    IMPORTED: 'IMPORTED',
    AVAILABLE: 'AVAILABLE'
} as const;

export type FunctionKind = typeof functionKinds[keyof typeof functionKinds];

export interface AddFunctionRequest {
    filePath: string;
    codedata: CodeData;
    kind: FunctionKind;
    searchKind: SearchKind;
}

export interface AddImportItemResponse extends ImportsInfoResponse {
    template: string;
}

export interface RenameIdentifierRequest {
    fileName: string;
    position: Position;
    newName: string;
}

// <-------- Trigger Related ------->
export interface TriggerModelsRequest {
    organization?: string;
    packageName?: string;
    query?: string;
    keyWord?: string;
}

export interface TriggerModelsResponse {
    local: ServiceModel[];
}

// <-------- Trigger Related ------->

// <-------- Service Designer Related ------->
export interface ListenersRequest {
    filePath: string;
    moduleName: string;
    orgName?: string;
    pkgName?: string;
    listenerTypeName?: string;
}
export interface ListenersResponse {
    hasListeners: boolean;
    listeners: string[];
}
export interface ListenerModelRequest {
    moduleName: string;
    orgName?: string;
    pkgName?: string;
    listenerTypeName?: string;
}
export interface ListenerModelResponse {
    listener: ListenerModel;
}

export interface ListenerSourceCodeRequest {
    filePath: string;
    listener: ListenerModel;
}
export interface ListenerSourceCodeResponse {
    textEdits: {
        [key: string]: TextEdit[];
    };
}
export interface ServiceModelRequest {
    filePath: string;
    moduleName: string;
    listenerName?: string;
    orgName?: string;
    pkgName?: string;
}
export interface ServiceModelResponse {
    service: ServiceModel;
}
export interface ServiceSourceCodeRequest {
    filePath: string;
    service: ServiceModel;
}
export interface ServiceSourceCodeResponse {
    textEdits: {
        [key: string]: TextEdit[];
    };
}

export interface ClassFieldModifierRequest {
    filePath: string;
    field: FieldType;
}

export interface AddFieldRequest {
    filePath: string;
    field: FieldType;
    codedata: {
        lineRange: LineRange;
    };
}

export interface SourceEditResponse {
    textEdits?: {
        [key: string]: TextEdit[];
    };
    errorMsg?: string;
    stacktrace?: string;
}

export interface ServiceClassSourceRequest {
    filePath: string;
    serviceClass: ServiceClassModel;
}

export interface FunctionModelRequest {
    type: string;
    functionName: string;
}

export interface FunctionModelResponse {
    function: FunctionModel;
}
export interface ServiceModelFromCodeRequest {
    filePath: string;
    codedata: {
        lineRange: LineRange; // For the entire service
    };
}
export interface ServiceModelFromCodeResponse {
    service: ServiceModel;
}
export interface ListenerModelFromCodeRequest {
    filePath: string;
    codedata: {
        lineRange: LineRange; // For the entire service
    };
}

export interface ModelFromCodeRequest {
    filePath: string;
    codedata: {
        lineRange: LineRange;
    };
    context: string;
}

export interface ServiceClassModelResponse {
    model?: ServiceClassModel;
    errorMsg?: string;
    stacktrace?: string;
}

// <-------- Type Related ------->

export interface Type {
    name: string;
    editable: boolean;
    metadata: TypeMetadata;
    codedata: TypeCodeData;
    properties: Record<string, TypeProperty>;
    members: Member[];
    restMember?: Member;
    includes?: string[];
    functions?: TypeFunctionModel[];
    allowAdditionalFields?: boolean;
}

type ServiceFunctionKind = "RESOURCE" | "REMOTE" | "FUNCTION";

export interface TypeFunctionModel {
    qualifiers: string[];
    accessor: string;
    kind: ServiceFunctionKind;
    name?: string;
    description?: string;
    parameters: Member[];
    restParameter?: Member;
    returnType?: Type | string;
    refs: string[];
    imports?: Imports;
}

export interface TypeMetadata {
    label: string;
    description: string;
}

export type TypeNodeKind = "RECORD" | "ENUM" | "ARRAY" | "UNION" | "ERROR" | "MAP" | "STREAM" | "FUTURE" |
    "TYPEDESC" | "CLASS" | "OBJECT" | "INTERSECTION" | "SERVICE_DECLARATION" | "TABLE" | "TUPLE";
// todo make this consistant
export interface TypeCodeData {
    lineRange?: LineRange;
    node: TypeNodeKind;
}

export interface TypeProperty {
    metadata: TypeMetadata;
    valueType: string;
    value: string | string[]; // as required for qualifiers
    optional: boolean;
    editable: boolean;
    advanced: boolean;
}

export interface Member {
    kind: string;
    refs: string[];
    type: string | Type;
    name?: string;
    docs?: string;
    defaultValue?: string;
    optional?: boolean;
    imports?: Imports;
}

export interface GetGraphqlTypeRequest {
    filePath: string,
    linePosition: LinePosition;
}

export interface GetGraphqlTypeResponse {
    type: Type;
    refs: Type[];
}

export interface GetTypesRequest {
    filePath: string;
}

export interface GetTypeRequest {
    filePath: string;
    linePosition: LinePosition;
}

export interface UpdateTypeRequest {
    filePath: string;
    description: string;
    type: Type;
}

export interface UpdateTypesRequest {
    filePath: string;
    types: Type[];
}

export interface UpdateTypesResponse {
    textEdits: {
        [filePath: string]: TextEdit[];
    };
    errorMsg?: string;
    stacktrace?: string;
}

export interface GetTypesResponse {
    types: Type[];
}

export interface GetTypeResponse {
    type: Type;
}

export interface GetRecordConfigRequest {
    filePath: string;
    codedata: {
        org: string;
        module: string;
        version: string;
        packageName?: string;
    };
    typeConstraint: string;
}

export interface GetRecordConfigResponse {
    recordConfig?: TypeField;
    errorMsg?: string;
    stacktrace?: string;
}

export type RecordSourceGenRequest = {
    filePath: string;
    type: TypeField;
}

export type RecordSourceGenResponse = {
    errorMessage?: string;
    stackTrace?: string;
    recordValue?: string;
}

export type UpdateRecordConfigRequest = {
    filePath: string;
    codedata: {
        org: string;
        module: string;
        version: string;
    };
    typeConstraint: string;
    expr: string;
}

export type GetRecordModelFromSourceRequest = {
    filePath: string;
    typeMembers: PropertyTypeMemberInfo[];
    expr: string;
}

export type GetRecordModelFromSourceResponse = {
    recordConfig: TypeField;
    typeName: string;
    errorMsg?: string;
    stacktrace?: string;
}


export interface TextEditRange {
    start: {
        line: number;
        character: number;
    };
    end: {
        line: number;
        character: number;
    };
}

export interface TextEdit {
    range: TextEditRange;
    newText: string;
}

export interface UpdateTypeResponse {
    name: string;
    textEdits: {
        [filePath: string]: TextEdit[];
    };
}

// <-------- Trigger Related ------->

export interface TriggerFunctionResponse {

}

export interface ListenerModelFromCodeResponse {
    listener: ListenerModel;
}
export interface HttpResourceModelRequest {
    type: "http",
    functionName: "resource"
}
export interface HttpResourceModelResponse {
    function: FunctionModel;
}
export interface FunctionSourceCodeRequest {
    filePath: string;
    function: FunctionModel;
    codedata: {
        lineRange: LineRange; // For the entire service
    };
    service?: ServiceModel;
}
export interface ResourceSourceCodeResponse {
    textEdits: {
        [key: string]: TextEdit[];
    };
}
// <-------- Service Designer Related ------->


export interface FunctionNodeRequest {
    projectPath?: string;
    fileName?: string;
    functionName: string;
}
export interface FunctionNodeResponse {
    functionDefinition: FunctionNode;
}

// <-------- AI Agent Related ------->

export interface AINodesRequest {
    filePath: string;
}
export interface AINodesResponse {
    agents?: CodeData[];
    models?: CodeData[];
}
export interface MemoryManagersRequest {
    filePath: string;
}
export interface MemoryManagersResponse {
    memoryManagers?: CodeData[];
}
export interface AIModelsResponse {
    models: string[];
}

// TODO: Correct the data type
export interface AIModelsRequest {
    agent: any;
    filePath?: string;
}

export interface AIToolsRequest {
    filePath: string;
}
export interface AIToolsResponse {
    tools: string[];
}

export interface AIGentToolsRequest {
    filePath: string;
    flowNode: FlowNode;
    toolName: string;
    description: string;
    connection: string;
}

export interface AIGentToolsResponse {
    textEdits: {
        [key: string]: TextEdit[];
    };
}

export type OpenAPIClientGenerationRequest = {
    openApiContractPath: string;
    projectPath: string;
    module: string;
}

interface OpenAPIClientSource {
    isModuleExists: boolean;
    textEditsMap: {
        [key: string]: TextEdit[];
    };
}

export type OpenAPIClientGenerationResponse = {
    source: OpenAPIClientSource;
}

export type OpenAPIGeneratedModulesRequest = {
    projectPath: string;
}

export type OpenAPIGeneratedModulesResponse = {
    modules: string[];
}

export type OpenAPIClientDeleteRequest = {
    projectPath: string;
    module: string;
}

export type OpenAPIClientDeleteData = {
    filesToDelete: string[];
    textEditsMap: {
        [key: string]: TextEdit[];
    };
}

export type OpenAPIClientDeleteResponse = {
    deleteData: OpenAPIClientDeleteData
}

// <-------- Deployment Related ------->

export interface DeploymentRequest {
    integrationTypes: SCOPE[];
}

export interface DeploymentResponse {
    isCompleted: boolean;
}


// 2201.12.3 -> New Project Component Artifacts Tree

export interface BaseArtifact<T = any> {
    id: string;
    location: {
        fileName: string;
        startLine: {
            line: number;
            offset: number;
        };
        endLine: {
            line: number;
            offset: number;
        };
    };
    type: DIRECTORY_MAP;
    name: string;
    module?: string;
    scope: string;
    icon?: string; // Optional for those that have an icon
    children?: Record<string, BaseArtifact>; // To allow nested structures
    accessor?: string; // Specific to Entry Points
    value?: T; // Generic value property to hold different types
}

// Artifact Types
export enum ARTIFACT_TYPE {
    Functions = "Functions",
    Connections = "Connections",
    Listeners = "Listeners",
    EntryPoints = "Entry Points",
    Types = "Types",
    NaturalFunctions = "Natural Functions",
    DataMappers = "Data Mappers",
    Configurations = "Configurations"
}

export interface Artifacts {
    [ARTIFACT_TYPE.Functions]: Record<string, BaseArtifact>;
    [ARTIFACT_TYPE.Connections]: Record<string, BaseArtifact>;
    [ARTIFACT_TYPE.Listeners]: Record<string, BaseArtifact>;
    [ARTIFACT_TYPE.EntryPoints]: Record<string, BaseArtifact>;
    [ARTIFACT_TYPE.Types]: Record<string, BaseArtifact>;
    [ARTIFACT_TYPE.NaturalFunctions]: Record<string, BaseArtifact>;
    [ARTIFACT_TYPE.DataMappers]: Record<string, BaseArtifact>;
    [ARTIFACT_TYPE.Configurations]: Record<string, BaseArtifact>;
}

export interface ArtifactsNotification {
    uri: string;
    artifacts: Artifacts;
}

export interface ProjectArtifactsRequest {
    projectPath: string;
}
export interface ProjectArtifacts {
    artifacts: Artifacts;
}

// <------------ BI INTERFACES --------->

export interface BaseLangClientInterface {
    init?: (params: InitializeParams) => Promise<InitializeResult>;
    didOpen: (Params: DidOpenParams) => void;
    didClose: (params: DidCloseParams) => void;
    didChange: (params: DidChangeParams) => void;
    definition: (params: DefinitionParams) => Promise<Location | Location[] | LocationLink[] | null>;
    close?: () => void;
}

export interface BIInterface extends BaseLangClientInterface {
    getSTByRange: (params: BallerinaSTParams) => Promise<SyntaxTree | NOT_SUPPORTED_TYPE>;
    getFlowModel: (params: BIFlowModelRequest) => Promise<BIFlowModelResponse>;
    getSourceCode: (params: BISourceCodeRequest) => Promise<BISourceCodeResponse>;
    getAvailableNodes: (params: BIAvailableNodesRequest) => Promise<BIAvailableNodesResponse>;
    getNodeTemplate: (params: BINodeTemplateRequest) => Promise<BINodeTemplateResponse>;
    getSequenceDiagramModel: (params: SequenceModelRequest) => Promise<SequenceModelResponse>;
    generateServiceFromOAS: (params: ServiceFromOASRequest) => Promise<ServiceFromOASResponse>;
    getExpressionCompletions: (params: ExpressionCompletionsRequest) => Promise<ExpressionCompletionsResponse>;
    getConfigVariables: (params: ConfigVariableRequest) => Promise<ConfigVariableResponse>;
    updateConfigVariables: (params: UpdateConfigVariableRequest) => Promise<UpdateConfigVariableResponse>;
    getConfigVariablesV2: (params: ConfigVariableRequest) => Promise<ConfigVariableResponse>;
    updateConfigVariablesV2: (params: UpdateConfigVariableRequestV2) => Promise<UpdateConfigVariableResponseV2>;
    deleteConfigVariableV2: (params: DeleteConfigVariableRequestV2) => Promise<DeleteConfigVariableResponseV2>;
    getConfigVariableNodeTemplate: (params: GetConfigVariableNodeTemplateRequest) => Promise<BINodeTemplateResponse>;
    getComponentsFromContent: (params: ComponentsFromContent) => Promise<BallerinaProjectComponents>;
    getSignatureHelp: (params: SignatureHelpRequest) => Promise<SignatureHelpResponse>;
    getVisibleTypes: (params: VisibleTypesRequest) => Promise<VisibleTypesResponse>;
    getExpressionDiagnostics: (params: ExpressionDiagnosticsRequest) => Promise<ExpressionDiagnosticsResponse>;
    getOpenApiGeneratedModules: (params: OpenAPIGeneratedModulesRequest) => Promise<OpenAPIGeneratedModulesResponse>

    // New Service Designer APIs
    getTriggerModels: (params: TriggerModelsRequest) => Promise<TriggerModelsResponse>;
    getListeners: (params: ListenersRequest) => Promise<ListenersResponse>;
    getListenerModel: (params: ListenerModelRequest) => Promise<ListenerModelResponse>;
    addListenerSourceCode: (params: ListenerSourceCodeRequest) => Promise<ListenerSourceCodeResponse>;
    getListenerFromSourceCode: (params: ListenerModelFromCodeRequest) => Promise<ListenerModelFromCodeResponse>;
    getServiceModel: (params: ServiceModelRequest) => Promise<ServiceModelResponse>;
    addServiceSourceCode: (params: ServiceSourceCodeRequest) => Promise<ListenerSourceCodeResponse>;
    getServiceModelFromCode: (params: ServiceModelFromCodeRequest) => Promise<ServiceModelFromCodeResponse>;
    getHttpResourceModel: (params: HttpResourceModelRequest) => Promise<HttpResourceModelResponse>;
    addResourceSourceCode: (params: FunctionSourceCodeRequest) => Promise<ResourceSourceCodeResponse>;
    addFunctionSourceCode: (params: FunctionSourceCodeRequest) => Promise<ResourceSourceCodeResponse>;

    // Function APIs
    getFunctionNode: (params: FunctionNodeRequest) => Promise<FunctionNodeResponse>;

    getDesignModel: (params: BIDesignModelRequest) => Promise<BIDesignModelResponse>;
    getType: (params: GetTypeRequest) => Promise<GetTypeResponse>;
    getTypes: (params: GetTypesRequest) => Promise<GetTypesResponse>;
    updateType: (params: UpdateTypeRequest) => Promise<UpdateTypeResponse>;
    updateImports: (params: UpdateImportsRequest) => Promise<ImportsInfoResponse>;
    addFunction: (params: AddFunctionRequest) => Promise<AddImportItemResponse>;
    convertJsonToRecordType: (params: JsonToRecordParams) => Promise<TypeDataWithReferences>;
    convertXmlToRecordType: (params: XMLToRecordParams) => Promise<TypeDataWithReferences>;

    // AI Agent APIs
    getAllAgents: (params: AINodesRequest) => Promise<AINodesResponse>;
    getAllModels: (params: AIModelsRequest) => Promise<AINodesResponse>;
    getModels: (params: AIModelsRequest) => Promise<AIModelsResponse>;
    getTools: (params: AIToolsRequest) => Promise<AIToolsResponse>;
    genTool: (params: AIGentToolsRequest) => Promise<AIGentToolsResponse>;
}

export interface ExtendedLangClientInterface extends BIInterface {
    rename(params: RenameParams): Promise<WorkspaceEdit | NOT_SUPPORTED_TYPE>;
    getDocumentSymbol(params: DocumentSymbolParams): Promise<DocumentSymbol[] | SymbolInformation[] | NOT_SUPPORTED_TYPE>;
    codeAction(params: CodeActionParams): Promise<CodeAction[]>;
    getCompletion(params: CompletionParams): Promise<Completion[]>;
    executeCommand(params: ExecuteCommandParams): Promise<any>;
    initBalServices(params: BallerinaInitializeParams): Promise<BallerinaInitializeResult>;
    getPackageComponentModels(params: ComponentModelsParams): Promise<ComponentModels>;
    getPersistERModel(params: PersistERModelParams): Promise<PersistERModel>;
    getDiagnostics(params: DiagnosticsParams): Promise<Diagnostics[] | NOT_SUPPORTED_TYPE>;
    getConnector(params: ConnectorRequest): Promise<ConnectorResponse | NOT_SUPPORTED_TYPE>;
    getRecord(params: RecordParams): Promise<BallerinaRecord | NOT_SUPPORTED_TYPE>;
    getSymbolDocumentation(params: SymbolInfoParams): Promise<SymbolInfo | NOT_SUPPORTED_TYPE>;
    getTypeFromExpression(params: TypeFromExpressionParams): Promise<TypesFromExpression | NOT_SUPPORTED_TYPE>;
    getTypeFromSymbol(params: TypeFromSymbolParams): Promise<TypesFromSymbol | NOT_SUPPORTED_TYPE>;
    getTypesFromFnDefinition(params: TypesFromFnDefinitionParams): Promise<TypesFromSymbol | NOT_SUPPORTED_TYPE>;
    getGraphqlModel(params: GraphqlDesignServiceParams): Promise<GraphqlDesignService | NOT_SUPPORTED_TYPE>;
    getSyntaxTree(req: SyntaxTreeParams): Promise<SyntaxTree | NOT_SUPPORTED_TYPE>;
    fetchExamples(args: BallerinaExampleListParams): Promise<BallerinaExampleList | NOT_SUPPORTED_TYPE>;
    getBallerinaProject(params: BallerinaProjectParams): Promise<BallerinaProject | NOT_SUPPORTED_TYPE>;
    getBallerinaProjectComponents(params: BallerinaPackagesParams): Promise<BallerinaProjectComponents | NOT_SUPPORTED_TYPE>;
    getBallerinaProjectConfigSchema(params: BallerinaProjectParams): Promise<PackageConfigSchema | NOT_SUPPORTED_TYPE>;
    getSyntaxTreeNode(params: SyntaxTreeNodeParams): Promise<SyntaxTreeNode | NOT_SUPPORTED_TYPE>;
    updateStatusBar(): void;
    getDidOpenParams(): DidOpenParams;
    getProjectArtifacts(params: ProjectArtifactsRequest): Promise<ProjectArtifacts>;
    openConfigToml(params: OpenConfigTomlRequest): Promise<void>;
}
