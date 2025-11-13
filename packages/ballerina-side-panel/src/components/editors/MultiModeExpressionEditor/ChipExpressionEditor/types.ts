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

export enum InputMode {
  TEXT = "Text",
  EXP = "Expression",
  GUIDED = "Guided"
}

export const INPUT_MODE_MAP = {
  string: InputMode.TEXT,
  //later add more when needed
};

export enum TokenType {
  LITERAL = "literal",
  VARIABLE = "variable",
  FUNCTION = "function",
  PARAMETER = "parameter",
  START_EVENT = "start_event",
  END_EVENT = "end_event",
  TYPE_CAST = "type_cast",
  VALUE = "value",
  DOCUMENT = "document",
  PROPERTY = "property"
}

export type ExpressionColumnOffset = {
  startColumn: number;
  endColumn: number;
}

export type ExpressionTokenPosition = {
  lineNumber: number;
  column: ExpressionColumnOffset;
}

export type Token = {
  line: number;
  column: number;
  length: number;
  tokenType: 'variable'
}

export type DocumentType = 'ImageDocument' | 'FileDocument' | 'AudioDocument';

export type DocumentMetadata = {
  documentType: DocumentType;
  content: string;
  fullValue: string;
};

export type ExpressionModel = {
  id: string
  value: string,
  isToken: boolean,
  startColumn: number,
  startLine: number,
  length: number,
  type: TokenType,
  isFocused?: boolean
  focusOffsetStart?: number,
  focusOffsetEnd?: number
  documentMetadata?: DocumentMetadata; // Present when type is 'document'
}

export type CursorPosition = {
  start: number;
  end: number;
}
