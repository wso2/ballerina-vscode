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
import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { URI } from "vscode-uri";
import { BallerinaProjectComponents } from "@wso2/ballerina-core";
import { LangClientRpcClient } from '@wso2/ballerina-rpc-client';
import {
	DiagramModel,
    DiagramModelGenerics
} from "@projectstorm/react-diagrams";
import { DataMapperNodeModel } from '../Diagram/Node/commons/DataMapperNode';
import { getErrorKind } from '../Diagram/utils/dm-utils';
import { OverlayLayerModel } from '../Diagram/OverlayLayer/OverlayLayerModel';
import { ErrorNodeKind } from '../DataMapper/Error/RenderingError';
import { useDMSearchStore, useDMStore } from '../../store/store';
import { ListConstructorNode, MappingConstructorNode, PrimitiveTypeNode, QueryExpressionNode, RequiredParamNode } from '../Diagram/Node';
import {
    GAP_BETWEEN_MAPPING_HEADER_NODE_AND_INPUT_NODE,
    GAP_BETWEEN_INPUT_NODES,
    IO_NODE_DEFAULT_WIDTH,
    OFFSETS,
    VISUALIZER_PADDING
} from '../Diagram/utils/constants';
import { FromClauseNode } from '../Diagram/Node/FromClause';
import { UnionTypeNode } from '../Diagram/Node/UnionType';
import { UnsupportedExprNodeKind, UnsupportedIONode } from '../Diagram/Node/UnsupportedIO';
import { LinkConnectorNode } from '../Diagram/Node/LinkConnector';
import { LetClauseNode } from '../Diagram/Node/LetClause';
import { JoinClauseNode } from '../Diagram/Node/JoinClause';
import { LetExpressionNode } from '../Diagram/Node/LetExpression';
import { ModuleVariableNode } from '../Diagram/Node/ModuleVariable';
import { EnumTypeNode } from '../Diagram/Node/EnumType';
import { ExpandedMappingHeaderNode } from '../Diagram/Node/ExpandedMappingHeader';
import { isDMSupported } from '../DataMapper/utils';
import { FunctionDefinition, ModulePart } from '@wso2/syntax-tree';
import {
    getExpandedMappingHeaderNodeHeight,
    getFieldCountMismatchIndex,
    getIONodeHeight,
    hasSameIntermediateClauses,
    isSameView
} from '../Diagram/utils/diagram-utils';
import { isInputNode, isOutputNode } from '../Diagram/Actions/utils';
import { createImportReferenceMap } from '../Diagram/utils/import-utils';

export const useProjectComponents = (langServerRpcClient: LangClientRpcClient, fileName: string, fnSrc: string): {
    projectComponents: BallerinaProjectComponents;
    isFetching: boolean;
    isError: boolean;
    refetch: any;
} => {
    const fetchProjectComponents = async () => {
        try {
            const componentResponse = await langServerRpcClient.getBallerinaProjectComponents({
                documentIdentifiers: [
                    {
                        uri: URI.file(fileName).toString(),
                    }
                ]
            })
            return componentResponse;
        } catch (networkError: any) {
            console.error('Error while fetching project components', networkError);
        }
    };

    const {
        data: projectComponents,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['fetchProjectComponents', {fnSrc}], 
        queryFn: () => fetchProjectComponents(),
        networkMode: 'always',
    });

    return { projectComponents, isFetching, isError, refetch };
};

export const useDiagramModel = (
    nodes: DataMapperNodeModel[],
    diagramModel: DiagramModel,
    onError:(kind: ErrorNodeKind) => void,
    zoomLevel: number,
    screenWidth: number,
): {
    updatedModel: DiagramModel<DiagramModelGenerics>;
    isFetching: boolean;
    isError: boolean;
    refetch: any;
} => {
    const offSetX = diagramModel.getOffsetX();
    const offSetY = diagramModel.getOffsetY();
    const noOfNodes = nodes.length;
    const context = nodes.find(node => node.context)?.context;
	const fnSource = context ? context.selection.selectedST.stNode.source : undefined;
    const fieldPath = context?.selection.selectedST.fieldPath;
    const queryExprPosition = context?.selection.selectedST?.position;
    const collapsedFields = context?.collapsedFields;
    const { inputSearch, outputSearch } = useDMSearchStore();
    const prevScreenWidth = useRef(screenWidth);

    const genModel = async () => {
        if (prevScreenWidth.current !== screenWidth && diagramModel.getNodes().length > 0) {
            const diagModelNodes = diagramModel.getNodes() as DataMapperNodeModel[];
            diagModelNodes.forEach(diagModelNode => {
                const repositionedNode = nodes.find(newNode => isOutputNode(newNode) && newNode.id === diagModelNode.id);
                if (repositionedNode) {
                    diagModelNode.setPosition(repositionedNode.getX(), repositionedNode.getY());
                }
            });
            diagramModel.setZoomLevel(zoomLevel);
            diagramModel.setOffset(offSetX, offSetY);
            prevScreenWidth.current = screenWidth;
            return diagramModel;
        }
        const newModel = new DiagramModel();
        newModel.setZoomLevel(zoomLevel);
        newModel.setOffset(offSetX, offSetY);
        const showInputFilterEmpty = !nodes.some(
            node => (node instanceof RequiredParamNode && node.getSearchFilteredType()) || node instanceof FromClauseNode
        );
        if (showInputFilterEmpty) {
            const inputSearchNotFoundNode = new RequiredParamNode(undefined, undefined, undefined, true);
            inputSearchNotFoundNode.setPosition(OFFSETS.SOURCE_NODE.X, OFFSETS.SOURCE_NODE.Y);
            newModel.addNode(inputSearchNotFoundNode);
        }
        newModel.addAll(...nodes);
        for (const node of nodes) {
            const existingNode = diagramModel.getNodes().find(n => (n as DataMapperNodeModel).id === node.id);
            const sameView = isSameView(node, existingNode as DataMapperNodeModel);
            if (sameView && existingNode && existingNode.getY() !== 0) {
                node.setPosition(existingNode.getX(), existingNode.getY());
            }
        }
        for (const node of nodes) {
            try {
                if (node instanceof RequiredParamNode && !node.getSearchFilteredType()) {
                    newModel.removeNode(node);
                    continue;
                }
                node.setModel(newModel);
                await node.initPorts();
                if (node instanceof LinkConnectorNode || node instanceof QueryExpressionNode) {
                    continue;
                }
                node.initLinks();
            } catch (e) {
                const errorNodeKind = getErrorKind(node);
                console.log(e);
                onError(errorNodeKind);
            }
        }
        newModel.setLocked(true);
        newModel.addLayer(new OverlayLayerModel());
        return newModel;
    };

    const {
        data: updatedModel,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['genModel', {fnSource, fieldPath, queryExprPosition, noOfNodes, inputSearch, outputSearch, collapsedFields, screenWidth}], 
        queryFn: () => genModel(), 
        networkMode: 'always',
    });

    return { updatedModel, isFetching, isError, refetch };
};

export const useRepositionedNodes = (nodes: DataMapperNodeModel[], zoomLevel: number, diagramModel: DiagramModel) => {
    const nodesClone = [...nodes];
    const prevNodes = diagramModel.getNodes() as DataMapperNodeModel[];
    const filtersUnchanged = hasSameIntermediateClauses(nodesClone, prevNodes);
    const fieldCountMismatchIndex = getFieldCountMismatchIndex(nodesClone, prevNodes);

    let prevBottomY = 0;

    nodesClone.forEach((node, index) => {
        const existingNode = prevNodes.find(prevNode => prevNode.id === node.id);
        const sameView = isSameView(node, existingNode);

        if (node instanceof MappingConstructorNode
            || node instanceof ListConstructorNode
            || node instanceof PrimitiveTypeNode
            || node instanceof UnionTypeNode
            || (node instanceof UnsupportedIONode && node.kind === UnsupportedExprNodeKind.Output)
        ) {
            const x = (window.innerWidth - VISUALIZER_PADDING) * (100 / zoomLevel) - IO_NODE_DEFAULT_WIDTH;
            const y = existingNode && sameView && existingNode.getY() !== 0 ? existingNode.getY() : 0;
            node.setPosition(x, y);
        }
        if (node instanceof RequiredParamNode
            || node instanceof LetClauseNode
            || node instanceof JoinClauseNode
            || node instanceof LetExpressionNode
            || node instanceof ModuleVariableNode
            || node instanceof EnumTypeNode
            || node instanceof ExpandedMappingHeaderNode
        ) {
            const x = OFFSETS.SOURCE_NODE.X;
            const computedY = prevBottomY + (prevBottomY ? GAP_BETWEEN_INPUT_NODES : 0);
            const utilizeExistingY = existingNode
                && sameView
                && filtersUnchanged
                && existingNode.getY() !== 0
                && !(node instanceof LetExpressionNode)
                && (fieldCountMismatchIndex === -1 || index <= fieldCountMismatchIndex);

            let y = utilizeExistingY ? existingNode.getY() : computedY;

            node.setPosition(x, y);

            if (node instanceof RequiredParamNode) {
                const nodeHeight = getIONodeHeight(node.numberOfFields);
                prevBottomY = y + nodeHeight;
            } else if (node instanceof ExpandedMappingHeaderNode) {
                const nodeHeight = getExpandedMappingHeaderNodeHeight(node);
                prevBottomY = y + (nodeHeight * (100/zoomLevel)) + GAP_BETWEEN_MAPPING_HEADER_NODE_AND_INPUT_NODE;
            } else if (node instanceof LetClauseNode || node instanceof JoinClauseNode) {
                const nodeHeight = getIONodeHeight(node.numberOfFields);
                prevBottomY = y + (nodeHeight * (100/zoomLevel)) + GAP_BETWEEN_INPUT_NODES;
            }
        }
        if (node instanceof FromClauseNode) {
            const x = OFFSETS.SOURCE_NODE.X;
            const computedY = prevBottomY + (prevBottomY ? GAP_BETWEEN_INPUT_NODES : 0);
            let y = existingNode && sameView && filtersUnchanged && existingNode.getY() !== 0 ? existingNode.getY() : computedY;

            node.setPosition(x, y);
            const nodeHeight = getIONodeHeight(node.numberOfFields);
            prevBottomY = computedY + nodeHeight;
        }
    });

    return nodesClone;
}

export const useDMMetaData = (langServerRpcClient: LangClientRpcClient): {
    ballerinaVersion: string;
    dMSupported: boolean;
    dMUnsupportedMessage: string;
    isFetching: boolean;
    isError: boolean;
    refetch: any;
} => {
    const fetchDMMetaData = async () => {
        try {
            const ballerinaVersion = (await langServerRpcClient.getBallerinaVersion()).version;
            const dMSupported = isDMSupported(ballerinaVersion);
            const dMUnsupportedMessage = `The current ballerina version ${ballerinaVersion.replace(
                "(swan lake)", "").trim()
            } does not support the Data Mapper feature. Please update your Ballerina versions to 2201.1.2, 2201.2.1, or higher version.`;
            return { ballerinaVersion, dMSupported, dMUnsupportedMessage };
        } catch (networkError: any) {
            console.error('Error while fetching ballerina version', networkError);
        }
    };

    const {
        data: { ballerinaVersion, dMSupported, dMUnsupportedMessage } = {},
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['fetchDMMetaData'], 
        queryFn: () => fetchDMMetaData(), 
        networkMode: 'always'
    });

    return { ballerinaVersion, dMSupported, dMUnsupportedMessage, isFetching, isError, refetch };
};

export const useFileContent = (langServerRpcClient: LangClientRpcClient, filePath: string, fnST: FunctionDefinition): {
    content: [string, string[]];
    isFetching: boolean;
    isError: boolean;
    refetch: any;
} => {
    const { source, position } = fnST;
    const dmStore = useDMStore();
    const fetchContent = async () : Promise<[string, string[]]> => {
        const importStatements: string[] = [];
        try {
            const fullST = await langServerRpcClient.getST({
                documentIdentifier: { uri: URI.file(filePath).toString() }
            });
            const modulePart = fullST.syntaxTree as ModulePart;
            modulePart?.imports.map((importDeclaration: any) => {
                const src = importDeclaration.source.trim();
                const match = src.match(/\bimport\s+[^\s;]+(?:\s+as\s+\w+)?\s*;/);
                if (match) {
                    importStatements.push(match[0]);
                }
            });
            dmStore.setImports(importStatements);
            dmStore.setImportReferenceMap(createImportReferenceMap(importStatements));
            return [modulePart.source, importStatements];
        } catch (networkError: any) {
            console.error('Error while fetching content', networkError);
        }
    };

    const {
        data: content,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['fetchFileContent', { filePath, source, position }], 
        queryFn: () => fetchContent(), 
        networkMode: 'always'
    });

    return { content, isFetching, isError, refetch };
};

export const useSearchScrollReset = (
    diagramModel: DiagramModel<DiagramModelGenerics>
) => {
    const { inputSearch, outputSearch } = useDMSearchStore();
    const prevInSearchTermRef = useRef<string>("");
    const prevOutSearchTermRef = useRef<string>("");

    useEffect(() => {
        const nodes = diagramModel.getNodes() as DataMapperNodeModel[];
        const inputNode = nodes.find((node) => (isInputNode(node) && !(node instanceof LetExpressionNode)));
        const letExpressionNode = nodes.find((node) => (node instanceof LetExpressionNode));
        const outputNode = nodes.find(isOutputNode);

        if (inputNode && prevInSearchTermRef.current != inputSearch) {
            inputNode.setPosition(inputNode.getX(), 0);
            letExpressionNode?.setPosition(letExpressionNode.getX(), inputNode.height + GAP_BETWEEN_INPUT_NODES);
            prevInSearchTermRef.current = inputSearch;
        }

        if (outputNode && prevOutSearchTermRef.current != outputSearch) {
            outputNode.setPosition(outputNode.getX(), 0);
            prevOutSearchTermRef.current = outputSearch;
        }

    }, [diagramModel]);
}
