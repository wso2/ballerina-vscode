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
  RECORD = "Record",
  TEMPLATE = "Template",
  NUMBER = "Number",
  BOOLEAN = "Boolean",
  SQL = "SQL",
  SELECT = "Select",
  ARRAY = "Array",
  TEXT_ARRAY = "Text Array",
  PROMPT = "Prompt",
  MAP = "Map",
  SIMPLE_TEXT = "Info"
};

export const INPUT_MODE_MAP = {
  string: InputMode.TEXT,
  int: InputMode.NUMBER,
  boolean: InputMode.BOOLEAN,
  "sql:ParameterizedQuery": InputMode.SQL,
  "io:Printable": InputMode.TEXT,
  "ai:Prompt": InputMode.PROMPT
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

export type TokenMetadata = {
  content: string;
  fullValue: string;
  documentType?: DocumentType; // Present only for document tokens
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
  metadata?: TokenMetadata; // Present when type is 'document' or 'variable' with interpolation
}

export type CursorPosition = {
  start: number;
  end: number;
}

// Compound token sequence detected from multiple tokens
export type CompoundTokenSequence = {
  startIndex: number;
  endIndex: number;
  tokenType: TokenType.VARIABLE | TokenType.DOCUMENT;
  displayText: string;
  metadata: TokenMetadata;
  start: number;
  end: number;
};

// Token pattern configuration for detecting compound token sequences
export type TokenPattern = {
  name: TokenType.VARIABLE | TokenType.DOCUMENT;
  sequence: readonly TokenType[];
  extractor: (tokens: any[], startIndex: number, endIndex: number, docText: string) => TokenMetadata | null;
  priority: number;
};

// Helper pane state management
export type HelperPaneState = {
  isOpen: boolean;
  top: number;
  left: number;
  clickedChipPos?: number;
  clickedChipNode?: any;
};
