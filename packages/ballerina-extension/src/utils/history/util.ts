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

import { CaptureBindingPattern, DotToken, IdentifierToken, NodePosition, ResourcePathRestParam, ResourcePathSegmentParam, ServiceDeclaration, SlashToken, STKindChecker, STNode } from "@wso2/syntax-tree";

export const MODULE_DELIMETER = '#';
export const SUB_DELIMETER = '%%';

export enum CONSTRUCT_KEYWORDS {
    SERVICE = 'service',
    FUNCTION = 'function',
    RESOURCE = 'resource',
    RECORD = 'record',
    REMOTE = 'remote',
    CLASS = 'class',
    CONST = 'const',
    MODULE_VAR = 'module-var',
}

export function isPositionEqual(position1: NodePosition, position2: NodePosition): boolean {
    return position1.startLine === position2.startLine &&
        position1.startColumn === position2.startColumn &&
        position1.endLine === position2.endLine &&
        position1.endColumn === position2.endColumn;
}

export function isPositionWithinDeletedComponent(currentPosition: NodePosition, deletedPosition: NodePosition): boolean {
    return currentPosition.startLine >= deletedPosition.startLine;
}

export function generateResourcePathString(resourcePathSegments: (DotToken | IdentifierToken | ResourcePathRestParam | ResourcePathSegmentParam | SlashToken)[]): string {
    let path: string = '';
    resourcePathSegments.forEach(pathSegment => {
        path = `${path}${pathSegment.value ? pathSegment.value : pathSegment.source}`;
    });
    return path;
}

export function generateServicePathString(serviceNode: ServiceDeclaration): string {
    let path: string = '';

    if (serviceNode.absoluteResourcePath && serviceNode.absoluteResourcePath.length > 0) {
        path = serviceNode.absoluteResourcePath.reduce((amulgamatedPath, pathSegment) => {
            return `${amulgamatedPath}${pathSegment.value ? pathSegment.value : pathSegment.source}`;
        }, '');
    }

    return path.length > 0 ? path : '/';
}

export function generateConstructIdStub(construct: STNode, index?: number): string {
    let id: string = '';
    if (STKindChecker.isServiceDeclaration(construct)) {
        id = `${CONSTRUCT_KEYWORDS.SERVICE}${SUB_DELIMETER}${generateServicePathString(construct)}`;
    } else if (STKindChecker.isClassDefinition(construct)) {
        id = `${CONSTRUCT_KEYWORDS.CLASS}${SUB_DELIMETER}${construct.className.value}`;
    } else if (STKindChecker.isFunctionDefinition(construct)) {
        id = `${CONSTRUCT_KEYWORDS.FUNCTION}${SUB_DELIMETER}${construct.functionName.value}`;
    } else if (STKindChecker.isObjectMethodDefinition(construct)) {
        id = `${CONSTRUCT_KEYWORDS.FUNCTION}${SUB_DELIMETER}${construct.functionName.value}`;
    } else if (STKindChecker.isResourceAccessorDefinition(construct)) {
        // tslint:disable: prefer-conditional-expression
        id = `${CONSTRUCT_KEYWORDS.RESOURCE}${SUB_DELIMETER}${construct.functionName.value}`;
        if (construct.relativeResourcePath && construct.relativeResourcePath.length > 0) {
            id = `${id}-${generateResourcePathString(construct.relativeResourcePath)}`;
        } else {
            id = `${id}-/`;
        }
    } else if (STKindChecker.isTypeDefinition(construct)) {
        id = `${CONSTRUCT_KEYWORDS.RECORD}${SUB_DELIMETER}${construct.typeName?.value}`;
    } else if (STKindChecker.isConstDeclaration(construct)) {
        id = `${CONSTRUCT_KEYWORDS.CONST}${SUB_DELIMETER}${construct.variableName.value}`;
    } else if (STKindChecker.isModuleVarDecl(construct)) {
        id = `${CONSTRUCT_KEYWORDS.MODULE_VAR}${SUB_DELIMETER}${(construct.typedBindingPattern.bindingPattern as CaptureBindingPattern).variableName.value}`;
    }

    if (index) {
        id = `${id}${SUB_DELIMETER}${index}`;
    }

    return id;
}


export function getConstructBodyString(construct: STNode): string {
    let bodyString = "";

    if (STKindChecker.isFunctionDefinition(construct)) {
        bodyString = construct.functionBody.source;
    } else if (STKindChecker.isServiceDeclaration(construct)) {
        bodyString += construct.openBraceToken.value;
        bodyString += construct.members.reduce((acc, member) => `${acc}${member.source}`, "");
        bodyString += construct.closeBraceToken.value;
    } else if (STKindChecker.isClassDefinition(construct)) {
        bodyString += construct.openBrace.value;
        bodyString += construct.members.reduce((acc, member) => `${acc}${member.source}`, "");
        bodyString += construct.closeBrace.value;
    } else if (STKindChecker.isObjectMethodDefinition(construct)) {
        bodyString = construct.functionBody.source;
    } else if (STKindChecker.isResourceAccessorDefinition(construct)) {
        bodyString += construct.functionBody.source;
    }

    return bodyString;
}

