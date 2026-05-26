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

import React, { useEffect, useRef, useState } from 'react';
import { DiagramEngine, PortModel } from '@projectstorm/react-diagrams';
import { CMAttribute as Attribute } from '@wso2/ballerina-core';
import { PrimaryKeyIcon } from '../../../resources/';
import { EntityModel } from '../EntityModel';
import { EntityPortWidget } from '../../EntityPort/EntityPortWidget';
import { extractAttributeType } from '../entity-util';
import { AttributeContainer, AttributeName, AttributeType } from '../styles';
import { useDiagramContext } from "../../DiagramContext/DiagramContext";

interface AttributeProps {
    node: EntityModel;
    engine: DiagramEngine;
    attribute: Attribute;
    isSelected: boolean;
}

export function AttributeWidget(props: AttributeProps) {
    const { node, engine, attribute, isSelected } = props;
    const { setFocusedNodeId, setSelectedNodeId } = useDiagramContext();

    const [isHovered, setIsHovered] = useState<boolean>(false);
    const attributePorts = useRef<PortModel[]>([]);

    let attributeType: string = extractAttributeType(attribute.type);

    useEffect(() => {
        attributePorts.current.push(node.getPortFromID(`left-${node.getID()}/${attribute.name}`));
        attributePorts.current.push(node.getPortFromID(`right-${node.getID()}/${attribute.name}`));
    }, [attribute])

    const handleOnHover = (task: string) => {
        setIsHovered(task === 'SELECT' ? true : false);
        node.handleHover(attributePorts.current, task);
    }

    const handleOnAttributeTypeClick = () => {
        setFocusedNodeId(attribute?.associations[0]?.associate);
        setSelectedNodeId(undefined);
    }

    return (
        <AttributeContainer
            isSelected={isSelected || isHovered}
            onMouseOver={() => handleOnHover('SELECT')}
            onMouseLeave={() => handleOnHover('UNSELECT')}
        >
            <EntityPortWidget
                port={node.getPort(`left-${node.getID()}/${attribute.name}`)}
                engine={engine}
            />
            {attribute.isReadOnly && <PrimaryKeyIcon styles={{ left: '20px', position: 'absolute' }} />}
            <AttributeName>{attribute.name}</AttributeName>
            <AttributeType
                onClick={handleOnAttributeTypeClick}
                isAnonymous={node.entityObject.isAnonymous}
                isSelected={isSelected || isHovered}
                styles={{
                    fontFamily: 'Droid Sans Mono'
                }}
            >
                {attributeType}
            </AttributeType>
            <EntityPortWidget
                port={node.getPort(`right-${node.getID()}/${attribute.name}`)}
                engine={engine}
            />
        </AttributeContainer>
    );
}
