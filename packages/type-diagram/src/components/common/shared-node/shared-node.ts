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

import { LinkModel, NodeModel, NodeModelGenerics, PortModel } from '@projectstorm/react-diagrams';
import { EntityLinkModel } from '../../entity-relationship';

export class SharedNodeModel extends NodeModel<NodeModelGenerics> {
    constructor(type: string, id: string) {
        super({
            type: type,
            id: id
        });
    }

    handleHover = (ports: PortModel[], task: string) => {
        if (ports.length > 0) {
            ports.forEach((port) => {
                const portLinks: Map<string, LinkModel> = new Map(Object.entries(port.links));
                portLinks.forEach((link) => {
                    if (link.getSourcePort().getID() === port.getID()) {
                        link.fireEvent({}, task);
                    }
                })
            })
        }
    }

    isNodeSelected = (selectedLink: EntityLinkModel, portIdentifier: string): boolean => {
        if (selectedLink) {
            if (selectedLink.getSourcePort().getNode().getID() === this.getID()) {
                let sourcePortID: string = selectedLink.getSourcePort().getID();
                return sourcePortID.slice(sourcePortID.indexOf('-') + 1) === portIdentifier;
            } else if (selectedLink.getTargetPort().getNode().getID() === this.getID()) {
                let targetPortID: string = selectedLink.getTargetPort().getID();
                return targetPortID.slice(targetPortID.indexOf('-') + 1) === portIdentifier;
            }
        }
        return false;
    }
}
