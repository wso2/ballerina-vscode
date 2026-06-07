
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

import React from "react";

import {
    DesignViewIcon,
    GraphqlMutationIcon, GraphqlQueryIcon, GraphqlSubscriptionIcon, LabelDeleteIcon, LabelEditIcon
} from "@wso2/ballerina-core";
import { NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";
import { Codicon, Icon, Item } from "@wso2/ui-toolkit";

import { NodeCategory, NodeType } from "../NodeFilter";
import { FunctionType, Position } from "../resources/model";
import { getFormattedPosition, getParentSTNodeFromRange, getSTNodeFromRange } from "../utils/common-util";
import { getSyntaxTree } from "../utils/ls-util";

export function getServiceSubHeaderMenuItems(
    location: Position,
    nodeName: string,
    setFilteredNode: (nodeType: NodeType) => void,
    goToSource: (filePath: string, position: NodePosition) => void,
    functionPanel: any, model: any, servicePanel: any) {

    const menuItem: Item[] = [];

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <LabelEditIcon />
                <div style={{ marginLeft: '5px' }}>
                    Edit Service
                </div>
            </div>
        )
    }

    menuItem.push({ id: "edit-service", label: ItemWithIcon(), onClick: () => servicePanel() });
    if (location) {
        menuItem.push(getAddFunctionMenuItem(location, FunctionType.QUERY, functionPanel, model));
        menuItem.push(getAddFunctionMenuItem(location, FunctionType.MUTATION, functionPanel, model));
        menuItem.push(getAddFunctionMenuItem(location, FunctionType.SUBSCRIPTION, functionPanel, model));

        if (location?.filePath) {
            menuItem.push(getGoToSourceMenuItem(location, goToSource));
            menuItem.push(getFilterNodeMenuItem({ name: nodeName, type: NodeCategory.GRAPHQL_SERVICE }, setFilteredNode));
        }
    }

    return menuItem;

}

function getAddFunctionMenuItem(position: Position, functionType: FunctionType, functionPanel: any, model: any) {

    const openFunctionPanel = () => {
        if (STKindChecker.isServiceDeclaration(model)) {
            const lastMemberPosition: NodePosition = {
                endColumn: model.closeBraceToken.position.endColumn,
                endLine: model.closeBraceToken.position.endLine,
                startColumn: model.closeBraceToken.position.startColumn,
                startLine: model.closeBraceToken.position.startLine
            };
            if (functionType === FunctionType.QUERY) {
                functionPanel(lastMemberPosition, "GraphqlResource");
            } else if (functionType === FunctionType.MUTATION) {
                functionPanel(lastMemberPosition, "GraphqlMutation");
            } else if (functionType === FunctionType.SUBSCRIPTION) {
                functionPanel(lastMemberPosition, "GraphqlSubscription");
            }
        }
    };

    const popupTitle = () => {
        if (functionType === FunctionType.QUERY) {
            return "Add Query";
        } else if (functionType === FunctionType.MUTATION) {
            return "Add Mutation";
        } else {
            return "Add Subscription";
        }
    };

    const popupIcon = () => {
        if (functionType === FunctionType.QUERY) {
            return <GraphqlQueryIcon />;
        } else if (functionType === FunctionType.MUTATION) {
            return <GraphqlMutationIcon />;
        } else {
            return <GraphqlSubscriptionIcon />;
        }
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                {popupIcon()}
                <div style={{ marginLeft: '5px' }}>
                    {popupTitle()}
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: popupTitle(), label: ItemWithIcon(), onClick: () => openFunctionPanel() };
    return menuItem;
}


export function getGoToSourceMenuItem(location: Position, goToSource: (filePath: string, position: NodePosition) => void) {
    const filePath = location?.filePath;
    const position = getFormattedPosition(location);

    const handleOnClick = () => {
        goToSource(filePath, position);
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Codicon name="code" />
                <div style={{ marginLeft: '5px' }}>
                    Go to Source
                </div>
                <div style={{ marginLeft: '5px', color: '#595959F4' }}>
                    Ctrl + left click
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "go-to-source", label: ItemWithIcon(), onClick: () => handleOnClick() };
    return menuItem;
}


export function getFilterNodeMenuItem(nodeType: NodeType, setFilteredNode: (nodeType: NodeType) => void) {

    const handleOnClick = () => {
        setFilteredNode(nodeType);
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Icon name='center-focus-weak' />
                <div style={{ marginLeft: '5px' }}>
                    Show Subgraph
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "Show Subgraph", label: ItemWithIcon(), onClick: () => handleOnClick() };
    return menuItem;
}

export function getRecordMenuItems(
    location: Position,
    nodeName: string,
    fullST: STNode,
    currentFile: any,
    recordEditor: any,
    langClientPromise: any,
    setFilteredNode: (nodeType: NodeType) => void,
    goToSource: (filePath: string, position: NodePosition) => void) {

    const handleEditRecord = async () => {
        let recordModel: STNode;
        let currentST: STNode = fullST;
        const nodePosition: NodePosition = {
            endColumn: location.endLine.offset,
            endLine: location.endLine.line,
            startColumn: location.startLine.offset,
            startLine: location.startLine.line
        };
        if (location.filePath === currentFile.path) {
            const parentNode = getParentSTNodeFromRange(nodePosition, currentST);
            recordModel = parentNode;
        } else {
            const syntaxTree: STNode = await getSyntaxTree(location.filePath, langClientPromise);
            const parentNode = getParentSTNodeFromRange(nodePosition, syntaxTree);
            recordModel = parentNode;
            currentST = syntaxTree;
        }
        if (recordModel && (STKindChecker.isRecordTypeDesc(recordModel) || STKindChecker.isTypeDefinition(recordModel))) {
            recordEditor(recordModel, location.filePath, currentST);
        }
    }

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <LabelEditIcon />
                <div style={{ marginLeft: '5px' }}>
                    Edit Record
                </div>
            </div>
        )
    }

    const menuItem: Item[] = [];

    menuItem.push({ id: "edit-service", label: ItemWithIcon(), onClick: () => handleEditRecord() });
    menuItem.push(getGoToSourceMenuItem(location, goToSource));
    menuItem.push(getFilterNodeMenuItem({ name: nodeName, type: NodeCategory.RECORD }, setFilteredNode));

    return menuItem;
}

export function getClassFunctionMenuItem(
    position: Position,
    model: STNode,
    functionType: FunctionType,
    currentST?: STNode,
    functionPanel?: any) {

    const openFunctionPanel = () => {
        if (model && currentST && STKindChecker.isClassDefinition(model)) {
            const lastMemberPosition: NodePosition = {
                endColumn: model.closeBrace.position.endColumn,
                endLine: model.closeBrace.position.endLine,
                startColumn: model.closeBrace.position.startColumn,
                startLine: model.closeBrace.position.startLine
            };
            if (functionType === FunctionType.CLASS_RESOURCE) {
                functionPanel(lastMemberPosition, "ServiceClassResource", undefined, position.filePath, currentST);
            }
        }
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <GraphqlQueryIcon />
                <div style={{ marginLeft: '5px' }}>
                    Add Field
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "add-field", label: ItemWithIcon(), onClick: () => openFunctionPanel() };
    return menuItem;
}

export function getServiceFieldEdit(model: STNode, functionType: FunctionType, location: Position, st: STNode, functionPanel: any) {

    const openFunctionPanel = () => {
        if (STKindChecker.isResourceAccessorDefinition(model)) {
            if (functionType === FunctionType.CLASS_RESOURCE) {
                functionPanel(model.position, "ServiceClassResource", model, location.filePath, st);
            }
        }
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <LabelEditIcon />
                <div style={{ marginLeft: '5px' }}>
                    Edit Field
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "edit-service", label: ItemWithIcon(), onClick: () => openFunctionPanel() };
    return menuItem;

}

export function getDesignServiceField(
    model: STNode,
    location: Position,
    operationDesignView: (functionPosition: NodePosition, filePath?: string) => void) {

    const openOperationDesignView = () => {
        operationDesignView(model.position, location.filePath);
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <DesignViewIcon />
                <div style={{ marginLeft: '5px' }}>
                    Design Field
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "design-service", label: ItemWithIcon(), onClick: () => openOperationDesignView() };
    return menuItem;
}

export function getDesignOperationMenuItem(
    position: Position,
    operationDesignView: (functionPosition: NodePosition, filePath?: string) => void) {

    const openFunctionDesignPanel = () => {
        const functionPosition: NodePosition = {
            endColumn: position.endLine.offset,
            endLine: position.endLine.line,
            startColumn: position.startLine.offset,
            startLine: position.startLine.line
        };
        operationDesignView(functionPosition);
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <DesignViewIcon />
                <div style={{ marginLeft: '5px' }}>
                    Design Operation
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "design-operation", label: ItemWithIcon(), onClick: () => openFunctionDesignPanel() };
    return menuItem;
}

export function getEditOperationMenuItem(position: Position, functionType: FunctionType, functionPanel: any, model: any) {

    const openFunctionPanel = () => {
        if (STKindChecker.isServiceDeclaration(model)) {
            const functionPosition: NodePosition = {
                endColumn: position.endLine.offset,
                endLine: position.endLine.line,
                startColumn: position.startLine.offset,
                startLine: position.startLine.line
            };
            if (functionType === FunctionType.QUERY) {
                functionPanel(functionPosition, "GraphqlResource", getSTNodeFromRange(functionPosition, model));
            } else if (functionType === FunctionType.MUTATION) {
                functionPanel(functionPosition, "GraphqlMutation", getSTNodeFromRange(functionPosition, model));
            } else if (functionType === FunctionType.SUBSCRIPTION) {
                functionPanel(functionPosition, "GraphqlSubscription", getSTNodeFromRange(functionPosition, model));
            }
        }
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <LabelEditIcon />
                <div style={{ marginLeft: '5px' }}>
                    Edit Operation
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "edit-operation", label: ItemWithIcon(), onClick: () => openFunctionPanel() };
    return menuItem;
}

export function getDeleteOperationMenuItem(position: Position, onDelete: (position: NodePosition) => void) {

    const handleDeleteClick = () => {
        const functionPosition: NodePosition = {
            endColumn: position.endLine.offset,
            endLine: position.endLine.line,
            startColumn: position.startLine.offset,
            startLine: position.startLine.line
        };
        onDelete(functionPosition);
    };

    const ItemWithIcon = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <LabelDeleteIcon />
                <div style={{ marginLeft: '5px' }}>
                    Delete Operation
                </div>
            </div>
        )
    }

    const menuItem: Item = { id: "delete-operation", label: ItemWithIcon(), onClick: () => handleDeleteClick() };
    return menuItem;
}
