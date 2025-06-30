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
import React, { useMemo, useState } from 'react';

import { DiagramEngine } from '@projectstorm/react-diagrams';
import { AnydataType, STModification, TypeField } from "@wso2/ballerina-core";
import { NodePosition, STKindChecker, STNode } from '@wso2/syntax-tree';

import { IDataMapperContext } from "../../../../../utils/DataMapperContext/DataMapperContext";
import { EditableRecordField } from "../../../Mappings/EditableRecordField";
import { FieldAccessToSpecificFied } from "../../../Mappings/FieldAccessToSpecificFied";
import { DataMapperPortWidget, PortState, RecordFieldPortModel } from '../../../Port';
import {
	getDefaultValue,
	getExprBodyFromLetExpression,
	getExprBodyFromTypeCastExpression,
	getNewFieldAdditionModification,
	getTypeName,
	isEmptyValue
} from "../../../utils/dm-utils";
import { getModification } from "../../../utils/modifications";
import {
	CLEAR_EXISTING_MAPPINGS_WARNING,
	getSupportedUnionTypes,
	INCOMPATIBLE_CASTING_WARNING,
	isAnydataType,
	UnionTypeInfo
} from "../../../utils/union-type-utils";
import { AddRecordFieldButton } from '../AddRecordFieldButton';
import { OutputSearchHighlight } from '../Search';
import { TreeBody, TreeContainer, TreeHeader } from '../Tree/Tree';

import { EditableRecordFieldWidget } from "./EditableRecordFieldWidget";
import { ValueConfigMenu } from "./ValueConfigButton";
import { ValueConfigMenuItem } from "./ValueConfigButton/ValueConfigMenuItem";
import { Button, Codicon, ProgressRing, TruncatedLabel } from '@wso2/ui-toolkit';
import { useIONodesStyles } from '../../../../styles';

export interface EditableMappingConstructorWidgetProps {
	id: string; // this will be the root ID used to prepend for UUIDs of nested fields
	editableRecordField: EditableRecordField;
	typeName: string;
	value: STNode;
	engine: DiagramEngine;
	getPort: (portId: string) => RecordFieldPortModel;
	context: IDataMapperContext;
	valueLabel?: string;
	mappings?: FieldAccessToSpecificFied[];
	deleteField?: (node: STNode) => Promise<void>;
	originalTypeName?: string;
	unionTypeInfo?: UnionTypeInfo;
}


export function EditableMappingConstructorWidget(props: EditableMappingConstructorWidgetProps) {
	const {
		id,
		editableRecordField,
		typeName,
		value,
		engine,
		getPort,
		context,
		mappings,
		valueLabel,
		deleteField,
		originalTypeName,
		unionTypeInfo
	} = props;
	const classes = useIONodesStyles();

	const [portState, setPortState] = useState<PortState>(PortState.Unselected);
	const [isHovered, setIsHovered] = useState(false);
	const [isModifyingTypeCast, setIsModifyingTypeCast] = useState(false);

	const editableRecordFields = editableRecordField && editableRecordField.childrenTypes;
	const hasValue = editableRecordFields && editableRecordFields.length > 0;
	const isBodyMappingConstructor = value && STKindChecker.isMappingConstructor(value);
	const hasSyntaxDiagnostics = value && value.syntaxDiagnostics.length > 0;
	const hasEmptyFields = mappings && (mappings.length === 0 || !mappings.some(mapping => {
		if (mapping.value) {
			return !isEmptyValue(mapping.value.position);
		}
		return true;
	}));
	const isAnyData = originalTypeName === AnydataType;

	const portIn = getPort(`${id}.IN`);

	let expanded = true;
	if ((portIn && portIn.collapsed)) {
		expanded = false;
	}

	const indentation = (portIn && (!hasValue || !expanded)) ? 0 : 24;

	const getUnionType = () => {
		const typeText: JSX.Element[] = [];
		const { typeNames, resolvedTypeName } = unionTypeInfo;
		typeNames.forEach((type) => {
			if (type.trim() === resolvedTypeName) {
				typeText.push(<span className={classes.boldedTypeLabel}>{type}</span>);
			} else {
				typeText.push(<>{type}</>);
			}
			if (type !== typeNames[typeNames.length - 1]) {
				typeText.push(<> | </>);
			}
		});
		return typeText;
	};

	const label = (
		<TruncatedLabel style={{ marginRight: "auto" }}>
			<span style={{ marginRight: "auto" }}>
				{valueLabel && (
					<span className={classes.valueLabel}>
						<OutputSearchHighlight>{valueLabel}</OutputSearchHighlight>
						{typeName && ":"}
					</span>
				)}
				<span className={classes.outputTypeLabel}>
					{unionTypeInfo ? getUnionType() : typeName || ''}
				</span>
			</span>
		</TruncatedLabel>
	);

	const handleExpand = () => {
		context.handleCollapse(id, !expanded);
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


	const addNewField = async (newFieldName: string) => {
		const modification = getNewFieldAdditionModification(value, newFieldName);
		if (modification) {
			await context.applyModifications(modification);
		}
	}

	const subFieldNames = useMemo(() => {
		const fieldNames: string[] = [];
		editableRecordFields?.forEach(field => {
			if (field.value && STKindChecker.isSpecificField(field.value)) {
				fieldNames.push(field.value?.fieldName?.value)
			}
		})
		return fieldNames;
	}, [editableRecordFields])

	const getTargetPositionForReInitWithTypeCast = () => {
		const rootValueExpr = unionTypeInfo.valueExpr.expression;
		const valueExpr: STNode = STKindChecker.isLetExpression(rootValueExpr)
			? getExprBodyFromLetExpression(rootValueExpr)
			: rootValueExpr;

		return valueExpr.position;
	}

	const getTargetPositionForWrapWithTypeCast = () => {
		const rootValueExpr = unionTypeInfo.valueExpr.expression;
		const valueExpr: STNode = STKindChecker.isLetExpression(rootValueExpr)
			? getExprBodyFromLetExpression(rootValueExpr)
			: rootValueExpr;
		const valueExprPosition: NodePosition = valueExpr.position;

		let targetPosition: NodePosition = {
			...valueExprPosition,
			endLine: valueExprPosition.startLine,
			endColumn: valueExprPosition.startColumn
		}

		if (STKindChecker.isTypeCastExpression(valueExpr)) {
			const exprBodyPosition = getExprBodyFromTypeCastExpression(valueExpr).position;
			targetPosition = {
				...valueExprPosition,
				endLine: exprBodyPosition.startLine,
				endColumn: exprBodyPosition.startColumn
			};
		}

		return targetPosition;
	}

	const handleWrapWithTypeCast = async (type: TypeField, shouldReInitialize?: boolean) => {
		setIsModifyingTypeCast(true)
		try {
			const name = getTypeName(type);
			const modification: STModification[] = [];
			if (shouldReInitialize) {
				const defaultValue = getDefaultValue(type.typeName);
				const targetPosition = getTargetPositionForReInitWithTypeCast();
				modification.push(getModification(`<${name}>${defaultValue}`, targetPosition));
			} else {
				const targetPosition = getTargetPositionForWrapWithTypeCast();
				modification.push(getModification(`<${name}>`, targetPosition));
			}
			await context.applyModifications(modification);
		} finally {
			setIsModifyingTypeCast(false);
		}
	};

	const getTypedElementMenuItems = () => {
		const menuItems: ValueConfigMenuItem[] = [];
		const resolvedTypeName = getTypeName(editableRecordField.type);
		const supportedTypes = getSupportedUnionTypes(unionTypeInfo.unionType);

		for (const member of unionTypeInfo.unionType.members) {
			const memberTypeName = getTypeName(member);
			if (!supportedTypes.includes(memberTypeName) || isAnydataType(memberTypeName)) {
				continue;
			}
			const isResolvedType = memberTypeName === resolvedTypeName;
			if (unionTypeInfo.isResolvedViaTypeCast) {
				if (!isResolvedType) {
					menuItems.push({
						title: `Change type cast to ${memberTypeName}`,
						onClick: () => handleWrapWithTypeCast(member, false),
						level: 2,
						warningMsg: INCOMPATIBLE_CASTING_WARNING
					});
					if (!hasEmptyFields) {
						menuItems.push({
							title: `Re-initialize as ${memberTypeName}`,
							onClick: () => handleWrapWithTypeCast(member, true),
							level: 3,
							warningMsg: CLEAR_EXISTING_MAPPINGS_WARNING
						});
					}
				}
			} else if (supportedTypes.length > 1) {
				if (isResolvedType) {
					menuItems.push({
						title: `Cast type as ${memberTypeName}`,
						onClick: () => handleWrapWithTypeCast(member, false),
						level: 0
					});
				} else {
					menuItems.push(
						{
							title: `Cast type as ${memberTypeName}`,
							onClick: () => handleWrapWithTypeCast(member, false),
							level: 1,
							warningMsg: INCOMPATIBLE_CASTING_WARNING
						}, {
							title: `Re-initialize as ${memberTypeName}`,
							onClick: () => handleWrapWithTypeCast(member, true),
							level: 3,
							warningMsg: CLEAR_EXISTING_MAPPINGS_WARNING
						}
					);
				}
			}
		}

		return menuItems.sort((a, b) => (a.level || 0) - (b.level || 0));
	};

	const valConfigMenuItems = unionTypeInfo && getTypedElementMenuItems();

	return (
		<>
			<TreeContainer data-testid={`${id}-node`}>
				<TreeHeader
					isSelected={portState !== PortState.Unselected}
					id={"recordfield-" + id}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
				>
					<span className={classes.inPort}>
						{portIn && (isBodyMappingConstructor || !hasSyntaxDiagnostics) && (!hasValue
								|| !expanded
								|| !isBodyMappingConstructor
								|| hasEmptyFields
							) &&
							<DataMapperPortWidget engine={engine} port={portIn} handlePortState={handlePortState} />
						}
					</span>
					<span className={classes.label}>
						<Button
							id={"expand-or-collapse-" + id}
							appearance="icon"
							tooltip="Expand/Collapse"
							sx={{ marginLeft: indentation }}
							onClick={handleExpand}
							data-testid={`${id}-expand-icon-mapping-target-node`}
						>
							{expanded ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
						</Button>
						{label}
					</span>
					{unionTypeInfo && (
						<>
							{isModifyingTypeCast ? (
								<ProgressRing sx={{ height: '16px', width: '16px' }} />
							) : (
								<ValueConfigMenu menuItems={valConfigMenuItems} portName={portIn?.getName()} />
							)}
						</>
					)}
				</TreeHeader>
				{((expanded && editableRecordFields) || isAnyData) && (
					<TreeBody>
						{editableRecordFields?.map((item, index) => {
							return (
								<EditableRecordFieldWidget
									key={index}
									engine={engine}
									field={item}
									getPort={getPort}
									parentId={id}
									parentMappingConstruct={value}
									context={context}
									treeDepth={0}
									deleteField={deleteField}
									hasHoveredParent={isHovered}
								/>
							);
						})}
						{isAnyData && (
							<AddRecordFieldButton
								addNewField={addNewField}
								indentation={0}
								existingFieldNames={subFieldNames}
								fieldId={id}
							/>
						)}
					</TreeBody>
				)}
			</TreeContainer>
		</>
	);
}
