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

import { Type } from "@wso2/ballerina-core";
import { createContext } from "react";

export interface StackItem {
    type: Type;
    isDirty: boolean;
    fieldIndex?: number;
}

export interface EditorContextType {
  stack: StackItem[];
  push: (item: StackItem) => void;
  pop: () => void;
  peek: () => StackItem | null;
  replaceTop: (item: StackItem) => void;
}

export const EditorContext = createContext<EditorContextType>({
  stack: [],
  push: () => {},
  pop: () => {},
  peek: () => null,
  replaceTop: (item: StackItem) => {}
});
