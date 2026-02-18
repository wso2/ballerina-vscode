/* eslint-disable @typescript-eslint/no-explicit-any */

import { STNode } from "@wso2/syntax-tree";
import { FlowNode, RecordTypeField } from "./bi";
import { MACHINE_VIEW } from "..";

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
export declare enum BallerinaComponentTypes {
    REST_API = "restAPI",
    GRAPHQL = "graphql",
    MAIN = "main",
    WEBHOOK = "webhook",
    GRPC_API = "grpcAPI",
    WEBSOCKET_API = "websocketAPI"
}

export enum SubPanelView {
    HELPER_PANEL = "helperPanel",
    ADD_NEW_FORM = "addNewForm",
    UNDEFINED = undefined,
}

export enum EditorDisplayMode {
    NONE = "none",
    POPUP = "popup",
    VIEW = "view",
}

export interface EditorConfig {
    view: MACHINE_VIEW;
    displayMode: EditorDisplayMode;
}

export interface DocumentIdentifier {
    uri: string;
}

export interface LineRange {
    fileName?: string;
    startLine: LinePosition;
    endLine: LinePosition;
}

export interface LinePosition {
    line: number;
    offset: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Position {
    line: number;
    character: number;
}

export interface NOT_SUPPORTED_TYPE {

}
export interface FunctionDef {
    syntaxTree: STNode;
    defFilePath: string;
}

export interface SubPanel {
    view: SubPanelView;
    props?: SubPanelViewProps;
}

export interface SubPanelViewProps {
    sidePanelData?: SidePanelData;
}

export interface SidePanelData {
    filePath: string;
    range: LineRange;
    editorKey: string;
    configurePanelData?: ConfigurePanelData;
    recordField: RecordTypeField;
}

export interface ConfigurePanelData {
    isEnable: boolean;
    name?: string;
    documentation?: string;
    value?: string;
}
