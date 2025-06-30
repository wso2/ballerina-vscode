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

import { DocumentIdentifier, LinePosition, LineRange, Position, Range } from "./common";
import { ClientCapabilities, Location } from "vscode-languageserver-protocol";
import { DiagramDiagnostic, FunctionDefinitionInfo, NonPrimitiveBal } from "./config-spec";
import { STModifyParams } from "./extended-lang-client";
import { NodePosition, STNode } from "@wso2/syntax-tree";

export enum DIAGNOSTIC_SEVERITY {
    INTERNAL = "INTERNAL",
    HINT = "HINT",
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR"
}

export interface GoToSourceParams {
    textDocumentIdentifier: {
        uri: string;
    };
    position: Position;
}

export interface RevealRangeParams {
    textDocumentIdentifier: {
        uri: string;
    };
    range: Range;
}

export interface BallerinaExample {
    title: string;
    url: string;
}

export interface BallerinaExampleCategory {
    title: string;
    column: number;
    samples: BallerinaExample[];
}

export interface VisibleEndpoint {
    kind?: string;
    isCaller: boolean;
    isExternal: boolean;
    isModuleVar: boolean;
    moduleName: string;
    name: string;
    packageName: string;
    orgName: string;
    version: string;
    typeName: string;
    position: NodePosition;
    viewState?: any;
    isParameter?: boolean;
    isClassField?: boolean;
}

export interface TypeField {
    typeName: string;
    name?: string;
    displayName?: string;
    memberType?: TypeField;
    inclusionType?: TypeField;
    paramType?: TypeField;
    selectedDataType?: string;
    description?: string;
    defaultValue?: any;
    value?: any;
    optional?: boolean;
    defaultable?: boolean;
    fields?: TypeField[];
    members?: TypeField[];
    references?: TypeField[];
    restType?: TypeField;
    constraintType?: TypeField;
    rowType?: TypeField;
    keys?: string[];
    isReturn?: boolean;
    isTypeDef?: boolean;
    isReference?: boolean;
    isStream?: boolean;
    isErrorUnion?: boolean;
    typeInfo?: NonPrimitiveBal;
    hide?: boolean;
    aiSuggestion?: string;
    noCodeGen?: boolean;
    requestName?: string; // only for http form used when there's a request object in the request
    tooltip?: string;
    tooltipActionLink?: string;
    tooltipActionText?: string;
    isErrorType?: boolean;
    isRestParam?: boolean; // TODO: unified rest params
    hasRestType?: boolean;
    isRestType?: boolean;
    customAutoComplete?: string[];
    validationRegex?: any;
    leftTypeParam?: any;
    rightTypeParam?: any;
    initialDiagnostics?: DiagramDiagnostic[];
    documentation?: string;
    displayAnnotation?: any;
    position?: NodePosition;
    selected?: boolean;
    originalTypeName?: string;
    resolvedUnionType?: TypeField | TypeField[];
}

export interface BallerinaConnectorInfo extends BallerinaConnector {
    functions: FunctionDefinitionInfo[];
    documentation?: string;
}

export interface BallerinaConnectorsRequest {
    query: string;
    packageName?: string;
    organization?: string;
    connector?: string;
    description?: string;
    template?: string;
    keyword?: string;
    ballerinaVersion?: string;
    platform?: boolean;
    userPackages?: boolean;
    limit?: number;
    offset?: number;
    sort?: string;
    targetFile?: string;
}


// tslint:disable-next-line: no-empty-interface


export interface Package {
    organization: string;
    name: string;
    version: string;
    platform?: string;
    languageSpecificationVersion?: string;
    URL?: string;
    balaURL?: string;
    balaVersion?: string;
    digest?: string;
    summary?: string;
    readme?: string;
    template?: boolean;
    licenses?: any[];
    authors?: any[];
    sourceCodeLocation?: string;
    keywords?: any[];
    ballerinaVersion?: string;
    icon?: string;
    pullCount?: number;
    createdDate?: number;
    modules?: any[];
}

export interface PartialSTModification {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    newCodeSnippet: string;
}


export interface BallerinaModule {
    id?: string;
    type?: string;
    name: string;
    displayName?: string;
    moduleName?: string;
    package: Package;
    displayAnnotation?: DisplayAnnotation;
    icon?: string;
}

export interface ConnectorInfo {
    connector: any;
    functionNode?: STNode;
    action?: FunctionDefinitionInfo;
}

// tslint:disable-next-line: no-empty-interface
export interface BallerinaConnector extends BallerinaModule { }

// tslint:disable-next-line: no-empty-interface
export interface BallerinaTrigger extends BallerinaModule { }

export interface Package {
    organization: string;
    name: string;
    version: string;
    platform?: string;
    languageSpecificationVersion?: string;
    URL?: string;
    balaURL?: string;
    balaVersion?: string;
    digest?: string;
    summary?: string;
    readme?: string;
    template?: boolean;
    licenses?: any[];
    authors?: any[];
    sourceCodeLocation?: string;
    keywords?: any[];
    ballerinaVersion?: string;
    icon?: string;
    pullCount?: number;
    createdDate?: number;
    visibility?: string;
    modules?: any[];
}

export interface BallerinaTriggerInfo extends BallerinaTrigger {
    serviceTypes: ServiceType[],
    listenerParams?: Parameter[],
    listener: any,
    documentation?: string,
}

export interface ServiceType {
    name: string;
    description?: string;
    functions?: RemoteFunction[];
    basePath?: Parameter;
    // Editor Related
    isImplemented?: boolean;
}

export interface RemoteFunction {
    isRemote?: boolean;
    documentation?: string;
    optional?: boolean;
    name: string;
    parameters?: Parameter[];
    qualifiers?: string[];
    returnType?: ReturnType;
    // Editor Related
    isImplemented?: boolean;
    enabled?: boolean;
    group?: any;
}

export interface Parameter {
    name: string;
    typeName: string;
    optional?: boolean;
    typeInfo?: TypeInfo;
    displayAnnotation?: DisplayAnnotation;
    fields?: Field[];
    hasRestType?: boolean;
    restType?: ReturnType;
    defaultable?: boolean;
    defaultValue?: string;
    defaultTypeName?: string; // Is this defaultTypeValue?
    documentation?: string;
    type?: string[]
    arrayType?: boolean;
}

export interface DisplayAnnotation {
    label?: string;
    iconPath?: string;
}

export interface MemberField {
    typeName?: string;
    optional?: boolean;
    defaultable?: boolean;
}
export interface Field {
    name?: string;
    typeName?: string;
    optional?: boolean;
    defaultable?: boolean;
    fields?: ReturnType[];
    hasRestType?: boolean;
    restType?: ReturnType;
    members?: MemberField[];
    defaultType?: string;
}

export interface ReturnType {
    name?: string;
    typeName?: string;
    optional?: boolean;
    defaultable?: boolean;
    displayAnnotation?: DisplayAnnotation;
}

export interface TypeInfo {
    name?: string;
    orgName?: string;
    moduleName?: string;
    version?: string;
}

export interface BallerinaModulesRequest {
    query: string;
    packageName?: string;
    organization?: string;
    connector?: string;
    description?: string;
    template?: string;
    keyword?: string;
    ballerinaVersion?: string;
    platform?: boolean;
    userPackages?: boolean;
    limit?: number;
    offset?: number;
    sort?: string;
    targetFile?: string;
}
export interface BallerinaModuleResponse {
    central: BallerinaModule[];
    local?: BallerinaModule[];
    error?: string;
}

export interface STModification {
    startLine?: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
    type: string;
    config?: any;
    isImport?: boolean;
}

export interface MainTriggerModifyRequest extends STModifyParams {
    type: "main";
    config?: MainConfig;
}

export interface ServiceConfig {
    SERVICE: string;
    RESOURCE: string;
    RES_PATH: string;
    PORT: string;
    METHODS: string;
    CURRENT_TRIGGER?: string;
}

export interface MainConfig {
    COMMENT?: string;
    CURRENT_TRIGGER?: string;
}

export interface ServiceTriggerModifyRequest extends STModifyParams {
    type: "service";
    config: ServiceConfig;
}

export interface ExecutorPosition {
    kind: string;
    range: LineRange;
    name: string;
    filePath: string;
}

export interface ParameterInfo {
    name: string,
    description?: string,
    kind: string,
    type: string,
    modelPosition?: NodePosition,
    fields?: ParameterInfo[]
}

export interface SymbolDocumentation {
    description: string,
    parameters?: ParameterInfo[],
    returnValueDescription?: string,
    deprecatedDocumentation?: string,
    deprecatedParams?: ParameterInfo[]
}

export interface ExpressionRange {
    startLine: LinePosition;
    endLine: LinePosition;
    filePath?: string;
}


export interface ResolvedTypeForExpression {
    type: TypeField;
    requestedRange: ExpressionRange;
}

export interface ResolvedTypeForSymbol {
    type: TypeField;
    requestedPosition: LinePosition;
}

export interface BallerinaConstructRequest {
    query: string;
    packageName?: string;
    organization?: string;
    connector?: string;
    description?: string;
    template?: string;
    keyword?: string;
    ballerinaVersion?: string;
    platform?: boolean;
    userPackages?: boolean;
    limit?: number;
    offset?: number;
    sort?: string;
    targetFile?: string;
}

export interface Package {
    organization: string;
    name: string;
    version: string;
    platform?: string;
    languageSpecificationVersion?: string;
    URL?: string;
    balaURL?: string;
    balaVersion?: string;
    digest?: string;
    summary?: string;
    readme?: string;
    template?: boolean;
    licenses?: any[];
    authors?: any[];
    sourceCodeLocation?: string;
    keywords?: any[];
    ballerinaVersion?: string;
    icon?: string;
    pullCount?: number;
    createdDate?: number;
    visibility?: string;
    modules?: any[];
}

export interface CurrentFile {
    content: string;
    path: string;
    size: number;
}

export interface BallerinaConstruct {
    id?: string;
    name: string;
    displayName?: string;
    moduleName?: string;
    package: Package;
    displayAnnotation?: DisplayAnnotation;
    icon?: string;
}

export interface APITimeConsumption {
    diagnostics: number[];
    completion: number[];
}

export interface OADiagnostic {
    message: string;
    serverity: string;
    location?: LineRange;
}

export interface OASpec {
    file: string;
    serviceName: string;
    spec: any;
    diagnostics: OADiagnostic[];
}

export interface PerformanceAnalyzerGraphRequest {
    documentIdentifier: DocumentIdentifier;
    range: Range;
    choreoAPI: string;
    choreoCookie: string;
    choreoToken: string;
}

export interface NoteBookCellOutputValue {
    value: string;
    mimeType: string;
    type: string;
}

export interface NotebookCellMetaInfo {
    definedVars: string[];
    moduleDclns: string[];
}

export interface ExtendedClientCapabilities extends ClientCapabilities {
    experimental: { introspection: boolean, showTextDocument: boolean, experimentalLanguageFeatures?: boolean };
}

export interface PackageSummary {
    name: string,
    filePath: string,
    modules: ModuleSummary[]
}

export interface ModuleSummary extends ComponentSummary {
    name: string
}

export interface ComponentSummary {
    functions: ComponentInfo[],
    services: ComponentInfo[],
    records: ComponentInfo[],
    objects: ComponentInfo[],
    classes: ComponentInfo[],
    types: ComponentInfo[],
    constants: ComponentInfo[],
    enums: ComponentInfo[],
    listeners: ComponentInfo[],
    moduleVariables: ComponentInfo[],
    automations: ComponentInfo[],
    configurableVariables: ComponentInfo[],
    naturalFunctions: ComponentInfo[]
}

export interface ComponentInfo {
    name: string;
    filePath: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    resources?: ComponentInfo[];
}

export type SequenceModel = {
    participants: Participant[];
    location: Location;
};

export type SequenceModelDiagnostic = {
    errorMsg: string;
    isIncompleteModel: boolean;
};

export enum ParticipantType {
    FUNCTION = "FUNCTION",
    WORKER = "WORKER",
    ENDPOINT = "ENDPOINT",
}

export type Participant = {
    id: string;
    name: string;
    kind: ParticipantType;
    moduleName: string;
    nodes: Node[];
    location: Location;
};

export interface JsonToRecordMapperDiagnostic {
    message: string;
    severity?: DIAGNOSTIC_SEVERITY;
}

export interface XMLToRecordConverterDiagnostic {
    message: string;
    severity?: DIAGNOSTIC_SEVERITY;
}


export interface ConstantConfigFormState {
    isPublic: boolean;
    isTypeDefined: boolean;
    constantName: string;
    constantValue: string;
    constantType: string;
    isExpressionValid: boolean;
}

export interface ConfigurableFormState {
    isPublic: boolean;
    varType: string;
    varName: string;
    varValue: string;
    isExpressionValid: boolean;
    hasDefaultValue: boolean;
    label: string;
}

export interface ListenerConfig {
    listenerName: string,
    listenerPort: string,
    listenerType: string
    isExpressionValid: boolean;
}

export interface ModuleVariableFormState {
    varType: string;
    varName: string;
    varValue: string;
    varOptions: string[];
}

export interface HeaderObjectConfig {
    requestName?: string;
    objectKey: string;
    objectValue: string;
}

export interface CommandResponse {
    error: boolean;
    message: string;
}
