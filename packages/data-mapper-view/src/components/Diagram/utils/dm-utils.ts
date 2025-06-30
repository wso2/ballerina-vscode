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
import { NodeModel } from "@projectstorm/react-diagrams";
import {
	LinePosition,
	NonPrimitiveBal,
	STModification,
	keywords,
	PrimitiveBalType,
	TypeField
} from "@wso2/ballerina-core";
import {
	CaptureBindingPattern,
	ExpressionFunctionBody,
	FieldAccess,
	FromClause,
	FunctionCall,
	FunctionDefinition,
	IdentifierToken,
	JoinClause,
	LetClause,
	LetExpression,
	LetVarDecl,
	ListConstructor,
	MappingConstructor,
	MethodCall,
	NodePosition,
	OptionalFieldAccess,
	QueryExpression,
	RequiredParam,
	SelectClause,
	SimpleNameReference,
	SpecificField,
	STKindChecker,
	STNode,
	traversNode,
	TypeCastExpression
} from "@wso2/syntax-tree";
import { PortModel } from "@projectstorm/react-diagrams-core";

import { useDMSearchStore, useDMStore } from "../../../store/store";
import { isPositionsEquals } from "../../../utils/st-utils";
import { DMNode, ViewOption } from "../../DataMapper/DataMapper";
import { ErrorNodeKind } from "../../DataMapper/Error/RenderingError";
import { getLetExpression, getLetExpressions } from "../../DataMapper/LocalVarConfigPanel/local-var-mgt-utils";
import { isArraysSupported } from "../../DataMapper/utils";
import { ExpressionLabelModel, AggregationFunctions } from "../Label";
import { DataMapperLinkModel } from "../Link";
import { ArrayElement, EditableRecordField } from "../Mappings/EditableRecordField";
import { FieldAccessToSpecificFied } from "../Mappings/FieldAccessToSpecificFied";
import {
	LIST_CONSTRUCTOR_NODE_TYPE,
	MappingConstructorNode,
	MAPPING_CONSTRUCTOR_NODE_TYPE, PRIMITIVE_TYPE_NODE_TYPE, QueryExpressionNode,
	QUERY_EXPR_NODE_TYPE, RequiredParamNode,
	REQ_PARAM_NODE_TYPE,
	QueryExprMappingType
} from "../Node";
import { DataMapperNodeModel, TypeDescriptor } from "../Node/commons/DataMapperNode";
import { EnumTypeNode, ENUM_TYPE_SOURCE_NODE_TYPE } from "../Node/EnumType";
import { ExpandedMappingHeaderNode, EXPANDED_MAPPING_HEADER_NODE_TYPE } from "../Node/ExpandedMappingHeader";
import { FromClauseNode, QUERY_EXPR_SOURCE_NODE_TYPE } from "../Node/FromClause";
import { JoinClauseNode, QUERY_EXPR_JOIN_NODE_TYPE } from "../Node/JoinClause";
import { LetClauseNode, QUERY_EXPR_LET_NODE_TYPE } from "../Node/LetClause";
import { LetExpressionNode, LET_EXPR_SOURCE_NODE_TYPE } from "../Node/LetExpression";
import { LinkConnectorNode } from "../Node/LinkConnector";
import { ListConstructorNode } from "../Node/ListConstructor";
import { ModuleVariable, ModuleVariableNode, MODULE_VAR_SOURCE_NODE_TYPE } from "../Node/ModuleVariable";
import { PrimitiveTypeNode } from "../Node/PrimitiveType";
import { UnionTypeNode } from "../Node/UnionType";
import { IntermediatePortModel, MappingType, RecordFieldPortModel, ValueType } from "../Port";
import { FromClauseBindingPatternFindingVisitor } from "../visitors/FromClauseBindingPatternFindingVisitor";
import { InputNodeFindingVisitor } from "../visitors/InputNodeFindingVisitor";
import { ModuleVariablesFindingVisitor } from "../visitors/ModuleVariablesFindingVisitor";

import {
	ENUM_TYPE_SOURCE_PORT_PREFIX,
	EXPANDED_QUERY_SOURCE_PORT_PREFIX,
	FUNCTION_BODY_QUERY,
	JSON_MERGE_MODULE_NAME,
	LET_EXPRESSION_SOURCE_PORT_PREFIX,
	LIST_CONSTRUCTOR_TARGET_PORT_PREFIX,
	MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX,
	MODULE_VARIABLE_SOURCE_PORT_PREFIX,
	PRIMITIVE_TYPE_TARGET_PORT_PREFIX,
	SELECT_CALUSE_QUERY,
	UNION_TYPE_TARGET_PORT_PREFIX,
} from "./constants";
import { FnDefInfo, FunctionDefinitionStore } from "./fn-definition-store";
import { getModification } from "./modifications";
import { TypeDescriptorStore } from "./type-descriptor-store";
import { QueryExprFindingVisitorByPosition } from "../visitors/QueryExprFindingVisitorByPosition";
import { NodeFindingVisitorByPosition } from "../visitors/NodeFindingVisitorByPosition";
import { CustomAction } from "../CodeAction/CodeAction";
import { FunctionCallFindingVisitor } from "../visitors/FunctionCallFindingVisitor";
import { BaseModel } from "@projectstorm/react-canvas-core";
import { getDMTypeDim } from "./type-utils";
import { QueryParentFindingVisitor } from "../visitors/QueryParentFindingVisitor";
import { IDataMapperContext } from "../../../utils/DataMapperContext/DataMapperContext";
import { generateCustomFunction } from "../Link/link-utils";
import { InputNode, NodeWithoutTypeDesc } from "../Actions/utils";

export function getFieldNames(expr: FieldAccess | OptionalFieldAccess) {
	const fieldNames: { name: string, isOptional: boolean }[] = [];
	let nextExp: FieldAccess | OptionalFieldAccess = expr;
	while (nextExp && (STKindChecker.isFieldAccess(nextExp) || STKindChecker.isOptionalFieldAccess(nextExp))) {
		if (STKindChecker.isIndexedExpression(nextExp.expression) && STKindChecker.isFieldAccess(nextExp.expression?.containerExpression)) {
			nextExp = nextExp.expression?.containerExpression;
		} else {
			fieldNames.push({ name: (nextExp.fieldName as SimpleNameReference).name.value, isOptional: STKindChecker.isOptionalFieldAccess(nextExp) });
			if (STKindChecker.isSimpleNameReference(nextExp.expression)) {
				fieldNames.push({ name: nextExp.expression.name.value, isOptional: false });
			}
			nextExp = (STKindChecker.isFieldAccess(nextExp.expression) || STKindChecker.isOptionalFieldAccess(nextExp.expression))
				? nextExp.expression : undefined;
		}
	}
	let isRestOptional = false;
	const fieldsToReturn = fieldNames.reverse().map((item) => {
		if (item.isOptional) {
			isRestOptional = true;
		}
		return { name: item.name, isOptional: isRestOptional || item.isOptional };
	});
	return fieldsToReturn
}

export async function createSourceForMapping(
	sourcePort: RecordFieldPortModel,
	targetPort: RecordFieldPortModel,
	rhsValue?: string
) {
	let source = "";
	let lhs = "";
	let rhs = "";
	const modifications: STModification[] = [];

	const targetNode = targetPort.getNode() as DataMapperNodeModel;
	const fieldIndexes = targetPort && getFieldIndexes(targetPort);
	const { applyModifications } = targetNode.context;

	rhs =  rhsValue || sourcePort.fieldFQN;

	if (isMappedToPrimitiveTypePort(targetPort)
		|| isMappedToRootListConstructor(targetPort)
		|| isMappedToRootMappingConstructor(targetPort)
		|| isMappedToMappingConstructorWithinArray(targetPort)
		|| isMappedToExprFuncBody(targetPort, targetNode.context.selection.selectedST.stNode)) {
		let targetExpr: STNode;
		if (STKindChecker.isLetExpression(targetPort.editableRecordField.value)) {
			targetExpr = getExprBodyFromLetExpression(targetPort.editableRecordField.value);
		} else if (STKindChecker.isQueryExpression(targetPort.editableRecordField.value)) {
			const selectClause = targetPort.editableRecordField.value?.selectClause
				|| targetPort.editableRecordField.value?.resultClause;
			targetExpr = selectClause.expression;
		} else {
			targetExpr = targetPort.editableRecordField.value;
		}
		const valuePosition = targetExpr.position as NodePosition;
		const isValueEmpty = isEmptyValue(valuePosition);
		if (!isValueEmpty) {
			return await updateValueExprSource(rhs, valuePosition, applyModifications);
		}
	} else if (isMappedToSelectClauseExprConstructor(targetPort)) {
		const queryExpr = targetPort.editableRecordField.value as QueryExpression;
		const selectClause = queryExpr?.selectClause || queryExpr?.resultClause;
		const exprPosition = selectClause.expression.position as NodePosition;
		return await updateValueExprSource(rhs, exprPosition, applyModifications);
	} else if (isMappedToRootUnionType(targetPort)) {
		const exprPosition = (targetPort.getParent() as UnionTypeNode).innermostExpr.position as NodePosition;
		return await updateValueExprSource(rhs, exprPosition, applyModifications);
	}

	const targetFieldName = getFieldNameFromOutputPort(targetPort);
	lhs = getBalRecFieldName(targetFieldName);

	// Inserting a new specific field
	let mappingConstruct;
	const parentFieldNames: string[] = [];
	let parent = targetPort.parentModel;
	let fromFieldIdx = -1;

	while (parent != null && parent.parentModel) {
		const parentFieldName = getFieldNameFromOutputPort(parent);
		if (parentFieldName
			&& !(parent.field.typeName === PrimitiveBalType.Record
				&& ([PrimitiveBalType.Array, PrimitiveBalType.Union].includes(parent.parentModel.field.typeName as PrimitiveBalType))
				&& !parent.isWithinSelectClause)
		) {
			parentFieldNames.push(getBalRecFieldName(parentFieldName));
		}
		parent = parent.parentModel;
	}

	if (targetNode instanceof MappingConstructorNode
		|| (targetNode instanceof UnionTypeNode && targetNode.resolvedType.typeName === PrimitiveBalType.Record)) {
		const targetExpr = targetNode.innermostExpr;
		if (STKindChecker.isMappingConstructor(targetExpr)) {
			mappingConstruct = targetExpr;
		} else if (STKindChecker.isLetExpression(targetExpr)) {
			const exprBody = getExprBodyFromLetExpression(targetExpr);
			if (STKindChecker.isMappingConstructor(exprBody)) {
				mappingConstruct = exprBody;
			}
		}
	} else if (targetNode instanceof ListConstructorNode
		|| (targetNode instanceof UnionTypeNode && targetNode.resolvedType.typeName === PrimitiveBalType.Array)) {
		const targetExpr = targetNode.innermostExpr;
		if (STKindChecker.isListConstructor(targetExpr) && fieldIndexes !== undefined && !!fieldIndexes.length) {
			mappingConstruct = getNextMappingConstructor(targetExpr);
		} else if (STKindChecker.isLetExpression(targetExpr)
			&& fieldIndexes !== undefined
			&& !!fieldIndexes.length) {
			const exprBody = getExprBodyFromLetExpression(targetExpr);
			if (STKindChecker.isListConstructor(exprBody)) {
				mappingConstruct = getNextMappingConstructor(exprBody);
			}
		}
	}

	let targetMappingConstruct = mappingConstruct;

	if (parentFieldNames.length > 0) {
		const fieldNames = parentFieldNames.reverse();

		for (let i = 0; i < fieldNames.length; i++) {
			const fieldName = fieldNames[i];
			const specificField = getSpecificField(mappingConstruct, fieldName);

			if (specificField && specificField.valueExpr) {
				const valueExpr = specificField.valueExpr;

				if (!valueExpr.source) {
					return await createValueExprSource(lhs, rhs, fieldNames, i, specificField.colon.position as NodePosition,
						applyModifications);
				}

				const innerExpr = getInnermostExpressionBody(valueExpr);
				if (STKindChecker.isMappingConstructor(innerExpr)) {
					mappingConstruct = innerExpr;
				} else if (STKindChecker.isListConstructor(innerExpr)
					&& fieldIndexes !== undefined && !!fieldIndexes.length) {
					mappingConstruct = getNextMappingConstructor(innerExpr);
				}

				if (i === fieldNames.length - 1) {
					targetMappingConstruct = mappingConstruct;
				}
			} else {
				fromFieldIdx = i;
				targetMappingConstruct = mappingConstruct;
				break;
			}
		}

		if (fromFieldIdx >= 0 && fromFieldIdx <= fieldNames.length) {
			const missingFields = fieldNames.slice(fromFieldIdx);
			source = createSpecificField(missingFields);
		} else {
			const specificField = getSpecificField(targetMappingConstruct, lhs);
			if (specificField && !specificField.valueExpr.source) {
				return await createValueExprSource(lhs, rhs, [], 0, specificField.colon.position as NodePosition,
					applyModifications);
			}
			source = `${lhs}: ${rhs}`;
		}
	} else {
		const specificField = getSpecificField(targetMappingConstruct, lhs);
		if (specificField && !specificField.valueExpr.source) {
			return await createValueExprSource(lhs, rhs, [], 0, specificField.colon.position as NodePosition, applyModifications);
		}
		source = `${lhs}: ${rhs}`;
	}

	let targetPosition: NodePosition;
	if (targetMappingConstruct) {
		const fieldsAvailable = !!targetMappingConstruct.fields.length;
		if (fieldsAvailable) {
			const lastField = mappingConstruct.fields[mappingConstruct.fields.length - 1];
			targetPosition = lastField.position as NodePosition;
			source = STKindChecker.isSpecificField(lastField) && isEmptyValue(lastField.position)
				? source
				: `,${getLinebreak()}${source}`;
		} else {
			targetPosition = mappingConstruct.openBrace.position as NodePosition;
			source = `${getLinebreak()}${source}`
		}
		targetPosition = {
			...targetPosition,
			startLine: targetPosition.endLine,
			startColumn: targetPosition.endColumn
		}
	} else if (targetNode instanceof MappingConstructorNode) {
		targetPosition = targetNode.innermostExpr.position as NodePosition;
		source = `{${getLinebreak()}${source}}`;
	}

	modifications.push(getModification(source, targetPosition));
	await applyModifications(modifications);

	function createSpecificField(missingFields: string[]): string {
		return missingFields.length > 0
			? `\t${missingFields[0]}: {${getLinebreak()}${createSpecificField(missingFields.slice(1))}}`
			: `\t${lhs}: ${rhs}`;
	}

	function getNextMappingConstructor(listConstructor: ListConstructor): MappingConstructor {
		const targetExpr = listConstructor.expressions[fieldIndexes.pop() * 2];
		const innerExpr = getInnermostExpressionBody(targetExpr);
		if (STKindChecker.isMappingConstructor(innerExpr)) {
			return innerExpr;
		} else if (STKindChecker.isListConstructor(innerExpr)) {
			return getNextMappingConstructor(innerExpr);
		}
	}

	return `${lhs} = ${rhs}`;
}

export async function createSourceForUserInput(
	field: EditableRecordField,
	mappingConstruct: MappingConstructor,
	newValue: string,
	applyModifications: (modifications: STModification[]) => Promise<void>
) {

	let source;
	let targetMappingConstructor: STNode = mappingConstruct;
	const parentFields: string[] = [];
	let nextField = field;
	const modifications: STModification[] = [];

	while (nextField && nextField.parentType) {
		const fieldName = getFieldName(nextField);
		const innerExpr = nextField.hasValue() && getInnermostExpressionBody(nextField.value);
		if (fieldName && !(innerExpr && STKindChecker.isMappingConstructor(innerExpr))) {
			parentFields.push(getBalRecFieldName(fieldName));
		}

		if (nextField.parentType.hasValue() && STKindChecker.isSpecificField(nextField.parentType.value)) {
			const rootField: SpecificField = nextField.parentType.value;

			if (!rootField.valueExpr.source) {
				return await createValueExprSource(fieldName, newValue, parentFields.reverse(), 0,
					rootField.colon.position as NodePosition, applyModifications);
			}

			const rootInnerExpr = getInnermostExpressionBody(rootField.valueExpr);
			if (STKindChecker.isMappingConstructor(rootInnerExpr)) {
				const specificField = getSpecificField(rootInnerExpr, fieldName);
				if (specificField && !specificField.valueExpr.source) {
					return await createValueExprSource(fieldName, newValue, parentFields, 1,
						specificField.colon.position as NodePosition, applyModifications);
				}
				source = createSpecificField(parentFields.reverse());
				targetMappingConstructor = rootInnerExpr;
			} else if (STKindChecker.isListConstructor(rootInnerExpr)
				&& STKindChecker.isMappingConstructor(rootInnerExpr.expressions[0])) {
				for (const expr of rootInnerExpr.expressions) {
					if (STKindChecker.isMappingConstructor(expr)
						&& isPositionsEquals(expr.position as NodePosition, mappingConstruct.position as NodePosition)) {
						const specificField = getSpecificField(expr, fieldName);
						if (specificField && !specificField.valueExpr.source) {
							return await createValueExprSource(fieldName, newValue, parentFields, 1,
								specificField.colon.position as NodePosition, applyModifications);
						}
						source = createSpecificField(parentFields.reverse());
						targetMappingConstructor = expr;
					}
				}
			}
			nextField = undefined;
		} else {
			nextField = nextField?.parentType;
		}
	}

	if (!source) {
		const specificField = STKindChecker.isMappingConstructor(targetMappingConstructor)
			&& getSpecificField(targetMappingConstructor, getFieldName(field));
		if (specificField && !specificField.valueExpr.source) {
			return await createValueExprSource(field.originalType.name, newValue, parentFields, 1,
				specificField.colon.position as NodePosition, applyModifications);
		}
		source = createSpecificField(parentFields.reverse());
	}

	let targetPosition: NodePosition;
	if (STKindChecker.isMappingConstructor(targetMappingConstructor)) {
		const fieldsAvailable = !!targetMappingConstructor.fields.length;
		if (fieldsAvailable) {
			targetPosition = targetMappingConstructor.fields[targetMappingConstructor.fields.length - 1].position as NodePosition;
			source = `,${source}`;
		} else {
			const openBracePosition = targetMappingConstructor.openBrace.position as NodePosition;
			const closeBracePosition = targetMappingConstructor.closeBrace.position as NodePosition;
			targetPosition = openBracePosition;
			if (openBracePosition.startLine === closeBracePosition.endLine) {
				source = `${getLinebreak()}${source}`;
			}
		}
		targetPosition = {
			...targetPosition,
			startLine: targetPosition.endLine,
			startColumn: targetPosition.endColumn
		}
	} else {
		targetPosition = targetMappingConstructor.position as NodePosition;
		source = `{${getLinebreak()}${source}}`;
	}

	modifications.push(getModification(source, targetPosition));
	await applyModifications(modifications);

	function createSpecificField(missingFields: string[]): string {
		return missingFields.length > 1
			? `\t${missingFields[0]}: {${getLinebreak()}${createSpecificField(missingFields.slice(1))}}`
			: `\t${missingFields[0]}: ${newValue}`;
	}
}

export function modifySpecificFieldSource(
	sourcePort: RecordFieldPortModel,
	targetPort: RecordFieldPortModel,
	newLinkId: string,
	rhsValue?: string
) {
	let rhs = "";
	const modifications: STModification[] = [];
	if (sourcePort && sourcePort instanceof RecordFieldPortModel) {
		rhs = rhsValue || sourcePort.fieldFQN;
	}

	const targetNode = targetPort.getNode();
	if (targetNode instanceof LinkConnectorNode) {
		targetNode.value = targetNode.value + " + " + rhs;
		targetNode.updateSource();
	}
	else {
		let targetPos: NodePosition;
		let targetType: TypeField;
		Object.keys(targetPort.getLinks()).forEach((linkId) => {
			if (linkId !== newLinkId) {
				const targerPortLink = targetPort.getLinks()[linkId]
				if (sourcePort instanceof IntermediatePortModel) {
					if (sourcePort.getParent() instanceof LinkConnectorNode) {
						targetPos = (sourcePort.getParent() as LinkConnectorNode).valueNode.position as NodePosition
					}
				} else if (targerPortLink.getLabels().length > 0) {
					targetPos = (targerPortLink.getLabels()[0] as ExpressionLabelModel).valueNode.position as NodePosition;
					targetType = getTypeFromStore(targetPos);
				} else if (targetNode instanceof MappingConstructorNode
					|| targetNode instanceof PrimitiveTypeNode
					|| targetNode instanceof ListConstructorNode)
				{
					const linkConnector = targetNode
						.getModel()
						.getNodes()
						.find(
							(node) =>
								node instanceof LinkConnectorNode &&
								node.targetPort.portName === (targerPortLink.getTargetPort() as RecordFieldPortModel).portName
						);
					targetPos = (linkConnector as LinkConnectorNode).valueNode.position as NodePosition;
				}

			}
		});
		if (targetType &&
			targetType.typeName === PrimitiveBalType.Json &&
			(sourcePort as RecordFieldPortModel).field.typeName === PrimitiveBalType.Json) {
			modifications.push({
				type: "INSERT",
				config: {
					"STATEMENT": `value:mergeJson(${(targetNode as UnionTypeNode).recordField.value.source}, ${(sourcePort as RecordFieldPortModel).fieldFQN})`,
				},
				...targetPos
			})

			// add imports
			modifications.push({
				type: "IMPORT",
				config: {
					"TYPE": JSON_MERGE_MODULE_NAME,
				},
				startLine: 0,
				startColumn: 0,
				endLine: 0,
				endColumn: 0
			});

			const { context } = targetNode as DataMapperNodeModel;
			void context.applyModifications(modifications);
		} else if (targetPos) {
			modifications.push({
				type: "INSERT",
				config: {
					"STATEMENT": " + " + rhs,
				},
				endColumn: targetPos.endColumn,
				endLine: targetPos.endLine,
				startColumn: targetPos.endColumn,
				startLine: targetPos.endLine
			});
		}
		const { context } = targetNode as DataMapperNodeModel;
		void context.applyModifications(modifications);
	}

}

export async function updateExistingValue(sourcePort: PortModel, targetPort: PortModel, newValue?: string) {
	const modifications = [];
	let sourceField = newValue || sourcePort && sourcePort instanceof RecordFieldPortModel && sourcePort.fieldFQN;
	modifications.push(getModificationForSpecificFieldValue(targetPort, sourceField));
	replaceSpecificFieldValue(targetPort, modifications);
}

export async function mapUsingCustomFunction(
	sourcePort: RecordFieldPortModel,
	targetPort: RecordFieldPortModel,
	linkId: string,
	context: IDataMapperContext,
	valueType: ValueType
) {
	const existingFunctions = context.moduleComponents.functions.map((fn) => fn.name);
	const [functionName, functionSource] = generateCustomFunction(sourcePort, targetPort, existingFunctions);
	const functionCallExpr = `${functionName}(${sourcePort.fieldFQN})`;

	const modifications: STModification[] = [];

	const customFnPosition: NodePosition = {
		...context.functionST.position,
		startLine: context.functionST.position.endLine,
		startColumn: context.functionST.position.endColumn
	}

	modifications.push({
		type: "INSERT",
		config: {
			"STATEMENT": functionSource,
		},
		...customFnPosition
	});

	await context.applyModifications(modifications);

	if (valueType === ValueType.Default) {
		await updateExistingValue(sourcePort, targetPort, functionCallExpr);
	} else if (valueType === ValueType.NonEmpty) {
		await modifySpecificFieldSource(sourcePort, targetPort, linkId, functionCallExpr);
	} else {
		await createSourceForMapping(sourcePort, targetPort, functionCallExpr);
	}

	// Navigate to the data mapper function
	// TODO: Instead creating custom function from the front-end, we should use a LS API to create the function
	// and then navigate to the function by using the position returned by the LS API
	context.goToSource({
		...context.functionST.position,
		endLine: context.functionST.position.startLine,
		endColumn: context.functionST.position.startColumn
	});
}

export function replaceSpecificFieldValue(targetPort: PortModel, modifications: STModification[]) {
	const targetNode = (targetPort as RecordFieldPortModel).getNode();
	const { context } = targetNode as DataMapperNodeModel;
	void context.applyModifications(modifications);
}

export function expandArrayFn(node: QueryExpressionNode) {
	let isExprBodyQuery: boolean;
	let isSelectClauseQuery: boolean;

	const { parentNode, value, context, targetPort: { fieldFQN } } = node;
	const { selection, changeSelection } = context;
	const selectedST = selection.selectedST.stNode;


	let exprFnBody: ExpressionFunctionBody;
	if (STKindChecker.isFunctionDefinition(selectedST) && STKindChecker.isExpressionFunctionBody(selectedST.functionBody)) {
        exprFnBody = selectedST.functionBody;
    }

	if (STKindChecker.isBracedExpression(parentNode)) {
		// Handle scenarios where user tries to expand into
		// braced indexed query expressions which are at the function body level
		const specificFieldFindingVisitor = new QueryParentFindingVisitor(value.position);
		traversNode(selectedST, specificFieldFindingVisitor);
		const specificField = specificFieldFindingVisitor.getSpecificField();
		if (specificField && STKindChecker.isFunctionDefinition(specificField)) {
			isExprBodyQuery = true;
		}
	} else if (exprFnBody && isRepresentFnBody(parentNode, exprFnBody)) {
		isExprBodyQuery = true;
	} else if (STKindChecker.isSelectClause(parentNode)
		|| (STKindChecker.isSpecificField(parentNode)
			&& STKindChecker.isQueryExpression(parentNode.valueExpr)
			&& !isPositionsEquals(value.position, parentNode.valueExpr.position))
	) {
		isSelectClauseQuery = true;
	}
	let selectClauseIndex: number;
	if (isSelectClauseQuery) {
		const queryExprFindingVisitor = new QueryExprFindingVisitorByPosition(value.position);
		traversNode(selectedST, queryExprFindingVisitor);
		selectClauseIndex = queryExprFindingVisitor.getSelectClauseIndex();
	}

	const hasIndexedQuery = hasIndexedQueryExpr(parentNode);
	const hasCollectClause = hasCollectClauseExpr(value);
	const mappingType = getQueryExprMappingType(hasIndexedQuery, hasCollectClause);
	changeSelection(ViewOption.EXPAND,
		{
			...selection,
			selectedST: {
				stNode: isExprBodyQuery || isSelectClauseQuery ? selectedST : parentNode,
				fieldPath: isExprBodyQuery ? FUNCTION_BODY_QUERY : isSelectClauseQuery ? SELECT_CALUSE_QUERY : fieldFQN,
				position: value.position,
				index: selectClauseIndex,
				mappingType: mappingType,
			}
		})
}

export function getModificationForSpecificFieldValue(
	targetPort: PortModel,
	newSource: string
): STModification {
	if (targetPort instanceof RecordFieldPortModel) {
		const editableRecordField = targetPort.editableRecordField;
		let targetPosition: NodePosition;
		if (editableRecordField?.value) {
			let expr = editableRecordField.value;
			if (STKindChecker.isSpecificField(expr)) {
				expr = expr.valueExpr;
			}
			const innerExpr = getInnermostExpressionBody(expr);
			targetPosition = innerExpr.position as NodePosition;
		}
		if (targetPosition) {
			return {
				type: "INSERT",
				config: {
					"STATEMENT": newSource,
				},
				...targetPosition
			};
		}
	}
}

export function getModificationForFromClauseBindingPattern(
	queryExprPosition: NodePosition,
	bindingPatternSrc: string,
	selectedSTNode: STNode
): STModification {
	const nodeFindingVisitor = new NodeFindingVisitorByPosition(queryExprPosition);
	traversNode(selectedSTNode, nodeFindingVisitor);
	const queryExpr = nodeFindingVisitor.getNode() as QueryExpression;

	if (queryExpr) {
		return {
			type: "INSERT",
			config: {
				"STATEMENT": bindingPatternSrc,
			},
			...queryExpr.queryPipeline.fromClause.typedBindingPattern.bindingPattern.position
		};
	}
}

export function findNodeByValueNode(value: STNode,
	                                   dmNode: DataMapperNodeModel
): RequiredParamNode | FromClauseNode | LetClauseNode | JoinClauseNode | LetExpressionNode {
	let foundNode: RequiredParamNode | FromClauseNode | LetClauseNode | JoinClauseNode | LetExpressionNode;
	if (value) {
		dmNode.getModel().getNodes().find((node) => {
			if (((STKindChecker.isRequiredParam(value) && node instanceof RequiredParamNode
				&& node?.value && STKindChecker.isRequiredParam(node.value))
				|| (STKindChecker.isFromClause(value) && node instanceof FromClauseNode
					&& STKindChecker.isFromClause(node.value))
				|| (STKindChecker.isLetClause(value) && node instanceof LetClauseNode
					&& STKindChecker.isLetClause(node.value))
				|| (STKindChecker.isJoinClause(value) && node instanceof JoinClauseNode
					&& STKindChecker.isJoinClause(node.value))
				|| (STKindChecker.isExpressionFunctionBody(value) && node instanceof LetExpressionNode
					&& STKindChecker.isExpressionFunctionBody(node.value)))
				&& isPositionsEquals(value.position as NodePosition, node.value.position as NodePosition)) {
				foundNode = node;
			}
		});
	}
	return foundNode;
}

export function getInputNodeExpr(expr: STNode, dmNode: DataMapperNodeModel) {
	const dmNodes = dmNode.getModel().getNodes();
	let paramType: LetClauseNode | LetExpressionNode | RequiredParamNode | FromClauseNode | ModuleVariableNode | EnumTypeNode;
	let paramNode: RequiredParam | FromClause | LetClause | JoinClause | ExpressionFunctionBody | Map<string, ModuleVariable>;
	if (STKindChecker.isSimpleNameReference(expr)) {
		paramType = (dmNodes.find((node) => {
			if (node instanceof LetClauseNode) {
				const letVarDecl = node.value.letVarDeclarations[0] as LetVarDecl;
				const bindingPattern = letVarDecl?.typedBindingPattern?.bindingPattern as CaptureBindingPattern;
				return bindingPattern?.variableName?.value === expr.source.trim();
			} else if (node instanceof LetExpressionNode) {
				return node.letVarDecls.some(decl => decl.varName === expr.source.trim());
			} else if (node instanceof ModuleVariableNode || node instanceof EnumTypeNode) {
				return node.value.has(expr.source.trim());
			} else if (node instanceof JoinClauseNode) {
				const bindingPattern = (node.value as JoinClause)?.typedBindingPattern?.bindingPattern as CaptureBindingPattern
				return bindingPattern?.source?.trim() === expr.source?.trim()
			} else if (node instanceof RequiredParamNode) {
				return node?.value && expr.name.value === node.value.paramName.value;
			} else if (node instanceof FromClauseNode) {
				const bindingPattern = node.value.typedBindingPattern.bindingPattern;
				return isAvailableWithinBindingPattern(bindingPattern, expr.name.value );
			}
		}) as LetClauseNode | LetExpressionNode | RequiredParamNode | FromClauseNode | ModuleVariableNode | EnumTypeNode);
		paramNode = paramType?.value;
	} else if (STKindChecker.isFieldAccess(expr) || STKindChecker.isOptionalFieldAccess(expr)) {
		const valueExpr = getInnerExpr(expr);
		
		if (valueExpr && STKindChecker.isSimpleNameReference(valueExpr)) {
			const { selectedST } = dmNode.context.selection;
			const { stNode: selectedSTNode, fieldPath, position } = selectedST;
			const isSpecificFieldValueQueryExpr = STKindChecker.isSpecificField(selectedSTNode)
				&& STKindChecker.isQueryExpression(selectedSTNode.valueExpr);
			const isSelectClauseExprQueryExpr = isSelectClauseQueryExpr(fieldPath);
			paramNode = dmNode.context.functionST.functionSignature.parameters.find((param) =>
					!isSpecificFieldValueQueryExpr
					&& !isSelectClauseExprQueryExpr
					&& STKindChecker.isRequiredParam(param)
					&& param.paramName?.value === (valueExpr as SimpleNameReference).name.value
				) as RequiredParam;

			if (!paramNode) {
				// Check if value expression source matches with any of the let clause, let expr or module variable names
				paramNode = (dmNodes.find((node) => {
					if (node instanceof LetClauseNode) {
						const letVarDecl = node.value.letVarDeclarations[0] as LetVarDecl;
						const bindingPattern = letVarDecl?.typedBindingPattern?.bindingPattern as CaptureBindingPattern;
						return bindingPattern?.variableName?.value === valueExpr.source;
					} else if (node instanceof LetExpressionNode) {
						return node.letVarDecls.some(decl => {
							if (decl.type.typeName === PrimitiveBalType.Record) {
								return decl.varName === expr.source.trim().split(".")[0]
							}
							return decl.varName === expr.source.trim()
						});
					} else if (node instanceof ModuleVariableNode) {
						return node.moduleVarDecls.some(decl => {
							if (decl.type.typeName === PrimitiveBalType.Record) {
								return decl.varName === expr.source.trim().split(".")[0]
							}
							return decl.varName === expr.source.trim()
						});
					} else if (node instanceof JoinClauseNode) {
						const bindingPattern = (node.value as JoinClause)?.typedBindingPattern?.bindingPattern as CaptureBindingPattern
						return bindingPattern?.source?.trim() === valueExpr.source
					} else if (node instanceof EnumTypeNode) {
						return node.enumTypeDecls.some(decl => {
							return decl.varName === expr.source.trim()
						});
					}
				}) as LetClauseNode | JoinClauseNode | LetExpressionNode | ModuleVariableNode | EnumTypeNode)?.value;
			}

			if (!paramNode) {
				if (isSpecificFieldValueQueryExpr && !isSelectClauseExprQueryExpr) {
					paramNode = (selectedSTNode.valueExpr as QueryExpression).queryPipeline.fromClause;
				} else if (isSelectClauseExprQueryExpr) {
					const queryExprFindingVisitor = new QueryExprFindingVisitorByPosition(position);
					traversNode(selectedSTNode, queryExprFindingVisitor);
					const queryExpr = queryExprFindingVisitor.getQueryExpression();
					paramNode = queryExpr ? queryExpr.queryPipeline.fromClause : paramNode;
				} else if (STKindChecker.isSpecificField(selectedSTNode)
					&& STKindChecker.isBracedExpression(selectedSTNode.valueExpr)
					&& STKindChecker.isQueryExpression(selectedSTNode.valueExpr.expression)) {
					paramNode = selectedSTNode.valueExpr.expression.queryPipeline.fromClause;
				} else if (STKindChecker.isSpecificField(selectedSTNode)
					&& STKindChecker.isIndexedExpression(selectedSTNode.valueExpr)
					&& STKindChecker.isBracedExpression(selectedSTNode.valueExpr.containerExpression)
					&& STKindChecker.isQueryExpression(selectedSTNode.valueExpr.containerExpression.expression)) {
					paramNode = selectedSTNode.valueExpr.containerExpression.expression.queryPipeline.fromClause;
				} else if (STKindChecker.isFunctionDefinition(selectedSTNode)
					&& STKindChecker.isExpressionFunctionBody(selectedSTNode.functionBody)
					&& STKindChecker.isIndexedExpression(selectedSTNode.functionBody.expression)
					&& STKindChecker.isBracedExpression(selectedSTNode.functionBody.expression.containerExpression)
					&& STKindChecker.isQueryExpression(selectedSTNode.functionBody.expression.containerExpression.expression)) {
					paramNode = selectedSTNode.functionBody.expression.containerExpression.expression.queryPipeline.fromClause;
				} else if (STKindChecker.isLetVarDecl(selectedSTNode) && STKindChecker.isQueryExpression(selectedSTNode.expression)) {
					paramNode = selectedSTNode.expression.queryPipeline.fromClause;
				} else if (STKindChecker.isFunctionDefinition(selectedSTNode)
					&& STKindChecker.isExpressionFunctionBody(selectedSTNode.functionBody)) {
					const bodyExpr = STKindChecker.isLetExpression(selectedSTNode.functionBody.expression)
						? getExprBodyFromLetExpression(selectedSTNode.functionBody.expression)
						: selectedSTNode.functionBody.expression;
					if (STKindChecker.isQueryExpression(bodyExpr)) {
						paramNode = bodyExpr.queryPipeline.fromClause;
					}
				}
			}
		}
	}
	if (paramNode) {
		if (paramNode instanceof Map) {
			if (paramType instanceof ModuleVariableNode) {
				return dmNodes.find(node => node instanceof ModuleVariableNode) as ModuleVariableNode;
			} else if (paramType instanceof EnumTypeNode) {
				return dmNodes.find(node => node instanceof EnumTypeNode) as EnumTypeNode;
			}
		} else {
			return findNodeByValueNode(paramNode, dmNode);
		}
	}
}

export function getInputPortsForExpr(node: InputNode, expr: STNode ): RecordFieldPortModel {
	let typeDesc = !isNodeWithoutTypeDesc(node) && node.typeDef;
	let portIdBuffer;
	if (node instanceof RequiredParamNode) {
		portIdBuffer = node?.value && node.value.paramName.value
	} else if (node instanceof LetExpressionNode) {
		const varDecl = node.letVarDecls.find(decl => {
			if (decl.type.typeName === PrimitiveBalType.Record) {
				return decl.varName === expr.source.trim().split(".")[0];
			}
			return decl.varName === expr.source.trim()
		});
		typeDesc = varDecl.type;
		portIdBuffer = varDecl && LET_EXPRESSION_SOURCE_PORT_PREFIX + "." + varDecl.varName;
	} else if (node instanceof ModuleVariableNode) {
		const moduleVar = node.moduleVarDecls.find(decl => {
			if (decl.type.typeName === PrimitiveBalType.Record) {
				return decl.varName === expr.source.trim().split(".")[0];
			}
			return decl.varName === expr.source.trim();
		});
		typeDesc = moduleVar?.type;
		portIdBuffer = moduleVar && MODULE_VARIABLE_SOURCE_PORT_PREFIX + "." + moduleVar.varName;
	} else if (node instanceof EnumTypeNode) {
		for (const enumType of node.enumTypeDecls) {
			for (const field of enumType.fields) {
				if (field.varName === expr.source.trim()) {
					typeDesc = field.type;
					portIdBuffer = `${ENUM_TYPE_SOURCE_PORT_PREFIX}.${enumType.varName}.${field.varName}`;
					break;
				}
			}
		}
	} else if (node instanceof FromClauseNode
		&& (STKindChecker.isMappingBindingPattern(node.sourceBindingPattern)
			|| STKindChecker.isListBindingPattern(node.sourceBindingPattern))
	) {
		const fieldPath = getRelativePathOfField(node.value.typedBindingPattern.bindingPattern, expr.source.trim());
		portIdBuffer = EXPANDED_QUERY_SOURCE_PORT_PREFIX + "." + node.nodeLabel + fieldPath;
		return (node.getPort(portIdBuffer + ".OUT") as RecordFieldPortModel);
	} else {
		portIdBuffer = EXPANDED_QUERY_SOURCE_PORT_PREFIX + "." + (node as FromClauseNode).nodeLabel;
	}

	if (typeDesc && typeDesc.typeName === PrimitiveBalType.Record) {
		if (STKindChecker.isFieldAccess(expr) || STKindChecker.isOptionalFieldAccess(expr)) {
			const fieldNames = getFieldNames(expr);
			let nextTypeNode: TypeField = typeDesc;
			for (let i = 1; i < fieldNames.length; i++) {
				const fieldName = fieldNames[i];
				portIdBuffer += `.${fieldName.name}`;
				let recField: TypeField;
				const optionalRecordField = getOptionalRecordField(nextTypeNode);
				if (optionalRecordField) {
					recField = optionalRecordField?.fields.find((field: TypeField) => getBalRecFieldName(field.name) === fieldName.name);
				} else if (nextTypeNode.typeName === PrimitiveBalType.Record) {
					recField = nextTypeNode.fields.find(
						(field: TypeField) => getBalRecFieldName(field.name) === fieldName.name);
				}

				if (recField) {
					if (i === fieldNames.length - 1) {
						const portId = portIdBuffer.trim() + ".OUT";
						let port = (node.getPort(portId) as RecordFieldPortModel);
						while (port && port.hidden) {
							port = port.parentModel;
						}
						return port;
					} else if ([PrimitiveBalType.Record, PrimitiveBalType.Union].includes(recField.typeName as PrimitiveBalType)) {
						nextTypeNode = recField;
					}
				}
			}
		} else if (STKindChecker.isSimpleNameReference(expr)){
			return (node.getPort(portIdBuffer + ".OUT") as RecordFieldPortModel);
		}
	} else if (STKindChecker.isSimpleNameReference(expr)) {
		const portId = portIdBuffer + ".OUT";
		let port = (node.getPort(portId) as RecordFieldPortModel);
		while (port && port.hidden) {
			port = port.parentModel;
		}
		return port;
	}
	return null;
}

export function getOutputPortForField(fields: STNode[],
                                      editableRecordField: EditableRecordField,
                                      portPrefix: string,
                                      getPort: (portId: string) => RecordFieldPortModel,
                                      listConstructorRootName?: string): [RecordFieldPortModel, RecordFieldPortModel] {
	let portIdBuffer = `${portPrefix}${listConstructorRootName ? `.${getBalRecFieldName(listConstructorRootName)}` : ''}`;
	let nextTypeNode: EditableRecordField = editableRecordField;

	for (let i = 0; i < fields.length; i++) {
		const field = fields[i];
		const next = i + 1 < fields.length && fields[i + 1];
		const nextPosition: NodePosition = next ? next.position : field.position;
		if (STKindChecker.isSpecificField(field) && STKindChecker.isSpecificField(nextTypeNode.value)) {
			const isLastField = i === fields.length - 1;
			const innerExprOfNextTypeNode = getInnermostExpressionBody(nextTypeNode.value.valueExpr);
			const innerExprOfFieldValue = getInnermostExpressionBody(field?.valueExpr);
			const targetPosition: NodePosition = isLastField
				? nextTypeNode.value.position
				: field?.valueExpr && innerExprOfNextTypeNode.position;
			if (isPositionsEquals(targetPosition, nextPosition)
				&& field.valueExpr
				&& !STKindChecker.isMappingConstructor(innerExprOfFieldValue))
			{
				portIdBuffer = `${portIdBuffer}.${getBalRecFieldName(field.fieldName.value)}`;
			}
		} else if (STKindChecker.isListConstructor(field) && nextTypeNode.elements) {
			const [nextField, fieldIndex] = getNextField(nextTypeNode.elements, nextPosition);
			if (nextField && fieldIndex !== -1) {
				portIdBuffer = `${portIdBuffer}.${fieldIndex}`;
				nextTypeNode = nextField;
			}
		} else {
			if (nextTypeNode.childrenTypes) {
				const fieldIndex = nextTypeNode.childrenTypes.findIndex(recF => {
					const innerExpr = recF?.value && getInnermostExpressionBody(recF.value);
					return innerExpr && isPositionsEquals(nextPosition, innerExpr.position as NodePosition);
				});
				if (fieldIndex !== -1) {
					portIdBuffer = `${portIdBuffer}${nextTypeNode.originalType?.name ? `.${getBalRecFieldName(nextTypeNode.originalType.name)}` : ''}`;
					nextTypeNode = nextTypeNode.childrenTypes[fieldIndex];
				} else if (isPositionsEquals(nextPosition, nextTypeNode?.value.position)) {
					portIdBuffer = `${portIdBuffer}${nextTypeNode.originalType?.name ? `.${getBalRecFieldName(nextTypeNode.originalType.name)}` : ''}`;
				}
			} else if (nextTypeNode.elements) {
				const [nextField, fieldIndex] = getNextField(nextTypeNode.elements, nextPosition);
				if (nextField && fieldIndex !== -1) {
					portIdBuffer = `${portIdBuffer}.${getBalRecFieldName(nextField.originalType?.name) || ''}`;
				}
			}
		}
	}

	const outputSearchValue = useDMSearchStore.getState().outputSearch;
	const memberAccessRegex = /\.\d+$/;
	const isMemberAccessPattern = memberAccessRegex.test(portIdBuffer);
	const lastPortIdSegment = portIdBuffer.split('.').slice(-1)[0];
	if (outputSearchValue !== ''
		&& !isMemberAccessPattern
		&& !lastPortIdSegment.toLowerCase().includes(outputSearchValue.toLowerCase()))
	{
		return [undefined, undefined];
	}
	const portId = `${portIdBuffer}.IN`;
	const port = getPort(portId);
	let mappedPort = port;
	while (mappedPort && mappedPort.hidden) {
		mappedPort = mappedPort.parentModel;
	}
	return [port, mappedPort];
}

export function getLinebreak(){
	if (navigator.userAgent.indexOf("Windows") !== -1){
		return "\r\n";
	}
	return "\n";
}

function getNextField(nextTypeMemberNodes: ArrayElement[],
                      nextFieldPosition: NodePosition): [EditableRecordField, number] {
	const fieldIndex = nextTypeMemberNodes.findIndex((node) => {
		const innerExpr = node.member?.value && getInnermostExpressionBody(node.member.value);
		return innerExpr && isPositionsEquals(nextFieldPosition, innerExpr.position as NodePosition);
	});
	if (fieldIndex !== -1) {
		return [nextTypeMemberNodes[fieldIndex].member, fieldIndex];
	}
	return [undefined, undefined];
}

export function getBalRecFieldName(fieldName: string) {
	if (fieldName) {
		return keywords.includes(fieldName) ? `'${fieldName}` : fieldName;
	}
	return "";
}

export function getFieldIndexes(targetPort: RecordFieldPortModel): number[] {
	const fieldIndexes = [];
	if (targetPort?.index !== undefined) {
		fieldIndexes.push(targetPort.index);
	}
	const parentPort = targetPort?.parentModel;
	if (parentPort) {
		fieldIndexes.push(...getFieldIndexes(parentPort));
	}
	return fieldIndexes;
}

export function isConnectedViaLink(field: STNode) {
	const inputNodes = getInputNodes(field);

	const isMappingConstruct = STKindChecker.isMappingConstructor(field);
	const isListConstruct = STKindChecker.isListConstructor(field);
	const isQueryExpression = STKindChecker.isQueryExpression(field);
	const isSimpleNameRef = STKindChecker.isSimpleNameReference(field);

	return (!!inputNodes.length || isQueryExpression || isSimpleNameRef)
		&& !isMappingConstruct && !isListConstruct;
}

export function getTypeName(field: TypeField): string {
	if (!field) {
		return '';
	}
	let typeName = '';
	const importStatements = useDMStore.getState().imports;
	if (field.typeName === PrimitiveBalType.Record) {
		typeName = 'record';
		if (field?.typeInfo) {
			const { orgName, moduleName, name } = field.typeInfo;
			typeName = name;
			const importStatement = importStatements.find(item => item.includes(`${orgName}/${moduleName}`));
			if (importStatement) {
				// If record is from an imported package
				const importAlias = extractImportAlias(moduleName, importStatement);
				typeName = `${importAlias || moduleName}:${name}`;
			}
		}
	} else if (field.typeName === PrimitiveBalType.Array && field?.memberType) {
		typeName = getTypeName(field.memberType);
		typeName = field.memberType.typeName === PrimitiveBalType.Union ? `(${typeName})[]` : `${typeName}[]`;
	} else if (field.typeName === PrimitiveBalType.Union) {
		typeName = field.members?.map(item => getTypeName(item)).join('|');
	} else if (field?.typeInfo) {
		typeName = field.typeInfo.name;
	} else {
		typeName = field.typeName;
	}

	return getShortenedTypeName(typeName);
}

export function normalizeTypeName(typeName: string) {
    // Handle union types first
    if (typeName.includes('|')) {
        const types = typeName.split('|').map(t => t.trim());
        const transformedTypes = types.map(type => {
            const arrayDim = (type.match(/\[]/g) || []).length;
            const baseName = type.replace(/\[]/g, '');
            return arrayDim > 0 ? `${baseName}${arrayDim}DArray` : baseName;
        });
        return transformedTypes.join('Or');
    }

    let baseName = typeName.replace(/\[]/g, '');

	// Handle imported types
	if (baseName.includes(':')) {
		const [moduleName, type] = baseName.split(':');
		baseName = `${moduleName}_${type}`;
	}

    // Handle array types
    const arrayDim = (typeName.match(/\[]/g) || []).length;

    if (arrayDim === 0) {
        return baseName;
    }
    
    return arrayDim === 1 ? `${baseName}Array` : `${baseName}${arrayDim}DArray`;
}

export function getDefaultValue(typeName: string): string {
	let draftParameter = "";
	switch (typeName) {
		case PrimitiveBalType.String:
			draftParameter = `""`;
			break;
		case PrimitiveBalType.Int:
		case PrimitiveBalType.Float:
		case PrimitiveBalType.Decimal:
			draftParameter = `0`;
			break;
		case PrimitiveBalType.Boolean:
			draftParameter = `true`;
			break;
		case PrimitiveBalType.Array:
			draftParameter = `[]`;
			break;
		case PrimitiveBalType.Xml:
			draftParameter = "xml ``";
			break;
		case PrimitiveBalType.Nil:
		case "anydata":
		case "any":
		case "()":
			draftParameter = `()`;
			break;
		case PrimitiveBalType.Record:
		case PrimitiveBalType.Json:
		case "map":
			draftParameter = `{}`;
			break;
		case PrimitiveBalType.Enum:
		case PrimitiveBalType.Union:
			draftParameter = `()`;
			break;
		default:
			draftParameter = `""`;
			break;
	}
	return draftParameter;
}

export function isArrayOrRecord(field: TypeField) {
	return field.typeName === PrimitiveBalType.Array || field.typeName === PrimitiveBalType.Record;
}

export function getInputNodes(node: STNode) {
	const inputNodeFindingVisitor: InputNodeFindingVisitor = new InputNodeFindingVisitor();
	traversNode(node, inputNodeFindingVisitor);
	return inputNodeFindingVisitor.getFieldAccessNodes();
}

export function getModuleVariables(node: STNode, moduleVariables: any) {
	const moduleVarFindingVisitor: ModuleVariablesFindingVisitor = new ModuleVariablesFindingVisitor(moduleVariables);
	traversNode(node, moduleVarFindingVisitor);
	return moduleVarFindingVisitor.getModuleVariables();
}

export function getEnumTypes(node: STNode, moduleVariables: any) {
	const enumTypeFindingVisitor: ModuleVariablesFindingVisitor = new ModuleVariablesFindingVisitor(moduleVariables);
	traversNode(node, enumTypeFindingVisitor);
	return enumTypeFindingVisitor.getEnumTypes();
}

export function getFieldName(field: EditableRecordField) {
	return field.originalType?.name ? getBalRecFieldName(field.originalType.name) : '';
}

export function getFieldLabel(fieldId: string) {
	const parts = fieldId.split('.').slice(1);
	let fieldLabel = '';
	for (const [i, part] of parts.entries()) {
		if (isNaN(+part)) {
			fieldLabel += i === 0 ? part : `.${part}`;
		} else {
			fieldLabel += `[${part}]`;
		}
	}
	return fieldLabel;
}

export function getTypeOfValue(editableRecField: EditableRecordField, targetPosition: NodePosition): TypeField {
	if (editableRecField.hasValue()) {
		if (isPositionsEquals(editableRecField.value.position, targetPosition)) {
			return editableRecField.type;
		} else if (editableRecField.elements) {
			for (const element of editableRecField.elements) {
				const type = getTypeOfValue(element.member, targetPosition);
				if (type) {
					return type;
				}
			}
		} else if (editableRecField.childrenTypes) {
			for (const child of editableRecField.childrenTypes) {
				const type = getTypeOfValue(child, targetPosition);
				if (type) {
					return type;
				}
			}
		}
	}
	return undefined;
}

export function getTypeOfInputParam(param: RequiredParam, balVersion: string): TypeField {
	const paramPosition = isArraysSupported(balVersion) && param?.paramName
		? param.paramName.position
		: STKindChecker.isQualifiedNameReference(param.typeName)
			? param.typeName.identifier.position
			: param.typeName.position;
	return getTypeFromStore({
		startLine: paramPosition.startLine,
		startColumn: paramPosition.startColumn,
		endLine: paramPosition.startLine,
		endColumn: paramPosition.startColumn
	});
}

export function getTypeOfOutput(typeIdentifier: TypeDescriptor | IdentifierToken, balVersion: string): TypeField {
	let typeIdentifierPosition = typeIdentifier.position;
	if (!isArraysSupported(balVersion) && STKindChecker.isQualifiedNameReference(typeIdentifier)) {
		typeIdentifierPosition = typeIdentifier.identifier.position;
	}
	return getTypeFromStore({
		startLine: typeIdentifierPosition.startLine,
		startColumn: typeIdentifierPosition.startColumn,
		endLine: typeIdentifierPosition.startLine,
		endColumn: typeIdentifierPosition.startColumn
	});
}

export function getTypeOfSelectClause(selectClause: SelectClause): TypeField {
	let typeIdentifierPosition = selectClause.expression.position;
	return getTypeFromStore(typeIdentifierPosition);
}

export function getSubArrayType(arrayType: TypeField, index: number): TypeField {
    if (index <= 0) {
        return arrayType;
    }

	if (arrayType.memberType) {
		return getSubArrayType(arrayType.memberType, index - 1);
	}
	return undefined;
}
    

export function getTypeFromStore(position: NodePosition): TypeField {
	const recordTypeDescriptors = TypeDescriptorStore.getInstance();
	return recordTypeDescriptors.getTypeDescriptor(position);
}

export function findTypeByNameFromStore(typeName: string): TypeField {
	const recordTypeDescriptors = TypeDescriptorStore.getInstance();
	for (const type of recordTypeDescriptors.typeDescriptors.values()) {
		if (type?.name && type.name === typeName) {
			return type;
		}
	}
	return undefined;
}

export function findTypeByInfoFromStore(typeInfo: NonPrimitiveBal): TypeField {
	const recordTypeDescriptors = TypeDescriptorStore.getInstance();

	for (const type of recordTypeDescriptors.typeDescriptors.values()) {
		if (!type) {
			return undefined;
		}
		const matchingType = getMatchingType(type, typeInfo);
		if (matchingType) {
			return matchingType;
		}
	}

	return undefined;
}

export function getFnDefFromStore(position: LinePosition): FnDefInfo {
	const functionDefinitionStore = FunctionDefinitionStore.getInstance();
	return functionDefinitionStore.getFnDefinitions(position);
}

export function isEmptyValue(position: NodePosition): boolean {
	return (position.startLine === position.endLine && position.startColumn === position.endColumn);
}

export function getExprBodyFromLetExpression(letExpr: LetExpression): STNode {
	if (STKindChecker.isLetExpression(letExpr.expression)) {
		return getExprBodyFromLetExpression(letExpr.expression);
	}
	return letExpr.expression;
}

export function getExprBodyFromTypeCastExpression(typeCastExpression: TypeCastExpression): STNode {
	if (STKindChecker.isTypeCastExpression(typeCastExpression.expression)) {
		return getExprBodyFromTypeCastExpression(typeCastExpression.expression);
	}
	return typeCastExpression.expression;
}

export function getPrevOutputType(prevSTNodes: DMNode[], ballerinaVersion: string): TypeField {
	if (prevSTNodes.length === 0) {
		return undefined;
	}
	const prevST = prevSTNodes[prevSTNodes.length - 1].stNode;
	const prevOutput = STKindChecker.isSpecificField(prevST)
		? prevST.fieldName as IdentifierToken
		: STKindChecker.isFunctionDefinition(prevST)
			? prevST.functionSignature.returnTypeDesc.type
			: undefined;
	const prevOutputType = prevOutput && getTypeOfOutput(prevOutput, ballerinaVersion);
	if (!prevOutputType) {
		return getPrevOutputType(prevSTNodes.slice(0, -1), ballerinaVersion)
	}
	return prevOutputType;
}

export function hasIONodesPresent(nodes: DataMapperNodeModel[]) {
	return nodes.filter(node => !(
		node instanceof LetExpressionNode
		|| node instanceof QueryExpressionNode
		|| node instanceof LinkConnectorNode
		|| node instanceof JoinClauseNode
		|| node instanceof ExpandedMappingHeaderNode
		|| node instanceof LetClauseNode
		|| node instanceof ModuleVariableNode
		|| node instanceof EnumTypeNode)
	).length >= 2;
}

export function hasNoMatchFound(originalTypeDef: TypeField, valueEnrichedType: EditableRecordField): boolean {
	const searchValue = useDMSearchStore.getState().outputSearch;
	const filteredTypeDef = valueEnrichedType.type;
	if (!searchValue) {
		return false;
	} else if (originalTypeDef.typeName === PrimitiveBalType.Record && filteredTypeDef.typeName === PrimitiveBalType.Record) {
		return valueEnrichedType?.childrenTypes.length === 0;
	} else if (originalTypeDef.typeName === PrimitiveBalType.Array && filteredTypeDef.typeName === PrimitiveBalType.Array) {
		return hasNoMatchFoundInArray(valueEnrichedType?.elements, searchValue);
	} else if (originalTypeDef.typeName === PrimitiveBalType.Union) {
		if (filteredTypeDef.typeName === PrimitiveBalType.Record) {
			return valueEnrichedType?.childrenTypes.length === 0;
		} else if (filteredTypeDef.typeName === PrimitiveBalType.Array) {
			return hasNoMatchFoundInArray(valueEnrichedType?.elements, searchValue);
		}
	}
	return false;
}

export function getMethodCallElements(methodCall: MethodCall): string[] {
	const { expression } = methodCall;
	const elements: string[] = [];

	if (STKindChecker.isFieldAccess(expression) || STKindChecker.isOptionalFieldAccess(expression)) {
		const fieldNames = getFieldNames(expression).map(item => item.name);
		elements.push(...fieldNames);
	} else if (STKindChecker.isSimpleNameReference(expression)) {
		elements.push(expression.name.value)
	} else if (STKindChecker.isMethodCall(expression)) {
		elements.push(...getMethodCallElements(expression));
	}

	return elements;
}

export function isDefaultValue(field: TypeField, value: string): boolean {
	if (value === '()'){
		return true;
	}
	const defaultValue = getDefaultValue(field?.typeName);
	return defaultValue === value?.trim();
}

export function getShortenedTypeName(typeName: string): string {
	return typeName && typeName.slice(typeName.lastIndexOf('.') + 1);
}

export function extractImportAlias(moduleName: string, importStatement: string): string {
	const regex = new RegExp(`${moduleName}\\s+as\\s+(\\w+)`);
	const matches = importStatement.match(regex);
	return matches ? matches[1] : null;
}

export function getFromClauseNodeLabel(bindingPattern: STNode, valueExpr: STNode): string {
	const defaultLabel = "Input";
	if (STKindChecker.isCaptureBindingPattern(bindingPattern)) {
		return bindingPattern.variableName.value;
	} else if (STKindChecker.isMappingBindingPattern(bindingPattern)) {
		if (STKindChecker.isSimpleNameReference(valueExpr)) {
			return `${valueExpr.name.value}Item`;
		} else if (STKindChecker.isFieldAccess(valueExpr) || STKindChecker.isOptionalFieldAccess(valueExpr)) {
			const expr = getInnerExpr(valueExpr);
			return `${expr}.source`;
		}
	}
	
	return defaultLabel;
}

export function isAvailableWithinBindingPattern(bindingPattern: STNode, targetIdentifier: string): boolean {
	if (STKindChecker.isErrorBindingPattern(bindingPattern) || STKindChecker.isWildcardBindingPattern(bindingPattern)) {
		return false;
	}

	if (STKindChecker.isCaptureBindingPattern(bindingPattern)) {
		return bindingPattern.variableName.value === targetIdentifier; 
	} else if (STKindChecker.isMappingBindingPattern(bindingPattern)) {
		return bindingPattern.fieldBindingPatterns.some((fieldBindingPattern) => {
			// RestBindingPattern is not supported by the Data Mapper
			if (STKindChecker.isFieldBindingPattern(fieldBindingPattern)) {
				if (fieldBindingPattern?.bindingPattern) {
					return isAvailableWithinBindingPattern(fieldBindingPattern.bindingPattern, targetIdentifier);
				} else {
					return fieldBindingPattern.variableName.source === targetIdentifier;
				}
			}
		});
	} else if (STKindChecker.isListBindingPattern(bindingPattern)) {
		return bindingPattern.bindingPatterns.some((bindingPattern) => {
			return isAvailableWithinBindingPattern(bindingPattern, targetIdentifier);
		});
	}

	return false;
}

export function getRelativePathOfField(bindingPattern: STNode, targetIdentifier: string, path?: string): string {
	if (STKindChecker.isErrorBindingPattern(bindingPattern) || STKindChecker.isWildcardBindingPattern(bindingPattern)) {
		return undefined;
	}

	if (STKindChecker.isCaptureBindingPattern(bindingPattern)) {
		if (bindingPattern.variableName.value === targetIdentifier) {
			return path || `.${targetIdentifier}`;
		}; 
		path = undefined;
	} else if (STKindChecker.isMappingBindingPattern(bindingPattern)) {
		for (const fieldBindingPattern of bindingPattern.fieldBindingPatterns) {
			if (STKindChecker.isFieldBindingPattern(fieldBindingPattern)) {
				if (fieldBindingPattern?.bindingPattern) {
					const pathElement = fieldBindingPattern.variableName.source;
					const relativePath = getRelativePathOfField(
						fieldBindingPattern.bindingPattern,
						targetIdentifier, path ? `${path}.${pathElement}` : `.${pathElement}`
					);
					if (relativePath) {
						return relativePath;
					}
				} else {
					if (fieldBindingPattern.variableName.source === targetIdentifier) {
						return path ? `${path}.${targetIdentifier}` : `.${targetIdentifier}`;
					}
				}
			}
		}
	} else if (STKindChecker.isListBindingPattern(bindingPattern)) {
		for (const bPattern of bindingPattern.bindingPatterns) {
			const relativePath = getRelativePathOfField(bPattern, targetIdentifier, path);
			if (relativePath) {
				return relativePath;
			}
		}
	}

	return path;
}

export function getQueryExprMappingType(hasIndexedQuery: boolean, hasCollectClause: boolean): QueryExprMappingType {
	if (hasIndexedQuery) {
		return QueryExprMappingType.A2SWithSelect;
	} else if (hasCollectClause) {
		return QueryExprMappingType.A2SWithCollect;
	}
	return QueryExprMappingType.A2AWithSelect;
}

export function hasIndexedQueryExpr(node: STNode) {
	return STKindChecker.isSpecificField(node)
		&& STKindChecker.isIndexedExpression(node.valueExpr)
		&& STKindChecker.isBracedExpression(node.valueExpr.containerExpression)
		&& STKindChecker.isQueryExpression(node.valueExpr.containerExpression.expression);
}

export function hasCollectClauseExpr(node: QueryExpression) {
	const resultClause = node?.selectClause || node?.resultClause;
	// TODO: Update the syntax tree interfaces to include the collect clause
	return resultClause.kind === "CollectClause";
}

export function generateDestructuringPattern(expression: string): string {
    const parts = expression.split('.');
    const lastIndex = parts.length - 1;

    const constructPattern = (index: number): string => {
        if (index === lastIndex) {
            return `{${parts[index]}}`;
        } else {
            return `{${[parts[index]]}: ${constructPattern(index + 1)} }`;
        }
    };

    return constructPattern(0);
}

export function getMappedFnNames(targetPort: PortModel) {
	const mappedExpr = (targetPort as RecordFieldPortModel)?.editableRecordField?.value;

	const fnCallFindingVisitor = new FunctionCallFindingVisitor();
	traversNode(mappedExpr, fnCallFindingVisitor);
	const fnCall = fnCallFindingVisitor.getFunctionCalls();

	return fnCall.map((call) => call.fnName);
}

export function isLinkModel(node: BaseModel) {
    return node instanceof DataMapperLinkModel;
}

export function getValueType(lm: DataMapperLinkModel): ValueType {
	const editableRecordField = (lm.getTargetPort() as RecordFieldPortModel).editableRecordField;

	if (editableRecordField?.value) {
		let expr = editableRecordField.value;
		if (STKindChecker.isSpecificField(expr)) {
			expr = expr.valueExpr;
		}
		const innerExpr = getInnermostExpressionBody(expr);
		let value: string = innerExpr?.value || innerExpr?.source;

		if (STKindChecker.isListConstructor(innerExpr) && innerExpr.expressions.length === 0) {
			// Ensure new lines and spaces are removed in empty arrays
			value = "[]";
		}

		if (value !== undefined) {
			return isDefaultValue(editableRecordField.type, value) ? ValueType.Default : ValueType.NonEmpty;
		}
	}

	return ValueType.Empty;
}

export function toFirstLetterLowerCase(identifierName: string){
    return identifierName.charAt(0).toLowerCase() + identifierName.slice(1);
}

export function toFirstLetterUpperCase(identifierName: string){
    return identifierName.charAt(0).toUpperCase() + identifierName.slice(1);
}

function getInnerExpr(node: FieldAccess | OptionalFieldAccess): STNode {
	let valueExpr = node.expression;
	while (valueExpr && (STKindChecker.isFieldAccess(valueExpr)
		|| STKindChecker.isOptionalFieldAccess(valueExpr))) {
		valueExpr = valueExpr.expression;
	}
	return valueExpr;
}

function hasNoMatchFoundInArray(elements: ArrayElement[], searchValue: string): boolean {
	if (!elements) {
		return false;
	} else if (elements.length === 0) {
		return true;
	}
	return elements.every(element => {
		if (element.member.type.typeName === PrimitiveBalType.Record) {
			return element.member?.childrenTypes.length === 0;
		} else if (element.member.type.typeName === PrimitiveBalType.Array) {
			return element.member.elements && element.member.elements.length === 0
		} else if (element.member.value) {
			const value = element.member.value.value || element.member.value.source;
			return !value.toLowerCase().includes(searchValue.toLowerCase());
		}
	});
}

async function createValueExprSource(
	lhs: string,
	rhs: string,
	fieldNames: string[],
	fieldIndex: number,
	targetPosition: NodePosition,
	applyModifications: (modifications: STModification[]) => Promise<void>
) {
	let source = "";

	if (fieldIndex >= 0 && fieldIndex <= fieldNames.length) {
		const missingFields = fieldNames.slice(fieldIndex);
		source = createValueExpr(missingFields, true);
	} else {
		source = rhs;
	}

	const modifications = [getModification(source, {
		...targetPosition,
		startLine: targetPosition.endLine,
		startColumn: targetPosition.endColumn
	})];
	await applyModifications(modifications);

	function createValueExpr(missingFields: string[], isRoot?: boolean): string {
		return missingFields.length
			? isRoot
				? `{${getLinebreak()}${createValueExpr(missingFields.slice(1))}}`
				: `\t${missingFields[0]}: {${getLinebreak()}${createValueExpr(missingFields.slice(1))}}`
			: isRoot
				? rhs
				: `\t${lhs}: ${rhs}`;
	}

	return `${rhs}: ${lhs}`;
}

export function updateCollectClauseAggrFn(
	newFnName: string,
	currentFnName: string,
	mappedExpr: FunctionCall,
	applyModifications: (modifications: STModification[]) => Promise<void>
) {
	const currentExpr: string = mappedExpr.source;
	const updatedExpr = currentExpr.replace(currentFnName, newFnName);

	const position = mappedExpr.position as NodePosition;
	const modifications = [{
		type: "INSERT",
		config: {
			"STATEMENT": updatedExpr,
		},
		...position
	}];
	void applyModifications(modifications);
}

export function getCollectClauseActions(
	currentFnName: string,
	mappedExpr: FunctionCall,
	applyModifications: (modifications: STModification[]) => Promise<void>
):CustomAction[] {
	const aggrOptions = AggregationFunctions.filter((fn) => fn !== currentFnName);
	return aggrOptions.map((fn) => {
		return {
			title: fn,
			onClick: () => updateCollectClauseAggrFn(fn, currentFnName, mappedExpr, applyModifications)
		};
	});
}

export function getMatchingType(type: TypeField, typeInfo: NonPrimitiveBal): TypeField {
	if (isTypeMatch(type, typeInfo)) {
		return type;
	} else if (type.typeName === PrimitiveBalType.Record) {
		for (const field of type.fields) {
			const matchingType = getMatchingType(field, typeInfo);
			if (matchingType) {
				return matchingType;
			}
		}
	} else if (type.typeName === PrimitiveBalType.Array && type.memberType) {
		if (isTypeMatch(type.memberType, typeInfo)) {
			return type.memberType;
		} else if (type.memberType?.typeName === PrimitiveBalType.Record) {
			for (const field of type.memberType.fields) {
				const matchingType = getMatchingType(field, typeInfo);
				if (matchingType) {
					return matchingType;
				}
			}
		}
	}

	return undefined;
}

export function isTypeMatch(type: TypeField, typeInfo: NonPrimitiveBal): boolean {
	return (
		type.typeInfo &&
		type.typeInfo.orgName === typeInfo.orgName &&
		type.typeInfo.moduleName === typeInfo.moduleName &&
		type.typeInfo.name === typeInfo.name &&
		type.typeInfo.version === typeInfo.version
	);
}

async function updateValueExprSource(
	value: string,
	targetPosition: NodePosition,
	applyModifications: (modifications: STModification[]) => Promise<void>
) {
	void await applyModifications([getModification(value, {...targetPosition})]);

	return value;
}

function getSpecificField(mappingConstruct: MappingConstructor, targetFieldName: string) {
	return mappingConstruct?.fields.find((val) =>
		STKindChecker.isSpecificField(val) && val.fieldName.value === targetFieldName
	) as SpecificField;
}

export function isComplexExpression(node: STNode): boolean {
	return (STKindChecker.isConditionalExpression(node)
			|| (STKindChecker.isBinaryExpression(node) && STKindChecker.isElvisToken(node.operator)))
}

export function isIndexedExpression(node: STNode): boolean {
	return STKindChecker.isIndexedExpression(node);
}

export function getFnDefForFnCall(node: FunctionCall): FnDefInfo {
	const fnCallPosition: LinePosition = {
		line: node.position.startLine,
		offset: node.position.startColumn
	};
	return getFnDefFromStore(fnCallPosition);
}

export function getFilteredMappings(mappings: FieldAccessToSpecificFied[], searchValue: string) {
	return mappings.filter(mapping => {
		if (mapping) {
			const lastField = mapping.fields[mapping.fields.length - 1];
			const fieldName = STKindChecker.isSpecificField(lastField)
				? lastField.fieldName?.value || lastField.fieldName.source
				: lastField.source;
			return searchValue === "" || fieldName.toLowerCase().includes(searchValue.toLowerCase());
		}
	});
}

export function getInnermostExpressionBody(expr: STNode): STNode {
	let innerExpr =	expr;
	if (innerExpr && STKindChecker.isLetExpression(innerExpr)) {
		innerExpr = getExprBodyFromLetExpression(innerExpr);
	}
	if (innerExpr && STKindChecker.isTypeCastExpression(innerExpr)) {
		innerExpr = getExprBodyFromTypeCastExpression(innerExpr);
	}
	return innerExpr;
}

export function getInnermostMemberTypeFromArrayType(arrayType: TypeField): TypeField {
	let memberType = arrayType.memberType;
	while (memberType.typeName === PrimitiveBalType.Array) {
		memberType = memberType.memberType;
	}
	return memberType;
}

export function getTargetPortPrefix(node: NodeModel): string {
	switch (true) {
		case node instanceof MappingConstructorNode:
			return MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX;
		case node instanceof ListConstructorNode:
			return LIST_CONSTRUCTOR_TARGET_PORT_PREFIX;
		case node instanceof PrimitiveTypeNode:
			return PRIMITIVE_TYPE_TARGET_PORT_PREFIX;
		case node instanceof UnionTypeNode:
			const unionTypeNode = node as UnionTypeNode;
			const resolvedType = unionTypeNode.resolvedType;
			if (unionTypeNode.shouldRenderUnionType()) {
				return UNION_TYPE_TARGET_PORT_PREFIX;
			} else if (resolvedType && resolvedType.typeName === PrimitiveBalType.Record) {
				return MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX;
			} else if (resolvedType && resolvedType.typeName === PrimitiveBalType.Array) {
				return LIST_CONSTRUCTOR_TARGET_PORT_PREFIX;
			} else {
				return PRIMITIVE_TYPE_TARGET_PORT_PREFIX;
			}
		default:
			return PRIMITIVE_TYPE_TARGET_PORT_PREFIX;
	}
}

export function getDiagnosticsPosition(outPortField: EditableRecordField, mapping: FieldAccessToSpecificFied): NodePosition {
	const {type, value: outPortFieldValue} = outPortField;
	const {value: mappedValue, otherVal} = mapping;
	let diagnosticsPosition: NodePosition = (otherVal.position || mappedValue.position) as NodePosition;
	if (type.typeName === PrimitiveBalType.Union && !type?.resolvedUnionType && outPortFieldValue) {
		diagnosticsPosition = outPortFieldValue.position;
	}
	return diagnosticsPosition;
}

export function isRepresentFnBody(queryParentNode: STNode, fnBody: ExpressionFunctionBody) {
	const isExprFnBody = STKindChecker.isExpressionFunctionBody(queryParentNode);
	const isQueryParentNodeFnBody = isExprFnBody && isPositionsEquals(queryParentNode.position, fnBody.position);
	if (isQueryParentNodeFnBody) {
		return true;
	}
	let nextNode: STNode = fnBody.expression;
	while (STKindChecker.isTypeCastExpression(nextNode) || STKindChecker.isLetExpression(nextNode)) {
		if (isPositionsEquals(queryParentNode.position, nextNode.position)) {
			return true;
		}
		nextNode = nextNode.expression;
	}
	return false;
}

export function getErrorKind(node: DataMapperNodeModel): ErrorNodeKind {
	const nodeType = node.getType();
	switch (nodeType) {
		case MAPPING_CONSTRUCTOR_NODE_TYPE:
		case LIST_CONSTRUCTOR_NODE_TYPE:
		case PRIMITIVE_TYPE_NODE_TYPE:
			return ErrorNodeKind.Output;
		case REQ_PARAM_NODE_TYPE:
			return ErrorNodeKind.Input;
		case LET_EXPR_SOURCE_NODE_TYPE:
		case MODULE_VAR_SOURCE_NODE_TYPE:
		case ENUM_TYPE_SOURCE_NODE_TYPE:
		case EXPANDED_MAPPING_HEADER_NODE_TYPE:
		case QUERY_EXPR_NODE_TYPE:
		case QUERY_EXPR_SOURCE_NODE_TYPE:
		case QUERY_EXPR_LET_NODE_TYPE:
		case QUERY_EXPR_JOIN_NODE_TYPE:
			return ErrorNodeKind.Other;
		default:
			return ErrorNodeKind.Other;
	}
}

export function getLocalVariableNames(fnDef: FunctionDefinition): string[] {
	const paramNames = fnDef.functionSignature.parameters.map(param => {
		return !STKindChecker.isCommaToken(param) && param?.paramName.value;
	}).filter(param => param !== undefined);

	const letVarDeclNames: string[] = [];
	const letExpression = getLetExpression(fnDef);
	const letExpressions = letExpression ? getLetExpressions(letExpression) : [];
	for (const expr of letExpressions) {
		for (const decl of expr?.letVarDeclarations) {
			if (STKindChecker.isLetVarDecl(decl)) {
				letVarDeclNames.push(decl.typedBindingPattern.bindingPattern.source.trim());
			}
		}
	}

	const visitor = new FromClauseBindingPatternFindingVisitor();
	traversNode(fnDef, visitor);
	const fromClauseBindingPatterns = visitor.getBindingPatterns().map(pattern => pattern.source.trim());

	return [...paramNames, ...letVarDeclNames, ...fromClauseBindingPatterns];
}

export function genVariableName(originalName: string, variables: string[]): string {
	let modifiedName: string = originalName;
	let index = 0;
	while (variables.includes(modifiedName)) {
		index++;
		modifiedName = originalName + index;
	}
	return modifiedName;
}

export function isFnBodyQueryExpr(fieldPath: string) {
	return fieldPath === FUNCTION_BODY_QUERY;
}

export function isSelectClauseQueryExpr(fieldPath: string) {
	return fieldPath === SELECT_CALUSE_QUERY;
}

export function getLetClauseVarNames(letClause: LetClause): string[] {
	const varNames: string[] = [];
	for (const decl of letClause.letVarDeclarations) {
		if (STKindChecker.isLetVarDecl(decl)) {
			varNames.push(decl.typedBindingPattern.bindingPattern.source.trim());
		}
	}
	return varNames;
}

export function getMappingType(sourcePort: PortModel, targetPort: PortModel): MappingType {

    if (sourcePort instanceof RecordFieldPortModel
        && targetPort instanceof RecordFieldPortModel
        && targetPort.field && sourcePort.field) {
            
		const sourceDim = getDMTypeDim(sourcePort.field);
		const targetDim = getDMTypeDim(targetPort.field);

		if (sourceDim > 0) {
			const dimDelta = sourceDim - targetDim;
			if (dimDelta == 0) return MappingType.ArrayToArray;
			if (dimDelta > 0) return MappingType.ArrayToSingleton;
		} else if (sourcePort.field.typeName === PrimitiveBalType.Union) {
			return MappingType.UnionToAny;
		} else if (sourcePort.field.typeName === PrimitiveBalType.Record
			&& targetPort.field.typeName === PrimitiveBalType.Record) {
			return MappingType.RecordToRecord;
		}
    }

    return MappingType.Default;
}

export function buildInputAccessExpr(fieldFqn: string): string {
	// Regular expression to match either quoted strings or non-quoted strings with dots
	const regex = /"([^"]+)"|'([^"]+)'|([^".]+)/g;

	const result = fieldFqn.replace(regex, (match, doubleQuoted, singleQuoted, unquoted) => {
		if (doubleQuoted) {
			return `["${doubleQuoted}"]`; // If the part is enclosed in double quotes, wrap it in square brackets
		} else if (singleQuoted) {
			return `['${singleQuoted}']`; // If the part is enclosed in single quotes, wrap it in square brackets
		} else {
			return unquoted; // Otherwise, leave the part unchanged
		}
	});

	return result.replace(/(?<!\?)\.\[/g, '['); // Replace occurrences of '.[' with '[' to handle consecutive bracketing
}

export function genArrayElementAccessSuffix(sourcePort: PortModel, targetPort: PortModel) {
    if (sourcePort instanceof RecordFieldPortModel && targetPort instanceof RecordFieldPortModel) {
        let suffix = '';
        const sourceDim = getDMTypeDim(sourcePort.field);
        const targetDim = getDMTypeDim(targetPort.field);
        const dimDelta = sourceDim - targetDim;
        for (let i = 0; i < dimDelta; i++) {
            suffix += '[0]';
        }
        return suffix;
    }
    return '';
};

export function genArrayElementAccessExpr(node: STNode): string {
    let accessors: string[] = [];
	let targetNode = STKindChecker.isSpecificField(node) ? node.valueExpr : node;

    while (STKindChecker.isIndexedExpression(targetNode)) {
        const keyExprs = targetNode.keyExpression;
		if (keyExprs?.length === 1 && STKindChecker.isNumericLiteral(keyExprs[0])) {
			accessors.push(keyExprs[0].source);
			targetNode = targetNode.containerExpression;
		}
    }
    accessors.reverse();
    return `[${accessors.join(",")}]`;
}

export function hasFieldAccessExpression(node: STNode): boolean {
	if (!node) {
		return false;
	} else if (STKindChecker.isSpecificField(node) && STKindChecker.isIndexedExpression(node.valueExpr)) {
		return true;
	} else {
		return STKindChecker.isIndexedExpression(node)
	}
}

function isMappedToPrimitiveTypePort(targetPort: RecordFieldPortModel): boolean {
	return !isArrayOrRecord(targetPort.field)
		&& targetPort?.editableRecordField?.value
		&& !STKindChecker.isSpecificField(targetPort.editableRecordField.value)
		&& !isEmptyValue(targetPort.editableRecordField.value.position);
}

function isMappedToRootListConstructor(targetPort: RecordFieldPortModel): boolean {
	return !targetPort.parentModel
		&& targetPort.field.typeName === PrimitiveBalType.Array
		&& targetPort?.editableRecordField?.value
		&& STKindChecker.isListConstructor(targetPort.editableRecordField.value);
}

function isMappedToRootMappingConstructor(targetPort: RecordFieldPortModel): boolean {
	return !targetPort.parentModel
		&& targetPort.field.typeName === PrimitiveBalType.Record
		&& targetPort?.editableRecordField?.value
		&& STKindChecker.isMappingConstructor(targetPort.editableRecordField.value);
}

function isMappedToRootUnionType(targetPort: RecordFieldPortModel): boolean {
	return !targetPort.parentModel
		&& targetPort.field.typeName === PrimitiveBalType.Union
		&& !targetPort?.editableRecordField;
}

function isMappedToExprFuncBody(targetPort: RecordFieldPortModel, selectedSTNode: STNode): boolean {
	const exprPosition: NodePosition = STKindChecker.isFunctionDefinition(selectedSTNode)
		&& STKindChecker.isExpressionFunctionBody(selectedSTNode.functionBody)
		&& selectedSTNode.functionBody.expression.position;
	return !targetPort.parentModel
		&& targetPort?.editableRecordField?.value
		&& !STKindChecker.isQueryExpression(targetPort.editableRecordField.value)
		&& isPositionsEquals(targetPort?.editableRecordField?.value.position as NodePosition, exprPosition);
}

function isMappedToMappingConstructorWithinArray(targetPort: RecordFieldPortModel): boolean {
	return targetPort.index !== undefined
		&& targetPort.field.typeName === PrimitiveBalType.Record
		&& targetPort.editableRecordField?.value
		&& STKindChecker.isMappingConstructor(getInnermostExpressionBody(targetPort.editableRecordField.value));
}

function isMappedToSelectClauseExprConstructor(targetPort: RecordFieldPortModel): boolean {
	const queryExpr = !targetPort.parentModel
		&& targetPort.field.typeName === PrimitiveBalType.Array
		&& targetPort?.editableRecordField?.value
		&& STKindChecker.isQueryExpression(targetPort.editableRecordField.value)
		&& targetPort.editableRecordField.value;
	if (queryExpr) {
		const selectClause = queryExpr?.selectClause || queryExpr?.resultClause;
		return selectClause
			&& (STKindChecker.isListConstructor(selectClause.expression)
				|| STKindChecker.isMappingConstructor(selectClause.expression));
	}
	return false;
}

function getFieldNameFromOutputPort(outputPort: RecordFieldPortModel): string {
	let fieldName = outputPort.field?.name;
	if (outputPort?.editableRecordField?.originalType) {
		fieldName = outputPort.editableRecordField.originalType?.name;
	}
	return fieldName;
}

function isNodeWithoutTypeDesc(node: BaseModel): node is NodeWithoutTypeDesc {
	return (
		node instanceof LetExpressionNode ||
		node instanceof ModuleVariableNode ||
		node instanceof EnumTypeNode ||
		node instanceof ExpandedMappingHeaderNode
	);
}

export const getOptionalRecordField = (field: TypeField): TypeField | undefined => {
	if (!field) return;

	let recField: TypeField;
	if (PrimitiveBalType.Record === field.typeName && field.optional) {
		recField = field;
	} else if (PrimitiveBalType.Union === field.typeName) {
		const isSimpleOptionalType = field.members?.some(member => member.typeName === '()');
		if (isSimpleOptionalType && field.members?.length === 2) {
			for (const member of field.members) {
				if (member.typeName === PrimitiveBalType.Record) {
					recField = member;
				} else if (member.typeName === 'intersection') {
					const recordMem = member.members?.find(member => member.typeName === PrimitiveBalType.Record);
					recField = recordMem;
				}
			}
		}
	}

	return recField;
}

export const isOptionalAndNillableField = (field: TypeField) => {
	return field.optional
		&& field.typeName === PrimitiveBalType.Union
		&& field.members?.some(member => member.typeName === '()');
}

export const getOptionalArrayField = (field: TypeField): TypeField | undefined => {
	if (PrimitiveBalType.Array === field.typeName && field.optional) {
		return field;
	} else if (PrimitiveBalType.Union === field.typeName) {
		const isSimpleOptionalType = field.members?.some(member => member.typeName === '()');
		if (isSimpleOptionalType && field.members?.length === 2){
			return field.members?.find(member => member.typeName === PrimitiveBalType.Array);
		}
	}
}

/** Filter out error and nill types and return only the types that can be displayed as mapping as target nodes */
export const getFilteredUnionOutputTypes = (type: TypeField) => type.members?.filter(member => member && !["error"].includes(member.typeName));


export const getNewFieldAdditionModification = (node: STNode, fieldName: string, fieldValue = '') => {
	let insertPosition: NodePosition;
	let modificationStatement = "";
	let mappingConstruct: MappingConstructor;

	if (STKindChecker.isMappingConstructor(node)) {
		mappingConstruct = node;
	} else if (STKindChecker.isSpecificField(node) && STKindChecker.isMappingConstructor(node.valueExpr)) {
		mappingConstruct = node.valueExpr
	}

	if (mappingConstruct) {
		if (mappingConstruct.fields?.length) {
			const lastField = mappingConstruct.fields[mappingConstruct.fields?.length - 1]
			insertPosition = {
				...lastField.position,
				startLine: lastField.position.endLine,
				startColumn: lastField.position.endColumn,
			}
			modificationStatement = `,${getLinebreak()}\t${fieldName}:${fieldValue}${getLinebreak()}`
		} else {
			insertPosition = mappingConstruct.position
			modificationStatement = `{${getLinebreak()}\t${fieldName}:${fieldValue}${getLinebreak()}}`
		}
	}

	if (insertPosition && modificationStatement) {
		return [getModification(modificationStatement, insertPosition)];
	}
}

export const getSearchFilteredInput = (typeDef: TypeField, varName?: string) => {
	const searchValue = useDMSearchStore.getState().inputSearch;
	if (!searchValue) {
		return typeDef;
	}

	if (varName?.toLowerCase()?.includes(searchValue.toLowerCase())) {
		return typeDef
	} else if (typeDef?.typeName === PrimitiveBalType.Record || typeDef?.typeName === PrimitiveBalType.Array) {
		const filteredRecordType = getFilteredSubFields(typeDef, searchValue);
		if (filteredRecordType) {
			return filteredRecordType
		}
	}
}

export const getFilteredSubFields = (type: TypeField, searchValue: string) => {
	if (!type) {
		return null;
	}

	if (!searchValue) {
		return type;
	}

	const optionalRecordField = getOptionalRecordField(type);
	if (optionalRecordField && type?.typeName === PrimitiveBalType.Union) {
		const matchedSubFields: TypeField[] = optionalRecordField?.fields?.map(fieldItem => getFilteredSubFields(fieldItem, searchValue)).filter(fieldItem => fieldItem);
		const matchingName = type?.name?.toLowerCase().includes(searchValue.toLowerCase());
		if (matchingName || matchedSubFields?.length > 0) {
			return {
				...type,
				members: [
					{ ...optionalRecordField, fields: matchingName ? optionalRecordField?.fields : matchedSubFields },
					...type?.members?.filter(member => member.typeName !== PrimitiveBalType.Record)
				]
			};
		}
	} else if (type?.typeName === PrimitiveBalType.Record) {
		const matchedSubFields: TypeField[] = type?.fields?.map(fieldItem => getFilteredSubFields(fieldItem, searchValue)).filter(fieldItem => fieldItem);
		const matchingName = type?.name?.toLowerCase().includes(searchValue.toLowerCase());
		if (matchingName || matchedSubFields?.length > 0) {
			return {
				...type,
				fields: matchingName ? type?.fields : matchedSubFields
			}
		}
	} else if (type?.typeName === PrimitiveBalType.Array) {
		const matchedSubFields: TypeField[] = type?.memberType?.fields?.map(fieldItem => getFilteredSubFields(fieldItem, searchValue)).filter(fieldItem => fieldItem);
		const matchingName = type?.name?.toLowerCase().includes(searchValue.toLowerCase());
		if (matchingName || matchedSubFields?.length > 0) {
			return {
				...type,
				memberType: {
					...type?.memberType,
					fields: matchingName ? type?.memberType?.fields : matchedSubFields
				}
			}
		}
	} else {
		return type?.name?.toLowerCase()?.includes(searchValue.toLowerCase()) ? type : null
	}

	return null;
}

export const getSearchFilteredOutput = (type: TypeField) => {
	const searchValue = useDMSearchStore.getState().outputSearch;
	if (!type) {
		return null
	}
	if (!searchValue) {
		return type;
	}

	let searchType: TypeField = type;

	if (type?.typeName === PrimitiveBalType.Union) {
		const filteredTypes = getFilteredUnionOutputTypes(type);
		if (filteredTypes?.length === 1) {
			searchType = filteredTypes[0];
		}
	}

	if (searchType.typeName === PrimitiveBalType.Array) {
		const subFields = searchType.memberType?.fields?.map(item => getFilteredSubFields(item, searchValue)).filter(item => item);

		return {
			...searchType,
			memberType: {
				...searchType.memberType,
				fields: subFields || []
			}
		}
	} else if (searchType.typeName === PrimitiveBalType.Record) {
		const subFields = searchType.fields?.map(item => getFilteredSubFields(item, searchValue)).filter(item => item);

		return {
			...searchType,
			fields: subFields || []
		}
	}
	return  null;
}
