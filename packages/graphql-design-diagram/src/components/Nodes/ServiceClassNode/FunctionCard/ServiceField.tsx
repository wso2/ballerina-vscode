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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda jsx-wrap-multiline
import React, { useEffect, useRef, useState } from "react";

import { DiagramEngine, PortModel } from "@projectstorm/react-diagrams";
import { Popover } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../../../DiagramContext/GraphqlDiagramContext";
import { ChildActionMenu } from "../../../NodeActionMenu/ChildActionMenu";
import { ParametersPopup } from "../../../Popup/ParametersPopup";
import { popOverCompStyle } from "../../../Popup/styles";
import { GraphqlBasePortWidget } from "../../../Port/GraphqlBasePortWidget";
import { FunctionType, ServiceClassField } from "../../../resources/model";
import { FieldName, FieldType, NodeFieldContainer } from "../../../resources/styles/styles";
import { ServiceClassNodeModel } from "../ServiceClassNodeModel";

interface ServiceFieldProps {
    engine: DiagramEngine;
    node: ServiceClassNodeModel;
    functionElement: ServiceClassField;
}

export function ServiceField(props: ServiceFieldProps) {
    const { engine, node, functionElement } = props;
    const { setSelectedNode } = useGraphQlContext();

    const functionPorts = useRef<PortModel[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [anchorEvent, setAnchorEvent] = useState<null | HTMLElement>(null);
    const [isHovered, setIsHovered] = useState<boolean>(false);

    const path = functionElement.identifier;

    useEffect(() => {
        functionPorts.current.push(node.getPortFromID(`left-${path}`));
        functionPorts.current.push(node.getPortFromID(`right-${path}`));
    }, [functionElement]);

    const openPanel = (event: React.MouseEvent<HTMLElement>) => {
        setIsOpen(true);
        setAnchorEvent(event.currentTarget);
    };
    const closePanel = () => {
        setIsOpen(false);
        setAnchorEvent(null);
    };


    const updateSelectedNode = () => {
        setSelectedNode(functionElement.returnType);
    }

    const handleOnHover = (task: string) => {
        setIsHovered(task === 'SELECT' ? true : false);
    };

    return (
        <NodeFieldContainer
            onMouseOver={() => handleOnHover('SELECT')}
            onMouseLeave={() => handleOnHover('UNSELECT')}
            data-testid={`service-field-card-${functionElement.identifier}`}
        >
            <GraphqlBasePortWidget
                port={node.getPort(`left-${path}`)}
                engine={engine}
            />
            <FieldName onMouseOver={openPanel} onMouseLeave={closePanel} style={{ marginLeft: '7px' }} data-testid={`service-field-${functionElement.identifier}`}>
                {functionElement.identifier}
            </FieldName>
            <div onClick={updateSelectedNode}>
                <FieldType data-testid={`service-field-type-${functionElement.returnType}`}>{functionElement.returnType}</FieldType>
            </div>
            <div style={{width: '10px'}}>
                {/* {isHovered &&
                    <ChildActionMenu
                        functionType={FunctionType.CLASS_RESOURCE}
                        location={node.classObject.position}
                        path={functionElement.identifier}
                    />
                } */}
            </div>
            <GraphqlBasePortWidget
                port={node.getPort(`right-${path}`)}
                engine={engine}
            />

            {functionElement.parameters?.length > 0 && (
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
                    <ParametersPopup parameters={functionElement.parameters} />
                </Popover>
            )}
        </NodeFieldContainer>
    );
}
