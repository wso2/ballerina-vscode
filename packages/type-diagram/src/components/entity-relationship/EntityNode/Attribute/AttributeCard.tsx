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

import React, { useContext, useEffect, useRef, useState } from 'react';
import { DiagramEngine, PortModel } from '@projectstorm/react-diagrams';
import { Member, TypeFunctionModel } from '@wso2/ballerina-core';
import { EntityModel } from '../EntityModel';
import { EntityPortWidget } from '../../EntityPort/EntityPortWidget';

import { AttributeContainer, AttributeName, AttributeType } from '../styles';
import { CtrlClickGo2Source, DiagramContext } from '../../../common';
import { getAttributeType } from '../../../../utils/utils';

interface AttributeProps {
    node: EntityModel;
    engine: DiagramEngine;
    attribute: Member | TypeFunctionModel;
    isSelected: boolean;
}

const getCustomNameFromAnnotation = (member: Member): string | null => {
    if (!member.annotationAttachments) {
        return null;
    }

    try {
        for (const annotation of member.annotationAttachments) {
            if (annotation.modulePrefix === 'jsondata' && annotation.name === 'Name') {
                // Handle the properties structure - it could be an array or object
                const properties = annotation.properties;

                if (!properties) {
                    continue;
                }

                // Log the structure for debugging (can be removed later)
                console.log('jsondata:Name annotation properties:', properties);

                // If properties is an array, find the 'value' property
                if (Array.isArray(properties)) {
                    const valueProperty = properties.find(prop =>
                        prop.metadata?.label === 'value' || typeof prop.value === 'string'
                    );

                    if (valueProperty?.value && typeof valueProperty.value === 'string') {
                        return valueProperty.value.replace(/^["'\\]+|["'\\]+$/g, '');
                    }
                } else if (typeof properties === 'object') {
                    // If properties is an object, try different paths to get the value
                    // Path 1: properties.value.value
                    const valueData = (properties as any).value;
                    if (valueData?.value && typeof valueData.value === 'string') {
                        return valueData.value.replace(/^["'\\]+|["'\\]+$/g, '');
                    }

                    // Path 2: properties.value directly
                    if (typeof (properties as any).value === 'string') {
                        return (properties as any).value.replace(/^["'\\]+|["'\\]+$/g, '');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error extracting custom name from annotation:', error, member);
    }

    return null;
};

export function AttributeWidget(props: AttributeProps) {
    const { node, engine, attribute, isSelected } = props;
    const { setSelectedNodeId } = useContext(DiagramContext);

    const [isHovered, setIsHovered] = useState<boolean>(false);
    const attributePorts = useRef<PortModel[]>([]);

    let attributeType: string = getAttributeType(attribute);// TODO: FIX for anynnymous records

    // Get custom name from annotation if it exists, otherwise use the attribute name
    const isMember = (attr: Member | TypeFunctionModel): attr is Member => {
        return 'annotationAttachments' in attr && attr.annotationAttachments !== undefined;
    };

    const displayName = isMember(attribute)
        ? (getCustomNameFromAnnotation(attribute) || attribute.name)
        : attribute.name;    
    useEffect(() => {
        attributePorts.current.push(node.getPortFromID(`left-${node.getID()}/${attribute.name}`));
        attributePorts.current.push(node.getPortFromID(`right-${node.getID()}/${attribute.name}`));
    }, [attribute])

    const handleOnHover = (task: string) => {
        setIsHovered(task === 'SELECT' ? true : false);
        node.handleHover(attributePorts.current, task);
    }

    const onClickOnType = () => {
        if (attribute?.refs[0]) {
            setSelectedNodeId(attribute.refs[0]);
        }
    }

    return (
        <CtrlClickGo2Source node={node.entityObject}>
            <AttributeContainer
                isSelected={isSelected || isHovered}
                onMouseOver={() => handleOnHover('SELECT')}
                onMouseLeave={() => handleOnHover('UNSELECT')}
            >
                <EntityPortWidget
                    port={node.getPort(`left-${node.getID()}/${attribute.name}`)}
                    engine={engine}
                />
                <AttributeName>{displayName}</AttributeName>
                {node.entityObject?.codedata?.node !== 'UNION' &&
                    node.entityObject?.codedata?.node !== 'ENUM' &&
                    node.entityObject?.codedata?.node !== 'ARRAY' &&
                    <AttributeType
                        isAnonymous={false}
                        isSelected={isSelected || isHovered}
                        onClick={onClickOnType}
                    >
                        {attributeType}
                    </AttributeType>
                }
                {node.entityObject?.codedata?.node === 'ENUM' && ('defaultValue' in attribute && attribute.defaultValue) &&
                    <AttributeType
                        isAnonymous={false}
                        isSelected={isSelected || isHovered}
                    >
                        {attribute.defaultValue}
                    </AttributeType>
                }
                {/* {isHovered && attribute.sourceLocation && editingEnabled &&
                        <NodeMenuWidget
                            background={ThemeColors.SECONDARY}
                            location={attribute.sourceLocation}
                        />
                    } */}
                <EntityPortWidget
                    port={node.getPort(`right-${node.getID()}/${attribute.name}`)}
                    engine={engine}
                />
            </AttributeContainer>
        </CtrlClickGo2Source>
    );
}
