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
import { Button, Codicon, Icon, TruncatedLabel, TruncatedLabelGroup } from '@wso2/ui-toolkit';
import { InputCategory, IOType, Mapping, TypeKind } from '@wso2/ballerina-core';

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from '../../Port';
import { TreeBody, TreeContainer, TreeHeader } from '../commons/Tree/Tree';
import { ObjectOutputFieldWidget } from "./ObjectOutputFieldWidget";
import { useIONodesStyles } from '../../../styles';
import { useDMCollapsedFieldsStore, useDMIOConfigPanelStore } from '../../../../store/store';
import { OutputSearchHighlight } from '../commons/Search';
import { useShallow } from 'zustand/react/shallow';
import ArrowWidget from '../commons/ArrowWidget';
import { OBJECT_OUTPUT_TARGET_PORT_PREFIX } from '../../utils/constants';
import { FieldActionButton } from '../commons/FieldActionButton';
import { PayloadWidget } from '../commons/PayloadWidget';

export interface ObjectOutputWidgetProps {
	id: string; // this will be the root ID used to prepend for UUIDs of nested fields
	outputType: IOType;
	typeName: string;
	value: any;
	engine: DiagramEngine;
	getPort: (portId: string) => InputOutputPortModel;
	context: IDataMapperContext;
	mappings?: Mapping[];
	valueLabel: string;
	originalTypeName?: string;
}

export function ObjectOutputWidget(props: ObjectOutputWidgetProps) {
	const {
		id,
		outputType,
		typeName,
		value,
		engine,
		getPort,
		context,
		mappings,
		valueLabel
	} = props;
	const classes = useIONodesStyles();

	const [portState, setPortState] = useState<PortState>(PortState.Unselected);
	const [isHovered, setIsHovered] = useState(false);

	const collapsedFieldsStore = useDMCollapsedFieldsStore();

	const { setIsIOConfigPanelOpen, setIOConfigPanelType, setIsSchemaOverridden } = useDMIOConfigPanelStore(
		useShallow(state => ({
			setIsIOConfigPanelOpen: state.setIsIOConfigPanelOpen,
			setIOConfigPanelType: state.setIOConfigPanelType,
			setIsSchemaOverridden: state.setIsSchemaOverridden
		}))
	);

	const fields = outputType.fields?.filter(t => t !== null);
	const hasFields = fields?.length > 0;

	const portIn = getPort(`${id}.IN`);

	const typeKind = outputType.kind;
    const isUnknownType = typeKind === TypeKind.Unknown;
    const isConvertibleType = (typeKind === TypeKind.Json || typeKind === TypeKind.Xml) && !outputType.fields;


	let expanded = true;
	if ((portIn && portIn.attributes.collapsed)) {
		expanded = false;
	}
	const isDisabled = portIn?.attributes.descendantHasValue;

	const handleExpand = () => {
		const collapsedFields = collapsedFieldsStore.fields;
        if (!expanded) {
            collapsedFieldsStore.setFields(collapsedFields.filter((element) => element !== id));
        } else {
            collapsedFieldsStore.setFields([...collapsedFields, id]);
        }
	};

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
		<TruncatedLabelGroup style={{ alignItems: "baseline" }}>
			{valueLabel && (
				<TruncatedLabel className={classes.valueLabelHeader}>
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
			<TreeContainer data-testid={`${id}-node`} onContextMenu={onRightClick}>
				<TreeHeader
					isSelected={portState !== PortState.Unselected}
					id={"recordfield-" + id}
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
						{outputType.category !== InputCategory.ConvertedVariable ? (
							<Button
								id={"expand-or-collapse-" + id}
								appearance="icon"
								tooltip="Expand/Collapse"
								onClick={handleExpand}
								data-testid={`${id}-expand-icon-mapping-target-node`}
							>
								{expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
							</Button>
						) : (
							<Button
								id={"converted-icon-" + id}
								appearance="icon"
								tooltip="Type defined variable"
								onClick={() => { }}
							>
								<Icon name="arrow-left-up" />
							</Button>
						)}
						{label}
						{outputType.category === InputCategory.ConvertedVariable && (
							<FieldActionButton
								id={"field-action-edit-" + id}
								tooltip="Edit"
								iconName="edit"
								onClick={async () => await context.createConvertedVariable(outputType.name, false, outputType.typeName)}
							/>
						)}
					</span>
				</TreeHeader>
				{(expanded && hasFields) && (
					<TreeBody>
						{fields?.map((item, index) => {
							return (
								<ObjectOutputFieldWidget
									key={index}
									engine={engine}
									field={item}
									getPort={getPort}
									parentId={id}
									context={context}
									treeDepth={0}
									hasHoveredParent={isHovered}
								/>
							);
						})}
					</TreeBody>
				)}
			</TreeContainer>
			{expanded && outputType.convertedField &&
				<ObjectOutputWidget
					engine={engine}
					id={`${OBJECT_OUTPUT_TARGET_PORT_PREFIX}.${outputType.convertedField.name}`}
					outputType={outputType.convertedField}
					typeName={outputType.convertedField.typeName}
					value={undefined}
					getPort={getPort}
					context={context}
					mappings={mappings}
					valueLabel={outputType.convertedField.name}
					originalTypeName={outputType.convertedField.typeName}
				/>
			}
			{expanded && isConvertibleType && !outputType.convertedField &&
				<PayloadWidget
					onClick={async () => await context.createConvertedVariable(valueLabel, false, undefined, outputType.typeName)}
					typeName={outputType.typeName.toUpperCase()}
				/>
			}
		</>
	);
}
