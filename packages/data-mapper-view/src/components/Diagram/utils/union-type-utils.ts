/*
 * Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */

import { AnydataType, AnyType, OtherBalType, PrimitiveBalType, TypeField } from "@wso2/ballerina-core";
import {
	ExpressionFunctionBody,
	SelectClause,
	STKindChecker,
	STNode
} from "@wso2/syntax-tree";

import { useDMStore } from "../../../store/store";
import { TypeDescriptor } from "../Node/commons/DataMapperNode";

import {
	findTypeByInfoFromStore,
	getExprBodyFromLetExpression,
	getInnermostMemberTypeFromArrayType,
	getShortenedTypeName,
	getTypeName
} from "./dm-utils";

export interface UnionTypeInfo {
	unionType: TypeField;
	typeNames: string[];
	resolvedTypeName: string;
	isResolvedViaTypeCast: boolean;
	valueExpr: ExpressionFunctionBody | SelectClause;
}

export const CLEAR_EXISTING_MAPPINGS_WARNING = "This will clear the existing mappings associated with current type";
export const INCOMPATIBLE_CASTING_WARNING = "This may leads to syntax errors if the type is not matched";

export function resolveUnionType(expr: STNode, unionType: TypeField): TypeField {
	let innerExpr = expr;
	if (STKindChecker.isLetExpression(expr)) {
		innerExpr = getExprBodyFromLetExpression(expr);
	} else if (STKindChecker.isSpecificField(expr)) {
		innerExpr = expr.valueExpr;
	}
	const supportedTypes = getSupportedUnionTypes(unionType);
	if (STKindChecker.isTypeCastExpression(innerExpr)) {
		// when the expr is wrapped with a type cast
		const castedType = innerExpr.typeCastParam?.type;
		return unionType?.members.find((member) => {
			return getResolvedType(member, castedType);
		});
	} else if (supportedTypes.length === 1) {
		// when the specified union type is narrowed down to a single type
		return unionType?.members.find(member => {
			const typeName = getTypeName(member);
			return typeName === supportedTypes[0];
		});
	} else {
		// when the type is derivable from the expr
		let typeName: string;
		if (innerExpr.typeData?.typeSymbol && innerExpr.typeData?.typeSymbol?.signature !== "$CompilationError$") {
			const typeSignature = innerExpr.typeData?.typeSymbol?.signature;
			const typeSignatureSegments = typeSignature.split(':');
			typeName = typeSignatureSegments.length === 1 ? typeSignatureSegments[0] : typeSignature.split(':')[2];
			// If record is from an imported package
			const orgAndModule = typeSignatureSegments[0];
			const importStatements = useDMStore.getState().imports;

			importStatements.forEach(item => {
				if (item.includes(orgAndModule)) {
					const importReferenceMap = useDMStore.getState().importReferenceMap;
					const referencedName = importReferenceMap[item];
					if (referencedName) {
						typeName = `${referencedName}:${typeName}`;
					}
				}
			});
		}
		if (typeName && supportedTypes.includes(typeName)) {
			return unionType?.members.find(member => {
				const memberName = getTypeName(member);
				return memberName === typeName;
			});
		}
	}
}

export function getResolvedType(type: TypeField, typeDesc: TypeDescriptor): TypeField {
	const memberName = getTypeName(type).replace(/\s/g, '');
	const typeDescSource = typeDesc.source.replace(/\s/g, '');
	if (type.typeName === PrimitiveBalType.Union) {
		let resolvedType: TypeField;
		for (const member of type.members) {
			resolvedType = getResolvedType(member, typeDesc);
			if (resolvedType) {
				return resolvedType;
			}
		}
	} else if (memberName === typeDescSource) {
		return type;
	}
}

export function getUnsupportedTypesFromTypeDesc(typeDesc: STNode): string[] {
	const unsupportedTypes: string[] = [];
	if (STKindChecker.isUnionTypeDesc(typeDesc)) {
		const { leftTypeDesc, rightTypeDesc } = typeDesc;
		unsupportedTypes.push(...getUnsupportedTypesFromTypeDesc(leftTypeDesc),
			...getUnsupportedTypesFromTypeDesc(rightTypeDesc));
	} else if (STKindChecker.isArrayTypeDesc(typeDesc)) {
		const filteredTypes = getUnsupportedTypesFromTypeDesc(typeDesc.memberTypeDesc).map(type => `${type}[]`);
		unsupportedTypes.push(...filteredTypes);
	} else if (STKindChecker.isParenthesisedTypeDesc(typeDesc)) {
		unsupportedTypes.push(...getUnsupportedTypesFromTypeDesc(typeDesc.typedesc));
	} else if (isUnsupportedTypeDesc(typeDesc)) {
		unsupportedTypes.push(getShortenedTypeName(typeDesc.source));
	}
	return unsupportedTypes;
}

export function getUnsupportedTypesFromType(unionType: TypeField): string[] {
	const unsupportedTypes: string[] = [];
	for (const member of unionType?.members || []) {
		const memberType = getTypeName(member);
		let type: TypeField = member;
		if (member.typeName === PrimitiveBalType.Array) {
			type = getInnermostMemberTypeFromArrayType(member);
		}
		if (isUnsupportedType(type)) {
			unsupportedTypes.push(memberType);
		}
	}
	return unsupportedTypes;
}

export function getSupportedUnionTypes(typeDef: TypeField, typeDesc?: STNode): string[] {
	if (!typeDef.typeName && typeDef.typeInfo) {
		typeDef = findTypeByInfoFromStore(typeDef.typeInfo) || typeDef;
	}
	const unsupportedTypes = typeDesc
		? getUnsupportedTypesFromTypeDesc(typeDesc)
		: getUnsupportedTypesFromType(typeDef);
	const allUnionTypes = getUnionTypes(typeDef);

	const filteredTypes = allUnionTypes.map(unionType => {
		const type = unionType.trim();
		if (!unsupportedTypes.includes(type) && type !== "error") {
			return type;
		}
	}).filter(type => type !== undefined);

	return Array.from(new Set(filteredTypes));
}

export function getUnionTypes(unionType: TypeField): string[] {
	const unionTypes: string[] = [];
	if (unionType?.members !== undefined) {
		for (const member of unionType.members) {
			if (isUnsupportedType(member)) continue;
			unionTypes.push(getTypeName(member));
		}
	}
	return unionTypes;
}

export function isAnydataType(type: string): boolean {
	return type === AnydataType || type === AnyType;
}

function isUnsupportedTypeDesc(typeDesc: STNode): boolean {
	return STKindChecker.isByteTypeDesc(typeDesc)
		|| STKindChecker.isDistinctTypeDesc(typeDesc)
		|| STKindChecker.isFunctionTypeDesc(typeDesc)
		|| STKindChecker.isFutureTypeDesc(typeDesc)
		|| STKindChecker.isHandleTypeDesc(typeDesc)
		|| STKindChecker.isIntersectionTypeDesc(typeDesc)
		|| STKindChecker.isMapTypeDesc(typeDesc)
		|| STKindChecker.isNeverTypeDesc(typeDesc)
		|| STKindChecker.isObjectTypeDesc(typeDesc)
		|| STKindChecker.isReadonlyTypeDesc(typeDesc)
		|| STKindChecker.isSingletonTypeDesc(typeDesc)
		|| STKindChecker.isStreamTypeDesc(typeDesc)
		|| STKindChecker.isTableTypeDesc(typeDesc)
		|| STKindChecker.isTupleTypeDesc(typeDesc)
		|| STKindChecker.isTypedescTypeDesc(typeDesc)
		|| STKindChecker.isXmlTypeDesc(typeDesc)
		|| typeDesc?.typeData?.symbol?.definition?.kind === "ENUM";
}

function isUnsupportedType(type: TypeField): boolean {
	if (type.typeName === PrimitiveBalType.Union) {
		return type.members.some(member => {
			return isUnsupportedType(member);
		});
	} else if (type.typeName === PrimitiveBalType.Array) {
		return isUnsupportedType(getInnermostMemberTypeFromArrayType(type));
	}
	return type.typeName === PrimitiveBalType.Error
		|| type.typeName === PrimitiveBalType.Enum
		|| type.typeName === PrimitiveBalType.Json
		|| type.typeName === PrimitiveBalType.Var
		|| type.typeName === PrimitiveBalType.Xml
		|| type.typeName === OtherBalType.Map
		|| type.typeName === OtherBalType.Object
		|| type.typeName === OtherBalType.Stream
		|| type.typeName === OtherBalType.Table
}
