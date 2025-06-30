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
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperLinkModel } from "../../Link";
import { IntermediatePortModel, InputOutputPortModel } from "../../Port";
import { OFFSETS } from "../../utils/constants";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { ObjectOutputNode } from "../ObjectOutput";
import { findInputNode } from "../../utils/node-utils";
import { getInputPort, getOutputPort } from "../../utils/port-utils";
import { IDMDiagnostic, Mapping } from "@wso2/ballerina-core";
import { getTargetPortPrefix } from "../../utils/port-utils";
import { ArrayOutputNode } from "../ArrayOutput";
import { removeMapping } from "../../utils/modification-utils";

export const LINK_CONNECTOR_NODE_TYPE = "link-connector-node";
const NODE_ID = "link-connector-node";

export class LinkConnectorNode extends DataMapperNodeModel {

    public sourcePorts: InputOutputPortModel[] = [];
    public targetPort: InputOutputPortModel;
    public targetMappedPort: InputOutputPortModel;

    public inPort: IntermediatePortModel;
    public outPort: IntermediatePortModel;

    public value: string;
    public diagnostics: IDMDiagnostic[];
    public hidden: boolean;
    public hasInitialized: boolean;
    public label: string;

    constructor(
        public context: IDataMapperContext,
        public mapping: Mapping
    ) {
        super(
            NODE_ID,
            context,
            LINK_CONNECTOR_NODE_TYPE
        );

        this.value = mapping.expression;
        this.diagnostics = mapping.diagnostics;
    }

    initPorts(): void {
        const prevSourcePorts = this.sourcePorts;
        this.sourcePorts = [];
        this.targetMappedPort = undefined;
        this.inPort = new IntermediatePortModel(`${this.mapping.inputs.join('_')}_${this.mapping.output}_IN`, "IN");
        this.outPort = new IntermediatePortModel(`${this.mapping.inputs.join('_')}_${this.mapping.output}_OUT`, "OUT");
        this.addPort(this.inPort);
        this.addPort(this.outPort);

        this.mapping.inputs.forEach((field) => {
            const inputNode = findInputNode(field, this);
            if (inputNode) {
                const inputPort = getInputPort(inputNode, field.replace(/\.\d+/g, ''));
                if (!this.sourcePorts.some(port => port.getID() === inputPort.getID())) {
                    this.sourcePorts.push(inputPort);
                }
            }
        })

        if (this.outPort) {
            this.getModel().getNodes().map((node) => {
    
                if (node instanceof ObjectOutputNode || node instanceof ArrayOutputNode) {
                    const targetPortPrefix = getTargetPortPrefix(node);

                    this.targetPort = node.getPort(`${targetPortPrefix}.${this.mapping.output}.IN`) as InputOutputPortModel;
                    this.targetMappedPort = this.targetPort;

                    [this.targetPort, this.targetMappedPort] = getOutputPort(node, this.mapping.output);
                    const previouslyHidden = this.hidden;
                    this.hidden = this.targetMappedPort?.portName !== this.targetPort?.portName;
                    if (this.hidden !== previouslyHidden
                        || (prevSourcePorts.length !== this.sourcePorts.length
                            || prevSourcePorts.map(port => port.getID()).join('')
                                !== this.sourcePorts.map(port => port.getID()).join('')))
                    {
                        this.hasInitialized = false;
                    }
                }
            });
        }
    }

    initLinks(): void {
        if (this.hasInitialized) {
            return;
        }
        if (this.hidden) {
            if (this.targetMappedPort) {
                this.sourcePorts.forEach((sourcePort) => {
                    const inPort = this.targetMappedPort;
                    const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);

                    sourcePort.addLinkedPort(this.targetMappedPort);

                    lm.setTargetPort(this.targetMappedPort);
                    lm.setSourcePort(sourcePort);
                    lm.registerListener({
                        selectionChanged(event) {
                            if (event.isSelected) {
                                inPort.fireEvent({}, "link-selected");
                                sourcePort.fireEvent({}, "link-selected");
                            } else {
                                inPort.fireEvent({}, "link-unselected");
                                sourcePort.fireEvent({}, "link-unselected");
                            }
                        },
                    })
                    this.getModel().addAll(lm as any);

                    if (!this.label) {
                        this.label = this.targetMappedPort.fieldFQN.split('.').pop();
                    }
                })
            }
        } else {
            this.sourcePorts.forEach((sourcePort) => {
                const inPort = this.inPort;
                const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);
    
                if (sourcePort) {
                    sourcePort.addLinkedPort(this.inPort);
                    sourcePort.addLinkedPort(this.targetMappedPort)

                    lm.setTargetPort(this.inPort);
                    lm.setSourcePort(sourcePort);
                    lm.registerListener({
                        selectionChanged(event) {
                            if (event.isSelected) {
                                inPort.fireEvent({}, "link-selected");
                                sourcePort.fireEvent({}, "link-selected");
                            } else {
                                inPort.fireEvent({}, "link-unselected");
                                sourcePort.fireEvent({}, "link-unselected");
                            }
                        },
                    })
                    this.getModel().addAll(lm as any);
                }
            })

            if (this.targetMappedPort) {
                const outPort = this.outPort;
                const targetPort = this.targetMappedPort;

                const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);

                lm.setTargetPort(this.targetMappedPort);
                lm.setSourcePort(this.outPort);
                lm.registerListener({
                    selectionChanged(event) {
                        if (event.isSelected) {
                            outPort.fireEvent({}, "link-selected");
                            targetPort.fireEvent({}, "link-selected");
                        } else {
                            outPort.fireEvent({}, "link-unselected");
                            targetPort.fireEvent({}, "link-unselected");
                        }
                    },
                })

                if (!this.label) {
                    const fieldFQN = this.targetMappedPort.fieldFQN;
                    this.label = fieldFQN ? this.targetMappedPort.fieldFQN.split('.').pop() : '';
                }
                this.getModel().addAll(lm as any);
            }
        }
        this.hasInitialized = true;
    }

    async updateSource(suffix: string): Promise<void> {
        // TODO: Implement
    }

    public updatePosition() {
        if (this.targetMappedPort) {
            const position = this.targetMappedPort.getPosition()
            this.setPosition(this.hasError() ? OFFSETS.LINK_CONNECTOR_NODE_WITH_ERROR.X : OFFSETS.LINK_CONNECTOR_NODE.X, position.y - 2)
        }
    }

    public hasError(): boolean {
        return this.diagnostics.length > 0;
    }

    public async deleteLink(): Promise<void> {
        await removeMapping(this.mapping.output, this.context);
    }
}
