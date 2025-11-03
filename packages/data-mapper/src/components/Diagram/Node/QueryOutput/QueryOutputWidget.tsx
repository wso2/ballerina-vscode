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
import { Button, Codicon, TruncatedLabel, TruncatedLabelGroup } from '@wso2/ui-toolkit';
import { IOType, Mapping, TypeKind } from '@wso2/ballerina-core';
import { useShallow } from 'zustand/react/shallow';

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from '../../Port';
import { TreeBody, TreeContainer, TreeHeader } from '../commons/Tree/Tree';
import { ObjectOutputFieldWidget } from "../ObjectOutput/ObjectOutputFieldWidget";
import { useIONodesStyles } from '../../../styles';
import { useDMCollapsedFieldsStore, useDMIOConfigPanelStore } from '../../../../store/store';
import { OutputSearchHighlight } from '../commons/Search';
import { ArrayOutputFieldWidget } from '../ArrayOutput/ArrayOuptutFieldWidget';
import { PrimitiveOutputElementWidget } from '../PrimitiveOutput/PrimitiveOutputElementWidget';

export interface QueryOutputWidgetProps {
	id: string; // this will be the root ID used to prepend for UUIDs of nested fields
	outputType: IOType;
	typeName: string;
	value: any;
	engine: DiagramEngine;
	getPort: (portId: string) => InputOutputPortModel;
	context: IDataMapperContext;
	mappings?: Mapping[];
	valueLabel?: string;
	originalTypeName?: string;
}

export function QueryOutputWidget(props: QueryOutputWidgetProps) {
	const {
		id,
		outputType,
		typeName,
		value,
		engine,
		getPort,
		context,
		valueLabel
	} = props;
	const classes = useIONodesStyles();

	const [portState, setPortState] = useState<PortState>(PortState.Unselected);
	const [isHovered, setIsHovered] = useState(false);

	const { setIsIOConfigPanelOpen, setIOConfigPanelType, setIsSchemaOverridden } = useDMIOConfigPanelStore(
		useShallow(state => ({
			setIsIOConfigPanelOpen: state.setIsIOConfigPanelOpen,
			setIOConfigPanelType: state.setIOConfigPanelType,
			setIsSchemaOverridden: state.setIsSchemaOverridden
		}))
	);

	const field = outputType.member || outputType;

	const portIn = getPort(`${id}.#.IN`);
	const isUnknownType = outputType.kind === TypeKind.Unknown;

	let expanded = true;
	
	const isDisabled = portIn?.attributes.descendantHasValue;

	const handlePortState = (state: PortState) => {
		setPortState(state)
	};

	const onMouseEnter = () => {
		setIsHovered(true);
	};

	const onMouseLeave = () => {
		setIsHovered(false);
	};

	const label = (
		<TruncatedLabelGroup style={{ marginRight: "auto", alignItems: "baseline" }}>
			{valueLabel && (
				<TruncatedLabel className={classes.valueLabel}>
					<OutputSearchHighlight>{valueLabel}</OutputSearchHighlight>
				</TruncatedLabel>
			)}
			<TruncatedLabel className={isUnknownType ? classes.unknownTypeLabel : classes.typeLabel}>
				{typeName || ''}
			</TruncatedLabel>
		</TruncatedLabelGroup>
	);

	const onRightClick = (event: React.MouseEvent) => {
		event.preventDefault();
		setIOConfigPanelType("Output");
		setIsSchemaOverridden(true);
		setIsIOConfigPanelOpen(true);
    };

	return (
		<>
			<TreeContainer data-testid={`${id}.#-node`} onContextMenu={onRightClick}>
				<TreeHeader
					isSelected={portState !== PortState.Unselected}
					id={"recordfield-" + id + ".#"}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
				>
					<span className={classes.inPort}>
						{portIn && (
							<DataMapperPortWidget
								engine={engine}
								port={portIn}
								handlePortState={handlePortState}
								disable={isDisabled && !expanded}
							/>)
						}
					</span>
					<span className={classes.label}>
						{label}
					</span>
				</TreeHeader>
				{(expanded && field) && (
					<TreeBody>
						{outputType.kind === TypeKind.Array ? (
							<ObjectOutputFieldWidget
								engine={engine}
								field={field}
								getPort={getPort}
								parentId={id}
								context={context}
								treeDepth={0}
								hasHoveredParent={isHovered}
								isPortParent={true}
							/>
						) : (
							<PrimitiveOutputElementWidget
								key={id}
								engine={engine}
								field={field}
								getPort={getPort}
								parentId={id}
								context={context}
								hasHoveredParent={isHovered}
								isPortParent={true}
							/>
						)}
					</TreeBody>
				)}
			</TreeContainer>
		</>
	);
}
