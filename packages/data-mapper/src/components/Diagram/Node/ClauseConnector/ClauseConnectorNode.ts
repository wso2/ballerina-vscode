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
import { DMDiagnostic, Query } from "@wso2/ballerina-core";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperLinkModel } from "../../Link";
import { InputOutputPortModel, IntermediatePortModel } from "../../Port";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { findInputNode } from "../../utils/node-utils";
import { getInputPort, getTargetPortPrefix } from "../../utils/port-utils";
import { OFFSETS } from "../../utils/constants";
import { QueryOutputNode } from "../QueryOutput";
import { useDMSearchStore } from "../../../../store/store";

export const CLAUSE_CONNECTOR_NODE_TYPE = "clause-connector-node";
const NODE_ID = "clause-connector-node";

export class ClauseConnectorNode extends DataMapperNodeModel {

    public sourcePorts: InputOutputPortModel[] = [];
    public targetMappedPort: InputOutputPortModel;

    public inPort: IntermediatePortModel;
    public outPort: IntermediatePortModel;

    public diagnostics: DMDiagnostic[];
    public value: string;
    public shouldInitLinks: boolean;
    public label: string;

    constructor(
        public context: IDataMapperContext,
        public query: Query
    ) {
        super(
            NODE_ID,
            context,
            CLAUSE_CONNECTOR_NODE_TYPE
        );
        this.value = query.output;
        this.diagnostics = query.diagnostics;
    }

    initPorts(): void {
        const prevSourcePorts = this.sourcePorts;
        this.sourcePorts = [];
        this.targetMappedPort = undefined;
        this.inPort = new IntermediatePortModel(`${this.query.inputs.join('_')}_${this.query.output}_IN`, "IN");
        this.outPort = new IntermediatePortModel(`${this.query.inputs.join('_')}_${this.query.output}_OUT`, "OUT");
        this.addPort(this.inPort);
        this.addPort(this.outPort);

        const inputSearch = useDMSearchStore.getState().inputSearch;
        const outputSearch = useDMSearchStore.getState().outputSearch;

        const views = this.context.views;
        const lastViewIndex = views.length - 1;

        this.query.inputs.forEach((field) => {
            const inputField = field?.split('.').pop();
            const matchedSearch = inputSearch === "" || inputField.toLowerCase().includes(inputSearch.toLowerCase());

            if (!matchedSearch) return;

            const inputNode = findInputNode(field, this, views, lastViewIndex);
            if (inputNode) {
                const inputPort = getInputPort(inputNode, field?.replace(/\.\d+/g, ''));
                if (!this.sourcePorts.some(port => port.getID() === inputPort.getID())) {
                    this.sourcePorts.push(inputPort);
                }
            }
        });

        const outputField = this.query.output.split(".").pop();
        const matchedSearch = outputSearch === "" || outputField.toLowerCase().includes(outputSearch.toLowerCase());

        if (matchedSearch && this.outPort) {
            this.getModel().getNodes().map((node) => {
    
                if (node instanceof QueryOutputNode) {
                    const targetPortPrefix = getTargetPortPrefix(node);

                    this.targetMappedPort = node.getPort(`${targetPortPrefix}.${this.query.output}.#.IN`) as InputOutputPortModel;

                    if (prevSourcePorts.length !== this.sourcePorts.length ||
                        !prevSourcePorts.every((port, idx) => port.getID() === this.sourcePorts[idx]?.getID())) {
                        this.shouldInitLinks = true;
                    }
                }
            });
        }
    }

    initLinks(): void {
        if (!this.shouldInitLinks) {
            return;
        }

        this.sourcePorts.forEach((sourcePort) => {
            const inPort = this.inPort;
            const lm = new DataMapperLinkModel(undefined, this.diagnostics, true, undefined, true);

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
                this.getModel().addAll(lm);
            }
        })

        if (this.targetMappedPort) {
            const outPort = this.outPort;
            const targetPort = this.targetMappedPort;

            const lm = new DataMapperLinkModel(undefined, this.diagnostics, true, undefined, true);

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
                const fieldFQN = this.targetMappedPort.attributes.fieldFQN;
                this.label = fieldFQN ? this.targetMappedPort.attributes.fieldFQN.split('.').pop() : '';
            }
            this.getModel().addAll(lm);
        }

        this.shouldInitLinks = false;
    }

    public updatePosition() {
        if (this.targetMappedPort) {
            const position = this.targetMappedPort.getPosition();
            this.setPosition(
                this.hasError()
                    ? OFFSETS.LINK_CONNECTOR_NODE_WITH_ERROR.X
                    : OFFSETS.LINK_CONNECTOR_NODE.X,
                position.y - 2
            );
        }
    }

    public hasError(): boolean {
        return this.diagnostics?.length > 0;
    }
}