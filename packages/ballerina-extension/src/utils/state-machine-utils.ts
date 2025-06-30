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

import { DIRECTORY_MAP, FOCUS_FLOW_DIAGRAM_VIEW, HistoryEntry, MACHINE_VIEW, ProjectStructureArtifactResponse, SyntaxTreeResponse } from "@wso2/ballerina-core";
import { NodePosition, STKindChecker, STNode, traversNode } from "@wso2/syntax-tree";
import { StateMachine } from "../stateMachine";
import { Uri } from "vscode";
import { UIDGenerationVisitor } from "./history/uid-generation-visitor";
import { FindNodeByUidVisitor } from "./history/find-node-by-uid";
import { FindConstructByNameVisitor } from "./history/find-construct-by-name-visitor";
import { FindConstructByIndexVisitor } from "./history/find-construct-by-index-visitor";
import { getConstructBodyString } from "./history/util";
import { ballerinaExtInstance } from "../core";
import path from "path";

export async function getView(documentUri: string, position: NodePosition, projectUri?: string): Promise<HistoryEntry> {
    const haveTreeData = !!StateMachine.context().projectStructure;
    const isServiceClassFunction = await checkForServiceClassFunctions(documentUri, position);
    if (isServiceClassFunction || path.relative(projectUri || '', documentUri).startsWith("tests")) {
        return {
            location: {
                view: MACHINE_VIEW.BIDiagram,
                documentUri: documentUri,
                position: position
            },
            dataMapperDepth: 0
        };
    } else if (haveTreeData) {
        return getViewByArtifacts(documentUri, position, projectUri);
    }
    else {
        return await getViewBySTRange(documentUri, position, projectUri);
    }
}

async function checkForServiceClassFunctions(documentUri: string, position: NodePosition) {
    const currentProjectArtifacts = StateMachine.context().projectStructure;
    if (currentProjectArtifacts) {
        for (const dir of currentProjectArtifacts.directoryMap[DIRECTORY_MAP.TYPE]) {
            if (dir.path === documentUri && isPositionWithinBlock(position, dir.position)) {
                const req = getSTByRangeReq(documentUri, position);
                const node = await StateMachine.langClient().getSTByRange(req) as SyntaxTreeResponse;
                if (node.parseSuccess && (STKindChecker.isObjectMethodDefinition(node.syntaxTree) || STKindChecker.isResourceAccessorDefinition(node.syntaxTree))) {
                    return true;
                }
            }
        }
        return false;
    }
}

// TODO: This is not used anymore. Remove it.
async function getViewBySTRange(documentUri: string, position: NodePosition, projectUri?: string) {
    const req = getSTByRangeReq(documentUri, position);
    const node = await StateMachine.langClient().getSTByRange(req) as SyntaxTreeResponse;
    if (node.parseSuccess) {
        if (STKindChecker.isTypeDefinition(node.syntaxTree)) {
            const recordST = node.syntaxTree;
            const name = recordST.typeName?.value;
            const module = recordST.typeData?.symbol?.moduleID;
            if (!name || !module) {
                // tslint:disable-next-line
                console.error('Couldn\'t generate record nodeId to render composition view', recordST);
            } else {
                const nodeId = `${module?.orgName}/${module?.moduleName}:${module?.version}:${name}`;
                return {
                    location: {
                        view: MACHINE_VIEW.TypeDiagram,
                        documentUri: documentUri,
                        position: position,
                        identifier: name,
                        projectUri: projectUri
                    }
                };
            }
        }
        if (STKindChecker.isClassDefinition(node.syntaxTree)) {
            const classST = node.syntaxTree;
            const name = classST.className?.value;
            const module = classST.typeData?.symbol?.moduleID;
            if (!name || !module) {
                // tslint:disable-next-line
                console.error('Couldn\'t generate class nodeId to render composition view', classST);
            } else {
                return {
                    location: {
                        view: MACHINE_VIEW.TypeDiagram,
                        documentUri: documentUri,
                        position: position,
                        identifier: name,
                        projectUri: projectUri
                    }
                };
            }
        }
        if (STKindChecker.isEnumDeclaration(node.syntaxTree)) {
            const enumST = node.syntaxTree;
            const name = enumST?.identifier?.value;
            const module = enumST.typeData?.symbol?.moduleID;
            if (!name || !module) {
                // tslint:disable-next-line
                console.error('Couldn\'t generate enum nodeId to render composition view', enumST);
            } else {
                return {
                    location: {
                        view: MACHINE_VIEW.TypeDiagram,
                        documentUri: documentUri,
                        position: position,
                        identifier: name,
                        projectUri: projectUri
                    }
                };
            }
        }
        if (
            STKindChecker.isModuleVarDecl(node.syntaxTree) &&
            STKindChecker.isQualifiedNameReference(node.syntaxTree.typedBindingPattern.typeDescriptor) &&
            node.syntaxTree.typedBindingPattern.typeDescriptor.identifier.value === "Client" &&
            STKindChecker.isCaptureBindingPattern(node.syntaxTree.typedBindingPattern.bindingPattern)
        ) {
            // connection
            const connectionName = node.syntaxTree.typedBindingPattern.bindingPattern.variableName.value;
            if (!connectionName) {
                // tslint:disable-next-line
                console.error("Couldn't capture connection from STNode", { STNode: node.syntaxTree });
            } else {
                return {
                    location: {
                        view: MACHINE_VIEW.EditConnectionWizard,
                        identifier: connectionName,
                    },
                };
            }
        }

        if (STKindChecker.isListenerDeclaration(node.syntaxTree)) {
            const listenerST = node.syntaxTree;
            const variablePosition = listenerST.variableName.position;
            return {
                location: {
                    view: MACHINE_VIEW.BIListenerConfigView,
                    documentUri: documentUri,
                    position: variablePosition
                }
            };
        }

        if (STKindChecker.isServiceDeclaration(node.syntaxTree)) {
            const expr = node.syntaxTree.expressions[0];
            let haveServiceType = false;
            if (node.syntaxTree.typeDescriptor && STKindChecker.isSimpleNameReference(node.syntaxTree.typeDescriptor)) {
                haveServiceType = true;
            }
            if (expr?.typeData?.typeSymbol?.signature?.includes("graphql")) {
                return {
                    location: {
                        view: MACHINE_VIEW.GraphQLDiagram,
                        identifier: node.syntaxTree.absoluteResourcePath.map((path) => path.value).join(''),
                        documentUri: documentUri,
                        position: position,
                        projectUri: projectUri
                    }
                };
            } else {
                return {
                    location: {
                        view: MACHINE_VIEW.ServiceDesigner,
                        identifier: node.syntaxTree.absoluteResourcePath.map((path) => path.value).join(''),
                        documentUri: documentUri,
                        position: position
                    }
                };
            }
        } else if (
            STKindChecker.isFunctionDefinition(node.syntaxTree)
            && STKindChecker.isExpressionFunctionBody(node.syntaxTree.functionBody)
        ) {
            return {
                location: {
                    view: MACHINE_VIEW.DataMapper,
                    identifier: node.syntaxTree.functionName.value,
                    documentUri: documentUri,
                    position: position
                },
                dataMapperDepth: 0
            };
        } else if (
            STKindChecker.isFunctionDefinition(node.syntaxTree) &&
            node.syntaxTree.functionBody.source.includes("@np:NaturalFunction external")
        ) {
            return {
                location: {
                    view: MACHINE_VIEW.BIDiagram,
                    documentUri: documentUri,
                    position: node.syntaxTree.position,
                    focusFlowDiagramView: FOCUS_FLOW_DIAGRAM_VIEW.NP_FUNCTION,
                },
                dataMapperDepth: 0
            };
        } else if (
            STKindChecker.isFunctionDefinition(node.syntaxTree)
            || STKindChecker.isResourceAccessorDefinition(node.syntaxTree)
            || STKindChecker.isObjectMethodDefinition(node.syntaxTree)
        ) {
            return {
                location: {
                    view: MACHINE_VIEW.BIDiagram,
                    documentUri: documentUri,
                    position: node.syntaxTree.position,
                    metadata: {
                        enableSequenceDiagram: ballerinaExtInstance.enableSequenceDiagramView(),
                    }
                },
                dataMapperDepth: 0
            };
        }

        // config variables

        if (STKindChecker.isConfigurableKeyword(node.syntaxTree.qualifiers[0]) &&
            STKindChecker.isCaptureBindingPattern(node.syntaxTree.typedBindingPattern.bindingPattern)) {
            return {
                location: {
                    view: MACHINE_VIEW.EditConfigVariables,
                    documentUri: documentUri,
                    position: position
                },
            };
        }
    }

    return { location: { view: MACHINE_VIEW.Overview, documentUri: documentUri } };

}

function getViewByArtifacts(documentUri: string, position: NodePosition, projectUri?: string) {
    const currentProjectArtifacts = StateMachine.context().projectStructure;
    if (currentProjectArtifacts) {
        // Iterate through each category in the directory map
        for (const [key, directory] of Object.entries(currentProjectArtifacts.directoryMap)) {
            // Check each artifact in the category
            for (const dir of directory) {
                //  Go through the resources array if it exists
                if (dir.resources && dir.resources.length > 0) {
                    for (const resource of dir.resources) {
                        const view = findViewByArtifact(resource, position, documentUri, projectUri);
                        if (view) {
                            return view;
                        }
                    }
                }
                // Check the current directory
                const view = findViewByArtifact(dir, position, documentUri, projectUri);
                if (view) {
                    return view;
                }
            }
        }
        // If no view is found, return the overview view
        return { location: { view: MACHINE_VIEW.Overview, documentUri: documentUri } };
    }
}

function findViewByArtifact(dir: ProjectStructureArtifactResponse, position: NodePosition, documentUri: string, projectUri?: string) {
    // In windows the documentUri might contain drive letter
    const driveLetterRegex = /^[a-zA-Z]:/;
    const normalizedDocumentUri = documentUri.replace(driveLetterRegex, '');
    const normalizedDirPath = dir.path.replace(driveLetterRegex, '');
    const normalizedProjectUri = projectUri?.replace(driveLetterRegex, '');
    if (normalizedDirPath === normalizedDocumentUri && isPositionWithinRange(position, dir.position)) {
        switch (dir.type) {
            case DIRECTORY_MAP.SERVICE:
                if (dir.moduleName === "graphql") {
                    return {
                        location: {
                            view: MACHINE_VIEW.GraphQLDiagram,
                            identifier: dir.name,
                            documentUri: normalizedDocumentUri,
                            position: position,
                            projectUri: normalizedProjectUri
                        }
                    };
                } else if (dir.moduleName === "ai") {
                    return {
                        location: {
                            view: MACHINE_VIEW.BIDiagram,
                            identifier: dir.name,
                            documentUri: normalizedDocumentUri,
                            position: position,
                            projectUri: normalizedProjectUri
                        }
                    };
                } else {
                    return {
                        location: {
                            view: MACHINE_VIEW.ServiceDesigner,
                            identifier: dir.name,
                            documentUri: normalizedDocumentUri,
                            position: position
                        }
                    };
                }
            case DIRECTORY_MAP.LISTENER:
                return {
                    location: {
                        view: MACHINE_VIEW.BIListenerConfigView,
                        documentUri: normalizedDocumentUri,
                        position: dir.position,
                        identifier: dir.name,
                    }
                };
            case DIRECTORY_MAP.RESOURCE:
                return {
                    location: {
                        view: MACHINE_VIEW.BIDiagram,
                        documentUri: normalizedDocumentUri,
                        position: dir.position,
                        identifier: dir.id,
                    }
                };
            case DIRECTORY_MAP.NP_FUNCTION:
                return {
                    location: {
                        view: MACHINE_VIEW.BIDiagram,
                        documentUri: normalizedDocumentUri,
                        position: dir.position,
                        identifier: dir.name,
                        focusFlowDiagramView: FOCUS_FLOW_DIAGRAM_VIEW.NP_FUNCTION,
                    },
                    dataMapperDepth: 0
                };
            case DIRECTORY_MAP.AUTOMATION:
            case DIRECTORY_MAP.FUNCTION:
            case DIRECTORY_MAP.REMOTE:
                return {
                    location: {
                        view: MACHINE_VIEW.BIDiagram,
                        documentUri: normalizedDocumentUri,
                        identifier: dir.name,
                        position: dir.position,
                        metadata: {
                            enableSequenceDiagram: ballerinaExtInstance.enableSequenceDiagramView(),
                        }
                    },
                    dataMapperDepth: 0
                };
            case DIRECTORY_MAP.LOCAL_CONNECTORS:
            case DIRECTORY_MAP.CONNECTION:
                return {
                    location: {
                        view: MACHINE_VIEW.EditConnectionWizard,
                        identifier: dir.name,
                    },
                };
            case DIRECTORY_MAP.TYPE: // Type diagram should be shown for Type, Class, Enum, Record
                return {
                    location: {
                        view: MACHINE_VIEW.TypeDiagram,
                        documentUri: normalizedDocumentUri,
                        position: position,
                        identifier: dir.name,
                        projectUri: normalizedProjectUri
                    }
                };
            case DIRECTORY_MAP.CONFIGURABLE:
                return {
                    location: {
                        view: MACHINE_VIEW.EditConfigVariables,
                        documentUri: normalizedDocumentUri,
                        position: dir.position,
                        identifier: dir.name,
                    },
                };
            case DIRECTORY_MAP.DATA_MAPPER:
                return {
                    location: {
                        view: MACHINE_VIEW.DataMapper,
                        identifier: dir.name,
                        documentUri: normalizedDocumentUri,
                        position: position
                    },
                    dataMapperDepth: 0
                };
        }
    }
    return null;
}

function isPositionWithinRange(position: NodePosition, artifactPosition: NodePosition) {
    return position.startLine === artifactPosition.startLine && position.startColumn === artifactPosition.startColumn;
}

function isPositionWithinBlock(position: NodePosition, artifactPosition: NodePosition) {
    return position.startLine > artifactPosition.startLine && position.endLine < artifactPosition.endLine;
}

export function getComponentIdentifier(node: STNode): string {
    if (STKindChecker.isServiceDeclaration(node)) {
        return node.absoluteResourcePath.map((path) => path.value).join('');
    } else if (STKindChecker.isFunctionDefinition(node) || STKindChecker.isResourceAccessorDefinition(node)) {
        return node.functionName.value;
    }
    return '';
}

export function generateUid(position: NodePosition, fullST: STNode): string {
    const uidGenVisitor = new UIDGenerationVisitor(position);
    traversNode(fullST, uidGenVisitor);
    return uidGenVisitor.getUId();
}

export function getNodeByUid(uid: string, fullST: STNode): STNode {
    const nodeFindingVisitor = new FindNodeByUidVisitor(uid);
    traversNode(fullST, nodeFindingVisitor);
    return nodeFindingVisitor.getNode();
}

export function getNodeByName(uid: string, fullST: STNode): [STNode, string] {
    const nodeFindingVisitor = new FindConstructByNameVisitor(uid);
    traversNode(fullST, nodeFindingVisitor);
    return [nodeFindingVisitor.getNode(), nodeFindingVisitor.getUid()];
}

export function getNodeByIndex(uid: string, fullST: STNode): [STNode, string] {
    const nodeFindingVisitor = new FindConstructByIndexVisitor(uid, getConstructBodyString(fullST));
    traversNode(fullST, nodeFindingVisitor);
    return [nodeFindingVisitor.getNode(), nodeFindingVisitor.getUid()];
}

function getSTByRangeReq(documentUri: string, position: NodePosition) {
    return {
        documentIdentifier: { uri: Uri.file(documentUri).toString() },
        lineRange: {
            start: {
                line: position.startLine,
                character: position.startColumn
            },
            end: {
                line: position.endLine,
                character: position.endColumn
            }
        }
    };
}

