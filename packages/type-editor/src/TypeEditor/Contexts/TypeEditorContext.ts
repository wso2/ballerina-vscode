import { Type } from "@wso2/ballerina-core";
import { createContext } from "react";

export interface StackItem {
    type: Type;
    isDirty: boolean;
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
