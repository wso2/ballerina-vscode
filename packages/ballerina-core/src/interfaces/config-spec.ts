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

import { NodePosition, STNode } from "@wso2/syntax-tree";
import { STModification, TypeInfo } from "./ballerina";

export enum GenerationType {
    ASSIGNMENT,
    NEW
}

export enum PrimitiveBalType {
    String = "string",
    Record = "record",
    Union = "union",
    Enum = "enum",
    Int = "int",
    Float = "float",
    Boolean = "boolean",
    Array = "array",
    Json = "json",
    Xml = "xml",
    Nil = "nil",
    Var = "var",
    Error = "error",
    Decimal = "decimal"
}

export enum OtherBalType {
    Map = "map",
    Object = "object",
    Stream = "stream",
    Table = "table",
    Null = "()"
}

export const AnydataType = "anydata";
export const AnyType = "any";

export const httpResponse: NonPrimitiveBal = {
    orgName: 'ballerina',
    moduleName: 'http',
    name: 'Response',
}

export const httpRequest: NonPrimitiveBal = {
    orgName: 'ballerina',
    moduleName: 'http',
    name: 'Request',
}

export interface NonPrimitiveBal {
    orgName: string;
    moduleName: string;
    name: string;
    version?: string;
}

// tslint:disable-next-line: max-classes-per-file
export type balTypes = "string" | "record" | "union" | "int" | "float" | "decimal" | "boolean" | "array" | "json" | "xml" | "nil" | "http:Request" | "var" | "error" | undefined;

export type BallerinaType = PrimitiveBalType | NonPrimitiveBal;

export type ExpressionEditorType = BallerinaType | BallerinaType[];

export interface FunctionDefinitionInfo {
    name: string;
    documentation: string;
    parameters: FormField[];
    pathParams?: PathParam[];
    returnType?: FormField;
    qualifiers?: string[];
    isRemote?: boolean; // TODO: remove this
    displayAnnotation?: any;
}

export interface FormField {
    typeName: string;
    name?: string;
    displayName?: string;
    memberType?: FormField;
    inclusionType?: FormField;
    paramType?: FormField;
    selectedDataType?: string;
    description?: string;
    defaultValue?: any;
    value?: any;
    optional?: boolean;
    defaultable?: boolean;
    fields?: FormField[];
    members?: FormField[];
    references?: FormField[];
    restType?: FormField;
    constraintType?: FormField;
    rowType?: FormField;
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
}

export interface PathParam {
    name: string;
    typeName: string;
    isRestType: boolean;
}

export interface FormFieldReturnType {
    hasError: boolean;
    hasReturn: boolean;
    returnType: string;
    importTypeInfo?: NonPrimitiveBal[];
}

export interface FormFieldChecks {
    name: string;
    isValid: boolean;
    isEmpty?: boolean;
    canIgnore?: boolean; // Ff field is optional or defaultable
}

// tslint:disable-next-line: max-classes-per-file
export class ResponsePayloadMap {
    payloadTypes: Map<string, string> = new Map();
    isPayloadSelected: boolean = false;
    selectedPayloadType?: string;
    payloadVariableName?: string;
}


// tslint:disable-next-line: max-classes-per-file
export class ActionConfig {
    public isRemote: boolean = true;
    public name: string = "";
    public returnVariableName?: string = "";
    public returnType?: string = "";
    public fields: FormField[] = [];
    public isReturnValueIgnored?: boolean;
}

// tslint:disable-next-line: max-classes-per-file
export class ConnectorConfig {
    public connectionName?: string = "";
    public name?: string = "";
    public connectorInit: FormField[] = [];
    public action: ActionConfig;
    public existingConnections?: any;
    public isExistingConnection?: boolean;
    public subExitingConnection?: string;
    public isNewConnector?: boolean;
    public responsePayloadMap?: ResponsePayloadMap;
    public initPosition?: NodePosition;
    public isReturnError?: boolean;
    public isConnectionNameUpdated?: boolean;
    public qualifiers?: string[];
}

export interface ConfigurationSpec {
    type: string;
    name: string;
    icon?: symbol;
    description?: string;
    size?: "small" | "medium";
}

export enum WizardType {
    NEW,
    EXISTING
}

export function getPrimitiveType(type: string): PrimitiveBalType {
    let typeString: PrimitiveBalType;
    switch (type) {
        case "var":
            typeString = PrimitiveBalType.Var;
            break;
        case "string":
            typeString = PrimitiveBalType.String;
            break;
        case "int":
            typeString = PrimitiveBalType.Int;
            break;
        case "float":
            typeString = PrimitiveBalType.Float;
            break;
        case "record":
            typeString = PrimitiveBalType.Record;
            break;
        case "|":
            typeString = PrimitiveBalType.Union;
            break;
        case "boolean":
            typeString = PrimitiveBalType.Boolean;
            break;
        case "[]":
            typeString = PrimitiveBalType.Array;
            break;
        case "json":
            typeString = PrimitiveBalType.Json;
            break;
        case "xml":
            typeString = PrimitiveBalType.Xml;
            break;
        case "nil":
            typeString = PrimitiveBalType.Nil;
            break;
        default:
            typeString = undefined;
            break;
    }
    return typeString;
}

export interface ManualConfigType {
    name: string,
    value: string
}

export interface DiagramDiagnostic {
    message: string,
    diagnosticInfo: {
        code: string,
        severity: string
    },
    range: NodePosition
}

export interface InjectableItem {
    id: string;
    modification: STModification;
    name?: string;
    value?: string;
}

export interface ExpressionInjectablesProps {
    list: InjectableItem[];
    setInjectables: (InjectableItem: InjectableItem[]) => void;
}

export interface DiagnosticMsgSeverity {
    message: string,
    severity: string
}

export interface ConditionConfig {
    type: string;
    conditionExpression?: string | ForeachConfig | ElseIfConfig;
    scopeSymbols?: string[];
    conditionPosition?: NodePosition;
    model?: STNode
}

export interface ForeachConfig {
    variable: string;
    collection: string;
    type: string;
    model?: STNode
}

export interface ElseIfConfig {
    values: { id: number, expression: string, position: NodePosition }[]
}

export interface ProcessConfig {
    type: string;
    config?: string | LogConfig | RespondConfig | CustomExpressionConfig | WorkerConfig | SendStatementConfig
    | ReceivestatementConfig | WaitStatementConfig;
    scopeSymbols?: string[];
    model?: STNode;
    wizardType?: WizardType;
    targetPosition?: NodePosition;
}

export interface LogConfig {
    type: string;
    expression: string;
}


export interface WorkerConfig {
    name: string;
    returnType: string;
}

export interface SendStatementConfig {
    expression: string;
    targetWorker: string;
}

export interface ReceivestatementConfig {
    type: string;
    varName: string;
    senderWorker: string;
}

export interface WaitStatementConfig {
    type: string;
    varName: string;
    expression: string;
}

export interface FlushStatementConfig {
    varName: string;
    expression: string;
}

export interface CustomExpressionConfig {
    expression: string;
}

export interface RespondConfig {
    genType: string;
    caller: string;
    respondExpression: string;
    variable: string;
    responseCode?: string;
}

export interface DataMapperInputTypeInfo {
    type: string;
    name: string;
    node?: STNode;
}

export interface DataMapperOutputTypeInfo {
    variableName?: string;
    type: string;
    node?: STNode;
    generationType?: GenerationType;
    typeInfo?: TypeInfo;
    startLine?: number;
    fields?: DataMapperOutputField[];
    sampleStructure?: string;
    fieldsGenerated?: boolean;
    saved?: boolean
    typeDefInSameModule?: boolean;
}

export interface DataMapperConfig {
    inputTypes: DataMapperInputTypeInfo[]; // todo ::: finalize the interface
    outputType: DataMapperOutputTypeInfo;
}

export interface DataMapperOutputField {
    name: string;
    type: string;
    fields?: DataMapperOutputField[];
    value?: string;
    isChanged: boolean;
}

export interface EndConfig {
    type: string;
    expression?: string | RespondConfig;
    scopeSymbols?: string[];
    wizardType?: WizardType;
    model?: STNode;
}

export interface HTTPServiceConfigState {
    serviceBasePath: string;
    listenerConfig: ListenerConfigFormState,
    hasInvalidConfig?: boolean
}

export interface ListenerConfigFormState {
    createNewListener?: boolean;
    fromVar?: boolean,
    listenerName?: string,
    listenerPort?: string,
}

export interface ServiceConfigState {
    serviceBasePath: string;
    listenerConfig: ListenerConfigFormState,
    serviceType?: string
}
