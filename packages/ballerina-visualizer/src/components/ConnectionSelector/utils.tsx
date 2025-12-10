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

import { FlowNode, Category, Property, ProjectStructureArtifactResponse } from "@wso2/ballerina-core";
import { FormField, Category as PanelCategory, FormValues, FormImports } from "@wso2/ballerina-side-panel";
import { ConnectionKindConfig, ConnectionKind, ConnectionSearchConfig } from "./types";
import { getImportsForProperty } from "../../utils/bi";
import { getConnectionKindConfig } from "./config";
import { Codicon } from "@wso2/ui-toolkit";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";

export const createConnectionSelectField = (
    selectedConnection: FlowNode,
    config: ConnectionKindConfig,
    handleActionBtnClick: () => void
): FormField => {
    const selectLabel = `Select ${config.displayName}`;
    const description = `Choose an existing ${config.displayName} or create a new one.`;
    const createLabel = `Create New ${config.displayName}`;
    return {
        "key": "connection",
        "label": selectLabel,
        "type": "ACTION_EXPRESSION",
        "optional": false,
        "advanced": false,
        "placeholder": "\"\"",
        "editable": true,
        "enabled": true,
        "hidden": false,
        "documentation": description,
        "advanceProps": [],
        "diagnostics": [],
        "inputTypes": config.inputTypes,
        "metadata": {
            "label": selectLabel,
            "description": description
        },
        "codedata": {
            "kind": "REQUIRED",
            "originalName": "connection"
        },
        "actionCallback": handleActionBtnClick,
        "actionLabel": <><Codicon name="add" />{createLabel}</>,
        "value": (selectedConnection.properties.variable?.value as string) || ""
    };
};

export const updateFormFieldsWithData = (
    connectionFields: FormField[],
    data: FormValues,
    formImports?: FormImports
): void => {
    connectionFields.forEach((field) => {
        if (field.type === "DROPDOWN_CHOICE") {
            field.dynamicFormFields[data[field.key]].forEach((dynamicField) => {
                if (data[dynamicField.key]) {
                    dynamicField.value = data[dynamicField.key];
                }
            });
            field.value = data[field.key];
        } else if (data[field.key]) {
            field.value = data[field.key];
        }
        if (formImports) {
            field.imports = getImportsForProperty(field.key, formImports);
        }
    });
};

export const updateNodeTemplateProperties = (
    nodeTemplate: FlowNode,
    connectionFields: FormField[]
): void => {
    connectionFields.forEach((field) => {
        if (field.editable) {
            nodeTemplate.properties[field.key as keyof typeof nodeTemplate.properties].value = field.value;
        }
    });
};

export const convertConnectionCategories = (connectionKind: ConnectionKind, categories: Category[]): PanelCategory[] => {
    const config = getConnectionKindConfig(connectionKind);
    return config.categoryConverter(categories);
};

const getValidPropertyKey = (node: FlowNode, nodePropertyKeys: string | string[]): string | undefined => {
    const keys = Array.isArray(nodePropertyKeys) ? nodePropertyKeys : [nodePropertyKeys];
    return keys.find(key => node.properties[key as keyof typeof node.properties]?.value);
};

export const fetchConnectionForNode = async (
    rpcClient: BallerinaRpcClient,
    connectionKind: ConnectionKind,
    targetNode: FlowNode,
): Promise<FlowNode> => {
    const moduleNodes = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
    const connections = moduleNodes.flowModel.connections;
    const config = getConnectionKindConfig(connectionKind);
    const propertyKey = getValidPropertyKey(targetNode, config.nodePropertyKey);
    const targetPropertyValue = propertyKey ? targetNode.properties?.[propertyKey as keyof typeof targetNode.properties]?.value : undefined;

    const connection = connections.find((node: FlowNode) =>
        node.properties.variable?.value === targetPropertyValue.toString().trim()
    );

    if (!connection)
        throw new Error(`Could not find a connection for the target node.`);

    return connection;
};

export const updateNodeWithConnectionVariable = (connectionKind: ConnectionKind, selectedNode: FlowNode, connectionVariable: string): void => {
    const config = getConnectionKindConfig(connectionKind);
    const propertyKey = getValidPropertyKey(selectedNode, config.nodePropertyKey) || (Array.isArray(config.nodePropertyKey) ? config.nodePropertyKey[0] : config.nodePropertyKey);
    const property = selectedNode.properties[propertyKey as keyof typeof selectedNode.properties];

    if (property && typeof property === 'object') {
        (property as Property).value = connectionVariable;
    }
};

export const getSearchConfig = (connectionKind: ConnectionKind, aiModuleOrg?: string): ConnectionSearchConfig => {
    const config = getConnectionKindConfig(connectionKind);
    if (config.searchConfig)
        return config.searchConfig(aiModuleOrg);
    return { query: "", searchKind: connectionKind };
};

export const updateNodeLineRange = (selectedNode: FlowNode, artifacts: ProjectStructureArtifactResponse[]): void => {
    const selectedNodeArtifact = artifacts.find((artifact) => {
        return artifact.name === selectedNode?.properties?.variable?.value;
    });
    if (selectedNodeArtifact && selectedNodeArtifact.position && !selectedNode?.codedata?.isNew) {
        selectedNode.codedata.lineRange = {
            fileName: selectedNodeArtifact?.path,
            startLine: { line: selectedNodeArtifact.position.startLine, offset: selectedNodeArtifact.position.startColumn },
            endLine: { line: selectedNodeArtifact.position.endLine, offset: selectedNodeArtifact.position.endColumn }
        };
    }
};
