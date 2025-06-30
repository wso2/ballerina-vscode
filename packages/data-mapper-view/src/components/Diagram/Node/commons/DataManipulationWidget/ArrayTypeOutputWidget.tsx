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
import React, { useMemo, useState } from "react";

import { Button, Codicon, ProgressRing, TruncatedLabel } from "@wso2/ui-toolkit";
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { STModification, TypeField } from "@wso2/ballerina-core";
import { NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";
import classnames from "classnames";

import { IDataMapperContext } from "../../../../../utils/DataMapperContext/DataMapperContext";
import { EditableRecordField } from "../../../Mappings/EditableRecordField";
import { DataMapperPortWidget, PortState, RecordFieldPortModel } from "../../../Port";
import {
	getDefaultValue,
	getExprBodyFromLetExpression,
	getExprBodyFromTypeCastExpression,
	getInnermostExpressionBody,
	getTypeName,
	isConnectedViaLink
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

import { ArrayTypedEditableRecordFieldWidget } from "./ArrayTypedEditableRecordFieldWidget";
import { ValueConfigMenu } from "./ValueConfigButton";
import { ValueConfigMenuItem } from "./ValueConfigButton/ValueConfigMenuItem";
import { useIONodesStyles } from "../../../../styles";

export interface ArrayTypeOutputWidgetProps {
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

export function ArrayTypeOutputWidget(props: ArrayTypeOutputWidgetProps) {
	const { id, field, getPort, engine, context, typeName, valueLabel, deleteField, unionTypeInfo } = props;
	const classes = useIONodesStyles();

	const [ portState, setPortState ] = useState<PortState>(PortState.Unselected);
	const [isModifyingTypeCast, setIsModifyingTypeCast] = useState(false);

	const body = field && getInnermostExpressionBody(field.value);
	const hasValue = field && field?.elements && field.elements.length > 0;
	const isBodyListConstructor = body && STKindChecker.isListConstructor(body);
	const isBodyQueryExpression = body && STKindChecker.isQueryExpression(body);
	const hasSyntaxDiagnostics = field?.value && field.value.syntaxDiagnostics.length > 0;

	const portIn = getPort(`${id}.IN`);

	let expanded = true;
	if ((portIn && portIn.collapsed)) {
		expanded = false;
	}

	const indentation = (portIn && (!hasValue || !expanded)) ? 0 : 24;
	const shouldPortVisible = (isBodyQueryExpression || !hasSyntaxDiagnostics)
		&& (!hasValue || !expanded || !isBodyListConstructor || (
			STKindChecker.isListConstructor(body) && body.expressions.length === 0
	));

	const hasElementConnectedViaLink = useMemo(() => {
		if (isBodyListConstructor) {
			return body.expressions.some(expr => isConnectedViaLink(expr));
		}
	}, [body]);

	let isDisabled = portIn?.descendantHasValue;
	if (expanded && !isDisabled && isBodyListConstructor && body.expressions.length > 0) {
		portIn.setDescendantHasValue();
		isDisabled = true;
	} else if (!expanded && !hasElementConnectedViaLink && !isDisabled && isBodyListConstructor && body.expressions.length > 0) {
		isDisabled = true;
	}

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
					<span className={classnames(classes.valueLabel, isDisabled ? classes.labelDisabled : "")}>
						<OutputSearchHighlight>{valueLabel}</OutputSearchHighlight>
						{typeName && ":"}
					</span>
				)}
				<span className={classnames(classes.outputTypeLabel, isDisabled ? classes.labelDisabled : "")}>
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
		const resolvedTypeName = getTypeName(field.type);
		const supportedTypes = getSupportedUnionTypes(unionTypeInfo.unionType);
		const hasEmptyListConstructor = isBodyListConstructor && body.expressions.length === 0;

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
					if (!hasEmptyListConstructor) {
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
							title: `Cast type as ${memberTypeName}!`,
							onClick: () => handleWrapWithTypeCast(member, false),
							level: 1,
							warningMsg: INCOMPATIBLE_CASTING_WARNING
						}, {
							title: `Re-initialize as ${memberTypeName}`,
							onClick: () => handleWrapWithTypeCast(member, true),
							level: 1,
							warningMsg: INCOMPATIBLE_CASTING_WARNING
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
				<TreeHeader isSelected={portState !== PortState.Unselected} isDisabled={isDisabled} id={"recordfield-" + id}>
					<span className={classes.inPort}>
						{portIn && shouldPortVisible && (
							<DataMapperPortWidget
								engine={engine}
								port={portIn}
								disable={isDisabled}
								handlePortState={handlePortState}
							/>
						)}
					</span>
					<span className={classes.label}>
						<Button
							id={"expand-or-collapse-" + id}
							appearance="icon"
							tooltip="Expand/Collapse"
							onClick={handleExpand}
							data-testid={`${id}-expand-icon-mapping-target-node`}
							sx={{ marginLeft: indentation }}
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
				{expanded && field && isBodyListConstructor && (
					<TreeBody>
						<ArrayTypedEditableRecordFieldWidget
							key={id}
							engine={engine}
							field={field}
							getPort={getPort}
							parentId={id}
							parentMappingConstruct={undefined}
							context={context}
							deleteField={deleteField}
							isReturnTypeDesc={true}
						/>
					</TreeBody>
				)}
			</TreeContainer>
		</>
	);
}
