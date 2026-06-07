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
import { Diagnostic, NodePosition } from "@wso2/syntax-tree";

export enum ModelType {
    EXPRESSION,
    OPERATOR,
    BINDING_PATTERN,
    TYPE_DESCRIPTOR,
    QUERY_CLAUSE,
    METHOD_CALL,
    FIELD_ACCESS,
    QUERY_EXPRESSION,
    FUNCTION,
    ORDER_KEY,
    ORDER_DIRECTION_KEYWORDS,
    SPECIFIC_FIELD_NAME
}

export class StatementEditorViewState {
    public exprNotDeletable: boolean = false;
    public templateExprDeletable: boolean = false;
    public isWithinBlockStatement: boolean = false;
    public isWithinWhereClause: boolean = false;
    public modelType: ModelType = ModelType.EXPRESSION;
    public diagnosticsInRange?: Diagnostic[] = [];
    public diagnosticsInPosition?: Diagnostic[] = [];
    public multilineConstructConfig: MultilineConstructConfig = {
        isFieldWithNewLine: false,
        isClosingBraceWithNewLine: false
    };
    public parentFunctionPos: NodePosition = null;
}

interface MultilineConstructConfig {
    isFieldWithNewLine?: boolean;
    isClosingBraceWithNewLine?: boolean;
}
