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
import React, { useState } from 'react';

import { DiagramEngine } from '@projectstorm/react-diagrams';
import { GraphqlMutationIcon } from "@wso2/ballerina-core";
import { Popover } from '@wso2/ui-toolkit';

import { useGraphQlContext } from "../../../DiagramContext/GraphqlDiagramContext";
import { ParametersPopup } from "../../../Popup/ParametersPopup";
import { popOverCompStyle } from "../../../Popup/styles";
import { GraphqlBasePortWidget } from "../../../Port/GraphqlBasePortWidget";
import { RemoteFunction } from "../../../resources/model";
import { FieldName, FieldType } from "../../../resources/styles/styles";
import { GraphqlServiceNodeModel } from "../GraphqlServiceNodeModel";

interface RemoteFunctionProps {
    engine: DiagramEngine;
    node: GraphqlServiceNodeModel;
    remoteFunc: RemoteFunction;
    remotePath: string;
}

export function RemoteFunctionWidget(props: RemoteFunctionProps) {
    const { engine, node, remoteFunc, remotePath } = props;
    const { setSelectedNode } = useGraphQlContext();

    const [isOpen, setIsOpen] = useState(false);
    const [anchorEvent, setAnchorEvent] = useState<null | HTMLElement>(null);
    const openPanel = (event: React.MouseEvent<HTMLElement>) => {
        setIsOpen(true);
        setAnchorEvent(event.currentTarget);
    };
    const closePanel = () => {
        setIsOpen(false);
        setAnchorEvent(null);
    };

    const updateSelectedNode = () => {
        setSelectedNode(remoteFunc.returns);
    }

    return (
        <>
            <GraphqlBasePortWidget
                port={node.getPort(`left-${remotePath}`)}
                engine={engine}
            />
            <GraphqlMutationIcon />
            <FieldName
                onMouseOver={openPanel}
                onMouseLeave={closePanel}
                style={{ marginLeft: '7px' }}
                data-testid={`remote-identifier-${remoteFunc.identifier}`}
            >
                {remoteFunc.identifier}
            </FieldName>
            <div onClick={updateSelectedNode}>
                <FieldType data-testid={`remote-type-${remoteFunc.returns}`}>{remoteFunc.returns}</FieldType>
            </div>
            <GraphqlBasePortWidget
                port={node.getPort(`right-${remotePath}`)}
                engine={engine}
            />
            {remoteFunc.parameters?.length > 0 && (
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
                    <ParametersPopup parameters={remoteFunc.parameters} />
                </Popover>
            )}
        </>
    );
}
