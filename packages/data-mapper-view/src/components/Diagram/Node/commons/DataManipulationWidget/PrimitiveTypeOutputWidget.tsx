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
import * as React from 'react';
// tslint:disable-next-line:no-duplicate-imports
import { useState } from "react";

import { Button, Codicon, ProgressRing, TruncatedLabel } from '@wso2/ui-toolkit';
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { STModification, TypeField } from "@wso2/ballerina-core";
import { NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../../utils/DataMapperContext/DataMapperContext";
import { EditableRecordField } from "../../../Mappings/EditableRecordField";
import { DataMapperPortWidget, RecordFieldPortModel } from "../../../Port";
import {
	getDefaultValue,
	getExprBodyFromLetExpression,
	getExprBodyFromTypeCastExpression,
	getTypeName
} from "../../../utils/dm-utils";
import { getModification } from "../../../utils/modifications";
import {
	CLEAR_EXISTING_MAPPINGS_WARNING,
	getSupportedUnionTypes,
	INCOMPATIBLE_CASTING_WARNING,
	isAnydataType,
	UnionTypeInfo
} from "../../../utils/union-type-utils";
import { OutputSearchHighlight } from '../Search';
import { TreeBody, TreeContainer, TreeHeader } from "../Tree/Tree";

import { PrimitiveTypedEditableElementWidget } from "./PrimitiveTypedEditableElementWidget";
import { ValueConfigMenu } from "./ValueConfigButton";
import { ValueConfigMenuItem } from "./ValueConfigButton/ValueConfigMenuItem";
import { useIONodesStyles } from '../../../../styles';

export interface PrimitiveTypeOutputWidgetProps {
	id: string;
	field: EditableRecordField;
	engine: DiagramEngine;
	getPort: (portId: string) => RecordFieldPortModel;
	context: IDataMapperContext;
	typeName: string;
	valueLabel?: string;
	deleteField?: (node: STNode) => Promise<void>;
	unionTypeInfo?: UnionTypeInfo;
}


export function PrimitiveTypeOutputWidget(props: PrimitiveTypeOutputWidgetProps) {
	const { id, field, getPort, engine, context, typeName, valueLabel, deleteField, unionTypeInfo } = props;
	const classes = useIONodesStyles();

	const [isModifyingTypeCast, setIsModifyingTypeCast] = useState(false);

	const type = typeName || field?.type?.typeName;
	const fieldId = `${id}.${type}`;
	const portIn = getPort(`${fieldId}.IN`);

	let expanded = true;
	if ((portIn && portIn.collapsed)) {
		expanded = false;
	}

	const indentation = (portIn && !expanded) ? 0 : 24;

	const getUnionType = () => {
		const typeText: JSX.Element[] = [];
		const { typeNames, resolvedTypeName } = unionTypeInfo;
		typeNames.forEach((unionType) => {
			if (unionType.trim() === resolvedTypeName) {
				typeText.push(<span className={classes.boldedTypeLabel}>{unionType}</span>);
			} else {
				typeText.push(<>{unionType}</>);
			}
			if (unionType !== typeNames[typeNames.length - 1]) {
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
						{type && ":"}
					</span>
				)}
				<span className={classes.outputTypeLabel}>
					{unionTypeInfo ? getUnionType() : type}
				</span>
			</span>
		</TruncatedLabel>
	);

	const handleExpand = () => {
		context.handleCollapse(fieldId, !expanded);
	}

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

	const handleWrapWithTypeCast = async (selectedType: TypeField, shouldReInitialize?: boolean) => {
		setIsModifyingTypeCast(true)
		try {
			const name = getTypeName(selectedType);
			const modification: STModification[] = [];
			if (shouldReInitialize) {
				const defaultValue = getDefaultValue(selectedType.typeName);
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
		const resolvedTypeName = getTypeName(field.type);
		const supportedTypes = getSupportedUnionTypes(unionTypeInfo.unionType);

		for (const member of unionTypeInfo.unionType.members) {
			const memberTypeName = getTypeName(member);
			if (!supportedTypes.includes(memberTypeName) || isAnydataType(memberTypeName)) {
				continue;
			}
			const isResolvedType = memberTypeName === resolvedTypeName;
			if (unionTypeInfo.isResolvedViaTypeCast) {
				if (!isResolvedType) {
					menuItems.push(
						{
							title: `Change type cast to ${memberTypeName}`,
							onClick: () => handleWrapWithTypeCast(member, false),
							level: 2,
							warningMsg: INCOMPATIBLE_CASTING_WARNING
						},
						{
							title: `Re-initialize as ${memberTypeName}`,
							onClick: () => handleWrapWithTypeCast(member, true),
							level: 3,
							warningMsg: CLEAR_EXISTING_MAPPINGS_WARNING
						}
					);
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
							title: `Cast type as ${memberTypeName}!`,
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
		<TreeContainer data-testid={`${id}-node`}>
			<TreeHeader>
				<span className={classes.inPort}>
					{portIn && !expanded &&
						<DataMapperPortWidget engine={engine} port={portIn} />
					}
				</span>
				<span className={classes.label}>
					<Button
						appearance="icon"
						sx={{ marginLeft: indentation }}
						onClick={handleExpand}
						data-testid={`${id}-expand-icon-primitive-type`}
					>
						{expanded ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
					</Button>
					{label}
				</span>
				{valConfigMenuItems?.length > 0 && (
					<>
						{isModifyingTypeCast ? (
							<ProgressRing sx={{ height: '16px', width: '16px' }} />
						) : (
							<ValueConfigMenu menuItems={valConfigMenuItems} portName={portIn?.getName()} />
						)}
					</>
				)}
			</TreeHeader>
			{expanded && field && (
				<TreeBody>
					<PrimitiveTypedEditableElementWidget
						key={id}
						parentId={id}
						engine={engine}
						field={field}
						getPort={getPort}
						context={context}
						deleteField={deleteField}
					/>
				</TreeBody>
			)}
		</TreeContainer>
	);
}
