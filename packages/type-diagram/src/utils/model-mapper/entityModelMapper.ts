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

import { Member, Type, TypeFunctionModel, TypeNodeKind } from '@wso2/ballerina-core';
import { DiagramModel } from '@projectstorm/react-diagrams';
import { EntityLinkModel, EntityModel, EntityPortModel } from '../../components/entity-relationship';

function createEntityNodes(components: Type[], selectedEntityId?: string, isGraphqlRoot?: boolean): Map<string, EntityModel> {
    let entityNodes = new Map<string, EntityModel>();

    const createNode = (component: Type) => {
        let componentName = component.name;

        if (isGraphqlRoot && !component.name) {
            componentName = "Root";
        }

        const node = new EntityModel(componentName, component);
        if (selectedEntityId && componentName === selectedEntityId) {
            node.isRootEntity = true;
        }
        if (isGraphqlRoot) {
            node.isGraphqlRoot = true;
        }

        entityNodes.set(componentName, node);
    };

    components.forEach(createNode);
    return entityNodes;
}

function createEntityLinks(entityNodes: Map<string, EntityModel>): EntityLinkModel[] {
    let entityLinks: EntityLinkModel[] = [];

    entityNodes.forEach((sourceNode) => {
        const members = isNodeClass(sourceNode.entityObject?.codedata?.node) ? sourceNode.entityObject.functions : sourceNode.entityObject.members;
        if (members) {
            Object.entries(members).forEach(([_, member]: [string, Member | TypeFunctionModel]) => {
                const refs = getRefs(member);

                if (refs.length > 0) {
                    refs.forEach((ref) => {
                        const targetNode = entityNodes.get(ref);
                        if (targetNode) {
                            let sourcePort = sourceNode.getPort(`right-${sourceNode.getID()}/${member.name}`);
                            let targetPort = targetNode.getPort(`left-${ref}`);

                            const linkId = `entity-link-${sourceNode.getID()}-${ref}`;
                            let link = new EntityLinkModel(undefined, linkId); // REMOVE cardinalities
                            entityLinks.push(createLinks(sourcePort, targetPort, link));
                        }
                    });
                }
            });
        }
    });

    return entityLinks;
}

const getRefs = (member: Member | TypeFunctionModel): string[] => {
    const typeToCheck = 'returnType' in member ? member.returnType : (member as Member).type;

    if (typeof typeToCheck === 'string') {
        return member.refs || [];
    }

    // Handle type with members case
    if ('members' in typeToCheck && Array.isArray(typeToCheck.members)) {
        return typeToCheck.members.flatMap(m => getRefs(m));
    }

    // Default case - return empty array if none of the above conditions match
    return [];
};


export function isNodeClass(nodeKind: TypeNodeKind): boolean {
    return nodeKind === 'CLASS' || nodeKind === 'SERVICE_DECLARATION';
}

export function graphqlModeller(rootService: Type, refs: Type[]): DiagramModel {
    const rootNode = createEntityNodes([rootService], undefined, true);
    console.log("rootNode", rootNode);
    const entityNodes = createEntityNodes(refs);
    console.log("entityNodes", entityNodes);
    const allNodes = new Map([...rootNode, ...entityNodes]);
    const entityLinks = createEntityLinks(allNodes);
    let model = new DiagramModel();
    model.addAll(...Array.from(allNodes.values()), ...entityLinks);
    return model;
}

export function entityModeller(components: Type[], selectedEntityId?: string): DiagramModel {
    let filteredComponents = components;

    // If selectedEntityId is provided, filter for related entities
    if (selectedEntityId) {
        const relatedEntities = new Set<string>();
        relatedEntities.add(selectedEntityId);
        findRelatedEntities(selectedEntityId, components, relatedEntities);
        filteredComponents = components.filter(comp => relatedEntities.has(comp.name));
    }

    // Create nodes and links
    const entityNodes = createEntityNodes(filteredComponents, selectedEntityId);
    const entityLinks = createEntityLinks(entityNodes);

    let model = new DiagramModel();
    model.addAll(...Array.from(entityNodes.values()), ...entityLinks);
    return model;
}

function findRelatedEntities(componentId: string, components: Type[], relatedEntities: Set<string>) {
    const component = components.find(comp => comp.name === componentId);
    if (!component) return;

    const members = isNodeClass(component?.codedata?.node) ? component.functions : component.members;

    Object.values(members).forEach(member => {
        if (member.refs) {
            member.refs.forEach(ref => {
                if (!relatedEntities.has(ref)) {
                    relatedEntities.add(ref);
                    findRelatedEntities(ref, components, relatedEntities);
                }
            });
        }
    });
}

function createLinks(sourcePort: EntityPortModel, targetPort: EntityPortModel, link: EntityLinkModel): EntityLinkModel {
    link.setSourcePort(sourcePort);
    link.setTargetPort(targetPort);
    sourcePort.addLink(link);
    return link;
}

