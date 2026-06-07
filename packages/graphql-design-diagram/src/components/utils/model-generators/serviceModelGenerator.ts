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

import { DiagramModel } from "@projectstorm/react-diagrams";

import { GraphqlBaseLinkModel } from "../../Link/BaseLink/GraphqlBaseLinkModel";
import { DefaultLinkModel } from "../../Link/DefaultLink/DefaultLinkModel";
import { GraphqlServiceLinkModel } from "../../Link/GraphqlServiceLink/GraphqlServiceLinkModel";
import { NodeCategory, NodeType } from "../../NodeFilter";
import { GraphqlDesignNode } from "../../Nodes/BaseNode/GraphqlDesignNode";
import { EnumNodeModel } from "../../Nodes/EnumNode/EnumNodeModel";
import { GraphqlServiceNodeModel, GRAPHQL_SERVICE_NODE } from "../../Nodes/GraphqlServiceNode/GraphqlServiceNodeModel";
import { HierarchicalNodeModel } from "../../Nodes/HierarchicalResourceNode/HierarchicalNodeModel";
import { InterfaceNodeModel } from "../../Nodes/InterfaceNode/InterfaceNodeModel";
import { RecordNodeModel } from "../../Nodes/RecordNode/RecordNodeModel";
import { ServiceClassNodeModel } from "../../Nodes/ServiceClassNode/ServiceClassNodeModel";
import { UnionNodeModel } from "../../Nodes/UnionNode/UnionNodeModel";
import { GraphqlNodeBasePort } from "../../Port/GraphqlNodeBasePort";
import {
    EnumComponent,
    FunctionType,
    GraphqlDesignModel,
    HierarchicalResourceComponent,
    Interaction,
    InterfaceComponent,
    RecordComponent,
    RecordField,
    RemoteFunction,
    ResourceFunction,
    Service,
    ServiceClassComponent,
    ServiceClassField,
    UnionComponent
} from "../../resources/model";
import { OperationTypes } from "../../TypeFilter";

import { diagramGeneratorForNodeFiltering, diagramGeneratorForOperationTypeFiltering } from "./filteredModelGenerator";

// all nodes in the diagram
let diagramNodes: Map<string, GraphqlDesignNode>;
// all links in the diagram
let nodeLinks: GraphqlBaseLinkModel[];

export function graphqlModelGenerator(graphqlModel: GraphqlDesignModel, typeFilter: OperationTypes, filteredNode: NodeType): DiagramModel {
    diagramNodes = new Map<string, GraphqlDesignNode>();
    nodeLinks = [];

    if (filteredNode && filteredNode.type !== NodeCategory.GRAPHQL_SERVICE) {
        diagramGeneratorForNodeFiltering(graphqlModel, filteredNode);
    } else if (typeFilter !== OperationTypes.All_Operations) {
        diagramGeneratorForOperationTypeFiltering(graphqlModel, typeFilter);
        removeUnlinkedModels();
    } else {
        // generate the graphql service node
        graphqlServiceModelMapper(graphqlModel.graphqlService);

        // generate nodes for enums
        if (graphqlModel.enums) {
            const enums: Map<string, EnumComponent> = new Map(Object.entries(graphqlModel.enums));
            enumModelMapper(enums);
        }
        if (graphqlModel.records) {
            const records: Map<string, RecordComponent> = new Map(Object.entries(graphqlModel.records));
            recordModelMapper(records);
        }
        if (graphqlModel.serviceClasses) {
            const serviceClasses: Map<string, ServiceClassComponent> = new Map(Object.entries(graphqlModel.serviceClasses));
            serviceClassModelMapper(serviceClasses);
        }
        if (graphqlModel.unions) {
            const unions: Map<string, UnionComponent> = new Map(Object.entries(graphqlModel.unions));
            unionModelMapper(unions);
        }
        if (graphqlModel.interfaces) {
            const interfaces: Map<string, InterfaceComponent> = new Map(Object.entries(graphqlModel.interfaces));
            interfaceModelMapper(interfaces);
        }
        if (graphqlModel.hierarchicalResources) {
            const hierarchicalResources: Map<string, HierarchicalResourceComponent> = new Map(Object.entries(graphqlModel.hierarchicalResources));
            hierarchicalResourceModelMapper(hierarchicalResources);
        }

        generateLinks(graphqlModel);
        removeUnlinkedModels();

    }

    const model = new DiagramModel();
    model.addAll(...Array.from(diagramNodes.values()), ...nodeLinks);
    return model;
}

export function generateDiagramNodesForFilteredNodes(updatedModel: GraphqlDesignModel) {
    if (updatedModel.enums) {
        enumModelMapper(updatedModel.enums);
    }
    if (updatedModel.records) {
        recordModelMapper(updatedModel.records);
    }
    if (updatedModel.serviceClasses) {
        serviceClassModelMapper(updatedModel.serviceClasses);
    }
    if (updatedModel.unions) {
        unionModelMapper(updatedModel.unions);
    }
    if (updatedModel.interfaces) {
        interfaceModelMapper(updatedModel.interfaces);
    }
    if (updatedModel.hierarchicalResources) {
        hierarchicalResourceModelMapper(updatedModel.hierarchicalResources);
    }
    return updatedModel;
}

export function updatedGraphqlModel(graphqlModel: GraphqlDesignModel, typeFilter: OperationTypes): GraphqlDesignModel {
    let updatedModel: GraphqlDesignModel = { ...graphqlModel };

    updatedModel.graphqlService = filterFromOperationType(typeFilter, graphqlModel.graphqlService);

    // get the list of types of resource and remote functions
    const linkedNodeList: string[] = getTypesOfRootNodeFunctions(updatedModel);

    // get the interactions of the current linkedNodeList
    const updatedNodeList = getRelatedNodes(graphqlModel, linkedNodeList);

    updatedModel = createFilteredNodeModel(updatedNodeList, graphqlModel, updatedModel);
    return updatedModel;
}

export function createFilteredNodeModel(updatedNodeList: string[], graphqlModel: GraphqlDesignModel, updatedModel: GraphqlDesignModel) {
    // iterate with the current model and obtain only the ones with the updatedNodeList
    const unionMap = new Map<string, UnionComponent>();
    const enumMap = new Map<string, EnumComponent>();
    const recordMap = new Map<string, RecordComponent>();
    const serviceClassMap = new Map<string, ServiceClassComponent>();
    const interfaceMap = new Map<string, InterfaceComponent>();
    const hierarchicalResourceMap = new Map<string, HierarchicalResourceComponent>();

    updatedNodeList.forEach((type) => {
        if (Object.keys(graphqlModel.records).includes(type)) {
            if (!recordMap.has(type)) {
                recordMap.set(type, new Map(Object.entries(graphqlModel.records)).get(type));
            }
        } else if (Object.keys(graphqlModel.serviceClasses).includes(type)) {
            if (!serviceClassMap.has(type)) {
                serviceClassMap.set(type, new Map(Object.entries(graphqlModel.serviceClasses)).get(type));
            }
        } else if (Object.keys(graphqlModel.unions).includes(type)) {
            if (!unionMap.has(type)) {
                unionMap.set(type, new Map(Object.entries(graphqlModel.unions)).get(type));
            }
        } else if (Object.keys(graphqlModel.enums).includes(type)) {
            if (!enumMap.has(type)) {
                enumMap.set(type, new Map(Object.entries(graphqlModel.enums)).get(type));
            }
        } else if (Object.keys(graphqlModel.interfaces).includes(type)) {
            if (!interfaceMap.has(type)) {
                interfaceMap.set(type, new Map(Object.entries(graphqlModel.interfaces)).get(type));
            }
        } else if (Object.keys(graphqlModel.hierarchicalResources).includes(type)) {
            if (!hierarchicalResourceMap.has(type)) {
                hierarchicalResourceMap.set(type, new Map(Object.entries(graphqlModel.hierarchicalResources)).get(type));
            }
        }
    });

    updatedModel.unions = unionMap;
    updatedModel.enums = enumMap;
    updatedModel.records = recordMap;
    updatedModel.serviceClasses = serviceClassMap;
    updatedModel.interfaces = interfaceMap;
    updatedModel.hierarchicalResources = hierarchicalResourceMap;

    return updatedModel;
}

function getTypesOfRootNodeFunctions(updatedModel: GraphqlDesignModel) {
    const typeList: string[] = [];
    for (const functions of [updatedModel.graphqlService.resourceFunctions, updatedModel.graphqlService.remoteFunctions]) {
        functions.forEach((func) => {
            func.interactions.forEach((interaction) => {
                if (!typeList.includes(interaction.componentName)) {
                    typeList.push(interaction.componentName);
                }
            });
        });
    }
    return typeList;
}

export function getRelatedNodes(graphqlModel: GraphqlDesignModel, typeList: string[]) {
    typeList.forEach((type) => {
        if (Object.keys(graphqlModel.records).includes(type)) {
            Object.values(graphqlModel.records).forEach((record: RecordComponent) => {
                if (record.name === type && !record.isInputObject) {
                    record.recordFields.forEach((field: RecordField) => {
                        field.interactions.forEach((interaction) => {
                            if (!typeList.includes(interaction.componentName)) {
                                typeList.push(interaction.componentName);
                                getRelatedNodes(graphqlModel, typeList);
                            }
                        });
                    });
                }
            });
        }
        if (Object.keys(graphqlModel.serviceClasses).includes(type)) {
            Object.values(graphqlModel.serviceClasses).forEach((serviceClass: ServiceClassComponent) => {
                if (serviceClass.serviceName === type) {
                    serviceClass.functions.forEach((func: ServiceClassField) => {
                        func.interactions.forEach((interaction) => {
                            if (!typeList.includes(interaction.componentName)) {
                                typeList.push(interaction.componentName);
                                getRelatedNodes(graphqlModel, typeList);
                            }
                        });
                    });
                }
            });
        }
        if (Object.keys(graphqlModel.unions).includes(type)) {
            Object.values(graphqlModel.unions).forEach((union: UnionComponent) => {
                if (union.name === type) {
                    union.possibleTypes.forEach((possibleType) => {
                        if (!typeList.includes(possibleType.componentName)) {
                            typeList.push(possibleType.componentName);
                            getRelatedNodes(graphqlModel, typeList);
                        }
                    });
                }
            });
        }
        if (Object.keys(graphqlModel.interfaces).includes(type)) {
            Object.values(graphqlModel.interfaces).forEach((interfaceComp: InterfaceComponent) => {
                if (interfaceComp.name === type) {
                    interfaceComp.possibleTypes.forEach((interaction: Interaction) => {
                        if (!typeList.includes(interaction.componentName)) {
                            typeList.push(interaction.componentName);
                            getRelatedNodes(graphqlModel, typeList);
                        }
                    });
                }
            });
        }
        if (Object.keys(graphqlModel.hierarchicalResources).includes(type)) {
            Object.values(graphqlModel.hierarchicalResources).forEach((hierarchicalResource: HierarchicalResourceComponent) => {
                if (hierarchicalResource.name === type) {
                    hierarchicalResource.hierarchicalResources.forEach((resourceFunction: ResourceFunction) => {
                        resourceFunction.interactions.forEach((interaction) => {
                            if (!typeList.includes(interaction.componentName)) {
                                typeList.push(interaction.componentName);
                                getRelatedNodes(graphqlModel, typeList);
                            }
                        });
                    });
                }
            });
        }
    });

    return typeList;
}


function removeUnlinkedModels() {
    diagramNodes.forEach((node, key) => {
        if (node.getType() !== GRAPHQL_SERVICE_NODE) {
            let isLinked = false;
            for (const [, value] of Object.entries(node.getPorts())) {
                if (Object.keys(value.getLinks()).length !== 0) {
                    isLinked = true;
                    break;
                }
            }
            if (!isLinked) {
                diagramNodes.delete(key);
            }
        }
    });
}

export function graphqlServiceModelMapper(service: Service) {
    const serviceNode: GraphqlServiceNodeModel = new GraphqlServiceNodeModel(service);
    diagramNodes.set(service.serviceName, serviceNode);
}

function filterFromOperationType(operationType: OperationTypes, service: Service) {
    const filteredResourceFunctions: ResourceFunction[] = [];
    let filteredRemoteFunctions: RemoteFunction[] = [];
    if (operationType.valueOf() === OperationTypes.Queries.valueOf()) {
        service.resourceFunctions.forEach((resourceFunction) => {
            if (!resourceFunction.subscription) {
                filteredResourceFunctions.push(resourceFunction);
            }
        });
    } else if (operationType === OperationTypes.Mutations) {
        filteredRemoteFunctions = service.remoteFunctions;
    } else if (operationType === OperationTypes.Subscriptions) {
        service.resourceFunctions.forEach((resourceFunction) => {
            if (resourceFunction.subscription) {
                filteredResourceFunctions.push(resourceFunction);
            }
        });
    }
    const newService: Service = {
        ...service,
        resourceFunctions: filteredResourceFunctions,
        remoteFunctions: filteredRemoteFunctions
    };
    return newService;
}

function enumModelMapper(enums: Map<string, EnumComponent>) {
    enums.forEach((enumObj, key) => {
        const enumNode = new EnumNodeModel(enumObj);
        diagramNodes.set(key, enumNode);
    });
}

function recordModelMapper(records: Map<string, RecordComponent>) {
    records.forEach((recordObj, key) => {
        if (!recordObj.isInputObject) {
            const recordNode = new RecordNodeModel(recordObj);
            diagramNodes.set(key, recordNode);
        }
    });
}

function serviceClassModelMapper(classes: Map<string, ServiceClassComponent>) {
    classes.forEach((classObj, key) => {
        const serviceClass = new ServiceClassNodeModel(classObj);
        diagramNodes.set(key, serviceClass);
    });
}

function unionModelMapper(unions: Map<string, UnionComponent>) {
    unions.forEach((unionObj, key) => {
        const unionType = new UnionNodeModel(unionObj);
        diagramNodes.set(key, unionType);
    });
}

function interfaceModelMapper(interfaces: Map<string, InterfaceComponent>) {
    interfaces.forEach((interfaceObj, key) => {
        const interfaceType = new InterfaceNodeModel(interfaceObj);
        diagramNodes.set(key, interfaceType);
    });
}

function hierarchicalResourceModelMapper(hierarchicalResources: Map<string, HierarchicalResourceComponent>) {
    hierarchicalResources.forEach((hierarchicalResourceObj, key) => {
        const hierarchicalResource = new HierarchicalNodeModel(hierarchicalResourceObj);
        diagramNodes.set(key, hierarchicalResource);
    });
}

function generateLinks(graphqlModel: GraphqlDesignModel) {
    // create links for graphqlService
    generateLinksForGraphqlService(graphqlModel.graphqlService);

    if (graphqlModel.unions) {
        const unions: Map<string, UnionComponent> = new Map(Object.entries(graphqlModel.unions));
        generateLinksForUnions(unions);
    }
    if (graphqlModel.interfaces) {
        const interfaces: Map<string, InterfaceComponent> = new Map(Object.entries(graphqlModel.interfaces));
        generateLinksForInterfaces(interfaces);
    }
    if (graphqlModel.records) {
        const records: Map<string, RecordComponent> = new Map(Object.entries(graphqlModel.records));
        generateLinksForRecords(records);
    }
    if (graphqlModel.serviceClasses) {
        const serviceClasses: Map<string, ServiceClassComponent> = new Map(Object.entries(graphqlModel.serviceClasses));
        generateLinksForServiceClasses(serviceClasses);
    }
    if (graphqlModel.hierarchicalResources) {
        const hierarchicalResources: Map<string, HierarchicalResourceComponent> = new Map(Object.entries(graphqlModel.hierarchicalResources));
        generateLinksForHierarchicalResources(hierarchicalResources);
    }
}


export function generateLinksForFilteredNodes(graphqlModel: GraphqlDesignModel) {
    generateLinksForGraphqlService(graphqlModel.graphqlService);
    generateLinksForSupportingNodes(graphqlModel);
}

export function generateLinksForSupportingNodes(graphqlModel: GraphqlDesignModel) {
    if (graphqlModel.unions) {
        generateLinksForUnions(graphqlModel.unions);
    }
    if (graphqlModel.interfaces) {
        generateLinksForInterfaces(graphqlModel.interfaces);
    }
    if (graphqlModel.records) {
        generateLinksForRecords(graphqlModel.records);
    }
    if (graphqlModel.serviceClasses) {
        generateLinksForServiceClasses(graphqlModel.serviceClasses);
    }
    if (graphqlModel.hierarchicalResources) {
        generateLinksForHierarchicalResources(graphqlModel.hierarchicalResources);
    }
}

function generateLinksForGraphqlService(service: Service) {
    const sourceNode: GraphqlDesignNode = diagramNodes.get(service.serviceName);
    if (service.resourceFunctions) {
        service.resourceFunctions.forEach(resource => {
            mapFunctionInteraction(sourceNode, resource, FunctionType.QUERY);
        });
    }
    if (service.remoteFunctions) {
        service.remoteFunctions.forEach(remote => {
            mapFunctionInteraction(sourceNode, remote, FunctionType.MUTATION);
        });
    }
}

function generateLinksForUnions(unions: Map<string, UnionComponent>) {
    unions.forEach(union => {
        union.possibleTypes.forEach(interaction => {
            if (diagramNodes.has(interaction.componentName)) {
                const targetNode: GraphqlDesignNode = diagramNodes.get(interaction.componentName);
                if (targetNode) {
                    const sourceNode: GraphqlDesignNode = diagramNodes.get(union.name);
                    const link: GraphqlBaseLinkModel = setPossibleTypeLinks(sourceNode, targetNode, interaction);
                    nodeLinks.push(link);
                }
            }
        })
    })
}

function generateLinksForInterfaces(interfaces: Map<string, InterfaceComponent>) {
    interfaces.forEach(interfaceObj => {
        interfaceObj.possibleTypes.forEach(interaction => {
            if (diagramNodes.has(interaction.componentName)) {
                const targetNode: GraphqlDesignNode = diagramNodes.get(interaction.componentName);
                if (targetNode) {
                    const sourceNode: GraphqlDesignNode = diagramNodes.get(interfaceObj.name);
                    const link: GraphqlBaseLinkModel = setPossibleTypeLinks(sourceNode, targetNode, interaction);
                    nodeLinks.push(link);
                }
            }
        })
    })
}

function generateLinksForRecords(records: Map<string, RecordComponent>) {
    records.forEach(record => {
        if (!record.isInputObject) {
            record.recordFields.forEach(field => {
                field.interactions.forEach(interaction => {
                    if (diagramNodes.has(interaction.componentName)) {
                        const targetNode: GraphqlDesignNode = diagramNodes.get(interaction.componentName);
                        if (targetNode) {
                            const sourceNode: GraphqlDesignNode = diagramNodes.get(record.name);
                            const sourcePortId = field.name;
                            const link: GraphqlBaseLinkModel = setInteractionLinks(sourceNode, sourcePortId, targetNode, interaction);
                            nodeLinks.push(link);
                        }
                    }
                })
            })
        }
    })
}

function generateLinksForServiceClasses(serviceClasses: Map<string, ServiceClassComponent>) {
    serviceClasses.forEach(serviceClass => {
        serviceClass.functions.forEach(func => {
            func.interactions.forEach(interaction => {
                if (diagramNodes.has(interaction.componentName)) {
                    const targetNode: GraphqlDesignNode = diagramNodes.get(interaction.componentName);
                    if (targetNode) {
                        const sourceNode: GraphqlDesignNode = diagramNodes.get(serviceClass.serviceName);
                        const sourcePortId = func.identifier;
                        const link: GraphqlBaseLinkModel = setInteractionLinks(sourceNode, sourcePortId, targetNode, interaction);
                        nodeLinks.push(link);
                    }
                }
            })
        })
    })
}

function generateLinksForHierarchicalResources(hierarchicalResources: Map<string, HierarchicalResourceComponent>) {
    hierarchicalResources.forEach(resource => {
        resource.hierarchicalResources.forEach(hierrarchicalResource => {
            hierrarchicalResource.interactions.forEach(interaction => {
                if (diagramNodes.has(interaction.componentName)) {
                    const targetNode: GraphqlDesignNode = diagramNodes.get(interaction.componentName);
                    if (targetNode) {
                        const sourceNode: GraphqlDesignNode = diagramNodes.get(resource.name);
                        const sourcePortId = hierrarchicalResource.identifier;
                        const link: GraphqlBaseLinkModel = setInteractionLinks(sourceNode, sourcePortId, targetNode, interaction);
                        nodeLinks.push(link);
                    }
                }
            })
        })
    })
}

function setInteractionLinks(sourceNode: GraphqlDesignNode, sourcePortId: string, targetNode: GraphqlDesignNode, interaction: Interaction) {
    const sourcePort = sourceNode.getPortFromID(`right-${sourcePortId}`);
    const targetPort = targetNode.getPortFromID(`left-${interaction.componentName}`);
    if (sourcePort && targetPort) {
        const link: DefaultLinkModel = new DefaultLinkModel();
        return createLink(sourcePort, targetPort, link);
    }
}

function setPossibleTypeLinks(sourceNode: GraphqlDesignNode, targetNode: GraphqlDesignNode, interaction: Interaction) {
    const unionComponent = interaction.componentName;
    const sourcePort = sourceNode.getPortFromID(`right-${unionComponent}`);
    const targetPort = targetNode.getPortFromID(`left-${unionComponent}`);
    if (sourcePort && targetPort) {
        const link: DefaultLinkModel = new DefaultLinkModel();
        return createLink(sourcePort, targetPort, link);
    }
}

function mapFunctionInteraction(sourceNode: GraphqlDesignNode, func: ResourceFunction | RemoteFunction, functionType: FunctionType) {
    func.interactions.forEach(interaction => {
        if (diagramNodes.has(interaction.componentName)) {
            const targetNode: GraphqlDesignNode = diagramNodes.get(interaction.componentName);
            if (targetNode) {
                const link: GraphqlBaseLinkModel = setGraphqlServiceLinks(sourceNode, targetNode, func, functionType, interaction);
                nodeLinks.push(link);
            }
        }
    });
}

function setGraphqlServiceLinks(sourceNode: GraphqlDesignNode, targetNode: GraphqlDesignNode,
                                func: ResourceFunction | RemoteFunction, functionType: FunctionType, interaction?: Interaction) {
    let sourcePort: GraphqlNodeBasePort;
    let targetPort: GraphqlNodeBasePort;

    const compName = interaction.componentName;
    const sourcePortID = func.identifier;

    sourcePort = sourceNode.getPortFromID(`right-${sourcePortID}`);
    targetPort = targetNode.getPortFromID(`left-${compName}`);
    if (sourcePort && targetPort) {
        const link: GraphqlServiceLinkModel = new GraphqlServiceLinkModel(functionType);
        return createLink(sourcePort, targetPort, link);
    }
}

function createLink(sourcePort: GraphqlNodeBasePort, targetPort: GraphqlNodeBasePort, link: GraphqlBaseLinkModel) {
    link.setSourcePort(sourcePort);
    link.setTargetPort(targetPort);
    sourcePort.addLink(link);
    return link;
}
