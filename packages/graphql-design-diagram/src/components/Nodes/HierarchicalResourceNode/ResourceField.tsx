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

// tslint:disable: jsx-no-multiline-js
import React, { useEffect, useRef, useState } from "react";

import { DiagramEngine, PortModel } from "@projectstorm/react-diagrams";
import { Popover } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../../DiagramContext/GraphqlDiagramContext";
import { ParametersPopup } from "../../Popup/ParametersPopup";
import { popOverCompStyle } from "../../Popup/styles";
import { GraphqlBasePortWidget } from "../../Port/GraphqlBasePortWidget";
import { FunctionType, ResourceFunction } from "../../resources/model";
import { FieldName, FieldType, NodeFieldContainer } from "../../resources/styles/styles";
import { FunctionMenuWidget } from "../GraphqlServiceNode/FunctionCards/FunctionMenuWidget";

import { HierarchicalNodeModel } from "./HierarchicalNodeModel";

interface ResourceFieldProps {
    engine: DiagramEngine;
    node: HierarchicalNodeModel;
    resource: ResourceFunction;
}

export function ResourceField(props: ResourceFieldProps) {
    const { engine, node, resource } = props;

    const functionPorts = useRef<PortModel[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [anchorEvent, setAnchorEvent] = useState<null | HTMLElement>(null);
    const { setSelectedNode } = useGraphQlContext();

    const path = resource.identifier;

    useEffect(() => {
        functionPorts.current.push(node.getPortFromID(`left-${path}`));
        functionPorts.current.push(node.getPortFromID(`right-${path}`));
    }, [resource]);


    const openPanel = (event: React.MouseEvent<HTMLElement>) => {
        setIsOpen(true);
        setAnchorEvent(event.currentTarget);
    };
    const closePanel = () => {
        setIsOpen(false);
        setAnchorEvent(null);
    };

    const updateSelectedNode = () => {
        setSelectedNode(resource.returns);
    }

    return (
        <NodeFieldContainer data-testid={`hierarchical-field-card-${resource.identifier}`}>
            <GraphqlBasePortWidget
                port={node.getPort(`left-${path}`)}
                engine={engine}
            />
            <FieldName onMouseOver={openPanel} onMouseLeave={closePanel} style={{ marginLeft: '7px' }} data-testid={`hierarchical-field-${resource.identifier}`}>
                {resource.identifier}
            </FieldName>
            <div onClick={updateSelectedNode}>
                <FieldType data-testid={`hierarchical-field-type-${resource.returns}`}>{resource.returns}</FieldType>
            </div>
            <GraphqlBasePortWidget
                port={node.getPort(`right-${path}`)}
                engine={engine}
            />

            {resource.parameters?.length > 0 && (
                <Popover
                    anchorOrigin={
                        {
                            vertical: "bottom",
                            horizontal: "center",
                        }
                    }
                    transformOrigin={
                        {
                            vertical: "center",
                            horizontal: "left",
                        }
                    }
                    sx={popOverCompStyle}
                    open={isOpen}
                    anchorEl={anchorEvent}
                >
                    <ParametersPopup parameters={resource.parameters} />
                </Popover>
            )}
            <div style={{width: '10px'}}>
                {resource.subscription ?

                    <FunctionMenuWidget location={resource.position} functionType={FunctionType.SUBSCRIPTION} /> :
                    <FunctionMenuWidget location={resource.position} functionType={FunctionType.QUERY} />
                }
            </div>
        </NodeFieldContainer>
    );
}
